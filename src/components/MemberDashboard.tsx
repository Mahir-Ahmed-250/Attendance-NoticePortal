import React, { useState } from 'react';
import { TeamMember, Mentor, AttendanceReport, AttendanceFeedback, Notice, AttendanceStatus, EmailMessage, ProfileRequest, User as UserType, LeaveRequest, AttendanceEditRequest } from '../types';
import { getEffectiveStatus, parseTimeToMinutes } from '../utils';
import { Calendar, User, ShieldCheck, MapPin, Award, CheckCircle, AlertTriangle, FileText, Clock, Mail, Inbox, Download, ChevronLeft, ChevronRight, LayoutDashboard, Menu, X, Bell, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProfileSettings from './ProfileSettings';
import NoticeBoard from './NoticeBoard';
import ClockInput from './ClockInput';
import * as XLSX from 'xlsx';

interface MemberDashboardProps {
  currentMember: TeamMember;
  mentors: Mentor[];
  reports: AttendanceReport[];
  feedbacks: AttendanceFeedback[];
  notices: Notice[];
  onAddNotice: (notice: Notice) => void;
  onUpdateNotice: (notice: Notice) => void;
  onDeleteNoticeRequest: (noticeId: string) => void;
  profileRequests: ProfileRequest[];
  onSubmitProfileRequest: (requestedName: string, requestedPin: string) => void;
  onInstantUpdate: (updatedFields: Partial<UserType>) => void;
  leaveRequests: LeaveRequest[];
  onSubmitLeaveRequest: (req: LeaveRequest) => void;
  attendanceEditRequests: AttendanceEditRequest[];
  onSubmitAttendanceEditRequest: (req: AttendanceEditRequest) => void;
  emails: EmailMessage[];
  onMarkEmailAsRead: (emailPin: string) => void;
}

export default function MemberDashboard({
  currentMember,
  mentors,
  reports,
  feedbacks,
  notices,
  onAddNotice,
  onUpdateNotice,
  onDeleteNoticeRequest,
  profileRequests,
  onSubmitProfileRequest,
  onInstantUpdate,
  leaveRequests,
  onSubmitLeaveRequest,
  attendanceEditRequests,
  onSubmitAttendanceEditRequest,
  emails,
  onMarkEmailAsRead
}: MemberDashboardProps) {
  const allowedPerms = (currentMember.permissions && currentMember.permissions.length > 0) ? currentMember.permissions : ['member_attendance', 'member_notices', 'member_emails'];

  const [activeTab, setActiveTab] = useState<'attendance' | 'notices' | 'profile' | 'leave_requests' | 'emails'>(() => {
    if (allowedPerms.includes('member_attendance')) return 'attendance';
    if (allowedPerms.includes('member_notices')) return 'notices';
    if (allowedPerms.includes('member_emails')) return 'emails';
        return 'profile'; // Fallback to profile which is always accessible
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationActiveTab, setNotificationActiveTab] = useState<'notices'>('notices');
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
  const [adjCheckIn, setAdjCheckIn] = useState('');
  const [adjCheckOut, setAdjCheckOut] = useState('');

  // Real-time Working Hours logic for MemberDashboard
  let memberWorkingHoursText = "";
  let memberWorkingHoursError = "";
  let isMemberValidTime = true;

  if (adjCheckIn || adjCheckOut) {
    if (adjCheckIn && adjCheckOut) {
      const inMins = parseTimeToMinutes(adjCheckIn);
      const outMins = parseTimeToMinutes(adjCheckOut);

      if (inMins === null) {
        memberWorkingHoursError = "Invalid In Time format! (e.g. 09:00 AM)";
        isMemberValidTime = false;
      } else if (outMins === null) {
        memberWorkingHoursError = "Out Time Missing";
        isMemberValidTime = false;
      } else {
        let diffMins = outMins - inMins;
        if (diffMins < 0) diffMins += 24 * 60;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        memberWorkingHoursText = `Working Hour: ${hours} Hour ${mins} Min`;
      }
    } else {
      memberWorkingHoursError = "Both In Time and Out Time must be provided!";
      isMemberValidTime = false;
    }
  }
  
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate || !leaveReason.trim()) {
      alert('Please fill in all fields!');
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
      alert('Please fill in all fields!');
      return;
    }

    if (!isMemberValidTime) {
      alert(memberWorkingHoursError || 'Please provide valid time input!');
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
      requestedCheckIn: adjCheckIn || undefined,
      requestedCheckOut: adjCheckOut || undefined,
      reason: adjReason.trim(),
      campus: currentMember.campus,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    onSubmitAttendanceEditRequest(req);
    setAdjDate('');
    setAdjReason('');
    setAdjCheckIn('');
    setAdjCheckOut('');
    alert('Attendance adjustment request submitted!');
  };

  // Find their assigned mentor
  const assignedMentor = mentors.find(m => m.pin === currentMember.mentorPin);

  // Get emails for this team member
  const myEmails = emails.filter(e => e.toEmail === currentMember.email || e.toEmail === `${currentMember.pin}@portal.com`);
  const unreadEmailCount = myEmails.filter(e => !e.isRead).length;

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
      label: `My Notice (${myFilteredNotices.length})`,
      permission: 'member_notices',
      icon: <FileText className="w-4 h-4" />,
      hasUnread: false
    },
    {
      id: 'emails' as const,
      label: `My Inbox (${myEmails.length}) [ইনবক্স]`,
      permission: 'member_emails',
      icon: <Inbox className="w-4 h-4" />,
      hasUnread: unreadEmailCount > 0
    },
  ];

  const visibleTabs = tabsList.filter(t => allowedPerms.includes(t.permission));

  return (
    <div className="space-y-6">
      {/* Member Profile Badge - Styled like Coordinator/Mentor Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left relative z-10">
          <img
            src={currentMember.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
            alt={currentMember.name}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full border-2 border-indigo-100 object-cover shrink-0 shadow-sm transition-transform duration-500 group-hover:scale-105"
          />
          <div>
            <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900">{currentMember.name}</h1>
              <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg border border-indigo-100 font-mono">
                {currentMember.designation || 'Team Member'}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                {currentMember.campus || 'No Assigned Campus'}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                PIN: {currentMember.pin}
              </span>
              {assignedMentor && (
                <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Coordinator: <strong className="text-slate-700 ml-0.5">{assignedMentor.name}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
              {!isSidebarOpen ? (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all shadow-3xs group"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Open Dashboard Menu</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-all shadow-3xs group"
                >
                  <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Close Dashboard Menu</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {(isSidebarOpen || isMobileMenuOpen) && (
            <motion.div
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ 
                width: isMobileMenuOpen ? "280px" : "260px", 
                opacity: 1, 
                x: 0,
                position: isMobileMenuOpen ? "fixed" : "sticky",
                top: isMobileMenuOpen ? "0" : "1.5rem",
                left: isMobileMenuOpen ? "0" : "auto",
                height: isMobileMenuOpen ? "100vh" : "fit-content",
                zIndex: isMobileMenuOpen ? 50 : 10
              }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              className={`bg-white p-4 sm:p-5 rounded-none lg:rounded-3xl border-r lg:border border-slate-200/80 shadow-xs text-left overflow-y-auto shrink-0`}
            >
              <div className="flex items-center justify-between px-2 mb-6 lg:mb-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                  Sidebar Menu
                </p>
                {isMobileMenuOpen && (
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 lg:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {visibleTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id as any);
                      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 ${
                      activeTab === t.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {t.icon}
                    <span className="whitespace-normal text-left leading-tight break-words pr-5">
                      {t.label}
                    </span>
                  </button>
                ))}
                
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 ${
                    activeTab === 'profile'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">Profile Settings</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Mobile Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Content Area */}
        <div className="flex-1 w-full min-w-0 space-y-4 sm:space-y-6 relative">
          
          {/* Top Bar for Member */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs mb-6">
            <div className="text-left">
              <h2 className="text-md font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <LayoutDashboard className="w-4.5 h-4.5 text-indigo-600" />
            Team Member Dashboard
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
        
              </p>
            </div>

            <div className="relative self-end sm:self-auto">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-3 rounded-2xl transition-all relative flex items-center justify-center border group ${
                  isNotificationsOpen 
                    ? 'bg-white text-indigo-600 border-indigo-200 shadow-lg' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Bell className={`w-5 h-5 ${!isNotificationsOpen && unreadEmailCount > 0 ? 'animate-bounce' : ''}`} />
                {unreadEmailCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {unreadEmailCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsNotificationsOpen(false)}
                      className="fixed inset-0 z-40 lg:hidden bg-slate-900/60 backdrop-blur-sm"
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-[280px] sm:w-[350px] bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">System Notices (সিস্টেম নোটিশ)</h3>
                          <p className="text-[10px] font-bold text-slate-400">Recent alerts and bulletins</p>
                        </div>
                        <button onClick={() => setIsNotificationsOpen(false)}>
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto p-2 space-y-2">
                        {unreadEmailCount === 0 ? (
                          <div className="py-8 text-center text-slate-400">
                            <Inbox className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                            <p className="text-xs font-bold">Inbox is empty (ইনবক্স খালি)</p>
                          </div>
                        ) : (
                          myEmails.filter(e => !e.isRead).map(msg => (
                            <div 
                              key={msg.pin}
                              className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-2xl transition-all group flex items-start justify-between gap-2"
                            >
                              <div 
                                className="cursor-pointer flex-1 min-w-0"
                                onClick={() => {
                                  onMarkEmailAsRead(msg.pin);
                                  setActiveTab('emails');
                                  setSelectedEmail(msg);
                                  setIsNotificationsOpen(false);
                                }}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-[9px] font-black text-indigo-600 uppercase">{msg.fromName}</span>
                                  <span className="text-[8px] text-slate-400 font-bold">{new Date(msg.date).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-[11px] font-bold text-slate-800 truncate group-hover:text-indigo-700">{msg.subject}</h4>
                                <p className="text-[10px] text-slate-500 line-clamp-1 italic mt-0.5">"{msg.body}"</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkEmailAsRead(msg.pin);
                                }}
                                className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 rounded-lg transition-colors shadow-sm shrink-0"
                                title="Mark as Read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="p-3 border-t border-slate-100 bg-slate-50/30 text-center">
                        <button 
                          onClick={() => {
                            setActiveTab('emails');
                            setIsNotificationsOpen(false);
                          }}
                          className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 tracking-widest"
                        >
                          View All Messages (সব মেসেজ দেখুন)
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

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
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Members Attendance History</h3>
                <p className="text-xs text-slate-500 font-medium">{currentMember.name}</p>
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
                              (displayStatus === 'Finger Punch Missing' || displayStatus === '< 6hr' || displayStatus === '< 10hrs') ? 'bg-rose-50 text-rose-700 border-rose-200 ' :
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
                                      key={`${cleanText}-${index}`} 
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
            onAddNotice={onAddNotice}
            onUpdateNotice={onUpdateNotice}
            onDeleteNoticeRequest={onDeleteNoticeRequest}
            canPost={allowedPerms.includes('member_post_notice')}
            currentUser={{ name: currentMember.name, role: 'member', pin: currentMember.pin }}
            campuses={currentMember.campus ? [currentMember.campus] : []}
          />
        </motion.div>
      )}


      {/* Tab 3: SIMULATED SECURE EMAIL INBOX */}
      {activeTab === 'emails' && allowedPerms.includes('member_emails') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden min-h-[500px] flex flex-col">
            <div className="bg-slate-50/70 border-b border-slate-150 px-6 py-5">
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Secure Portal Messenger
              </h3>
              <p className="text-xs text-slate-500 font-medium">Internal communications and official alerts</p>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Message List */}
              <div className={`flex-1 overflow-y-auto ${selectedEmail ? 'hidden sm:block' : 'block'}`}>
                {myEmails.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <Inbox className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-500">No messages in your inbox</p>
                    <p className="text-xs text-slate-400 mt-1">Updates and alerts will appear here when posted by coordinators.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {myEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((msg) => (
                      <div
                        key={msg.pin}
                        onClick={() => setSelectedEmail(msg)}
                        className={`p-4 sm:p-5 cursor-pointer transition-all hover:bg-slate-50 border-l-4 ${
                          selectedEmail?.pin === msg.pin ? 'border-indigo-600 bg-indigo-50/30' : 
                          msg.isRead ? 'border-transparent' : 'border-amber-400 bg-amber-50/10'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{msg.fromName}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{new Date(msg.date).toLocaleDateString()}</span>
                        </div>
                        <h4 className={`text-sm font-bold truncate ${msg.isRead ? 'text-slate-600' : 'text-slate-900'}`}>{msg.subject}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-1 leading-relaxed">{msg.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Preview */}
              {selectedEmail ? (
                <div className="flex-1 bg-slate-50/30 border-l border-slate-150 p-6 sm:p-8 overflow-y-auto block relative">
                  <button 
                    onClick={() => setSelectedEmail(null)}
                    className="sm:hidden absolute top-4 right-4 p-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                      <div className="space-y-1.5">
                        <h2 className="text-xl font-black text-slate-900 leading-tight">{selectedEmail.subject}</h2>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-black border border-indigo-200">
                            {selectedEmail.fromName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-wide">{selectedEmail.fromName}</p>
                            <p className="text-[10px] text-slate-500 font-medium">To: {selectedEmail.toEmail}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(selectedEmail.date).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(selectedEmail.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs">
                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                        {selectedEmail.body}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                      <p className="text-[10px] text-slate-400 italic text-center leading-relaxed">
                        This is a secure system-generated message. Please check the official Notice Board for further details and attachments related to this bulletin.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:flex flex-1 items-center justify-center text-slate-300 p-12 bg-slate-50/10">
                  <div className="text-center">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest opacity-40">Select a message to view</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}






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
