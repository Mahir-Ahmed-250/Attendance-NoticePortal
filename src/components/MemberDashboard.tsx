import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  TeamMember,
  Mentor,
  AttendanceReport,
  AttendanceFeedback,
  Notice,
  AttendanceStatus,
  EmailMessage,
  ProfileRequest,
  User as UserType,
  LeaveRequest,
  AttendanceEditRequest,
  Campus,
  Branch,
} from "../types";
import PermissionManagementView from "./PermissionManagementView";
import MemberManagementView from "./MemberManagementView";
import { getEffectiveStatus, parseTimeToMinutes } from "../utils";
import {
  Calendar,
  User,
  ShieldCheck,
  MapPin,
  Award,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  Mail,
  Inbox,
  Download,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Menu,
  X,
  Bell,
  Check,
  Settings,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Edit3,
  Phone,
} from "lucide-react";
import { api } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import ProfileSettings from "./ProfileSettings";
import NoticeBoard from "./NoticeBoard";
import CallManagement from "./CallManagement";
import ClockInput from "./ClockInput";
import * as XLSX from "xlsx";

interface MemberDashboardProps {
  currentMember: TeamMember;
  mentors: Mentor[];
  members: TeamMember[];
  reports: AttendanceReport[];
  feedbacks: AttendanceFeedback[];
  notices: Notice[];
  onAddNotice: (notice: Notice) => void;
  onUpdateNotice: (notice: Notice) => void;
  onDeleteNoticeRequest: (noticeId: string) => void;
  profileRequests: ProfileRequest[];
  onSubmitProfileRequest: (requestedName: string, requestedPin: string, requestedEmail?: string) => void;
  onInstantUpdate: (updatedFields: Partial<UserType>) => void;
  leaveRequests: LeaveRequest[];
  onSubmitLeaveRequest: (req: LeaveRequest) => void;
  attendanceEditRequests: AttendanceEditRequest[];
  onSubmitAttendanceEditRequest: (req: AttendanceEditRequest) => void;
  emails: EmailMessage[];
  onMarkEmailAsRead: (emailPin: string) => void;
  onMarkAllEmailsAsRead?: (userPin: string) => void;
  campuses: Campus[];
  branches: Branch[];
  onAddBranch: (name: string) => void;
  onUpdateBranch: (id: string, data: Partial<Branch>) => void;
  onDeleteBranch: (id: string) => void;
  onAssignBranchesToCampus: (campusId: string, branchIds: string[]) => void;
  onUnassignBranch: (branchId: string) => void;
  onUpdateMember?: (pin: string, updatedMember: TeamMember) => void;
  onUpdateMentor?: (pin: string, updatedMentor: Mentor) => void;
  onAddMember?: (member: TeamMember) => void;
  onDeleteMember?: (pin: string) => void;
  onAddMentor?: (mentor: Mentor) => void;
  onDeleteMentor?: (pin: string) => void;
  onRefreshEmails?: () => void;
}

export default function MemberDashboard({
  currentMember,
  mentors,
  members,
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
  onMarkEmailAsRead,
  onMarkAllEmailsAsRead,
  campuses,
  branches,
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch,
  onAssignBranchesToCampus,
  onUnassignBranch,
  onUpdateMember,
  onUpdateMentor,
  onAddMember,
  onDeleteMember,
  onAddMentor,
  onDeleteMentor,
  onRefreshEmails,
}: MemberDashboardProps) {
  const allowedPerms =
    currentMember.permissions && currentMember.permissions.length > 0
      ? currentMember.permissions
      : ["member_attendance", "member_notices", "member_emails"];

  const [activeTab, setActiveTab] = useState<
    | "attendance"
    | "notices"
    | "profile"
    | "leave_requests"
    | "emails"
    | "campus_settings"
    | "call-management"
    | "permissions"
    | "members"
  >(() => {
    if (allowedPerms.includes("member_attendance")) return "attendance";
    if (allowedPerms.includes("member_notices")) return "notices";
    if (allowedPerms.includes("member_emails")) return "emails";
    if (
      allowedPerms.includes("manage_members") ||
      allowedPerms.includes("mentor_members")
    )
      return "members";
    if (allowedPerms.includes("manage_campus_settings"))
      return "campus_settings";
    return "call-management"; // Allow members to see their calls
  });
  const [memberSearch, setMemberSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => window.innerWidth > 1024,
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationActiveTab, setNotificationActiveTab] =
    useState<"notices">("notices");
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [filterMonth, setFilterMonth] = useState("");

  // Leave Request Form States
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveType, setLeaveType] =
    useState<LeaveRequest["leaveType"]>("Casual Leave");
  const [leaveReason, setLeaveReason] = useState("");

  // Attendance Adjustment Form States
  const [adjDate, setAdjDate] = useState("");
  const [adjRequestedStatus, setAdjRequestedStatus] =
    useState<AttendanceStatus>("Present");
  const [adjReason, setAdjReason] = useState("");
  const [adjCheckIn, setAdjCheckIn] = useState("");
  const [adjCheckOut, setAdjCheckOut] = useState("");

  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [selectedCampusForBranches, setSelectedCampusForBranches] =
    useState<Campus | null>(null);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");

  const getAttendanceRangeText = (dateStr: string) => {
    if (!dateStr)
      return "Time Range(YYYY-MM-DD 06:00 AM To YYYY-MM-DD 05:59 AM)";
    const parts = dateStr.split("-");
    if (parts.length !== 3)
      return `Time Range(${dateStr} 06:00 AM To ... 05:59 AM)`;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const d = new Date(year, month, day);
    const nextD = new Date(year, month, day + 1);

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    return `Time Range(${formatDate(d)} 06:00 AM To ${formatDate(nextD)} 05:59 AM)`;
  };

  // Find their assigned mentor
  const assignedMentor = mentors.find((m) => m.pin === currentMember.mentorPin);

  const memberPinLower = (currentMember.pin || "").trim().toLowerCase();
  const memberEmailLower = (currentMember.email || "").trim().toLowerCase();

  // Get emails for this team member
  const myEmails = emails.filter((e) => {
    const rPin = (e.recipientPin || "").trim().toLowerCase();
    const toEm = (e.toEmail || "").trim().toLowerCase();

    return (
      (rPin && rPin === memberPinLower) ||
      (toEm && memberEmailLower && toEm === memberEmailLower) ||
      (toEm && toEm === `${memberPinLower}@portal.com`) ||
      (toEm && toEm === memberPinLower)
    );
  });
  const unreadEmailCount = myEmails.filter((e) => !e.isRead).length;

  const [readNotifications, setReadNotifications] = useState<string[]>(
    currentMember.readNotifications || [],
  );

  useEffect(() => {
    if (currentMember.readNotifications) {
      setReadNotifications(currentMember.readNotifications);
    }
  }, [currentMember.readNotifications]);

  const myFilteredNotices = notices.filter((n) => {
    if (!n.campus || n.campus === "all") return true;
    return n.campus === currentMember.campus;
  });

  const unreadNoticeCount = myFilteredNotices.filter(
    (n) => !readNotifications.includes(n.pin),
  ).length;
  const totalNotificationBadgeCount = unreadEmailCount + unreadNoticeCount;

  const handleMarkNoticeRead = async (noticePin: string) => {
    if (readNotifications.includes(noticePin)) return;
    const newDismissed = [...readNotifications, noticePin];
    setReadNotifications(newDismissed);
    try {
      await api.users.update(currentMember.pin, {
        ...currentMember,
        readNotifications: newDismissed,
      });
      onInstantUpdate({ readNotifications: newDismissed });
    } catch (err) {
      console.error(err);
    }
  };

  // Extract ONLY their own attendance records
  let myAttendanceRecords = reports
    .map((report) => {
      const myRecord = report.records.find(
        (rec) => rec.memberPin === currentMember.pin,
      );
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
        remarks: myRecord.remarks,
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
    myAttendanceRecords = myAttendanceRecords.filter((r) =>
      r.date.startsWith(filterMonth),
    );
  }

  // Sort chronologically (newest first)
  myAttendanceRecords.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Real-time Working Hours logic for MemberDashboard
  let memberWorkingHoursText = "";
  let memberWorkingHoursError = "";
  let isMemberValidTime = false;

  const currentStatus = myAttendanceRecords.find(
    (r) => r.date === adjDate,
  )?.status;

  if (adjCheckIn && adjCheckOut) {
    const inMins = parseTimeToMinutes(adjCheckIn);
    const outMins = parseTimeToMinutes(adjCheckOut);

    if (inMins === null) {
      memberWorkingHoursError = `You entered invalid Time. ${getAttendanceRangeText(adjDate)}`;
    } else if (outMins === null) {
      memberWorkingHoursError = `You entered invalid Time. ${getAttendanceRangeText(adjDate)}`;
    } else {
      // Attendance logic: Day starts at 06:00 AM and ends at 05:59 AM next day
      const getAbsMins = (m: number) => (m >= 360 ? m : m + 1440);
      const absIn = getAbsMins(inMins);
      const absOut = getAbsMins(outMins);

      if (absIn >= absOut) {
        memberWorkingHoursError = `You entered invalid Time. ${getAttendanceRangeText(adjDate)}`;
      } else {
        let diffMins = absOut - absIn;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        memberWorkingHoursText = `Working Hour: ${hours} Hour ${mins} Min`;
        isMemberValidTime = true;
      }
    }
  } else if (adjCheckIn || adjCheckOut) {
    if (currentStatus === "Finger Punch Missing") {
      memberWorkingHoursError = "Out Punch Missing";
    } else {
      memberWorkingHoursError = "Both In Time and Out Time must be provided!";
    }
  } else {
    if (currentStatus === "Finger Punch Missing") {
      memberWorkingHoursError = "Out Punch Missing";
    }
  }

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate || !leaveReason.trim()) {
      toast.error("Please fill in all fields!");
      return;
    }
    const req: LeaveRequest = {
      pin: `leave-${Date.now()}`,
      memberPin: currentMember.pin,
      memberName: currentMember.name,
      coordinatorPin: currentMember.mentorPin || "",
      coordinatorName:
        mentors.find((m) => m.pin === currentMember.mentorPin)?.name || "",
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      leaveType: leaveType,
      reason: leaveReason.trim(),
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    onSubmitLeaveRequest(req);
    setLeaveStartDate("");
    setLeaveEndDate("");
    setLeaveReason("");
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjDate || !adjReason.trim()) {
      toast.error("Please fill in all fields!");
      return;
    }

    if (!isMemberValidTime) {
      toast.error(
        memberWorkingHoursError || "Please provide valid time input!",
      );
      return;
    }

    const report = reports.find(
      (r) => r.date === adjDate && r.campus === currentMember.campus,
    );
    const req: AttendanceEditRequest = {
      pin: `edit-req-${Date.now()}`,
      reportPin: report?.pin || `manual-${Date.now()}`,
      date: adjDate,
      memberPin: currentMember.pin,
      memberName: currentMember.name,
      coordinatorPin: currentMember.mentorPin || "",
      coordinatorName:
        mentors.find((m) => m.pin === currentMember.mentorPin)?.name || "",
      requestedStatus: adjRequestedStatus,
      requestedCheckIn: adjCheckIn || undefined,
      requestedCheckOut: adjCheckOut || undefined,
      reason: adjReason.trim(),
      campus: currentMember.campus,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    onSubmitAttendanceEditRequest(req);
    setAdjDate("");
    setAdjReason("");
    setAdjCheckIn("");
    setAdjCheckOut("");
  };

  // Compute Statistics
  const totalReports = myAttendanceRecords.length;
  const presentCount = myAttendanceRecords.filter(
    (r) => r.status === "Present",
  ).length;
  const lateCount = myAttendanceRecords.filter(
    (r) => r.status === "Late" || r.status === "Late Entry",
  ).length;
  const missingCount = myAttendanceRecords.filter(
    (r) => r.status === "Finger Punch Missing",
  ).length;
  const absentCount = myAttendanceRecords.filter(
    (r) => r.status === "Absent",
  ).length;

  // Find feedback submitted on behalf of this member
  const myFeedbackHistory = feedbacks.filter(
    (f) => f.memberPin === currentMember.pin,
  );

  // Dynamic Tabs list based on permissions
  const tabsList = [
    {
      id: "attendance" as const,
      label: "My Attendance Records",
      permission: "member_attendance",
      icon: <Calendar className="w-4 h-4" />,
      hasUnread: false,
    },
    {
      id: "notices" as const,
      label: "My Notice",
      permission: "member_notices",
      icon: <FileText className="w-4 h-4" />,
      hasUnread: false,
    },
    {
      id: "emails" as const,
      label: `My Inbox (${myEmails.length})`,
      permission: "member_emails",
      icon: <Inbox className="w-4 h-4" />,
      hasUnread: unreadEmailCount > 0,
    },
    {
      id: "members" as const,
      label: "Member Management",
      permission: "manage_members",
      icon: <User className="w-4 h-4" />,
      hasUnread: false,
    },
    {
      id: "campus_settings" as const,
      label: "Campus Settings",
      permission: "manage_campus_settings",
      icon: <Settings className="w-4 h-4" />,
      hasUnread: false,
    },
    {
      id: "permissions" as const,
      label: "Permission Management",
      permission: "configure_menu_permissions",
      icon: <ShieldCheck className="w-4 h-4" />,
      hasUnread: false,
    },
  ];

  const visibleTabs = tabsList.filter(
    (t) =>
      allowedPerms.includes(t.permission) ||
      (t.id === "members" &&
        (allowedPerms.includes("manage_members") ||
          allowedPerms.includes("mentor_members"))),
  );

  // --- SCROLL TO TOP ON TAB CHANGE ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  return (
    <div className="space-y-4">
      {/* Top Welcome & Notification Bar - Styled like Coordinator/Mentor Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative group">
        <div className="text-left relative z-10">
          <h2 className="text-md font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
            Member's Workspace
          </h2>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Control Center</p>
          <div className="flex gap-2">
            {/* Desktop Toggle Button */}
            <div className="hidden lg:block">
              {!isSidebarOpen ? (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all shadow-3xs group"
                >
                  <LayoutDashboard className="w-3 h-3" />
                  <span>Open Dashboard Menu</span>
                  <ChevronRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-100 transition-all shadow-3xs group"
                >
                  <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Close Dashboard Menu</span>
                </button>
              )}
            </div>

            {/* Mobile Toggle Button */}
            <div className="block lg:hidden">
              {!isMobileMenuOpen ? (
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all shadow-3xs group"
                >
                  <LayoutDashboard className="w-3 h-3" />
                  <span>Open Dashboard Menu</span>
                  <ChevronRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-100 transition-all shadow-3xs group"
                >
                  <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Close Dashboard Menu</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 self-end sm:self-auto">
          {/* Notification Bell Button & Popover */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`p-3 rounded-2xl transition-all relative flex items-center justify-center border group ${
                isNotificationsOpen
                  ? "bg-white text-indigo-600 border-indigo-200 shadow-lg"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Bell
                className={`w-5 h-5 ${!isNotificationsOpen && totalNotificationBadgeCount > 0 ? "animate-bounce" : ""}`}
              />
              {totalNotificationBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {totalNotificationBadgeCount}
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
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                          System Notices
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400">
                          Recent alerts and bulletins
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {totalNotificationBadgeCount > 0 && (
                          <button
                            onClick={async () => {
                              if (onMarkAllEmailsAsRead) {
                                await onMarkAllEmailsAsRead(currentMember.pin);
                              }
                              const allNoticePins = notices.map(n => n.pin);
                              const newDismissed = Array.from(new Set([...readNotifications, ...allNoticePins]));
                              setReadNotifications(newDismissed);
                              onInstantUpdate({ readNotifications: newDismissed });
                              toast.success("All notifications marked as read!");
                            }}
                            className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-lg cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        <button onClick={() => setIsNotificationsOpen(false)} className="cursor-pointer">
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-2">
                      {totalNotificationBadgeCount === 0 ? (
                        <div className="py-8 text-center text-slate-400">
                          <Inbox className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                          <p className="text-xs font-bold">Inbox is empty</p>
                        </div>
                      ) : (
                        <>
                          {/* Unread Emails */}
                          {myEmails
                            .filter((e) => !e.isRead)
                            .map((msg) => (
                              <div
                                key={msg.pin}
                                className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-2xl transition-all group flex items-start justify-between gap-2"
                              >
                                <div
                                  className="cursor-pointer flex-1 min-w-0"
                                  onClick={() => {
                                    onMarkEmailAsRead(msg.pin);
                                    setActiveTab("emails");
                                    setSelectedEmail(msg);
                                    setIsNotificationsOpen(false);
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] font-black text-indigo-600 uppercase">
                                      {msg.fromName}
                                    </span>
                                    <span className="text-[8px] text-slate-400 font-bold">
                                      {new Date(msg.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <h4 className="text-[11px] font-bold text-slate-800 truncate group-hover:text-indigo-700">
                                    {msg.subject}
                                  </h4>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkEmailAsRead(msg.pin);
                                  }}
                                  className="p-1 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            ))}

                          {/* Unread Notices */}
                          {myFilteredNotices
                            .filter((n) => !readNotifications.includes(n.pin))
                            .map((notice) => (
                              <div
                                key={notice.pin}
                                className="p-3 bg-amber-50 hover:bg-amber-100/50 border border-amber-100 hover:border-amber-200 rounded-2xl transition-all group flex items-start justify-between gap-2"
                              >
                                <div
                                  className="cursor-pointer flex-1 min-w-0"
                                  onClick={() => {
                                    handleMarkNoticeRead(notice.pin);
                                    setActiveTab("notices");
                                    setIsNotificationsOpen(false);
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] font-black text-amber-600 uppercase">
                                      {notice.category} Notice
                                    </span>
                                    <span className="text-[8px] text-slate-400 font-bold">
                                      {new Date(
                                        notice.date,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <h4 className="text-[11px] font-bold text-slate-800 truncate group-hover:text-amber-700">
                                    {notice.title}
                                  </h4>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkNoticeRead(notice.pin);
                                  }}
                                  className="p-1 hover:bg-amber-200/50 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                        </>
                      )}
                    </div>
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

        {/* Desktop Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{
                width: "260px",
                opacity: 1,
                x: 0,
              }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              className="hidden lg:block bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs text-left sticky top-6 h-fit shrink-0 overflow-y-auto"
            >
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                  Sidebar Menu
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {visibleTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id as any);
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
                    setActiveTab("profile");
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 ${
                    activeTab === "profile"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">Profile Settings</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("call-management");
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 ${
                    activeTab === "call-management"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">
                    {currentMember.permissions?.includes("can_upload_call_info")
                      ? "Call Management"
                      : "Assigned Calls"}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Sidebar */}
        <AnimatePresence mode="wait">
          {isMobileMenuOpen && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{
                x: 0,
                opacity: 1,
              }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="lg:hidden fixed inset-y-0 left-0 w-[280px] bg-white p-4 sm:p-5 border-r border-slate-200/80 shadow-2xl text-left overflow-y-auto z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-2 mb-6">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                  Sidebar Menu
                </p>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto">
                {visibleTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id as any);
                      setIsMobileMenuOpen(false);
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
                    setActiveTab("profile");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 ${
                    activeTab === "profile"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">Profile Settings</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("call-management");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 ${
                    activeTab === "call-management"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">
                    {currentMember.permissions?.includes("can_upload_call_info")
                      ? "Call Management"
                      : "Assigned Calls"}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Content Area */}
        <div className="flex-1 w-full min-w-0 space-y-4 sm:space-y-6 relative">
          {/* Tab 1: OWN ATTENDANCE LOG */}
          {activeTab === "attendance" &&
            allowedPerms.includes("member_attendance") && (
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
                      <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Total Tracked
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        Cumulative reports
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-black text-slate-800 block tracking-tight">
                        {totalReports} Days
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/10 p-5 rounded-3xl border border-emerald-200/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-36 text-left relative overflow-hidden group">
                    <div className="absolute right-4 top-4 opacity-15 group-hover:scale-110 transition-transform">
                      <Award className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider block">
                        Marked Present
                      </span>
                      <span className="text-[10px] text-emerald-500/80 font-medium block mt-0.5">
                        On-time sessions
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-black text-emerald-700 block tracking-tight">
                        {presentCount} Days
                      </span>
                    </div>
                  </div>

                  <div className="bg-amber-50/10 p-5 rounded-3xl border border-amber-200/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-36 text-left relative overflow-hidden group">
                    <div className="absolute right-4 top-4 opacity-15 group-hover:scale-110 transition-transform">
                      <AlertTriangle className="w-10 h-10 text-amber-600" />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider block">
                        Punch Missed
                      </span>
                      <span className="text-[10px] text-amber-500/80 font-medium block mt-0.5">
                        Awaiting correction
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-black text-amber-700 block tracking-tight">
                        {missingCount} Days
                      </span>
                    </div>
                  </div>

                  <div className="bg-rose-50/10 p-5 rounded-3xl border border-rose-200/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-36 text-left relative overflow-hidden group">
                    <div className="absolute right-4 top-4 opacity-15 group-hover:scale-110 transition-transform">
                      <Clock className="w-10 h-10 text-rose-600" />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider block">
                        Absences
                      </span>
                      <span className="text-[10px] text-rose-500/80 font-medium block mt-0.5">
                        Missed schedules
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-black text-rose-700 block tracking-tight">
                        {absentCount} Days
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table of logs */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
                  <div className="bg-slate-50/70 border-b border-slate-150 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                        Members Attendance History
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {currentMember.name}
                      </p>
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
                          const recordsToExport = myAttendanceRecords.map(
                            (rec) => ({
                              Date: rec.date,
                              Campus: rec.campus,
                              Status: rec.status,
                              "Check In": rec.checkInTime || "-",
                              "Check Out": rec.checkOutTime || "-",
                              "Notes/Remarks":
                                [rec.remarks, rec.notes]
                                  .filter(Boolean)
                                  .join(" | ") || "-",
                            }),
                          );

                          const ws = XLSX.utils.json_to_sheet(recordsToExport);
                          XLSX.utils.book_append_sheet(wb, ws, "My Attendance");
                          XLSX.writeFile(
                            wb,
                            `my_attendance_${filterMonth || "all"}.xlsx`,
                          );
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
                      <p className="font-semibold text-slate-500">
                        No attendance reports generated yet
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Once the mentors posts attendance reports for your
                        campus, your logs will populate here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="p-4">Log Date</th>
                            <th className="p-4">Campus Location</th>
                            <th className="p-4">Attendance Status</th>
                            <th className="p-4 font-mono">
                              Check-In / Out Timings
                            </th>
                            <th className="p-4">Administration Comments</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {myAttendanceRecords.map((rec) => {
                            // Find if mentor raised feedback for this specific date
                            const feedbackTicket = myFeedbackHistory.find(
                              (f) => f.date === rec.date,
                            );
                            const displayStatus = getEffectiveStatus(rec);

                            return (
                              <tr
                                key={rec.reportPin}
                                className="hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="p-4 font-semibold text-slate-700">
                                  {rec.date}
                                </td>
                                <td className="p-4 text-slate-600">
                                  {rec.campus}
                                </td>
                                <td className="p-4">
                                  <span
                                    className={`inline-flex items-center justify-center min-w-[85px] px-4 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-all ${
                                      displayStatus === "Present"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : displayStatus === "Late" ||
                                            displayStatus === "Late Entry"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : displayStatus === "Early Leave"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : displayStatus ===
                                                  "Finger Punch Missing" ||
                                                displayStatus === "< 6hr" ||
                                                displayStatus === "< 10hrs"
                                              ? "bg-rose-50 text-rose-700 border-rose-200 "
                                              : displayStatus === "Absent"
                                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                                : displayStatus === "Leave" ||
                                                    displayStatus
                                                      .toLowerCase()
                                                      .includes("leave")
                                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                                  : "bg-slate-50 text-slate-700 border-slate-200"
                                    }`}
                                  >
                                    {displayStatus}
                                  </span>
                                </td>
                                <td className="p-4 font-mono text-slate-600">
                                  {rec.checkInTime || rec.checkOutTime ? (
                                    <span>
                                      {rec.checkInTime || "--:--"} -{" "}
                                      {rec.checkOutTime || "--:--"}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">
                                      -- : --
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 space-y-1.5">
                                  {rec.notes || rec.remarks ? (
                                    <div className="flex flex-wrap gap-1 text-[11px] text-slate-600 w-full">
                                      {Array.from(
                                        new Set(
                                          `${rec.remarks || ""} ${rec.notes || ""}`
                                            .replace(/\u00a0/g, " ")
                                            .split(
                                              /\s*\|\s*|(?=\b(?:IN|OUT):)/i,
                                            )
                                            .map((p) => p.trim())
                                            .filter(Boolean),
                                        ),
                                      ).map((trimmed, index) => {
                                        const isIn = /^IN:/i.test(trimmed);
                                        const isOut = /^OUT:/i.test(trimmed);
                                        const isFingerPunchMissing =
                                          /Finger Punch Missing/i.test(trimmed);
                                        const cleanText = trimmed
                                          .replace(/^(IN|OUT):/i, "")
                                          .trim()
                                          .replace(/।/g, "");

                                        if (!cleanText && (isIn || isOut))
                                          return null;

                                        return (
                                          <div
                                            key={`${cleanText}-${index}`}
                                            className={`flex items-start gap-1 px-1.5 py-0.5 rounded border ${
                                              isFingerPunchMissing
                                                ? "bg-red-50 text-red-700 border-red-100 font-medium"
                                                : "bg-white/50 text-slate-600 border-slate-100/50"
                                            }`}
                                          >
                                            {isIn && (
                                              <span className="font-bold text-blue-600 shrink-0 text-[9px] uppercase">
                                                IN:
                                              </span>
                                            )}
                                            {isOut && (
                                              <span className="font-bold text-amber-600 shrink-0 text-[9px] uppercase">
                                                OUT:
                                              </span>
                                            )}
                                            <span className="leading-tight italic">
                                              "{cleanText}"
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">
                                      No notes
                                    </span>
                                  )}

                                  {/* Show if correction feedback is raised by mentor */}
                                  {feedbackTicket && (
                                    <div
                                      className={`p-2 rounded border text-[11px] leading-relaxed flex items-start gap-1.5 max-w-sm ${
                                        feedbackTicket.status === "Pending"
                                          ? "bg-amber-50/50 border-amber-100 text-amber-800"
                                          : "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                                      }`}
                                    >
                                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                      <div>
                                        <p className="font-semibold">
                                          Correction query submitted by Campus
                                          Coordinator:
                                        </p>
                                        <p className="italic opacity-90">
                                          "{feedbackTicket.mentorComment}"
                                        </p>
                                        {feedbackTicket.status ===
                                          "Resolved" && (
                                          <p className="font-semibold mt-1 text-emerald-700">
                                            Resolved by Manager: Mark approved.
                                          </p>
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
          {visibleTabs.length > 0 &&
            activeTab === "notices" &&
            allowedPerms.includes("member_notices") && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <NoticeBoard
                  notices={myFilteredNotices}
                  onAddNotice={onAddNotice}
                  onUpdateNotice={onUpdateNotice}
                  onDeleteNoticeRequest={onDeleteNoticeRequest}
                  canPost={allowedPerms.includes("member_post_notice")}
                  currentUser={{
                    name: currentMember.name,
                    role: "member",
                    pin: currentMember.pin,
                  }}
                  campuses={currentMember.campus ? [currentMember.campus] : []}
                />
              </motion.div>
            )}

          {/* Tab 3: SIMULATED SECURE EMAIL INBOX */}
          {activeTab === "emails" && allowedPerms.includes("member_emails") && (
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
                  <p className="text-xs text-slate-500 font-medium">
                    Internal communications and official alerts
                  </p>
                </div>

                <div className="flex flex-1 min-h-0">
                  {/* Message List */}
                  <div
                    className={`flex-1 overflow-y-auto ${selectedEmail ? "hidden sm:block" : "block"}`}
                  >
                    {myEmails.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                        <Inbox className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-500">
                          No messages in your inbox
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Updates and alerts will appear here when posted by
                          coordinators.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {myEmails
                          .sort(
                            (a, b) =>
                              new Date(b.date).getTime() -
                              new Date(a.date).getTime(),
                          )
                          .map((msg) => (
                            <div
                              key={msg.pin}
                              onClick={() => setSelectedEmail(msg)}
                              className={`p-4 sm:p-5 cursor-pointer transition-all hover:bg-slate-50 border-l-4 ${
                                selectedEmail?.pin === msg.pin
                                  ? "border-indigo-600 bg-indigo-50/30"
                                  : msg.isRead
                                    ? "border-transparent"
                                    : "border-amber-400 bg-amber-50/10"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">
                                  {msg.fromName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {new Date(msg.date).toLocaleDateString()}
                                </span>
                              </div>
                              <h4
                                className={`text-sm font-bold truncate ${msg.isRead ? "text-slate-600" : "text-slate-900"}`}
                              >
                                {msg.subject}
                              </h4>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-1 leading-relaxed">
                                {msg.body}
                              </p>
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
                            <h2 className="text-xl font-black text-slate-900 leading-tight">
                              {selectedEmail.subject}
                            </h2>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-black border border-indigo-200">
                                {selectedEmail.fromName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                  {selectedEmail.fromName}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  To: {selectedEmail.toEmail}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {new Date(
                                selectedEmail.date,
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {new Date(selectedEmail.date).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs">
                          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                            {selectedEmail.body}
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200">
                          <p className="text-[10px] text-slate-400 italic text-center leading-relaxed">
                            This is a secure system-generated message. Please
                            check the official Notice Board for further details
                            and attachments related to this bulletin.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:flex flex-1 items-center justify-center text-slate-300 p-12 bg-slate-50/10">
                      <div className="text-center">
                        <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest opacity-40">
                          Select a message to view
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 4: PROFILE SETTINGS */}
          {activeTab === "profile" && (
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

          {activeTab === "call-management" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CallManagement
                currentUser={currentMember}
                members={members}
                mentors={mentors}
                campuses={campuses}
                branches={branches}
                onRefreshEmails={onRefreshEmails}
              />
            </motion.div>
          )}

          {/* Tab: MEMBER MANAGEMENT */}
          {activeTab === "members" &&
            (allowedPerms.includes("manage_members") ||
              allowedPerms.includes("mentor_members")) && (
              <MemberManagementView
                members={members}
                mentors={mentors}
                managers={[]}
                campuses={campuses || []}
                currentUser={{ pin: currentMember.pin, role: "member", permissions: currentMember.permissions }}
                onAddMember={onAddMember || (() => {})}
                onUpdateMember={onUpdateMember || (() => {})}
                onDeleteMember={onDeleteMember || (() => {})}
                onAddMentor={onAddMentor}
                onUpdateMentor={onUpdateMentor}
                onDeleteMentor={onDeleteMentor}
              />
            )}

          {/* Tab: PERMISSION MANAGEMENT */}
          {activeTab === "permissions" &&
            allowedPerms.includes("configure_menu_permissions") && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <PermissionManagementView
                  members={members}
                  mentors={mentors}
                  onUpdateMember={onUpdateMember}
                  onUpdateMentor={onUpdateMentor}
                  isManager={false}
                />
              </motion.div>
            )}

          {/* Tab: CAMPUS SETTINGS (BRANCH MANAGEMENT) */}
          {activeTab === "campus_settings" &&
            allowedPerms.includes("manage_campus_settings") && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
                  <div className="bg-slate-50/70 border-b border-slate-150 px-6 py-5">
                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                      <Settings className="w-5 h-5 text-indigo-600" />
                      Campus & Branch Settings
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Configure branches for each campus location
                    </p>
                  </div>

                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="p-4 w-12 text-center">#</th>
                            <th className="p-4">Campus Name</th>
                            <th className="p-4">Branches</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {campuses.map((campus, idx) => (
                            <tr
                              key={campus.id}
                              className="hover:bg-slate-50/30 transition-colors"
                            >
                              <td className="p-4 text-center font-mono text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="p-4 font-bold text-slate-800">
                                {campus.name}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1 max-w-[400px]">
                                  {branches
                                    .filter((b) => b.campusId === campus.id)
                                    .map((b) => (
                                      <span
                                        key={b.id}
                                        className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 text-[10px] font-medium"
                                      >
                                        {b.name}
                                      </span>
                                    ))}
                                  {branches.filter(
                                    (b) => b.campusId === campus.id,
                                  ).length === 0 && (
                                    <span className="text-slate-400 italic text-[10px]">
                                      No branches assigned
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedCampusForBranches(campus);
                                    setIsBranchModalOpen(true);
                                  }}
                                  className="px-4 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-wider border border-indigo-100 transition-all cursor-pointer"
                                >
                                  Manage Branches
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
        </div>{" "}
        {/* Close Content Area */}
      </div>{" "}
      {/* Close flex-col lg:flex-row */}
      <BranchManagementModal
        isOpen={isBranchModalOpen}
        onClose={() => {
          setIsBranchModalOpen(false);
          setSelectedCampusForBranches(null);
          setBranchSearch("");
        }}
        campus={selectedCampusForBranches}
        branches={branches}
        onAssign={onAssignBranchesToCampus}
        onUnassign={onUnassignBranch}
        onUpdateBranch={onUpdateBranch}
        onOpenAddBranch={() => setIsAddBranchModalOpen(true)}
      />
      <AddBranchModal
        isOpen={isAddBranchModalOpen}
        onClose={() => {
          setIsAddBranchModalOpen(false);
        }}
        onAdd={onAddBranch}
        branches={branches}
      />
    </div>
  );
}

function BranchManagementModal({
  isOpen,
  onClose,
  campus,
  branches,
  onAssign,
  onUnassign,
  onUpdateBranch,
  onOpenAddBranch,
}: {
  isOpen: boolean;
  onClose: () => void;
  campus: Campus | null;
  branches: Branch[];
  onAssign: (campusId: string, branchIds: string[]) => void;
  onUnassign: (branchId: string) => void;
  onUpdateBranch: (id: string, data: Partial<Branch>) => void;
  onOpenAddBranch: () => void;
}) {
  if (!isOpen || !campus) return null;
  const [search, setSearch] = useState("");

  const assignedBranches = branches.filter((b) => b.campusId === campus.id);
  const unassignedBranches = branches.filter(
    (b) => !b.campusId && b.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[90vh] max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Manage Branches
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Campus: {campus.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 text-left">
          {/* Assigned Branches */}
          <section>
            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Currently Assigned ({assignedBranches.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assignedBranches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl group"
                >
                  <span className="text-xs font-bold text-slate-700">
                    {branch.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const newName = prompt("Rename branch:", branch.name);
                        if (
                          newName &&
                          newName.trim() &&
                          newName !== branch.name
                        ) {
                          onUpdateBranch(branch.id, { name: newName.trim() });
                        }
                      }}
                      className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onUnassign(branch.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {assignedBranches.length === 0 && (
                <div className="col-span-full py-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs font-bold text-slate-400">
                    No branches assigned to this campus.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Add More Branches */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Assign More Branches
              </h4>
              <button
                onClick={onOpenAddBranch}
                className="text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1"
              >
                + Create New Branch
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search branches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
              {unassignedBranches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => onAssign(campus.id, [branch.id])}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/20 transition-all text-left"
                >
                  <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600">
                    {branch.name}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
              {unassignedBranches.length === 0 && (
                <div className="col-span-full py-10 text-center">
                  <p className="text-xs font-bold text-slate-400 italic">
                    {search
                      ? "No unassigned branches matching search."
                      : "All branches are already assigned!"}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AddBranchModal({
  isOpen,
  onClose,
  onAdd,
  branches,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
  branches: Branch[];
}) {
  const [name, setName] = useState("");
  if (!isOpen) return null;

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800 tracking-tight">
            Create New Branch
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Branch Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter branch name (e.g. Azimpur Udvash)"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-800 shadow-sm"
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAdd}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              Create Branch
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
