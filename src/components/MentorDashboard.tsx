import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Mentor, TeamMember, AttendanceReport, AttendanceFeedback, AttendanceStatus, Notice, EmailMessage, ProfileRequest, User as UserType, AttendanceEditRequest, LeaveRequest, Campus } from '../types';
import { getEffectiveStatus, calculateWorkingHours, formatDateLong, parseTimeToMinutes } from '../utils';
import { Calendar, User, FileText, AlertCircle, CheckCircle2, MessageSquare, Send, Clock, Sparkles, Mail, Inbox, ShieldCheck, Plus, Edit3, ClipboardPlus, FileCheck, Trash, Sliders, Bell, X, ChevronRight, Menu, ChevronLeft, LayoutDashboard, Check, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import NoticeBoard from './NoticeBoard';
import ProfileSettings from './ProfileSettings';
import ConfirmModal from './ConfirmModal';
import { UserAvatar } from './UserAvatar';
import ClockInput from './ClockInput';
import { toast } from 'react-hot-toast';


interface MentorDashboardProps {
  currentMentor: Mentor;
  managers: UserType[];
  mentors: Mentor[];
  members: TeamMember[];
  reports: AttendanceReport[];
  feedbacks: AttendanceFeedback[];
  attendanceEditRequests: AttendanceEditRequest[];
  onSubmitAttendanceEditRequest: (req: AttendanceEditRequest) => void;
  onDeleteAttendanceEditRequest?: (pin: string) => void;
  onUpdateAttendanceEditRequest?: (req: AttendanceEditRequest) => void;
  leaveRequests: LeaveRequest[];
  onSubmitLeaveRequest: (req: LeaveRequest) => void;
  onDeleteLeaveRequest?: (pin: string) => void;
  onUpdateLeaveRequest?: (req: LeaveRequest) => void;
  notices: Notice[];
    onSubmitFeedback: (feedback: AttendanceFeedback) => void;
  onAddNotice: (notice: Omit<Notice, 'id' | 'date' | 'postedBy'>) => void;
  onUpdateNotice?: (notice: Notice) => void;
  onDeleteNotice?: (pin: string) => void;
  campuses?: Campus[];
  profileRequests: ProfileRequest[];
  onSubmitProfileRequest: (requestedName: string, requestedPin: string) => void;
  onInstantUpdate: (updatedFields: Partial<UserType>) => void;
  emails: EmailMessage[];
  onMarkEmailAsRead: (emailPin: string) => void;
}

export default function MentorDashboard({
  currentMentor,
  managers,
  mentors,
  members,
  reports,
  feedbacks,
  attendanceEditRequests,
  onSubmitAttendanceEditRequest,
  onDeleteAttendanceEditRequest,
  onUpdateAttendanceEditRequest,
  leaveRequests,
  onSubmitLeaveRequest,
  onDeleteLeaveRequest,
  onUpdateLeaveRequest,
  notices,
    onSubmitFeedback,
  onAddNotice,
  onUpdateNotice,
  onDeleteNotice,
  campuses,
  profileRequests,
  onSubmitProfileRequest,
  onInstantUpdate,
  emails,
  onMarkEmailAsRead
}: MentorDashboardProps) {
  const navigate = useNavigate();
  const allowedPerms = (currentMentor.permissions && currentMentor.permissions.length > 0) ? currentMentor.permissions : ['mentor_attendance', 'mentor_notices', 'mentor_history', 'mentor_leave', 'mentor_post_notice'];

  const [activeTab, setActiveTab] = useState<'attendance' | 'notices' | 'edit_requests' | 'profile' | 'members' | 'leaves' | 'emails'>(() => {
    if (allowedPerms.includes('mentor_attendance')) return 'attendance';
    if (allowedPerms.includes('mentor_notices')) return 'notices';
    if (allowedPerms.includes('mentor_history')) return 'edit_requests';
    return 'members'; // Default to members if others are restricted
  });
  const [confirmDeleteLeavePin, setConfirmDeleteLeavePin] = useState<string | null>(null);
  const [confirmDeleteEditReqPin, setConfirmDeleteEditReqPin] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);

    
  // Filter team members assigned to *this* mentor (or of the same campus if not explicitly assigned to another mentor)
  const myTeam = members
    .filter(m => m.isActive !== false && (m.mentorPin === currentMentor.pin || (!m.mentorPin && m.campus === currentMentor.campus)))
    .sort((a, b) => a.pin.localeCompare(b.pin, undefined, { numeric: true, sensitivity: 'base' }));
  const myTeamPins = myTeam.map(m => m.pin);

  const myCampus = (campuses || []).find(c => c.name === currentMentor.campus);
  const isHead = myCampus?.headCoordinatorPin === currentMentor.pin;
  const isDeputy = myCampus?.deputyCoordinatorPins?.includes(currentMentor.pin);
  const headCoordinatorPin = myCampus?.headCoordinatorPin || (myCampus?.coordinatorPins || [])[0];
  const headCoordinator = (mentors || []).find(m => m.pin === headCoordinatorPin);

  // Filter members belonging to the same campus as this coordinator
  const baseCampusMembers = members
    .filter(m => {
      if (m.isActive === false) return false;
      if (m.campus !== currentMentor.campus) return false;
      if (isHead) return true;
      if (isDeputy) {
        const allowedPins = myCampus?.deputyMemberAccess?.[currentMentor.pin] || [];
        return allowedPins.includes(m.pin);
      }
      return m.mentorPin === currentMentor.pin || !m.mentorPin;
    });

  const allCampusMembers = members.filter(m => m.campus === currentMentor.campus && m.isActive !== false);

  // All coordinators of this campus to be displayed as "members"
  const campusCoordinators = mentors
    .filter(m => m.campus === currentMentor.campus && m.isActive !== false);

  const hierarchicalMembers = [
    ...baseCampusMembers,
    ...campusCoordinators.map(c => ({ ...c, isCoordinator: true }))
  ].sort((a, b) => a.pin.localeCompare(b.pin, undefined, { numeric: true, sensitivity: 'base' }));

  const campusMembers = hierarchicalMembers;

  // Form states for attendance edit requests
  const [showEditRequestFormFor, setShowEditRequestFormFor] = useState<{ reportPin: string; memberPin: string; memberName: string; date: string; currentStatus: AttendanceStatus; currentCheckIn?: string; currentCheckOut?: string } | null>(null);
  const [viewedMemberPin, setViewedMemberPin] = useState<string | null>(null);
  const [attendanceStartDate, setAttendanceStartDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [attendanceEndDate, setAttendanceEndDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const mStr = String(m).padStart(2, '0');
    return `${y}-${mStr}-${lastDay}`;
  });
  const [tempStartDate, setTempStartDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [tempEndDate, setTempEndDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const mStr = String(m).padStart(2, '0');
    return `${y}-${mStr}-${lastDay}`;
  });
  const [editRequestedStatus, setEditRequestedStatus] = useState<AttendanceStatus>('Present');
  const [editRequestedCheckIn, setEditRequestedCheckIn] = useState<string>('');
  const [editRequestedCheckOut, setEditRequestedCheckOut] = useState<string>('');
  const [editRequestReason, setEditRequestReason] = useState('');

  // Real-time Working Hours logic for MentorDashboard
  let mentorWorkingHoursText = "";
  let mentorWorkingHoursError = "";
  let isMentorValidTime = true;

  if (editRequestedCheckIn || editRequestedCheckOut) {
    if (editRequestedCheckIn && editRequestedCheckOut) {
      const inMins = parseTimeToMinutes(editRequestedCheckIn);
      const outMins = parseTimeToMinutes(editRequestedCheckOut);

      if (inMins === null) {
        mentorWorkingHoursError = "Invalid In Time format! (e.g. 09:00 AM)";
        isMentorValidTime = false;
      } else if (outMins === null) {
        mentorWorkingHoursError = "Out Time Missing";
        isMentorValidTime = false;
      } else {
        let diffMins = outMins - inMins;
        if (diffMins < 0) diffMins += 24 * 60;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        mentorWorkingHoursText = `Working Hour: ${hours} Hour ${mins} Min`;
      }
    } else {
      mentorWorkingHoursError = "Both In Time and Out Time must be provided!";
      isMentorValidTime = false;
    }
  }

  // Form states for leave requests
  const [showLeaveRequestForm, setShowLeaveRequestForm] = useState(false);
  const [leaveMemberPin, setLeaveMemberPin] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('Casual Leave');
  const [leaveReason, setLeaveReason] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [leaveResponsiblePin, setLeaveResponsiblePin] = useState('');

  // States for local editing of requests in MentorDashboard
  const localToday = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const [editingReqPin, setEditingReqPin] = useState<string | null>(null);
  const [reqEditForm, setReqEditForm] = useState<Partial<AttendanceEditRequest>>({});
  const [editingLeavePin, setEditingLeavePin] = useState<string | null>(null);
  const [leaveEditForm, setLeaveEditForm] = useState<Partial<LeaveRequest>>({});
  const [leaveSearchPin, setLeaveSearchPin] = useState('');
  const [leaveFilterStatus, setLeaveFilterStatus] = useState('All');
  const [leaveFilterType, setLeaveFilterType] = useState('All');
  const [leaveFilterMonth, setLeaveFilterMonth] = useState(localToday.substring(0, 7));
  const [leaveSortBy, setLeaveSortBy] = useState('newest');
  const [memberSearch, setMemberSearch] = useState('');
  const [filterDate, setFilterDate] = useState(localToday);
  const [filterCampus, setFilterCampus] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const visibleMemberPins = [
    ...baseCampusMembers.map(m => m.pin),
    ...campusCoordinators.map(c => c.pin)
  ];

  // Get attendance reports that contain records for my team members
  const reportsWithMyTeam = reports.map(report => {
    const relevantRecords = report.records.filter(rec => visibleMemberPins.includes(rec.memberPin));
    return {
      ...report,
      records: relevantRecords
    };
  }).filter(report => report.records.length > 0);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationActiveTab, setNotificationActiveTab] = useState<'problematic' | 'notices'>('problematic');

  const myEmails = emails.filter(e => e.toEmail === currentMentor.email || e.toEmail === `${currentMentor.pin}@portal.com`);
  const unreadEmailCount = myEmails.filter(e => !e.isRead).length;

  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(() => {
    const saved = localStorage.getItem('mentor_dismissed_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDismissed = [...dismissedNotifications, id];
    setDismissedNotifications(newDismissed);
    localStorage.setItem('mentor_dismissed_notifications', JSON.stringify(newDismissed));
  };

  const notificationProblematicAttendances = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const issues: {
      date: string;
      memberPin: string;
      memberName: string;
      campus: string;
      issue: string;
      hours?: number;
    }[] = [];

    reportsWithMyTeam.forEach((report) => {
      if (report.date > today) return;

      report.records.forEach((record) => {
        const status = getEffectiveStatus(record);
        const hours = calculateWorkingHours(record.checkInTime, record.checkOutTime);

        let issue = '';
        if (status === 'Finger Punch Missing') {
          issue = 'Punch Missing';
        } else if (status === 'Absent') {
          issue = 'Absent';
        } else if (status === '< 6hr') {
          issue = `< 6hr (${Math.floor(hours || 0)}h ${Math.round(((hours || 0) % 1) * 60)}m)`;
        } else if (status === '< 10hrs') {
          issue = '< 10hrs (Low Hours)';
        } else if (status === 'Late Entry') {
          issue = 'Late Entry';
        } else if (status === 'Early Leave') {
          issue = 'Early Leave';
        }

        const memberObj = members.find(m => m.pin === record.memberPin) || mentors.find(m => m.pin === record.memberPin);
        const nameToUse = record.memberName || memberObj?.name || record.memberPin;

        if (issue) {
          const notificationId = `${record.memberPin}-${report.date}-${issue}`;
          if (!dismissedNotifications.includes(notificationId)) {
            issues.push({
              date: report.date,
              memberPin: record.memberPin,
              memberName: nameToUse,
              campus: report.campus,
              issue,
              hours: hours || 0
            });
          }
        }
      });
    });

    return issues.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reportsWithMyTeam, dismissedNotifications]);

  const totalNotificationBadgeCount = notificationProblematicAttendances.length + unreadEmailCount;

  const handleTabChange = (tab: 'attendance' | 'notices' | 'edit_requests' | 'profile' | 'members' | 'leaves' | 'emails') => {
    setActiveTab(tab);
    setViewedMemberPin(null);
    setLeaveSearchPin('');
    setLeaveFilterStatus('All');
    setLeaveFilterType('All');
    setLeaveFilterMonth(localToday.substring(0, 7));
    setLeaveSortBy('newest');
    setMemberSearch('');
    setFilterDate(localToday);
    setFilterCampus('All');
    setFilterStatus('All');
    setMemberSearchQuery('');
    setLeaveMemberPin('');
    setLeaveReason('');
  };

  const startEditRequest = (req: AttendanceEditRequest) => {
    setEditingReqPin(req.pin);
    setReqEditForm({ ...req });
  };

  const saveEditRequest = () => {
    if (!reqEditForm.pin || !onUpdateAttendanceEditRequest) return;
    onUpdateAttendanceEditRequest(reqEditForm as AttendanceEditRequest);
    setEditingReqPin(null);
  };

  const startEditLeave = (req: LeaveRequest) => {
    setEditingLeavePin(req.pin);
    setLeaveEditForm({ ...req });
  };

  const saveEditLeave = () => {
    if (!leaveEditForm.pin || !onUpdateLeaveRequest) return;
    
    const start = leaveEditForm.startDate;
    const end = leaveEditForm.endDate;
    if (!start || !end || !leaveEditForm.reason?.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    if (new Date(start) > new Date(end)) {
      toast.error('Start Date cannot be after End Date.');
      return;
    }

    if (leaveEditForm.responsiblePersonPin) {
      const resp = [...members, ...mentors].find(u => u.pin === leaveEditForm.responsiblePersonPin);
      if (resp) {
        // Double check overlap
        const isCurrentlyOnLeave = leaveRequests.some(req => {
          if (req.pin === leaveEditForm.pin) return false; // skip self
          if (req.memberPin !== leaveEditForm.responsiblePersonPin) return false;
          if (req.status === 'Rejected') return false;
          return req.startDate <= end && req.endDate >= start;
        });

        if (isCurrentlyOnLeave) {
          alert('The selected responsible person is on leave during those dates!');
          return;
        }

        leaveEditForm.responsiblePersonName = resp.name;
      }
    } else {
      leaveEditForm.responsiblePersonPin = '';
      leaveEditForm.responsiblePersonName = '';
    }

    onUpdateLeaveRequest(leaveEditForm as LeaveRequest);
    setEditingLeavePin(null);
  };

  // Filter reports by selected date, campus, and record status
  const filteredReports = reportsWithMyTeam
    .filter(r => (!filterDate || r.date === filterDate) && (filterCampus === 'All' || r.campus === filterCampus))
    .map(report => {
      const filteredRecords = report.records.filter(rec => {
        if (filterStatus === 'All') return true;
        const status = getEffectiveStatus(rec);
        if (filterStatus === 'Late Entry') {
          return status === 'Late Entry' || status === 'Late';
        }
        return status === filterStatus;
      });
      return {
        ...report,
        records: filteredRecords
      };
    })
    .filter(report => report.records.length > 0);

  const handleEditRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditRequestFormFor || !editRequestReason.trim()) return;

    if (!isMentorValidTime) {
      toast.error(mentorWorkingHoursError || 'Please provide valid time input!');
      return;
    }

    const newRequest: AttendanceEditRequest = {
      pin: `edit-req-${Date.now()}`,
      reportPin: showEditRequestFormFor.reportPin,
      date: showEditRequestFormFor.date,
      memberPin: showEditRequestFormFor.memberPin,
      memberName: showEditRequestFormFor.memberName,
      coordinatorPin: currentMentor.pin,
      coordinatorName: currentMentor.name,
      requestedStatus: editRequestedStatus,
      requestedCheckIn: editRequestedCheckIn.trim(),
      requestedCheckOut: editRequestedCheckOut.trim(),
      reason: editRequestReason.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    onSubmitAttendanceEditRequest(newRequest);
    setShowEditRequestFormFor(null);
    setEditRequestReason('');
    setEditRequestedCheckIn('');
    setEditRequestedCheckOut('');
  };

  const getEligibleResponsiblePeople = (forMemberPin: string, start: string, end: string, excludeLeavePin?: string) => {
    if (!currentMentor.campus) return [];
    
    // Combine members and coordinators (mentors) from this campus
    const campusPeople = [
      ...members.filter(m => m.campus === currentMentor.campus && m.isActive !== false),
      ...mentors.filter(m => m.campus === currentMentor.campus && m.isActive !== false)
    ];

    // Filter out the person taking leave itself
    const candidates = campusPeople.filter(p => p.pin !== forMemberPin);

    // Map each candidate to check if they have a non-rejected overlapping leave request
    return candidates.map(candidate => {
      const hasOverlap = leaveRequests.some(req => {
        if (req.memberPin !== candidate.pin) return false;
        if (req.status === 'Rejected') return false;
        if (excludeLeavePin && req.pin === excludeLeavePin) return false;
        
        const s1 = req.startDate;
        const e1 = req.endDate;
        const s2 = start;
        const e2 = end;
        // Overlap exists if s1 <= e2 and e1 >= s2
        return s1 <= e2 && e1 >= s2;
      });

      return {
        ...candidate,
        isOnLeave: hasOverlap
      };
    });
  };

  const handleLeaveRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveMemberPin || !leaveStartDate || !leaveEndDate || !leaveReason.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    if (new Date(leaveStartDate) > new Date(leaveEndDate)) {
      toast.error('Start Date cannot be after End Date.');
      return;
    }

    const foundUser = [...members, ...mentors].find(u => u.pin === leaveMemberPin);
    const memberName = foundUser?.name || '';
    const coordinatorToUse = leaveMemberPin === currentMentor.pin ? (managers.find(m => m.pin === currentMentor.mentorPin) || managers[0]) : { pin: currentMentor.pin, name: currentMentor.name };

    let responsiblePersonName = '';
    let responsiblePersonPin = '';

    if (leaveResponsiblePin) {
      const resp = [...members, ...mentors].find(u => u.pin === leaveResponsiblePin);
      if (resp) {
        // Double check overlap
        const isCurrentlyOnLeave = leaveRequests.some(req => {
          if (req.memberPin !== leaveResponsiblePin) return false;
          if (req.status === 'Rejected') return false;
          return req.startDate <= leaveEndDate && req.endDate >= leaveStartDate;
        });

        if (isCurrentlyOnLeave) {
          alert('The selected responsible person is on leave during those dates!');
          return;
        }

        responsiblePersonPin = resp.pin;
        responsiblePersonName = resp.name;
      }
    }

    const newRequest: LeaveRequest = {
      pin: `leave-req-${Date.now()}`,
      memberPin: leaveMemberPin,
      memberName,
      coordinatorPin: coordinatorToUse?.pin || currentMentor.pin,
      coordinatorName: coordinatorToUse?.name || currentMentor.name,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      leaveType,
      reason: leaveReason.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      responsiblePersonPin,
      responsiblePersonName,
    };

    onSubmitLeaveRequest(newRequest);
    setShowLeaveRequestForm(false);
    setLeaveMemberPin('');
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveReason('');
    setLeaveType('Casual Leave');
    setLeaveResponsiblePin('');
  };

  // Helper to check if edit request already exists for a report & member
  const getExistingEditRequest = (reportPin: string, memberPin: string) => {
    return attendanceEditRequests.find(req => req.reportPin === reportPin && req.memberPin === memberPin);
  };

  const tabsList = [
    {
      id: 'attendance' as const,
      label: "My Team's Attendance",
      permission: 'mentor_attendance',
      icon: <Calendar className="w-4 h-4" />,
      hasUnread: false
    },
    {
      id: 'emails' as const,
      label: `Inbox (${myEmails.length}) [ইনবক্স]`,
      permission: 'mentor_emails',
      icon: <Inbox className="w-4 h-4" />,
      hasUnread: unreadEmailCount > 0
    },
    {
      id: 'edit_requests' as const,
      label: 'Attendance Adjustment',
      permission: 'mentor_history',
      icon: <Clock className="w-4 h-4" />,
      hasUnread: false
    },
    {
      id: 'leaves' as const,
      label: 'Leave Requests',
      permission: 'mentor_leave',
      icon: <ClipboardPlus className="w-4 h-4" />,
      hasUnread: false
    },
     {
      id: 'notices' as const,
      label: 'Notice',
      permission: 'mentor_notices',
      icon: <MessageSquare className="w-4 h-4" />,
      hasUnread: false
    },
    {
      id: 'members' as const,
      label: 'Campus Members',
      permission: 'mentor_attendance', // Using same permission as attendance for now
      icon: <User className="w-4 h-4" />,
      hasUnread: false
    }
  ];

  const visibleTabs = tabsList.filter(t => allowedPerms.includes(t.permission));

  return (
    <div className="space-y-6">
      {/* Top Welcome & Notification Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="text-left">
          <h2 className="text-md font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-4.5 h-4.5 text-indigo-600" />
            Campus Coordinator Dashboard
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage attendance and leave requests for your assigned team members.
          </p>
          {!isSidebarOpen ? (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all shadow-3xs group"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Open Dashboard Menu</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-all shadow-3xs group"
            >
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Close Dashboard Menu</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          {/* Notification Bell Button & Popover */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`p-3 rounded-2xl transition-all relative flex items-center justify-center border group ${
                isNotificationsOpen 
                  ? 'bg-white text-indigo-600 border-indigo-200 shadow-lg' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Bell className={`w-5 h-5 ${!isNotificationsOpen && totalNotificationBadgeCount > 0 ? 'animate-bounce' : ''}`} />
              {totalNotificationBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {totalNotificationBadgeCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  {/* Backdrop for mobile */}
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
                    className="absolute right-0 mt-3 w-[320px] sm:w-[400px] bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">System Alerts (সিস্টেম অ্যালার্ট)</h3>
                        <p className="text-[10px] font-bold text-slate-400">Notices and Team Issues</p>
                      </div>
                      <button 
                        onClick={() => setIsNotificationsOpen(false)}
                        className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex border-b border-slate-100 px-3 py-1 gap-4 bg-slate-50/30">
                      <button 
                        onClick={() => setNotificationActiveTab('problematic')}
                        className={`py-2 text-[10px] font-black uppercase tracking-wider relative transition-all ${notificationActiveTab === 'problematic' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Issues ({notificationProblematicAttendances.length})
                        {notificationActiveTab === 'problematic' && <motion.div layoutId="notif-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                      </button>
                      <button 
                        onClick={() => setNotificationActiveTab('notices')}
                        className={`py-2 text-[10px] font-black uppercase tracking-wider relative transition-all ${notificationActiveTab === 'notices' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Notices ({unreadEmailCount})
                        {notificationActiveTab === 'notices' && <motion.div layoutId="notif-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                      </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {notificationActiveTab === 'problematic' && (
                        <>
                          {notificationProblematicAttendances.length === 0 ? (
                            <div className="py-12 text-center">
                              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-6 h-6" />
                              </div>
                              <p className="text-xs font-bold text-slate-500">No attendance issues found!</p>
                              <p className="text-[10px] text-slate-400 mt-1">Everyone is present and accounted for.</p>
                            </div>
                          ) : (
                            notificationProblematicAttendances.map((item, idx) => (
                              <div 
                                key={`${item.memberPin}-${item.date}-${idx}`}
                                className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all flex items-start gap-3 group relative cursor-pointer"
                                onClick={() => {
                                  setFilterDate(item.date);
                                  setActiveTab('attendance');
                                  setIsNotificationsOpen(false);
                                }}
                              >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                                  item.issue === 'Absent' ? 'bg-rose-50 text-rose-500' :
                                  item.issue === 'Punch Missing' ? 'bg-amber-50 text-amber-600' :
                                  'bg-indigo-50 text-indigo-500'
                                }`}>
                                   {item.issue === 'Absent' ? <AlertCircle className="w-5 h-5" /> : 
                                    item.issue === 'Punch Missing' ? <Clock className="w-5 h-5" /> : 
                                    <AlertCircle className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[11px] font-black text-indigo-600 font-mono tracking-tighter uppercase">{item.memberPin}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{item.date}</span>
                                  </div>
                                  <h4 className="text-[12px] font-black text-slate-800 truncate mb-0.5">{item.memberName}</h4>
                                  <p className={`text-[10px] font-bold ${
                                    item.issue === 'Absent' ? 'text-rose-500' :
                                    item.issue === 'Punch Missing' ? 'text-amber-600' :
                                    'text-indigo-500'
                                  }`}>
                                    {item.issue}
                                  </p>
                                </div>
                                
                                <button
                                  onClick={(e) => handleMarkAsRead(`${item.memberPin}-${item.date}-${item.issue}`, e)}
                                  className="absolute top-2 right-2 p-1.5 bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                                  title="Mark as read"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </>
                      )}

                      {notificationActiveTab === 'notices' && (
                        <>
                          {unreadEmailCount === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                              <Inbox className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                              <p className="font-bold text-slate-500 text-xs">No new notices in inbox</p>
                            </div>
                          ) : (
                            myEmails.filter(e => !e.isRead).map((msg) => (
                            <div
                              key={msg.pin}
                              className="flex flex-col p-3 bg-slate-50 border border-slate-150 rounded-2xl transition-all hover:bg-white hover:border-indigo-200 group relative text-left"
                            >
                              <div 
                                className="cursor-pointer"
                                onClick={() => {
                                  onMarkEmailAsRead(msg.pin);
                                  setActiveTab("emails");
                                  setIsNotificationsOpen(false);
                                }}
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider font-mono">
                                    {msg.fromName}
                                  </span>
                                  <span className="text-[8px] text-slate-400 font-bold">
                                    {new Date(msg.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <h4 className="text-[11px] font-black text-slate-800 line-clamp-1 mb-1">
                                  {msg.subject}
                                </h4>
                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight italic">
                                  "{msg.body}"
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkEmailAsRead(msg.pin);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-sm"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                            ))
                          )}
                        </>
                      )}
                    </div>
                    
                    {notificationProblematicAttendances.length > 0 && (
                      <div className="p-3 bg-slate-50 border-t border-slate-100">
                        <button 
                          onClick={() => {
                            setFilterDate('');
                            setFilterStatus('All');
                            setActiveTab('attendance');
                            setIsNotificationsOpen(false);
                          }}
                          className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-3xs"
                        >
                          View All Attendance History
                        </button>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
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
                width: isMobileMenuOpen ? "280px" : "240px", 
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
                  Coordinator Controls
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
                      handleTabChange(t.id);
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
                    handleTabChange('profile');
                    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 ${
                    activeTab === 'profile'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-4 h-4" />
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

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Member Monthly Attendance View (if selected) */}
              {viewedMemberPin !== null && (
                <motion.div
                  key="member-monthly-attendance"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-left space-y-6"
                >
                  {/* Back Button & Member Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-5">
                    <button
                      onClick={() => setViewedMemberPin(null)}
                      className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50/50 hover:bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 cursor-pointer w-fit animate-pulse"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Campus Members
                    </button>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={members.find(m => m.pin === viewedMemberPin) || mentors.find(m => m.pin === viewedMemberPin)} size="sm" />
                      <div>
                        <h3 className="text-sm font-black text-slate-800">
                          {(members.find(m => m.pin === viewedMemberPin) || mentors.find(m => m.pin === viewedMemberPin))?.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono font-medium">
                          PIN: {viewedMemberPin}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* The custom "My Attendance" interface exactly like the image */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                    {/* Title Header Bar */}
                    <div className="bg-[#022e54] text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                      <h4 className="text-sm font-bold tracking-wide">My Attendance</h4>
                      <span className="text-xs bg-white/10 px-3 py-1 rounded-full font-mono font-medium border border-white/20">
                        {(members.find(m => m.pin === viewedMemberPin) || mentors.find(m => m.pin === viewedMemberPin))?.name} (PIN: {viewedMemberPin})
                      </span>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col md:flex-row items-center justify-center gap-4 text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <span>Start Date</span>
                        <input
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span>End Date</span>
                        <input
                          type="date"
                          value={tempEndDate}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setAttendanceStartDate(tempStartDate);
                          setAttendanceEndDate(tempEndDate);
                          toast.success("Attendance filtered successfully!");
                        }}
                        className="px-5 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg cursor-pointer transition-colors shadow-2xs"
                      >
                        Show
                      </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                            <th className="p-3 border-r border-slate-150">Date</th>
                            <th className="p-3 border-r border-slate-150">In Time</th>
                            <th className="p-3 border-r border-slate-150">Out Time</th>
                            <th className="p-3 border-r border-slate-150">Late Entry</th>
                            <th className="p-3 border-r border-slate-150">Early Leave</th>
                            <th className="p-3 border-r border-slate-150">W. Hour</th>
                            <th className="p-3 border-r border-slate-150">Absent/Leave</th>
                            <th className="p-3">Zone</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                          {(() => {
                            const dateRange = (() => {
                              const dates: string[] = [];
                              const start = (() => {
                                const parts = attendanceStartDate.split('-');
                                if (parts.length === 3) {
                                  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                }
                                return new Date(attendanceStartDate);
                              })();
                              const end = (() => {
                                const parts = attendanceEndDate.split('-');
                                if (parts.length === 3) {
                                  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                }
                                return new Date(attendanceEndDate);
                              })();
                              if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
                              
                              let current = new Date(start);
                              while (current <= end) {
                                const yyyy = current.getFullYear();
                                const mm = String(current.getMonth() + 1).padStart(2, '0');
                                const dd = String(current.getDate()).padStart(2, '0');
                                dates.push(`${yyyy}-${mm}-${dd}`);
                                current.setDate(current.getDate() + 1);
                              }
                              return dates.reverse();
                            })();

                            if (dateRange.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                                    No records found for selected range.
                                  </td>
                                </tr>
                              );
                            }

                            return dateRange.map((dateStr) => {
                              const dayReports = reports.filter(r => r.date === dateStr);
                              let memberRecord: any = null;
                              let zoneName = "-";
                              for (const report of dayReports) {
                                const found = report.records.find(rec => rec.memberPin === viewedMemberPin);
                                if (found) {
                                  memberRecord = found;
                                  zoneName = report.campus || found.zone || "-";
                                  break;
                                }
                              }

                              const parsedDate = (() => {
                                const parts = dateStr.split('-');
                                if (parts.length === 3) {
                                  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                }
                                return new Date(dateStr);
                              })();
                              const isFriday = parsedDate.getDay() === 5; // Friday is weekend

                              // custom format
                              const displayDate = (() => {
                                const parts = dateStr.split('-');
                                if (parts.length !== 3) return dateStr;
                                const year = parts[0];
                                const monthIdx = parseInt(parts[1], 10) - 1;
                                const day = parseInt(parts[2], 10);
                                const monthNamesShort = [
                                  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                                ];
                                return `${day} ${monthNamesShort[monthIdx]}, ${year}`;
                              })();

                              if (memberRecord) {
                                const isLateEntry = memberRecord.lateEntry && memberRecord.lateEntry !== '-' && memberRecord.lateEntry !== '0' && memberRecord.lateEntry.trim() !== '';
                                const isEarlyLeave = memberRecord.earlyLeave && memberRecord.earlyLeave !== '-' && memberRecord.earlyLeave !== '0' && memberRecord.earlyLeave.trim() !== '';

                                return (
                                  <tr key={dateStr} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 font-semibold text-slate-700 border-r border-slate-150">{displayDate}</td>
                                    <td className="p-3 border-r border-slate-150 font-mono">{memberRecord.checkInTime || "-"}</td>
                                    <td className="p-3 border-r border-slate-150 font-mono">{memberRecord.checkOutTime || "-"}</td>
                                    <td className={`p-3 border-r border-slate-150 font-mono ${isLateEntry ? 'text-amber-600 font-bold' : ''}`}>{memberRecord.lateEntry || "-"}</td>
                                    <td className={`p-3 border-r border-slate-150 font-mono ${isEarlyLeave ? 'text-amber-600 font-bold' : ''}`}>{memberRecord.earlyLeave || "-"}</td>
                                    <td className="p-3 border-r border-slate-150 font-mono font-medium text-slate-800">{memberRecord.workingHour || "-"}</td>
                                    <td className="p-3 border-r border-slate-150">
                                      {memberRecord.absentOrLeave && memberRecord.absentOrLeave !== '-' ? (
                                        <span className={`font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-full ${
                                          memberRecord.absentOrLeave.toLowerCase().includes('leave') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                          memberRecord.absentOrLeave.toLowerCase().includes('absent') ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                          'bg-slate-50 text-slate-700 border border-slate-100'
                                        }`}>
                                          {memberRecord.absentOrLeave}
                                        </span>
                                      ) : "-"}
                                    </td>
                                    <td className="p-3 font-semibold text-slate-600">{zoneName}</td>
                                  </tr>
                                );
                              } else {
                                return (
                                  <tr key={dateStr} className="bg-white hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 font-semibold text-slate-700 border-r border-slate-150">{displayDate}</td>
                                    <td className="p-3 border-r border-slate-150 text-slate-400 font-mono">-</td>
                                    <td className="p-3 border-r border-slate-150 text-slate-400 font-mono">-</td>
                                    <td className="p-3 border-r border-slate-150 text-slate-400 font-mono">-</td>
                                    <td className="p-3 border-r border-slate-150 text-slate-400 font-mono">-</td>
                                    <td className="p-3 border-r border-slate-150 text-slate-400 font-mono">-</td>
                                    <td className="p-3 border-r border-slate-150">
                                      {isFriday ? <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200">Weekend</span> : "-"}
                                    </td>
                                    <td className="p-3 text-slate-400">-</td>
                                  </tr>
                                );
                              }
                            });
                          })()}
                        </tbody>
                        {/* Footer Total row exactly like the image */}
                        <tfoot>
                          {(() => {
                            const dateRange = (() => {
                              const dates: string[] = [];
                              const start = (() => {
                                const parts = attendanceStartDate.split('-');
                                if (parts.length === 3) {
                                  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                }
                                return new Date(attendanceStartDate);
                              })();
                              const end = (() => {
                                const parts = attendanceEndDate.split('-');
                                if (parts.length === 3) {
                                  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                                }
                                return new Date(attendanceEndDate);
                              })();
                              if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
                              
                              let current = new Date(start);
                              while (current <= end) {
                                const yyyy = current.getFullYear();
                                const mm = String(current.getMonth() + 1).padStart(2, '0');
                                const dd = String(current.getDate()).padStart(2, '0');
                                dates.push(`${yyyy}-${mm}-${dd}`);
                                current.setDate(current.getDate() + 1);
                              }
                              return dates.reverse();
                            })();

                            let totalLateMinutes = 0;
                            let totalWorkingMinutes = 0;

                            dateRange.forEach((dateStr) => {
                              const dayReports = reports.filter(r => r.date === dateStr);
                              for (const report of dayReports) {
                                const found = report.records.find(rec => rec.memberPin === viewedMemberPin);
                                if (found) {
                                  if (found.lateEntry) {
                                    const clean = found.lateEntry.trim();
                                    const matchHHMM = clean.match(/^(\d+):(\d+)$/);
                                    if (matchHHMM) {
                                      totalLateMinutes += parseInt(matchHHMM[1], 10) * 60 + parseInt(matchHHMM[2], 10);
                                    } else {
                                      const parsed = parseInt(clean, 10);
                                      if (!isNaN(parsed)) totalLateMinutes += parsed;
                                    }
                                  }
                                  if (found.workingHour) {
                                    const clean = found.workingHour.trim();
                                    const matchHHMM = clean.match(/^(\d+):(\d+)$/);
                                    if (matchHHMM) {
                                      totalWorkingMinutes += parseInt(matchHHMM[1], 10) * 60 + parseInt(matchHHMM[2], 10);
                                    } else {
                                      const parsed = parseInt(clean, 10);
                                      if (!isNaN(parsed)) totalWorkingMinutes += parsed;
                                    }
                                  }
                                  break;
                                }
                              }
                            });

                            const formatMins = (totalMinutes: number): string => {
                              if (totalMinutes <= 0) return '-';
                              const hrs = Math.floor(totalMinutes / 60);
                              const mins = totalMinutes % 60;
                              return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                            };

                            return (
                              <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800">
                                <td className="p-3 border-r border-slate-150">Total</td>
                                <td className="p-3 border-r border-slate-150"></td>
                                <td className="p-3 border-r border-slate-150"></td>
                                <td className="p-3 border-r border-slate-150 font-mono">{formatMins(totalLateMinutes)}</td>
                                <td className="p-3 border-r border-slate-150"></td>
                                <td className="p-3 border-r border-slate-150 font-mono">{formatMins(totalWorkingMinutes)}</td>
                                <td className="p-3 border-r border-slate-150"></td>
                                <td className="p-3 font-mono text-slate-400">-</td>
                              </tr>
                            );
                          })()}
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Copyright footer style exactly like the image */}
                  <div className="text-center text-[11px] text-slate-400 py-2 border-t border-slate-100">
                    © 2026 - ORG
                  </div>
                </motion.div>
              )}

              {/* Tab 1: ATTENDANCE OVERVIEW */}
              {activeTab === 'attendance' && viewedMemberPin === null && (
                <div className="space-y-6">
                  {/* Header & Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Team Attendance
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Monitor and manage your assigned team members' attendance
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Dates</option>
                {!Array.from(new Set(reportsWithMyTeam.map(r => r.date))).includes(localToday) && (
                  <option value={localToday}>{formatDateLong(localToday)}</option>
                )}
                {Array.from(new Set(reportsWithMyTeam.map(r => r.date))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(d => (
                  <option key={d} value={d}>
                    {formatDateLong(d)}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late Entry">Late Entry</option>
                <option value="Early Leave">Early Leave</option>
                <option value="Finger Punch Missing">Finger Punch Missing</option>
                <option value="< 6hr">&lt; 6hrs</option>
                <option value="< 10hrs">&lt; 10hrs</option>
                <option value="Leave">Leave</option>
              </select>
              
              <button
                onClick={() => {
                  const groupedByDate = reportsWithMyTeam.reduce((acc, report) => {
                    const date = report.date;
                    if (!acc[date]) acc[date] = [];
                    
                    const reportRecords = report.records
                      .filter(r => myTeamPins.includes(r.memberPin))
                      .map(r => ({
                        Date: report.date,
                        Campus: report.campus,
                        PIN: r.memberPin,
                        Name: r.memberName,
                        Status: getEffectiveStatus(r),
                        'Check In': r.checkInTime || '-',
                        'Check Out': r.checkOutTime || '-',
                        Remarks: r.remarks || '-',
                        Notes: r.notes || '-'
                      }));
                      
                    acc[date].push(...reportRecords);
                    return acc;
                  }, {} as Record<string, any[]>);
                  
                  const wb = XLSX.utils.book_new();
                  Object.entries(groupedByDate).forEach(([date, records]) => {
                    const ws = XLSX.utils.json_to_sheet(records);
                    XLSX.utils.book_append_sheet(wb, ws, date);
                  });
                  
                  XLSX.writeFile(wb, `attendance_${filterDate ? filterDate.substring(0, 7) : 'all'}.xlsx`);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Download Excel
              </button>
            </div>
          </div>

          {/* Reports Table list */}
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No attendance reports posted for your team matching this selection</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredReports.map(report => (
                <div key={report.pin} className="bg-white border border-slate-200/80 rounded-3xl shadow-md overflow-hidden hover:border-slate-300 transition-all">
                  {/* Report Header */}
                  <div className="bg-slate-50/70 border-b border-slate-150 p-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2.5 font-semibold text-slate-700">
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-150 shadow-2xs">
                        📍 {report.campus}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500">Date: <strong className="text-slate-800">{formatDateLong(report.date)}</strong></span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Posted by: {report.postedBy}</span>
                  </div>

                  {/* Table of My Team Attendance in this Report */}
                  <div className="p-5">
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-[#f8f9fa] shadow-inner p-1">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px] bg-white border border-[#e0e0e0]">
                          <thead>
                            <tr className="bg-[#f8f9fa] text-[10px] font-black uppercase tracking-wider text-[#3c4043] border-b border-[#e0e0e0]">
                              <th className="p-3 text-center w-12 border border-[#e0e0e0] font-bold">SL</th>
                              <th className="p-3 border border-[#e0e0e0] font-bold">PIN</th>
                              <th className="p-3 border border-[#e0e0e0] font-bold">Full Name</th>
                              <th className="p-3 border border-[#e0e0e0] font-bold">Check-In</th>
                              <th className="p-3 border border-[#e0e0e0] font-bold">Check-Out</th>
                              <th className="p-3 border border-[#e0e0e0] font-bold text-center">W.Hour</th>
                              <th className="p-3 border border-[#e0e0e0] font-bold text-center">Status</th>
                              <th className="p-3 border border-[#e0e0e0] font-bold">Remarks/Notes</th>
                              <th className="p-3 border border-[#e0e0e0] font-bold text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e0e0e0]">
                            {report.records
                              .sort((a, b) => a.memberPin.localeCompare(b.memberPin, undefined, { numeric: true, sensitivity: 'base' }))
                              .map((record, index) => {
                                const existingEdit = getExistingEditRequest(report.pin, record.memberPin);
                                const memberObj = myTeam.find(m => m.pin === record.memberPin);
                                const displayStatus = getEffectiveStatus(record);

                                const hours = calculateWorkingHours(record.checkInTime, record.checkOutTime);
                                const workingHoursDisplay = record.workingHour || (hours !== null ? `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m` : "-");

                                return (
                                  <tr key={record.memberPin} className="hover:bg-slate-50/50 text-slate-700 transition-colors">
                                    <td className="p-3 text-center text-xs font-bold text-slate-400 font-mono border border-[#e0e0e0]">
                                      {index + 1}
                                    </td>
                                    <td className="p-3 text-xs font-bold font-mono text-indigo-600 border border-[#e0e0e0]">
                                      {record.memberPin}
                                    </td>
                                    <td className="p-3 text-xs font-extrabold text-slate-900 border border-[#e0e0e0]">
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const cleanedName = record.memberName ? record.memberName.split('(')[0].trim() : '';
                                          const avatarUser = memberObj 
                                            ? { ...memberObj, name: memberObj.name ? memberObj.name.split('(')[0].trim() : '' }
                                            : { name: cleanedName, pin: record.memberPin, avatarUrl: '' };
                                          return (
                                            <>
                                              <UserAvatar user={avatarUser} size="sm" />
                                              <span>{cleanedName}</span>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </td>
                                    <td className="p-3 text-xs font-semibold font-mono text-slate-600 border border-[#e0e0e0]">
                                      {record.checkInTime || <span className="text-rose-400 italic">Punch Missing</span>}
                                    </td>
                                    <td className="p-3 text-xs font-semibold font-mono text-slate-600 border border-[#e0e0e0]">
                                      {record.checkOutTime || <span className="text-rose-400 italic">Punch Missing</span>}
                                    </td>
                                    <td className="p-3 text-xs font-semibold font-mono text-slate-600 border border-[#e0e0e0] text-center">
                                      {workingHoursDisplay}
                                    </td>
                                    <td className="p-3 text-xs border border-[#e0e0e0] text-center">
                                      <span className={`inline-flex items-center justify-center min-w-[85px] px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-all ${
                                        displayStatus === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        (displayStatus === 'Late' || displayStatus === 'Late Entry') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        displayStatus === 'Early Leave' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        (displayStatus === 'Finger Punch Missing' || displayStatus === '< 6hr' || displayStatus === '< 10hrs') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                        displayStatus === 'Absent' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                        displayStatus === 'Leave' || displayStatus.toLowerCase().includes('leave') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        'bg-slate-50 text-slate-700 border-slate-200'
                                      }`}>
                                        {displayStatus}
                                      </span>
                                    </td>
                                    <td className="p-3 text-xs border border-[#e0e0e0]">
                                      {(record.notes || record.remarks) ? (
                                        <div className="flex flex-wrap gap-1.5 w-full">
                                          {Array.from(new Set(
                                            `${record.remarks || ""} ${record.notes || ""}`
                                            .replace(/\u00a0/g, " ")
                                            .split(/\s*\|\s*|(?=\b(?:IN|OUT):)/i)
                                            .map(p => p.trim())
                                            .filter(Boolean)
                                          )).map((trimmed, idx) => {
                                             const isIn = /^IN:/i.test(trimmed);
                                             const isOut = /^OUT:/i.test(trimmed);
                                             const isFingerPunchMissing = /Finger Punch Missing/i.test(trimmed);
                                             const cleanText = trimmed.replace(/^(IN|OUT):/i, "").trim().replace(/।/g, '');
                                             
                                             if (!cleanText && (isIn || isOut)) return null;

                                             return (
                                               <div 
                                                 key={`${cleanText}-${idx}`} 
                                                 className={`flex items-start gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
                                                   isFingerPunchMissing 
                                                     ? "bg-red-50 text-red-700 border-red-100 font-medium" 
                                                     : "bg-white/50 text-slate-600 border-slate-100/50"
                                                 }`}
                                               >
                                                 {isIn && <span className="font-bold text-blue-600 shrink-0 text-[8px] uppercase">IN:</span>}
                                                 {isOut && <span className="font-bold text-amber-600 shrink-0 text-[8px] uppercase">OUT:</span>}
                                                 <span className="leading-tight text-slate-600 italic">"{cleanText}"</span>
                                               </div>
                                             );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">-</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-xs border border-[#e0e0e0] text-center">
                                      {existingEdit ? (
                                        <div className="flex flex-col items-center justify-center gap-1 font-bold">
                                          {existingEdit.status === 'Pending' ? (
                                            <span className="inline-flex items-center gap-1 text-indigo-600 text-[11px] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                              <Clock className="w-3 h-3 shrink-0" />
                                              Pending
                                            </span>
                                          ) : existingEdit.status === 'Approved' ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                                              Approved
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-rose-600 text-[11px] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                              <AlertCircle className="w-3 h-3 shrink-0" />
                                              Rejected
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setShowEditRequestFormFor({
                                              reportPin: report.pin,
                                              memberPin: record.memberPin,
                                              memberName: record.memberName,
                                              date: report.date,
                                              currentStatus: getEffectiveStatus(record),
                                              currentCheckIn: record.checkInTime || '',
                                              currentCheckOut: record.checkOutTime || ''
                                            });
                                            setEditRequestedStatus(getEffectiveStatus(record) as AttendanceStatus);
                                            setEditRequestedCheckIn(record.checkInTime || '');
                                            setEditRequestedCheckOut(record.checkOutTime || '');
                                            setEditRequestReason('');
                                          }}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-3xs"
                                          title="Apply for Adjustment"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                          <span>Apply for Adjustment</span>
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

              {/* Tab: LEAVE REQUESTS */}
              {activeTab === 'leaves' && viewedMemberPin === null && (() => {
        const filteredAndSortedLeaves = (() => {
          let list = leaveRequests.filter(req => {
            // Access control
            const hasAccess = req.coordinatorPin === currentMentor.pin || visibleMemberPins.includes(req.memberPin);
            if (!hasAccess) return false;

            // PIN / Name search
            const matchesSearch = !leaveSearchPin || 
              req.memberPin.includes(leaveSearchPin) || 
              req.memberName.toLowerCase().includes(leaveSearchPin.toLowerCase());
            if (!matchesSearch) return false;

            // Status filter
            const matchesStatus = leaveFilterStatus === 'All' || req.status === leaveFilterStatus;
            if (!matchesStatus) return false;

            // Leave Type filter
            const matchesType = leaveFilterType === 'All' || req.leaveType === leaveFilterType;
            if (!matchesType) return false;

            // Month filter
            const leaveStartMonth = req.startDate ? req.startDate.substring(0, 7) : '';
            const leaveEndMonth = req.endDate ? req.endDate.substring(0, 7) : '';
            const matchesMonth = leaveFilterMonth === 'All' || 
              leaveStartMonth === leaveFilterMonth || 
              leaveEndMonth === leaveFilterMonth;
            if (!matchesMonth) return false;

            return true;
          });

          // Sort list
          list = [...list].sort((a, b) => {
            const d1_a = new Date(a.startDate).getTime();
            const d2_a = new Date(a.endDate).getTime();
            const dur_a = d2_a - d1_a;

            const d1_b = new Date(b.startDate).getTime();
            const d2_b = new Date(b.endDate).getTime();
            const dur_b = d2_b - d1_b;

            if (leaveSortBy === 'newest') {
              return d1_b - d1_a; // Start date descending
            } else if (leaveSortBy === 'oldest') {
              return d1_a - d1_b; // Start date ascending
            } else if (leaveSortBy === 'duration_desc') {
              return dur_b - dur_a; // Duration descending
            } else if (leaveSortBy === 'duration_asc') {
              return dur_a - dur_b; // Duration ascending
            } else if (leaveSortBy === 'name_asc') {
              return a.memberName.localeCompare(b.memberName);
            }
            return 0;
          });

          return list;
        })();

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                  <ClipboardPlus className="w-5 h-5 text-indigo-500" />
                  Leave Requests
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Manage and track submitted leave requests.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    setLeaveMemberPin(currentMentor.pin);
                    setLeaveStartDate(new Date().toISOString().split('T')[0]);
                    setLeaveEndDate(new Date().toISOString().split('T')[0]);
                    setLeaveType('Casual Leave');
                    setLeaveReason('');
                    setMemberSearchQuery('');
                    setShowLeaveRequestForm(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs hover:shadow-md"
                >
                  <ClipboardPlus className="w-4 h-4" />
                  New Leave Request
                </button>
              </div>
            </div>

            {/* Leave Requests Table */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Search Member</label>
                      <input
                        type="text"
                        placeholder="Search PIN or Name..."
                        value={leaveSearchPin}
                        onChange={(e) => setLeaveSearchPin(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-300 font-semibold text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Filter Status</label>
                      <select
                        value={leaveFilterStatus}
                        onChange={(e) => setLeaveFilterStatus(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-300 font-semibold text-slate-700"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Filter Leave Type</label>
                      <select
                        value={leaveFilterType}
                        onChange={(e) => setLeaveFilterType(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-300 font-semibold text-slate-700"
                      >
                        <option value="All">All Leave Types</option>
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Medical Leave">Medical Leave</option>
                        <option value="Special Leave">Special Leave</option>
                        <option value="Paternity Leave">Paternity Leave</option>
                        <option value="Maternity Leave">Maternity Leave</option>
                        <option value="Earn Leave">Earn Leave</option>
                        <option value="Weekend Adjustment">Weekend Adjustment</option>
                        <option value="Holiday Adjustment">Holiday Adjustment</option>
                        <option value="Other Leave">Other Leave</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Filter Month</label>
                      <select
                        value={leaveFilterMonth}
                        onChange={(e) => setLeaveFilterMonth(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-300 font-semibold text-slate-700 font-sans"
                      >
                        <option value="All">All Months</option>
                        {(() => {
                          const uniqueMonths = Array.from(new Set(
                            leaveRequests
                              .filter(req => req.startDate)
                              .map(req => req.startDate.substring(0, 7))
                          ));
                          const currentMonthStr = localToday.substring(0, 7);
                          if (!uniqueMonths.includes(currentMonthStr)) {
                            uniqueMonths.push(currentMonthStr);
                          }
                          uniqueMonths.sort((a, b) => b.localeCompare(a));
                          
                          const formatMonthYearStr = (ym: string) => {
                            const [year, month] = ym.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                            return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                          };

                          return uniqueMonths.map(ym => (
                            <option key={ym} value={ym}>
                              {formatMonthYearStr(ym)}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-mono">Sort By</label>
                      <select
                        value={leaveSortBy}
                        onChange={(e) => setLeaveSortBy(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-300 font-semibold text-slate-700"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="duration_desc">Duration (High to Low)</option>
                        <option value="duration_asc">Duration (Low to High)</option>
                        <option value="name_asc">Name (A-Z)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {filteredAndSortedLeaves.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 text-center text-slate-400 text-xs font-semibold">
                  No leave requests found
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-[#f8f9fa] shadow-inner p-1">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1200px] bg-white border border-[#e0e0e0]">
                        <thead>
                          <tr className="bg-[#f8f9fa] text-[10px] font-black uppercase tracking-wider text-[#3c4043] border-b border-[#e0e0e0]">
                            <th className="p-2 text-center w-12 border border-[#e0e0e0] font-bold">SL</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">Name</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">Pin</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">From</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">To</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold text-center">Days</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">Reason</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">Responsible Person Name</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">Responsible Person PIN</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold w-40 min-w-[160px]">Leave Type</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">Status</th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">Remarks</th>
                            <th className="p-2 text-center w-28 border border-[#e0e0e0] font-bold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e0e0e0]">
                          {filteredAndSortedLeaves.map((req, index) => {
                            const d1 = new Date(req.startDate);
                            const d2 = new Date(req.endDate);
                            const diffTime = Math.abs(d2.getTime() - d1.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                            return (
                              <tr key={req.pin} className="hover:bg-slate-50/50 text-slate-700 transition-colors">
                                <td className="p-2 text-center text-[10px] font-black text-slate-400 font-mono border border-[#e0e0e0]">
                                  {index + 1}
                                </td>
                                <td className="p-2 text-[11px] border border-[#e0e0e0] font-bold text-slate-900">
                                  {req.memberName}
                                </td>
                                <td className="p-2 text-[11px] border border-[#e0e0e0] font-mono font-bold text-slate-600">
                                  {req.memberPin}
                                </td>
                                <td className="p-2 text-[11px] border border-[#e0e0e0] font-medium text-slate-600">
                                  {formatDateLong(req.startDate)}
                                </td>
                                <td className="p-2 text-[11px] border border-[#e0e0e0] font-medium text-slate-600">
                                  {formatDateLong(req.endDate)}
                                </td>
                                <td className="p-2 text-[11px] border border-[#e0e0e0] font-black text-center text-slate-800 font-mono">
                                  {diffDays}
                                </td>
                                <td className="p-2 text-[11px] border border-[#e0e0e0]">
                                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed max-w-[200px] truncate" title={req.reason}>
                                    "{req.reason}"
                                  </p>
                                </td>
                                <td className="p-2 text-[11px] border border-[#e0e0e0] font-medium text-slate-800">
                                  {req.responsiblePersonName || (
                                    <span className="text-slate-400 font-medium italic">N/A</span>
                                  )}
                                </td>
                                <td className="p-2 text-[11px] border border-[#e0e0e0] font-mono text-slate-600">
                                  {req.responsiblePersonPin || (
                                    <span className="text-slate-400 font-medium italic font-mono">N/A</span>
                                  )}
                                </td>
                                <td className="p-2 text-[11px] border border-[#e0e0e0] w-40 min-w-[160px]">
                                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider block text-center whitespace-nowrap font-mono">
                                    {req.leaveType}
                                  </span>
                                </td>
                                <td className="p-2 text-[11px] font-semibold border border-[#e0e0e0]">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                    req.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                    req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                    'bg-rose-100 text-rose-800 border-rose-200'
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="p-2 text-[11px] border border-[#e0e0e0]">
                                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                                    {req.managerComment || <span className="text-slate-300">No comment yet</span>}
                                  </p>
                                </td>
                                <td className="p-2 text-center border border-[#e0e0e0]">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {req.status === 'Pending' && (
                                      <>
                                        <button
                                          onClick={() => startEditLeave(req)}
                                          className="p-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                          title="Edit via Modal"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setConfirmDeleteLeavePin(req.pin);
                                          }}
                                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                          title="Delete"
                                        >
                                          <Trash className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

          {/* Attendance Edit Request Overlay Form Dialog */}
          <AnimatePresence>
            {showEditRequestFormFor && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-md font-bold text-slate-800">Attendance Edit Request</h3>
                      <p className="text-xs text-slate-400 font-medium">Submit an attendance edit request to the manager on behalf of the team member</p>
                    </div>
                    <button
                      onClick={() => setShowEditRequestFormFor(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                    <p><strong>Team Member:</strong> {showEditRequestFormFor.memberName}</p>
                    <p><strong>Date:</strong> {showEditRequestFormFor.date}</p>
                    <p><strong>Current Time:</strong> {showEditRequestFormFor.currentCheckIn || 'missing'} - {showEditRequestFormFor.currentCheckOut || 'missing'}</p>
                    <p><strong>Current Status:</strong> <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold">{showEditRequestFormFor.currentStatus}</span></p>
                  </div>

                  <form onSubmit={handleEditRequestSubmit} className="space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Check-In Time</label>
                        <ClockInput
                          value={editRequestedCheckIn}
                          onChange={(val) => setEditRequestedCheckIn(val)}
                          placeholder="e.g. 09:00 AM"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Check-Out Time</label>
                        <ClockInput
                          value={editRequestedCheckOut}
                          onChange={(val) => setEditRequestedCheckOut(val)}
                          placeholder="e.g. 06:00 PM"
                        />
                      </div>
                    </div>

                    {/* Live Clock Logic Display */}
                    <div>
                      {mentorWorkingHoursText && (
                        <div className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-150 px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          {mentorWorkingHoursText}
                        </div>
                      )}
                      {mentorWorkingHoursError && (
                        <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-150 px-3 py-2 rounded-xl flex items-center gap-1.5 leading-normal shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          {mentorWorkingHoursError}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Comment / Reason</label>
                      <textarea
                        required
                        rows={3}
                        value={editRequestReason}
                        onChange={(e) => setEditRequestReason(e.target.value)}
                        placeholder="Enter valid reason or comment for editing attendance..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowEditRequestFormFor(null)}
                        className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        Submit Request
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Leave Request Overlay Form Dialog */}
          <AnimatePresence>
            {showLeaveRequestForm && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-md font-bold text-slate-800">New Leave Request</h3>
                      <p className="text-xs text-slate-400 font-medium">Submit a leave request on behalf of a team member to the manager's panel</p>
                    </div>
                    <button
                      onClick={() => setShowLeaveRequestForm(false)}
                      className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </div>

                    <form onSubmit={handleLeaveRequestSubmit} className="space-y-4 text-left">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">Select Member</label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Type PIN or Name to filter..."
                            value={memberSearchQuery}
                            onChange={(e) => {
                              const query = e.target.value;
                              setMemberSearchQuery(query);
                              
                              // Auto select first match if possible
                              const queryLower = query.toLowerCase();
                              const matches = (p: string, n: string) => !query || p.toLowerCase().includes(queryLower) || n.toLowerCase().includes(queryLower);
                              
                              let firstMatch = '';
                              if (matches(currentMentor.pin, currentMentor.name)) {
                                firstMatch = currentMentor.pin;
                              } else {
                                const otherCoordinators = campusCoordinators.filter(c => c.pin !== currentMentor.pin);
                                const matchedCoord = otherCoordinators.find(c => matches(c.pin, c.name));
                                if (matchedCoord) {
                                  firstMatch = matchedCoord.pin;
                                } else {
                                  const matchedMember = baseCampusMembers.find(m => matches(m.pin, m.name));
                                  if (matchedMember) {
                                    firstMatch = matchedMember.pin;
                                  }
                                }
                              }
                              if (firstMatch) {
                                setLeaveMemberPin(firstMatch);
                              }
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 font-medium"
                          />
                          <select
                            value={leaveMemberPin}
                            onChange={(e) => setLeaveMemberPin(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none font-semibold text-indigo-600 font-mono"
                          >
                            {(() => {
                              const uniquePeopleMap = new Map<string, any>();
                              uniquePeopleMap.set(currentMentor.pin, currentMentor);
                              campusCoordinators.forEach(c => uniquePeopleMap.set(c.pin, c));
                              baseCampusMembers.forEach(m => uniquePeopleMap.set(m.pin, m));
                              
                              const combined = Array.from(uniquePeopleMap.values());
                              const filtered = combined.filter(p => 
                                !memberSearchQuery || 
                                p.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                                p.pin.includes(memberSearchQuery)
                              );

                              return filtered.map(p => (
                                <option key={p.pin} value={p.pin}>
                                  {p.name} (PIN: {p.pin})
                                </option>
                              ));
                            })()}
                          </select>
                        </div>
                      </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">Start Date</label>
                        <input
                          type="date"
                          required
                          value={leaveStartDate}
                          onChange={(e) => setLeaveStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">End Date</label>
                        <input
                          type="date"
                          required
                          value={leaveEndDate}
                          onChange={(e) => setLeaveEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">Leave Type</label>
                        <select
                          value={leaveType}
                          onChange={(e) => setLeaveType(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none font-semibold text-slate-700"
                        >
                          <option value="Casual Leave">Casual Leave</option>
                          <option value="Medical Leave">Medical Leave</option>
                          <option value="Special Leave">Special Leave</option>
                          <option value="Paternity Leave">Paternity Leave</option>
                          <option value="Maternity Leave">Maternity Leave</option>
                          <option value="Earn Leave">Earn Leave</option>
                          <option value="Weekend Adjustment">Weekend Adjustment</option>
                          <option value="Holiday Adjustment">Holiday Adjustment</option>
                          <option value="Other Leave">Other Leave</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">
                          Responsible Person (Reference)
                        </label>
                        <select
                          value={leaveResponsiblePin}
                          onChange={(e) => setLeaveResponsiblePin(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none font-semibold text-slate-700"
                        >
                          <option value="">-- Select Responsible Person --</option>
                          {getEligibleResponsiblePeople(leaveMemberPin, leaveStartDate, leaveEndDate).map(p => {
                            return (
                              <option 
                                key={p.pin} 
                                value={p.pin} 
                                disabled={p.isOnLeave}
                                className={p.isOnLeave ? "text-slate-400 bg-slate-50 italic" : "text-slate-800"}
                              >
                                {p.name} (PIN: {p.pin}){p.isOnLeave ? " - (On Leave/Unavailable)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">Reason for Leave</label>
                      <textarea
                        required
                        rows={3}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="Please specify the reason for the leave..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowLeaveRequestForm(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs hover:bg-slate-50 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs hover:shadow-md"
                      >
                        <Send className="w-3 h-3" />
                        Submit Leave Request
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Edit Leave Request Overlay Modal */}
          <AnimatePresence>
            {editingLeavePin && leaveEditForm && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-md font-bold text-slate-800">Edit Leave Request</h3>
                      <p className="text-xs text-slate-400 font-medium">Update the leave request details for {leaveEditForm.memberName}</p>
                    </div>
                    <button
                      onClick={() => setEditingLeavePin(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">Member Information</label>
                      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                        {leaveEditForm.memberName} (PIN: {leaveEditForm.memberPin})
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">Start Date</label>
                        <input
                          type="date"
                          required
                          value={leaveEditForm.startDate || ''}
                          onChange={(e) => setLeaveEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">End Date</label>
                        <input
                          type="date"
                          required
                          value={leaveEditForm.endDate || ''}
                          onChange={(e) => setLeaveEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">Leave Type</label>
                        <select
                          value={leaveEditForm.leaveType || 'Casual Leave'}
                          onChange={(e) => setLeaveEditForm(prev => ({ ...prev, leaveType: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none font-semibold text-slate-700"
                        >
                          <option value="Casual Leave">Casual Leave</option>
                          <option value="Medical Leave">Medical Leave</option>
                          <option value="Special Leave">Special Leave</option>
                          <option value="Paternity Leave">Paternity Leave</option>
                          <option value="Maternity Leave">Maternity Leave</option>
                          <option value="Earn Leave">Earn Leave</option>
                          <option value="Weekend Adjustment">Weekend Adjustment</option>
                          <option value="Holiday Adjustment">Holiday Adjustment</option>
                          <option value="Other Leave">Other Leave</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">
                          Responsible Person (Reference)
                        </label>
                        <select
                          value={leaveEditForm.responsiblePersonPin || ''}
                          onChange={(e) => setLeaveEditForm(prev => ({ ...prev, responsiblePersonPin: e.target.value }))}
                          disabled={!!leaveEditForm.pin}
                          className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none font-semibold text-slate-700 ${leaveEditForm.pin ? 'bg-slate-50 cursor-not-allowed opacity-75' : ''}`}
                        >
                          <option value="">-- Select Responsible Person --</option>
                          {getEligibleResponsiblePeople(
                            leaveEditForm.memberPin || '',
                            leaveEditForm.startDate || '',
                            leaveEditForm.endDate || '',
                            leaveEditForm.pin
                          ).map(p => {
                            return (
                              <option 
                                key={p.pin} 
                                value={p.pin} 
                                disabled={p.isOnLeave}
                                className={p.isOnLeave ? "text-slate-400 bg-slate-50 italic" : "text-slate-800"}
                              >
                                {p.name} (PIN: {p.pin}){p.isOnLeave ? " - (On Leave/Unavailable)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">Reason for Leave</label>
                      <textarea
                        required
                        rows={3}
                        value={leaveEditForm.reason || ''}
                        onChange={(e) => setLeaveEditForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Please specify the reason for the leave..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingLeavePin(null)}
                        className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs hover:bg-slate-50 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEditLeave}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs hover:shadow-md"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

      {/* Tab: CAMPUS MEMBERS DIRECTORY */}
      {activeTab === 'members' && viewedMemberPin === null && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                Campus Members Directory
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                List of all registered members and coordinators in your campus.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
              <input
                type="text"
                placeholder="Search by Name or PIN..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:border-indigo-300 w-48 font-mono"
              />
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-md overflow-hidden p-5">
            {campusMembers.filter(m => 
              m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
              m.pin.includes(memberSearch) || 
              m.email.toLowerCase().includes(memberSearch.toLowerCase())
            ).length === 0 ? (
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-12 text-center text-slate-400 text-xs font-semibold">
                No campus members found.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-[#f8f9fa] shadow-inner p-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px] bg-white border border-[#e0e0e0]">
                    <thead>
                      <tr className="bg-[#f8f9fa] text-[10px] font-black uppercase tracking-wider text-[#3c4043] border-b border-[#e0e0e0]">
                        <th className="p-3 text-center w-12 border border-[#e0e0e0] font-bold">SL</th>
                        <th className="p-3 border border-[#e0e0e0] font-bold">PIN</th>
                        <th className="p-3 border border-[#e0e0e0] font-bold">Full Name</th>
                        <th className="p-3 border border-[#e0e0e0] font-bold">Email</th>
                        <th className="p-3 border border-[#e0e0e0] font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {campusMembers
                        .filter(m => 
                          m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                          m.pin.includes(memberSearch) || 
                          m.email.toLowerCase().includes(memberSearch.toLowerCase())
                        )
                        .sort((a, b) => a.pin.localeCompare(b.pin, undefined, { numeric: true, sensitivity: 'base' }))
                        .map((m, index) => {
                          return (
                            <tr 
                              key={m.pin} 
                              onClick={() => {
                                navigate(`/attendance/${m.pin}`);
                              }}
                              className="hover:bg-indigo-50/50 cursor-pointer text-slate-700 transition-colors"
                            >
                              <td className="p-3 text-center text-xs font-bold text-slate-400 font-mono border border-[#e0e0e0]">
                                {index + 1}
                              </td>
                              <td className="p-3 text-xs font-bold font-mono text-indigo-600 border border-[#e0e0e0]">
                                {m.pin}
                              </td>
                              <td className="p-3 text-xs font-extrabold text-slate-900 border border-[#e0e0e0]">
                                <div className="flex items-center gap-2">
                                  <UserAvatar user={m} size="sm" />
                                  <div className="flex flex-col">
                                    <span>{m.name}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-xs text-slate-500 font-medium border border-[#e0e0e0]">
                                {m.email}
                              </td>
                              <td className="p-3 text-xs border border-[#e0e0e0]">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                                  m.isActive !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    m.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`} />
                                  {m.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: NOTICE BOARD PUBLISHING */}
      {visibleTabs.length > 0 && activeTab === 'notices' && allowedPerms.includes('mentor_notices') && viewedMemberPin === null && (
        <div>
          <NoticeBoard
            notices={notices}
            onAddNotice={onAddNotice}
            onUpdateNotice={onUpdateNotice}
            onDeleteNoticeRequest={onDeleteNotice}
            canPost={allowedPerms.includes('mentor_post_notice')}
            currentUser={{ name: currentMentor.name, role: 'mentor', pin: currentMentor.pin }}
            campuses={campuses?.map(c => c.name)}
          />
        </div>
      )}

      {/* Tab Emails: Inbox */}
      {activeTab === 'emails' && allowedPerms.includes('mentor_emails') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden min-h-[500px] flex flex-col">
            <div className="bg-slate-50/70 border-b border-slate-150 px-6 py-5">
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Secure Portal Messenger (সিকিউর পোর্টাল মেসেঞ্জার)
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

      {/* Tab 3: SUBMITTED FEEDBACK HISTORY */}
      {visibleTabs.length > 0 && activeTab === 'edit_requests' && allowedPerms.includes('mentor_history') && viewedMemberPin === null && (
        <div className="space-y-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5 mb-6">
              <Clock className="w-5.5 h-5.5 text-indigo-500" />
              Attendance Adjustment Requests
            </h2>

            {attendanceEditRequests.filter(req => req.coordinatorPin === currentMentor.pin).length === 0 ? (
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-12 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-slate-600">No adjustment requests sent</p>
                <p className="text-xs text-slate-400 mt-1">Your sent adjustment requests and manager's comments will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                      <th className="p-4 w-12 text-center">#</th>
                      <th className="p-4">PIN & Date</th>
                      <th className="p-4">Member & Date</th>
                      <th className="p-4">Requested Times</th>
                      <th className="p-4">Comments & Response</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {attendanceEditRequests
                      .filter(req => req.coordinatorPin === currentMentor.pin)
                      .map((req, index) => {
                        const isEditing = editingReqPin === req.pin;
                        return (
                          <tr key={req.pin} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-xs font-mono text-slate-400 text-center">{index + 1}</td>
                            <td className="p-4">
                              <div className="space-y-1">
                                <span className="text-xs font-mono font-bold text-slate-700">#{req.pin}</span>
                                <span className="block text-[10px] text-slate-400 font-medium">
                                  {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-800">{req.memberName}</p>
                                <span className="block text-[10px] bg-indigo-50 border border-indigo-100/50 text-indigo-700 font-bold px-1.5 py-0.5 rounded-md inline-block">
                                  📆 {formatDateLong(req.date)}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Status:</label>
                                    <select
                                      value={reqEditForm.requestedStatus || 'Present'}
                                      onChange={(e) => setReqEditForm(prev => ({ ...prev, requestedStatus: e.target.value as AttendanceStatus }))}
                                      className="px-2 py-1 rounded border border-indigo-200 focus:outline-none text-xs font-bold bg-white w-full uppercase"
                                    >
                                      <option value="Present">Present</option>
                                      <option value="Absent">Absent</option>
                                      <option value="Leave">Leave</option>
                                      <option value="Late">Late</option>
                                      <option value="< 6hr">&lt; 6hrs</option>
                                      <option value="Half Day">Half Day</option>
                                    </select>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 block mb-0.5">In:</span>
                                      <input
                                        type="text"
                                        value={reqEditForm.requestedCheckIn || ''}
                                        onChange={(e) => setReqEditForm(prev => ({ ...prev, requestedCheckIn: e.target.value }))}
                                        className="w-full px-1.5 py-1 border border-indigo-200 rounded text-xs bg-white focus:outline-none focus:border-indigo-500 font-mono"
                                        placeholder="09:00 AM"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 block mb-0.5">Out:</span>
                                      <input
                                        type="text"
                                        value={reqEditForm.requestedCheckOut || ''}
                                        onChange={(e) => setReqEditForm(prev => ({ ...prev, requestedCheckOut: e.target.value }))}
                                        className="w-full px-1.5 py-1 border border-indigo-200 rounded text-xs bg-white focus:outline-none focus:border-indigo-500 font-mono"
                                        placeholder="06:00 PM"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/50 px-1.5 py-0.5 rounded text-[10px] font-black uppercase inline-block">
                                    {req.requestedStatus}
                                  </span>
                                  {req.requestedCheckIn && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-1 rounded">In:</span>
                                      <span className="font-mono text-indigo-600 font-bold">{req.requestedCheckIn}</span>
                                    </div>
                                  )}
                                  {req.requestedCheckOut && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-1 rounded">Out:</span>
                                      <span className="font-mono text-indigo-600 font-bold">{req.requestedCheckOut}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-xs">
                              {isEditing ? (
                                <div className="space-y-1 max-w-sm">
                                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">My Comment / Reason:</label>
                                  <textarea
                                    rows={2}
                                    value={reqEditForm.reason || ''}
                                    onChange={(e) => setReqEditForm(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full px-2 py-1.5 border border-indigo-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Enter reason..."
                                  />
                                </div>
                              ) : (
                                <div className="space-y-2 max-w-sm lg:max-w-md">
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="font-extrabold text-slate-400 block text-[8px] uppercase tracking-wider">My Comment:</span>
                                    <p className="text-slate-600 italic">"{req.reason}"</p>
                                  </div>
                                  {req.managerComment && (
                                    <div className="bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/50">
                                      <span className="font-extrabold text-indigo-800 block text-[8px] uppercase tracking-wider">Manager Response:</span>
                                      <p className="text-slate-700 italic">"{req.managerComment}"</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-xs text-center">
                              <span className={`inline-flex items-center justify-center min-w-[80px] px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                                req.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={saveEditRequest}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-colors"
                                    title="Save"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingReqPin(null)}
                                    className="p-1.5 bg-slate-500 hover:bg-slate-600 text-white rounded-lg cursor-pointer transition-colors"
                                    title="Cancel"
                                  >
                                    <AlertCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  {req.status === 'Pending' && (
                                    <>
                                      <button
                                        onClick={() => startEditRequest(req)}
                                        className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                        title="Edit"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteEditReqPin(req.pin)}
                                        className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                        title="Delete"
                                      >
                                        <Trash className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
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
        </div>
      )}

      {/* Tab 5: PROFILE SETTINGS */}
      {activeTab === 'profile' && viewedMemberPin === null && (
        <div>
          <ProfileSettings
            currentUser={currentMentor}
            userRole="mentor"
            profileRequests={profileRequests}
            onSubmitProfileRequest={onSubmitProfileRequest}
            onInstantUpdate={onInstantUpdate}
          />
        </div>
      )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteLeavePin}
        onClose={() => setConfirmDeleteLeavePin(null)}
        onConfirm={() => {
          if (confirmDeleteLeavePin) onDeleteLeaveRequest?.(confirmDeleteLeavePin);
          setConfirmDeleteLeavePin(null);
        }}
        title="Delete Leave Request"
        message="Are you sure you want to delete this leave request? This action cannot be undone."
      />
      <ConfirmModal
        isOpen={!!confirmDeleteEditReqPin}
        onClose={() => setConfirmDeleteEditReqPin(null)}
        onConfirm={() => {
          if (confirmDeleteEditReqPin) onDeleteAttendanceEditRequest?.(confirmDeleteEditReqPin);
          setConfirmDeleteEditReqPin(null);
        }}
        title="Delete Edit Request"
        message="Are you sure you want to delete this edit request? This action cannot be undone."
      />
    </div>
  );
}
