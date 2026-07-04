import React, { useState } from 'react';
import { TeamMember, Mentor, AttendanceReport, AttendanceFeedback, Notice, AttendanceStatus, EmailMessage, ProfileRequest, User as UserType, LeaveRequest, AttendanceEditRequest } from '../types';
import { getEffectiveStatus } from '../utils';
import { Calendar, User, ShieldCheck, MapPin, Award, CheckCircle, AlertTriangle, FileText, Clock, Mail, Inbox, Download, ChevronLeft, ChevronRight, LayoutDashboard, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProfileSettings from './ProfileSettings';
import NoticeBoard from './NoticeBoard';
import * as XLSX from 'xlsx';

interface MemberDashboardProps {
  currentMember: TeamMember;
  mentors: Mentor[];
  reports: AttendanceReport[];
  feedbacks: AttendanceFeedback[];
  notices: Notice[];
    profileRequests: ProfileRequest[];
  onSubmitProfileRequest: (requestedName: string, requestedPin: string) => void;
  onInstantUpdate: (updatedFields: Partial<UserType>) => void;
  leaveRequests: LeaveRequest[];
  onSubmitLeaveRequest: (req: LeaveRequest) => void;
  attendanceEditRequests: AttendanceEditRequest[];
  onSubmitAttendanceEditRequest: (req: AttendanceEditRequest) => void;
}

export default function MemberDashboard({
  currentMember,
  mentors,
  reports,
  feedbacks,
  notices,
    profileRequests,
  onSubmitProfileRequest,
  onInstantUpdate,
  leaveRequests,
  onSubmitLeaveRequest,
  attendanceEditRequests,
  onSubmitAttendanceEditRequest
}: MemberDashboardProps) {
  const allowedPerms = (currentMember.permissions && currentMember.permissions.length > 0) ? currentMember.permissions : ['member_attendance', 'member_notices'];

  const [activeTab, setActiveTab] = useState<'attendance' | 'notices' | 'profile' | 'leave_requests' | 'attendance_adjustments'>(() => {
    if (allowedPerms.includes('member_attendance')) return 'attendance';
    if (allowedPerms.includes('member_notices')) return 'notices';
        return 'profile'; // Fallback to profile which is always accessible
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [filterMonth, setFilterMonth] = useState('');

  // Leave Request Form States
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('Casual Leave');
  const [leaveReason, setLeaveReason] = useState('');

  // Attendance Adjustment Form States
  const [adjDate, setAdjDate] = useState('');
  const [adjRequestedStatus, setAdjRequestedStatus] = useState<AttendanceStatus>('Present');
  const [adjReason, setAdjReason] = useState('');
  
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate || !leaveReason.trim()) {
      alert('সবগুলো ঘর পূরণ করুন!');
      return;
    }
    const req: LeaveRequest = {
      pin: `leave-${Date.now()}`,
      memberPin: currentMember.pin,
      memberName: currentMember.name,
      coordinatorPin: currentMember.mentorPin || '',
      coordinatorName: mentors.find(m => m.pin === currentMember.mentorPin)?.name || '',
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      leaveType: leaveType,
      reason: leaveReason.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    onSubmitLeaveRequest(req);
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveReason('');
    alert('Leave request submitted!');
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjDate || !adjReason.trim()) {
      alert('সবগুলো ঘর পূরণ করুন!');
      return;
    }
    const report = reports.find(r => r.date === adjDate && r.campus === currentMember.campus);
    const req: AttendanceEditRequest = {
      pin: `edit-req-${Date.now()}`,
      reportPin: report?.pin || `manual-${Date.now()}`,
      date: adjDate,
      memberPin: currentMember.pin,
      memberName: currentMember.name,
      coordinatorPin: currentMember.mentorPin || '',
      coordinatorName: mentors.find(m => m.pin === currentMember.mentorPin)?.name || '',
      requestedStatus: adjRequestedStatus,
      reason: adjReason.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    onSubmitAttendanceEditRequest(req);
    setAdjDate('');
    setAdjReason('');
    alert('Attendance adjustment request submitted!');
  };

  // Find their assigned mentor
  const assignedMentor = mentors.find(m => m.pin === currentMember.mentorPin);

  // Get emails for this team member
    
  // Extract ONLY their own attendance records
  let myAttendanceRecords = reports
    .map(report => {
      const myRecord = report.records.find(rec => rec.memberPin === currentMember.pin);
      if (!myRecord) return null;
      return {
        reportPin: report.pin,
        date: report.date,
        campus: report.campus,
        postedBy: report.postedBy,
        status: myRecord.status,
        checkInTime: myRecord.checkInTime,
        checkOutTime: myRecord.checkOutTime,
        notes: myRecord.notes,
        remarks: myRecord.remarks
      };
    })
    .filter(Boolean) as Array<{
      reportPin: string;
      date: string;
      campus: string;
      postedBy: string;
      status: AttendanceStatus;
      checkInTime?: string;
      checkOutTime?: string;
      notes?: string;
      remarks?: string;
    }>;

  // Apply month filter if selected
  if (filterMonth) {
    myAttendanceRecords = myAttendanceRecords.filter(r => r.date.startsWith(filterMonth));
  }

  // Sort chronologically (newest first)
  myAttendanceRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Compute Statistics
  const totalReports = myAttendanceRecords.length;
  const presentCount = myAttendanceRecords.filter(r => r.status === 'Present').length;
  const lateCount = myAttendanceRecords.filter(r => r.status === 'Late' || r.status === 'Late Entry').length;
  const missingCount = myAttendanceRecords.filter(r => r.status === 'Finger Punch Missing').length;
  const absentCount = myAttendanceRecords.filter(r => r.status === 'Absent').length;
  
  const attendancePercentage = totalReports > 0 
    ? Math.round(((presentCount + lateCount) / totalReports) * 100) 
    : 100;

  // Filter notices (only general, or those matching their campus)
  const myFilteredNotices = notices.filter(n => {
    return !n.campus || n.campus === currentMember.campus;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Find feedback submitted on behalf of this member
  const myFeedbackHistory = feedbacks.filter(f => f.memberPin === currentMember.pin);

  // Dynamic Tabs list based on permissions
  const tabsList = [
    {
      id: 'attendance' as const,
      label: 'My Attendance Records',
      permission: 'member_attendance',
      icon: <Calendar className="w-4 h-4" />,
      hasUnread: false
    },
    {
      id: 'notices' as const,
      label: `My Bulletins (${myFilteredNotices.length})`,
      permission: 'member_notices',
      icon: <FileText className="w-4 h-4" />,
      hasUnread: false
    },
  ];

  const visibleTabs = tabsList.filter(t => allowedPerms.includes(t.permission));

  return (
    <div className="space-y-6">
      {/* Member Profile Badge */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-850 relative overflow-hidden group">
        {/* Subtle decorative background blur for premium Bento aesthetic */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-600/20 transition-all duration-700" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <img
              src={currentMember.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={currentMember.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full border-2 border-indigo-400/50 object-cover shrink-0 shadow-sm"
            />
            <div>
              <span className="bg-indigo-500/15 text-indigo-300 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/30 font-mono">
                {currentMember.designation || 'Team Member Profile'}
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white mt-2.5">{currentMember.name}</h1>
              {!isSidebarOpen ? (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-white/20 transition-all shadow-3xs group"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Open Dashboard Menu</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-white/10 transition-all shadow-3xs group"
                >
                  <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Close Dashboard Menu</span>
                </button>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-medium bg-slate-800/60 px-2.5 py-1 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  {currentMember.campus || 'No Assigned Campus'}
                </span>
                {assignedMentor && (
                  <span className="flex items-center gap-1.5 font-medium bg-slate-800/60 px-2.5 py-1 rounded-lg">
                    <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    Campus Coordinator: <strong className="text-indigo-200">{assignedMentor.name} ({assignedMentor.pin})</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center shrink-0 min-w-[140px] shadow-2xs hover:bg-white/10 transition-colors">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance Ratio</p>
            <p className="text-3xl font-black text-indigo-400 mt-1">{attendancePercentage}%</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 font-mono">Approved Sessions</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ width: "260px", opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              className="lg:block space-y-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs text-left overflow-hidden shrink-0 h-fit sticky top-6"
            >
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-2 font-mono">মেন্যু প্যানেল (Sidebar Menu)</p>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-1 overflow-x-auto sm:overflow-x-visible">
                {visibleTabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex-1 sm:flex-initial lg:w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 ${
                      activeTab === t.id 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {t.icon}
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
                
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 sm:flex-initial lg:w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 ${
                    activeTab === 'profile'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span className="truncate">প্রোফাইল সেটিংস (Profile)</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 w-full min-w-0 space-y-6">

      {/* Tab 1: OWN ATTENDANCE LOG */}
      {activeTab === 'attendance' && allowedPerms.includes('member_attendance') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Personal Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-36 text-left relative overflow-hidden group">
              <div className="absolute right-4 top-4 opacity-10 group-hover:scale-110 transition-transform">
                <Calendar className="w-10 h-10 text-slate-700" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Tracked</span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Cumulative reports</span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black text-slate-800 block tracking-tight">{totalReports} Days</span>
              </div>
            </div>

            <div className="bg-emerald-50/10 p-5 rounded-3xl border border-emerald-200/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-36 text-left relative overflow-hidden group">
              <div className="absolute right-4 top-4 opacity-15 group-hover:scale-110 transition-transform">
                <Award className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider block">Marked Present</span>
                <span className="text-[10px] text-emerald-500/80 font-medium block mt-0.5">On-time sessions</span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black text-emerald-700 block tracking-tight">{presentCount} Days</span>
              </div>
            </div>

            <div className="bg-amber-50/10 p-5 rounded-3xl border border-amber-200/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-36 text-left relative overflow-hidden group">
              <div className="absolute right-4 top-4 opacity-15 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-10 h-10 text-amber-600" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider block">Punch Missed</span>
                <span className="text-[10px] text-amber-500/80 font-medium block mt-0.5">Awaiting correction</span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black text-amber-700 block tracking-tight">{missingCount} Days</span>
              </div>
            </div>

            <div className="bg-rose-50/10 p-5 rounded-3xl border border-rose-200/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-36 text-left relative overflow-hidden group">
              <div className="absolute right-4 top-4 opacity-15 group-hover:scale-110 transition-transform">
                <Clock className="w-10 h-10 text-rose-600" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider block">Absences</span>
                <span className="text-[10px] text-rose-500/80 font-medium block mt-0.5">Missed schedules</span>
              </div>
              <div className="mt-2">
                <span className="text-3xl font-black text-rose-700 block tracking-tight">{absentCount} Days</span>
              </div>
            </div>
          </div>

          {/* Table of logs */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="bg-slate-50/70 border-b border-slate-150 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Secure Personal Roster Sheet</h3>
                <p className="text-xs text-slate-500 font-medium">Strictly private biometric log of {currentMember.name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input 
                  type="month" 
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  onClick={() => {
                    const wb = XLSX.utils.book_new();
                    // Export member's own records
                    const recordsToExport = myAttendanceRecords.map(rec => ({
                      'Date': rec.date,
                      'Campus': rec.campus,
                      'Status': rec.status,
                      'Check In': rec.checkInTime || '-',
                      'Check Out': rec.checkOutTime || '-',
                      'Notes/Remarks': [rec.remarks, rec.notes].filter(Boolean).join(" | ") || '-'
                    }));
                    
                    const ws = XLSX.utils.json_to_sheet(recordsToExport);
                    XLSX.utils.book_append_sheet(wb, ws, "My Attendance");
                    XLSX.writeFile(wb, `my_attendance_${filterMonth || 'all'}.xlsx`);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full font-bold shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  Verified
                </span>
              </div>
            </div>

            {myAttendanceRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-500">No attendance reports generated yet</p>
                <p className="text-xs text-slate-400 mt-1">Once the manager posts attendance reports for your campus, your logs will populate here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4">Log Date</th>
                      <th className="p-4">Campus Location</th>
                      <th className="p-4">Attendance Status</th>
                      <th className="p-4 font-mono">Check-In / Out Timings</th>
                      <th className="p-4">Administration Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {myAttendanceRecords.map((rec) => {
                      // Find if mentor raised feedback for this specific date
                      const feedbackTicket = myFeedbackHistory.find(f => f.date === rec.date);
                      const displayStatus = getEffectiveStatus(rec);
                      
                      return (
                        <tr key={rec.reportPin} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-semibold text-slate-700">{rec.date}</td>
                          <td className="p-4 text-slate-600">{rec.campus}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center justify-center min-w-[85px] px-4 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-all ${
                              displayStatus === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              (displayStatus === 'Late' || displayStatus === 'Late Entry') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              displayStatus === 'Early Leave' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              (displayStatus === 'Finger Punch Missing' || displayStatus === '< 6hrs' || displayStatus === '< 10hrs') ? 'bg-rose-50 text-rose-700 border-rose-200 ' :
                              displayStatus === 'Absent' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                              displayStatus === 'Leave' || displayStatus.toLowerCase().includes('leave') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                              {displayStatus}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-600">
                            {(rec.checkInTime || rec.checkOutTime) ? (
                              <span>{rec.checkInTime || "--:--"} - {rec.checkOutTime || "--:--"}</span>
                            ) : (
                              <span className="text-slate-400">-- : --</span>
                            )}
                          </td>
                          <td className="p-4 space-y-1.5">
                            {rec.notes || rec.remarks ? (
                            <div className="flex flex-wrap gap-1 text-[11px] text-slate-600 w-full">
                                {Array.from(new Set(
                                  `${rec.remarks || ""} ${rec.notes || ""}`
                                  .replace(/\u00a0/g, " ")
                                  .split(/\s*\|\s*|(?=\b(?:IN|OUT):)/i)
                                  .map(p => p.trim())
                                  .filter(Boolean)
                                )).map((trimmed, index) => {
                                  const isIn = /^IN:/i.test(trimmed);
                                  const isOut = /^OUT:/i.test(trimmed);
                                  const isFingerPunchMissing = /Finger Punch Missing/i.test(trimmed);
                                  const cleanText = trimmed.replace(/^(IN|OUT):/i, "").trim().replace(/।/g, '');
                                  
                                  if (!cleanText && (isIn || isOut)) return null;

                                  return (
                                    <div 
                                      key={index} 
                                      className={`flex items-start gap-1 px-1.5 py-0.5 rounded border ${
                                        isFingerPunchMissing 
                                          ? "bg-red-50 text-red-700 border-red-100 font-medium" 
                                          : "bg-white/50 text-slate-600 border-slate-100/50"
                                      }`}
                                    >
                                      {isIn && <span className="font-bold text-blue-600 shrink-0 text-[9px] uppercase">IN:</span>}
                                      {isOut && <span className="font-bold text-amber-600 shrink-0 text-[9px] uppercase">OUT:</span>}
                                      <span className="leading-tight italic">"{cleanText}"</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No notes</span>
                            )}

                            {/* Show if correction feedback is raised by mentor */}
                            {feedbackTicket && (
                              <div className={`p-2 rounded border text-[11px] leading-relaxed flex items-start gap-1.5 max-w-sm ${
                                feedbackTicket.status === 'Pending' ? 'bg-amber-50/50 border-amber-100 text-amber-800' :
                                'bg-emerald-50/50 border-emerald-100 text-emerald-800'
                              }`}>
                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold">Correction query submitted by Campus Coordinator:</p>
                                  <p className="italic opacity-90">"{feedbackTicket.mentorComment}"</p>
                                  {feedbackTicket.status === 'Resolved' && (
                                    <p className="font-semibold mt-1 text-emerald-700">Resolved by Manager: Mark approved.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Tab 4: RELEVANT BULLETIN BOARD */}
      {visibleTabs.length > 0 && activeTab === 'notices' && allowedPerms.includes('member_notices') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <NoticeBoard
            notices={myFilteredNotices}
            canPost={false}
            currentUser={{ name: currentMember.name, role: 'member' }}
            campuses={currentMember.campus ? [currentMember.campus] : []}
          />
        </motion.div>
      )}



      {/* Tab 3: SIMULATED SECURE EMAIL INBOX removed */}






      {/* Tab 4: PROFILE SETTINGS */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ProfileSettings
            currentUser={currentMember}
            userRole="member"
            profileRequests={profileRequests}
            onSubmitProfileRequest={onSubmitProfileRequest}
            onInstantUpdate={onInstantUpdate}
          />
        </motion.div>
      )}
        </div> {/* Close lg:col-span-9 */}
      </div> {/* Close grid */}
    </div>
  );
}
