import React, { useState, useEffect } from "react";
import {
  Mentor,
  TeamMember,
  AttendanceReport,
  AttendanceFeedback,
  AttendanceStatus,
  MemberAttendance,
  ProfileRequest,
  User as UserType,
  Notice,
  AttendanceEditRequest,
  LeaveRequest,
  Campus,
  Role,
  EmailMessage,
} from "../types";
import { calculateWorkingHours, getEffectiveStatus, formatDateLong, parseTimeToMinutes } from "../utils";
import {
  Calendar,
  MapPin,
  Menu,
  Users,
  CheckCircle, XCircle,
  UserCheck,
  MessageSquare,
  Clock,
  FileSpreadsheet,
  Plus,
  AlertCircle,
  RefreshCw,
  Trash,
  Edit,
  UserPlus,
  Upload,
  Shield,
  ShieldCheck,
  User,
  ThumbsUp,
  ThumbsDown,
  Megaphone,
  Edit3,
  ClipboardList,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  LayoutDashboard,
  Search,
  Filter,
  Mail,
  Settings,
  X,
  Save,
  Check,
  Download,
  Bell,
  AlertTriangle,
  UserMinus,
  ArrowLeft,
  Inbox,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import ProfileSettings from "./ProfileSettings";
import NoticeBoard from "./NoticeBoard";
import ConfirmModal from "./ConfirmModal";
import toast from "react-hot-toast";
import { UserAvatar } from "./UserAvatar";
import * as XLSX from "xlsx";
import ClockInput from "./ClockInput";

interface ManagerDashboardProps {
  currentUser: UserType;
  managers: UserType[];
  mentors: Mentor[];
  members: TeamMember[];
  reports: AttendanceReport[];
  feedbacks: AttendanceFeedback[];
  profileRequests: ProfileRequest[];
  attendanceEditRequests: AttendanceEditRequest[];
  onResolveAttendanceEditRequest: (
    requestPin: string,
    status: "Pending" | "Approved" | "Rejected",
    managerComment?: string,
  ) => void;
  onDeleteAttendanceEditRequest: (requestPin: string) => void;
  onUpdateAttendanceEditRequest: (
    updatedRequest: AttendanceEditRequest,
  ) => void;
  leaveRequests: LeaveRequest[];
  onResolveLeaveRequest: (
    requestPin: string,
    status: "Pending" | "Approved" | "Rejected",
    managerComment?: string,
  ) => void;
  onDeleteLeaveRequest: (requestPin: string) => void;
  onUpdateLeaveRequest: (updatedRequest: LeaveRequest) => void;
  notices: Notice[];
  // Notice Board callbacks
  onAddNotice: (notice: Omit<Notice, "pin" | "date" | "postedBy">) => void;
  onDeleteNotice: (noticePin: string) => void;
  onUpdateNotice: (notice: Notice) => void;

  onAddReport: (report: AttendanceReport) => void;
  onAddAttendanceRecord: (
    date: string,
    campus: string,
    record: MemberAttendance,
  ) => void;
  onUpdateReportStatus: (
    reportPin: string,
    memberPin: string,
    newStatus: AttendanceStatus,
  ) => void;
  onDeleteAttendanceRecord: (reportPin: string, memberPin: string) => void;
  onDeleteReport: (date: string, campus: string) => void;
  onUpdateAttendanceRecord: (
    reportPin: string,
    memberPin: string,
    updatedRecord: MemberAttendance,
  ) => void;
  onUpdateAssignment: (
    memberPin: string,
    mentorPin: string,
    campus: string,
  ) => void;
  onResolveFeedback: (
    feedbackPin: string,
    managerComment: string,
    status: "Resolved" | "Reviewed",
  ) => void;
  onApproveProfileRequest: (requestPin: string) => void;
  onRejectProfileRequest: (requestPin: string) => void;
  onDeleteProfileRequest: (requestPin: string) => void;
  onInstantUpdate: (updatedFields: Partial<UserType>) => void;

  // Roster CRUD callbacks
  onAddMember: (member: TeamMember) => void;
  onUpdateMember: (oldPin: string, member: TeamMember) => void;
  onDeleteMember: (memberPin: string) => void;
  onChangeUserRole: (
    oldPin: string,
    oldRole: Role,
    newRole: Role,
    userData: any,
  ) => void;
  onAddMentor: (mentor: Mentor) => void;
  onUpdateMentor: (oldPin: string, mentor: Mentor) => void;
  onDeleteMentor: (mentorPin: string) => void;

  // Dynamic Campus Props
  campuses: Campus[];
  onAddCampus: (
    campusName: string,
    headPin?: string,
    deputyPins?: string[],
    deputyMemberAccess?: Record<string, string[]>,
  ) => void;
  onUpdateCampus: (
    oldName: string,
    newName: string,
    headPin?: string,
    deputyPins?: string[],
    deputyMemberAccess?: Record<string, string[]>,
  ) => void;
  onDeleteCampus: (campusName: string) => void;
  emails: EmailMessage[];
  onMarkEmailAsRead: (emailPin: string) => void;
}

export default function ManagerDashboard({
  currentUser,
  managers,
  mentors,
  members,
  reports,
  feedbacks,
  profileRequests,
  attendanceEditRequests,
  onResolveAttendanceEditRequest,
  onDeleteAttendanceEditRequest,
  onUpdateAttendanceEditRequest,
  leaveRequests,
  onResolveLeaveRequest,
  onDeleteLeaveRequest,
  onUpdateLeaveRequest,
  notices,
  onAddNotice,
  onDeleteNotice,
  onUpdateNotice,
  onAddReport,
  onAddAttendanceRecord,
  onUpdateReportStatus,
  onDeleteAttendanceRecord,
  onDeleteReport,
  onUpdateAttendanceRecord,
  onUpdateAssignment,
  onResolveFeedback,
  onApproveProfileRequest,
  onRejectProfileRequest,
  onDeleteProfileRequest,
  onInstantUpdate,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onChangeUserRole,
  onAddMentor,
  onUpdateMentor,
  onDeleteMentor,
  campuses,
  onAddCampus,
  onUpdateCampus,
  onDeleteCampus,
  emails,
  onMarkEmailAsRead
}: ManagerDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    | "attendance"
    | "feedback"
    | "roster"
    | "notices"
    | "verification"
    | "profile"
    | "campuses"
    | "attendance-viewer"
    | "members"
    | "edit_requests"
    | "leave-requests"
  >("attendance");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
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
  const [rosterSearch, setRosterSearch] = useState("");
  const [bulkPinInput, setBulkPinInput] = useState("");
  const [rosterCampusFilter, setRosterCampusFilter] = useState("all");
  const [rosterUnassignedOnly, setRosterUnassignedOnly] = useState(false);
  const [notificationActiveTab, setNotificationActiveTab] = useState<
    "requests" | "problematic" | "missing" | "notices"
  >("requests");

  // --- SINGLE PIN PASTE AND DISMISS STATES ---
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("manager_dismissed_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedNotifications((prev) => {
      const updated = [...prev, id];
      localStorage.setItem("manager_dismissed_notifications", JSON.stringify(updated));
      return updated;
    });
    toast.success("পঠিত হিসেবে চিহ্নিত করা হয়েছে!");
  };

  // --- NOTIFICATION READ STATES ---
  const [readRequestPins, setReadRequestPins] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("portal_read_request_pins");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem(
      "portal_read_request_pins",
      JSON.stringify(readRequestPins),
    );
  }, [readRequestPins]);

  const markAllRequestsAsRead = () => {
    const allPendingPins = [
      ...profileRequests
        .filter((r) => r.status === "Pending")
        .map((r) => r.pin),
      ...attendanceEditRequests
        .filter((r) => r.status === "Pending")
        .map((r) => r.pin),
      ...leaveRequests.filter((r) => r.status === "Pending").map((r) => r.pin),
    ];
    setReadRequestPins((prev) => {
      const unique = new Set([...prev, ...allPendingPins]);
      return Array.from(unique);
    });
      toast.success("All new requests marked as read!");
  };

  // --- DELETE CONFIRMATION STATES ---
  const [confirmDeleteMemberPin, setConfirmDeleteMemberPin] = useState<
    string | null
  >(null);
  const [confirmDeleteMentorPin, setConfirmDeleteMentorPin] = useState<
    string | null
  >(null);
  const [confirmDeleteNoticePin, setConfirmDeleteNoticePin] = useState<
    string | null
  >(null);
  const [confirmDeleteCampusName, setConfirmDeleteCampusName] = useState<
    string | null
  >(null);
  const [confirmDeleteLeavePin, setConfirmDeleteLeavePin] = useState<
    string | null
  >(null);
  const [confirmDeleteEditReqPin, setConfirmDeleteEditReqPin] = useState<
    string | null
  >(null);
  const [confirmDeleteAttendance, setConfirmDeleteAttendance] = useState<{
    reportPin: string;
    memberPin: string;
    memberName: string;
  } | null>(null);
  const [confirmDeleteReportInfo, setConfirmDeleteReportInfo] = useState<{
    date: string;
    campus: string;
  } | null>(null);
  const [confirmDeletePreviewRowIndex, setConfirmDeletePreviewRowIndex] = useState<number | null>(null);
  const [isAddCampusModalOpen, setIsAddCampusModalOpen] = useState(false);
  const [newCampusName, setNewCampusName] = useState("");
  const [newCampusHead, setNewCampusHead] = useState("");
  const [newCampusDeputies, setNewCampusDeputies] = useState<string[]>([]);
  const [editingCampusName, setEditingCampusName] = useState<string | null>(
    null,
  );
  const [editCampusValue, setEditCampusValue] = useState("");
  const [editCampusHead, setEditCampusHead] = useState("");
  const [editCampusDeputies, setEditCampusDeputies] = useState<string[]>([]);
  const [editCampusDeputyAccess, setEditCampusDeputyAccess] = useState<
    Record<string, string[]>
  >({});
  const [newCampusDeputyAccess, setNewCampusDeputyAccess] = useState<
    Record<string, string[]>
  >({});

  // --- REASON REMARKS STATES ---
  const [editRemarks, setEditRemarks] = useState<Record<string, string>>({});
  const [leaveRemarks, setLeaveRemarks] = useState<Record<string, string>>({});

  // --- REQUESTS EDITING STATE ---
  const [editingReqPin, setEditingReqPin] = useState<string | null>(null);
  const [reqEditForm, setReqEditForm] = useState<
    Partial<AttendanceEditRequest>
  >({});

  const [editingLeavePin, setEditingLeavePin] = useState<string | null>(null);
  const [leaveEditForm, setLeaveEditForm] = useState<Partial<LeaveRequest>>({});
  const [leaveSearchPin, setLeaveSearchPin] = useState("");
  const [leaveFilterStatus, setLeaveFilterStatus] = useState("All");
  const [leaveFilterType, setLeaveFilterType] = useState("All");
  const [leaveFilterMonth, setLeaveFilterMonth] = useState("All");
  const [leaveSortBy, setLeaveSortBy] = useState("newest");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedLeavePins, setSelectedLeavePins] = useState<string[]>([]);
  const [selectedEditReqPins, setSelectedEditReqPins] = useState<string[]>([]);

  const startEditRequest = (req: AttendanceEditRequest) => {
    setEditingReqPin(req.pin);
    setReqEditForm({ ...req });
  };

  const saveEditRequest = (updatedReq: Partial<AttendanceEditRequest>) => {
    onUpdateAttendanceEditRequest(updatedReq as AttendanceEditRequest);
    setEditingReqPin(null);
  };

  const startEditLeave = (req: LeaveRequest) => {
    setEditingLeavePin(req.pin);
    setLeaveEditForm({ ...req });
  };

  const saveEditLeave = () => {
    if (!leaveEditForm.pin) return;
    const start = leaveEditForm.startDate;
    const end = leaveEditForm.endDate;
    if (!start || !end || !leaveEditForm.reason?.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (new Date(start) > new Date(end)) {
      toast.error('Start Date cannot be after End Date.');
      return;
    }

    onUpdateLeaveRequest(leaveEditForm as LeaveRequest);
    setEditingLeavePin(null);
  };

  // --- ATTENDANCE VIEWER STATE ---
  const [attendanceViewerDate, setAttendanceViewerDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [attendanceViewerCampus, setAttendanceViewerCampus] = useState("All");
  const [attendanceViewerStatus, setAttendanceViewerStatus] = useState("All");
  const [attendanceViewerPinSearch, setAttendanceViewerPinSearch] =
    useState("");
  const [editingRecord, setEditingRecord] = useState<{
    reportPin: string;
    memberPin: string;
    record: MemberAttendance;
  } | null>(null);
  const [addingRecord, setAddingRecord] = useState<{
    date: string;
    campus: string;
    record: MemberAttendance;
  } | null>(null);

  const renderStatusBadge = (status: string) => {
    let classes = "bg-slate-50 text-slate-700 border-slate-200";
    if (status === "Present") {
      classes = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (status === "Late" || status === "Late Entry") {
      classes = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (status === "Early Leave") {
      classes = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (status === "Finger Punch Missing") {
      classes = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (status === "Absent") {
      classes = "bg-slate-100 text-slate-600 border-slate-200";
    } else if (status === "Leave" || status.toLowerCase().includes("leave")) {
      classes = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (status === "< 6hr") {
      classes = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (status === "< 10hrs") {
      classes = "bg-rose-50 text-rose-700 border-rose-200";
    }

    return (
      <span className={`inline-flex items-center justify-center min-w-[85px] px-4 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border transition-all ${classes}`}>
        {status}
      </span>
    );
  };

  const missingAttendances = React.useMemo(() => {
    const relevantReports = reports.filter(
      (r) =>
        r.date === attendanceViewerDate &&
        (attendanceViewerCampus === "All" ||
          r.campus === attendanceViewerCampus),
    );

    if (relevantReports.length === 0) return [];

    const reportedCampuses = Array.from(
      new Set(relevantReports.map((r) => r.campus)),
    );
    const missing: {
      date: string;
      campus: string;
      memberPin: string;
      memberName: string;
    }[] = [];
    const allUniqueMembers = Array.from(
      new Map([...members, ...mentors].map((m) => [m.pin, m])).values(),
    );

    reportedCampuses.forEach((campus) => {
      const campusMembers = allUniqueMembers.filter((m) => m.campus === campus);
      const campusRecords = relevantReports
        .filter((r) => r.campus === campus)
        .flatMap((r) => r.records);
      const campusRecordPins = new Set(campusRecords.map((r) => r.memberPin));

      campusMembers.forEach((member) => {
        if (!campusRecordPins.has(member.pin)) {
          missing.push({
            date: attendanceViewerDate,
            campus: campus,
            memberPin: member.pin,
            memberName: member.name,
          });
        }
      });
    });
    return missing;
  }, [reports, members, mentors, attendanceViewerDate, attendanceViewerCampus]);

  const problematicAttendances = React.useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const problematic: {
      date: string;
      campus: string;
      memberPin: string;
      memberName: string;
      issue: string;
      record: MemberAttendance;
      reportPin: string;
    }[] = [];

    reports.forEach((report) => {
      // Look at all past dates, or strictly before today? "বিগত তারিখের" usually means before today.
      if (report.date >= today) return; 

      if (
        attendanceViewerCampus !== "All" &&
        report.campus !== attendanceViewerCampus
      ) return;

      report.records.forEach((record) => {
        const status = getEffectiveStatus(record);
        const hours = calculateWorkingHours(record.checkInTime, record.checkOutTime);
        let issue = "";

        if (status === "Finger Punch Missing") {
          issue = "Finger Punch Missing";
        } else if (status === "Absent") {
          issue = "Absent";
        } else if (status === "< 6hr") {
          issue = `< 6hr (${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m)`;
        }

        if (issue) {
          problematic.push({
            date: report.date,
            campus: report.campus,
            memberPin: record.memberPin,
            memberName: record.memberName,
            issue: issue,
            record: record,
            reportPin: report.pin,
          });
        }
      });
    });
    
    // Sort by date descending
    return problematic.sort((a, b) => b.date.localeCompare(a.date));
  }, [reports, attendanceViewerCampus]);

  // --- ROSTER MANAGEMENT (CRUD) STATE ---
  const [rosterType, setRosterType] = useState<"member" | "mentor">("member");
  const [crudMode, setCrudMode] = useState<"create" | "edit">("create");
  const [selectedCrudPin, setSelectedCrudPin] = useState<string | null>(null);
  const [selectedCrudRole, setSelectedCrudRole] = useState<Role | null>(null);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isExcelGuideOpen, setIsExcelGuideOpen] = useState(false);

  const [memberForm, setMemberForm] = useState(() => ({
    pin: "",
    name: "",
    email: "",
    password: "password",
    campus: "",
    mentorPin: "",
    designation: "",
    permissions: ["member_attendance", "member_notices", "member_post_notice"],
    avatarUrl: "",
    role: "member" as Role,
  }));

  const [mentorForm, setMentorForm] = useState({
    pin: "",
    name: "",
    email: "",
    password: "password",
    campus: "",
    mentorPin: "",
    designation: "",
    permissions: [
      "mentor_attendance",
      "mentor_notices",
      "mentor_history",
      
    ],
    avatarUrl: "",
    role: "mentor" as Role,
  });

  // --- COPY-PASTE BULK ATTENDANCE STATE ---
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [parsedPreviewRows, setParsedPreviewRows] = useState<MemberAttendance[]>([]);
  const [editingPreviewRow, setEditingPreviewRow] = useState<{ index: number; record: MemberAttendance } | null>(null);

  // --- ATTENDANCE FORM STATE ---
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [reportCampus, setReportCampus] = useState<string>(
    () => campuses[0]?.name || "",
  );
  const [pinSearch, setPinSearch] = useState("");

  // Member Search State
  const [memberSearch, setMemberSearch] = useState("");
  const [memberCampusFilter, setMemberCampusFilter] = useState("");

  const [attendanceGrid, setAttendanceGrid] = useState<
    Record<
      string,
      {
        status: AttendanceStatus;
        checkInTime: string;
        checkOutTime: string;
        notes: string;
      }
    >
  >({});

  // Initialize/Reset grid when campus or date changes
  const currentReport = reports.find(
    (r) => r.date === reportDate && r.campus === reportCampus,
  );
  const postedMemberPins = currentReport
    ? currentReport.records.map((r) => r.memberPin)
    : [];
  const campusMembers = (() => {
    const map = new Map<string, any>();
    [...members, ...mentors].forEach((m) => {
      if (!map.has(m.pin)) map.set(m.pin, m);
    });
    return Array.from(map.values());
  })()
    .filter(
      (m) =>
        m.campus === reportCampus &&
        (pinSearch === "" || m.pin.includes(pinSearch)) &&
        !postedMemberPins.includes(m.pin),
    )
    .sort((a, b) =>
      a.pin.localeCompare(b.pin, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

  // Filtered members list (including mentors)
  const filteredMembers = (() => {
    const map = new Map<string, any>();
    [...members, ...mentors].forEach((m) => {
      if (!map.has(m.pin)) map.set(m.pin, m);
    });
    return Array.from(map.values());
  })().filter(
    (m) =>
      m.isActive !== false &&
      (memberSearch === "" ||
        (m.name?.toLowerCase() || "").includes(memberSearch.toLowerCase())) &&
      (memberCampusFilter === "" || m.campus === memberCampusFilter),
  );

  React.useEffect(() => {
    const initialGrid: typeof attendanceGrid = {};
    campusMembers.forEach((m) => {
      initialGrid[m.pin] = {
        status: "Present",
        checkInTime: "09:00 AM",
        checkOutTime: "05:00 PM",
        notes: "",
      };
    });
    setAttendanceGrid(initialGrid);
  }, [reportCampus, members]);

  const handleGridStatusChange = (
    memberPin: string,
    status: AttendanceStatus,
  ) => {
    setAttendanceGrid((prev) => ({
      ...prev,
      [memberPin]: {
        ...prev[memberPin],
        status,
        checkInTime:
          status === "Absent" ? "" : prev[memberPin]?.checkInTime || "09:00 AM",
        checkOutTime:
          status === "Absent"
            ? ""
            : prev[memberPin]?.checkOutTime || "05:00 PM",
      },
    }));
  };

  const handleGridFieldChange = (
    memberPin: string,
    field: "checkInTime" | "checkOutTime" | "notes",
    value: string,
  ) => {
    setAttendanceGrid((prev) => ({
      ...prev,
      [memberPin]: {
        ...prev[memberPin],
        [field]: value,
      },
    }));
  };

  const handlePostAttendance = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if report already exists for this campus and date
    const exists = reports.some(
      (r) => r.date === reportDate && r.campus === reportCampus,
    );
    if (exists) {
      toast.error(
        `Attendance for ${reportCampus} on ${reportDate} already exists.`,
      );
      return;
    }

    if (campusMembers.length === 0) {
      toast.error(
        "Cannot post report: No team members assigned to this campus.",
      );
      return;
    }

    const records: MemberAttendance[] = campusMembers.map((member) => {
      const gridItem = attendanceGrid[member.pin] || {
        status: "Present",
        checkInTime: "09:00 AM",
        checkOutTime: "05:00 PM",
        notes: "",
      };
      return {
        memberPin: member.pin,
        memberName: member.name,
        status: gridItem.status,
        checkInTime:
          gridItem.status !== "Absent" ? gridItem.checkInTime : undefined,
        checkOutTime:
          gridItem.status !== "Absent" ? gridItem.checkOutTime : undefined,
        notes: gridItem.notes || undefined,
      };
    });

    const newReport: AttendanceReport = {
      pin: `report-${Date.now()}`,
      date: reportDate,
      campus: reportCampus,
      records,
      postedBy: "Alice Vance (Manager)",
      createdAt: new Date().toISOString(),
    };

    onAddReport(newReport);
    toast.success(
      `Success: Attendance report posted for ${reportCampus} on ${reportDate}`,
    );

    // Reset notes
    setAttendanceGrid((prev) => {
      const resetGrid = { ...prev };
      Object.keys(resetGrid).forEach((key) => {
        resetGrid[key].notes = "";
      });
      return resetGrid;
    });
  };

  // Helper function to parse biometric raw text, handling multi-line wrapping and location merge
  const parseAndMergeBulkText = (text: string): { parsedList: MemberAttendance[], unmatchedMembers: { pin: string, name: string }[] } => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return { parsedList: [], unmatchedMembers: [] };

    let startIdx = 0;

    // Detect if first line contains headers
    const firstLineParts = lines[0].split(/\t|,|;/).map((p) => p.trim());
    const isHeaderLine =
      isNaN(Number(firstLineParts[0])) && (
        firstLineParts[0].toLowerCase().includes("pin") ||
        firstLineParts[0].toLowerCase().includes("id") ||
        firstLineParts[0].toLowerCase().includes("নাম") ||
        firstLineParts[0].toLowerCase().includes("name") ||
        firstLineParts[0].toLowerCase().includes("in time") ||
        firstLineParts[0].toLowerCase().includes("check")
      );

    if (isHeaderLine) {
      startIdx = 1;
    }

    const rawRows: any[] = [];

    // Helper to extract remarks from a line
    const getRemarksFromLine = (lineStr: string, partsArr: string[]): string => {
      const cleanRem = (s: string) => s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

      // 1. Try standard index 9+ (for full rows)
      if (partsArr.length > 9) {
        let rem = partsArr.slice(9).map(p => p.trim()).filter(Boolean).join(" | ");
        rem = cleanRem(rem);
        if (rem && rem !== "-") return rem;
      }

      // 2. For continuation lines (no numeric PIN)
      const pin = (partsArr[0] || "").trim();
      const isNumericPin = /^\d+$/.test(pin);
      
      if (!isNumericPin) {
        const nonEmptyParts = partsArr.map(p => p.trim()).filter(p => p !== "" && p !== "-");
        if (nonEmptyParts.length > 0) {
          // If it contains IN: or OUT:, or if it's the only non-empty part
          if (nonEmptyParts.some(p => /^(IN|OUT):/i.test(p)) || nonEmptyParts.length === 1) {
            return cleanRem(nonEmptyParts.join(" | "));
          }
        }
      }
      return "";
    };

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      let parts = line.split("\t").map((p) => p.trim());

      if (parts.length < 3) {
        parts = line.split(",").map((p) => p.trim());
      }
      if (parts.length < 3) {
        parts = line.split(";").map((p) => p.trim());
      }
      if (parts.length < 3) {
        parts = line.split(/\s{2,}/).map((p) => p.trim());
      }

      if (parts.length === 0 || parts.every(p => p === "")) continue;

      let pin = parts[0] || "";
      let name = parts[1] || "";

      if (pin && /^\d+[\s-,\/]+/.test(pin)) {
        const pinMatch = pin.match(/^(\d+)[\s-,\/]+(.+)$/);
        if (pinMatch) {
          pin = pinMatch[1];
          name = pinMatch[2].trim();
          parts = [pin, name, ...parts.slice(1)];
        }
      }

      const lowerPin = pin.toLowerCase().trim();
      if (lowerPin === "pin" || lowerPin === "id" || lowerPin === "p.in" || lowerPin === "member pin") {
        continue;
      }

      const inTime = parts[2] || "";
      const outTime = parts[3] || "";
      const lateEntry = parts[4] || "";
      const earlyLeave = parts[5] || "";
      const workingHour = parts[6] || "";
      const absentOrLeave = parts[7] || "";
      const zone = parts[8] || "";
      let remarks = getRemarksFromLine(line, parts);

      // Auto-prefix remarks if missing IN/OUT prefix and it's a clear IN or OUT event
      if (remarks && !/^IN:|^OUT:/i.test(remarks.trim())) {
        const hasIn = inTime && inTime !== "-" && inTime !== "";
        const hasOut = outTime && outTime !== "-" && outTime !== "";
        if (hasIn && !hasOut) {
          remarks = `IN: ${remarks}`;
        } else if (hasOut && !hasIn) {
          remarks = `OUT: ${remarks}`;
        }
      }

      rawRows.push({
        pin,
        name,
        inTime,
        outTime,
        lateEntry,
        earlyLeave,
        workingHour,
        absentOrLeave,
        zone,
        remarks,
      });
    }

    // Run merge pass for multi-line wrapped text
    const mergedRows: any[] = [];
    let currentRecord: any = null;

    const isRealPin = (p: string) => {
      const trimmed = (p || "").trim();
      return trimmed !== "" && /^\d+$/.test(trimmed);
    };

    const cleanPinVal = (p: string) => (p || "").trim().replace(/^0+/, "");

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowPinClean = cleanPinVal(row.pin);
      const currentPinClean = currentRecord ? cleanPinVal(currentRecord.pin) : "";

      // If it's a new PIN (not the same as current), start a new record
      // If it's not a real PIN, it's a continuation line for the current record
      if (isRealPin(row.pin) && rowPinClean !== currentPinClean) {
        currentRecord = { ...row };
        mergedRows.push(currentRecord);
      } else if (currentRecord) {
        // Merge remarks from the continuation line or same-PIN line
        if (row.remarks && row.remarks.trim()) {
          const rowRem = row.remarks.trim();
          if (currentRecord.remarks && currentRecord.remarks.trim()) {
            const currentRem = currentRecord.remarks.trim();
            // Ensure we don't duplicate remarks if already merged from same line
            if (currentRem !== rowRem) {
              // Always add | separator if merging
              if (!currentRem.endsWith("|") && !rowRem.startsWith("|")) {
                currentRecord.remarks = currentRem + " | " + rowRem;
              } else {
                currentRecord.remarks = currentRem + " " + rowRem;
              }
            }
          } else {
            currentRecord.remarks = rowRem;
          }
        }
        // Merge other fields if currentRecord has empty/placeholder values but row has real values
        const mergeField = (field: string) => {
          const rowVal = (row[field] || "").trim();
          const currVal = (currentRecord[field] || "").trim();
          if (rowVal && rowVal !== "-" && (!currVal || currVal === "-")) {
            currentRecord[field] = rowVal;
          }
        };
        mergeField("inTime");
        mergeField("outTime");
        mergeField("lateEntry");
        mergeField("earlyLeave");
        mergeField("workingHour");
        mergeField("absentOrLeave");
        mergeField("zone");
      } else {
        // Fallback for first line if it doesn't have a PIN (though unlikely with startIdx logic)
        currentRecord = { ...row };
        mergedRows.push(currentRecord);
      }
    }

    // Sort and format final remarks so "In:" always comes first, followed by "Out:"
    const formatCombinedRemarks = (remStr: string): string => {
      if (!remStr) return "";
      // Split by | or lookahead for IN:/OUT:
      const rParts = remStr.replace(/\u00a0/g, " ").split(/\s*\|\s*|(?=\b(?:IN|OUT):)/i).map(p => p.trim()).filter(Boolean);
      const uniqueParts = Array.from(new Set(rParts));
      
      uniqueParts.sort((a, b) => {
        const aIn = /^In:/i.test(a);
        const bIn = /^In:/i.test(b);
        const aOut = /^Out:/i.test(a);
        const bOut = /^Out:/i.test(b);
        
        if (aIn && !bIn) return -1;
        if (!aIn && bIn) return 1;
        if (aOut && !bOut) return 1;
        if (!aOut && bOut) return -1;
        return 0;
      });
      
      // Filter out redundant "IN:" or "OUT:" if they are empty
      const filteredParts = uniqueParts.filter(p => !/^(IN|OUT):\s*$/i.test(p));
      
      return filteredParts.join(" | ");
    };

    const parsedList: MemberAttendance[] = [];
    const unmatchedMembers: { pin: string, name: string }[] = [];

    for (const row of mergedRows) {
      const pin = row.pin;
      const name = row.name;

      const cleanPin = pin.trim().replace(/^0+/, "");
      const matchedMember = [...members, ...mentors].find((m) => {
        const mPinClean = (m.pin || "").trim().replace(/^0+/, "");
        return mPinClean.toLowerCase() === cleanPin.toLowerCase() ||
               (!isNaN(Number(mPinClean)) && !isNaN(Number(cleanPin)) && Number(mPinClean) === Number(cleanPin));
      });

      if (!matchedMember) {
        const cleanName = name.split(/\s*[\(\[]/)[0].trim();
        unmatchedMembers.push({ pin, name: cleanName });
        continue;
      }

      // Keep Name exactly as pasted, default to matched member name if pasted name is missing
      const finalName = name.trim() || (matchedMember ? matchedMember.name : "Unknown");
      const inTime = row.inTime || "";
      const outTime = row.outTime || "";
      const lateEntry = row.lateEntry || "";
      const earlyLeave = row.earlyLeave || "";
      const workingHour = row.workingHour || "";
      const absentOrLeave = row.absentOrLeave || "";
      const zone = row.zone || "";
      const remarks = formatCombinedRemarks(row.remarks || "");

      let status: AttendanceStatus = "Present";
      const isAbsentOrLeave = absentOrLeave && absentOrLeave !== "-" && absentOrLeave !== "";
      const hasInTime = inTime && inTime !== "-" && inTime !== "";
      const hasOutTime = outTime && outTime !== "-" && outTime !== "";

      if (isAbsentOrLeave || (!hasInTime && !hasOutTime)) {
        status = "Absent";
      } else if (hasInTime && (!hasOutTime || outTime === "-")) {
        status = "Finger Punch Missing";
      } else {
        let isLate = false;
        const cleanLate = lateEntry ? lateEntry.trim().replace(/\s/g, "").toLowerCase() : "";
        const isLateValue =
          cleanLate &&
          cleanLate !== "-" &&
          cleanLate !== "0" &&
          cleanLate !== "00:00" &&
          cleanLate !== "0:00" &&
          cleanLate !== "00:00:00" &&
          cleanLate !== "0.00" &&
          cleanLate !== "0min" &&
          cleanLate !== "0mins";

        if (isLateValue) {
          isLate = true;
        } else if (hasInTime) {
          const timeMatch = inTime.match(/^(\d+):(\d+)(?::\d+)?\s*(AM|PM)$/i);
          if (timeMatch) {
            let hr = parseInt(timeMatch[1], 10);
            const min = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === "PM" && hr < 12) hr += 12;
            else if (ampm === "AM" && hr === 12) hr = 0;
            if (hr > 9 || (hr === 9 && min > 15)) isLate = true;
          }
        }
        status = isLate ? "Late Entry" : "Present";
      }

      parsedList.push({
        memberPin: pin,
        memberName: finalName,
        status,
        checkInTime: inTime || undefined,
        checkOutTime: outTime || undefined,
        lateEntry: lateEntry || undefined,
        earlyLeave: earlyLeave || undefined,
        workingHour: workingHour || undefined,
        absentOrLeave: absentOrLeave || undefined,
        zone: zone || undefined,
        remarks: remarks || undefined,
      });
    }

    return { parsedList, unmatchedMembers };
  };

  // Parser function for copy-pasted attendance text (Biometric / Excel Raw Export)
  // Direct parsing into previewRows state
  const handleParseBulkAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError("");
    setImportSummary(null);

    if (!bulkText.trim()) {
      setBulkError(
        "Please enter Report text",
      );
      return;
    }

    const { parsedList, unmatchedMembers } = parseAndMergeBulkText(bulkText);

    if (parsedList.length === 0 && unmatchedMembers.length === 0) {
      setBulkError(
        "কোনো মেম্বারের তথ্য ইম্পোর্ট করা যায়নি। ফাইল ফরম্যাট ও পিন চেক করুন।",
      );
      return;
    }

    if (unmatchedMembers.length > 0) {
      setBulkError(
        `সতর্কতা: নিচের মেম্বারদের সিস্টেমে পাওয়া যায়নি: ${unmatchedMembers.map(m => `${m.name} (Pin: ${m.pin})`).join(", ")}`
      );
    }

    setParsedPreviewRows(parsedList);
    if (parsedList.length > 0) {
        toast.success("Data processed! Please review the column preview in the table below.");
    }
  };

  // Direct post and publish raw text immediately without preview
  const handleDirectPostBulkAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError("");
    setImportSummary(null);

    if (!bulkText.trim()) {
      setBulkError(
       "Please enter Report text",
      );
      return;
    }

    const { parsedList, unmatchedMembers } = parseAndMergeBulkText(bulkText);

    if (parsedList.length === 0 && unmatchedMembers.length === 0) {
      setBulkError(
        "কোনো মেম্বারের তথ্য ইম্পোর্ট করা যায়নি। ফাইল ফরম্যাট ও পিন চেক করুন।",
      );
      return;
    }

    if (unmatchedMembers.length > 0) {
        setBulkError(
          `সতর্কতা: নিচের মেম্বারদের সিস্টেমে পাওয়া যায়নি: ${unmatchedMembers.map(m => `${m.name} (Pin: ${m.pin})`).join(", ")}`
        );
        return;
    }

    // Direct publish logic
    const campusRecords: Record<string, MemberAttendance[]> = {};
    let matchedCount = 0;
    
    parsedList.forEach((record) => {
      const matchedMember = [...members, ...mentors].find((m) => {
        const mPinClean = (m.pin || "").trim().replace(/^0+/, "");
        const recordPinClean = record.memberPin.trim().replace(/^0+/, "");
        return mPinClean.toLowerCase() === recordPinClean.toLowerCase() ||
               (!isNaN(Number(mPinClean)) && !isNaN(Number(recordPinClean)) && Number(mPinClean) === Number(recordPinClean));
      });

      if (matchedMember) {
        const campusName = matchedMember.campus || "Unknown Campus";
        if (!campusRecords[campusName]) campusRecords[campusName] = [];
        if (!campusRecords[campusName].some((r) => r.memberPin === record.memberPin)) {
          campusRecords[campusName].push(record);
          matchedCount++;
        }
      }
    });

    // ... (rest of the direct publish logic)

    const postedCampuses: string[] = [];
    Object.keys(campusRecords).forEach((campusName) => {
      const records = campusRecords[campusName];
      const newReport: AttendanceReport = {
        pin: `report-${Date.now()}-${Math.random()}`,
        date: reportDate,
        campus: campusName,
        records,
        postedBy: currentUser.name || "Manager",
        createdAt: new Date().toISOString(),
      };
      onAddReport(newReport);
      postedCampuses.push(`${campusName} (${records.length} জন)`);
    });

    toast.success("Attendance report posted directly!");
    setBulkText("");
    setBulkError("");
    setParsedPreviewRows([]);

    let summaryStr =
      `Date: ${reportDate}\nSuccessfully posted directly:\n` +
      postedCampuses.map((c) => `• ${c}`).join("\n");
    setImportSummary(summaryStr);
    setActiveTab("attendance-viewer");
  };

  // Confirm and Publish the parsed bulk attendance
  const handleConfirmPublishBulkAttendance = () => {
    if (parsedPreviewRows.length === 0) {
      toast.error("No data preview available.");
      return;
    }

    const campusRecords: Record<string, MemberAttendance[]> = {};
    let matchedCount = 0;
    let unmatchedCount = 0;
    const skippedPins: string[] = [];

    parsedPreviewRows.forEach((record) => {
      const cleanPin = record.memberPin.trim().replace(/^0+/, "");
      const matchedMember = [...members, ...mentors].find((m) => {
        const mPinClean = (m.pin || "").trim().replace(/^0+/, "");
        if (mPinClean.toLowerCase() === cleanPin.toLowerCase()) return true;
        if (
          !isNaN(Number(mPinClean)) &&
          !isNaN(Number(cleanPin)) &&
          Number(mPinClean) === Number(cleanPin)
        )
          return true;
        return false;
      });

      if (!matchedMember) {
        skippedPins.push(record.memberPin);
        unmatchedCount++;
        // Save under Unknown Campus so it is not lost, or skip
        const campusName = "Unknown Campus";
        if (!campusRecords[campusName]) {
          campusRecords[campusName] = [];
        }
        if (!campusRecords[campusName].some((r) => r.memberPin === record.memberPin)) {
          campusRecords[campusName].push(record);
        }
        return;
      }

      const campusName = matchedMember.campus || "Unknown Campus";
      if (!campusRecords[campusName]) {
        campusRecords[campusName] = [];
      }

      if (!campusRecords[campusName].some((r) => r.memberPin === record.memberPin)) {
        campusRecords[campusName].push(record);
        matchedCount++;
      }
    });

    const postedCampuses: string[] = [];
    Object.keys(campusRecords).forEach((campusName) => {
      const records = campusRecords[campusName];
      const newReport: AttendanceReport = {
        pin: `report-${Date.now()}-${Math.random()}`,
        date: reportDate,
        campus: campusName,
        records,
        postedBy: currentUser.name || "Manager",
        createdAt: new Date().toISOString(),
      };
      onAddReport(newReport);
      postedCampuses.push(`${campusName} (${records.length} জন)`);
    });

    toast.success("Attendance report posted successfully!");
    setBulkText("");
    setBulkError("");
    setParsedPreviewRows([]);

    let summaryStr =
      `Date: ${reportDate}\nSuccessfully posted:\n` +
      postedCampuses.map((c) => `• ${c}`).join("\n");
    if (unmatchedCount > 0) {
      summaryStr += `\n\n* ${unmatchedCount} PINs did not match any system record and were added as 'Unknown Campus'. PINs: ${skippedPins.join(", ")}`;
    }
    setImportSummary(summaryStr);
    setActiveTab("attendance-viewer");
  };

  // Handle Member CRUD submit
  const handleSaveMemberRoster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.pin || !memberForm.name || !memberForm.email) {
      toast.error("Please fill out Name, Email, and PIN.");
      return;
    }

    const campusObj = campuses.find((c) => c.name === memberForm.campus);
    const headCoordinatorPin = campusObj?.coordinatorPins?.[0];

    const memberData: any = {
      pin: memberForm.pin.trim(),
      name: memberForm.name.trim(),
      email: memberForm.email.trim(),
      designation: memberForm.designation.trim(),
      campus: memberForm.campus,
      mentorPin:
        memberForm.mentorPin ||
        (memberForm.role === "member"
          ? headCoordinatorPin
          : managers[0]?.pin || currentUser.pin),
      role: memberForm.role,
      permissions: memberForm.permissions,
      avatarUrl: memberForm.avatarUrl || undefined,
    };

    if (memberForm.password.trim()) {
      memberData.password = memberForm.password.trim();
    } else if (crudMode === "create") {
      memberData.password = "password";
    }

    if (!memberData.campus) {
      toast.error(
        "অবশ্যই একটি ক্যাম্পাস সিলেক্ট করতে হবে (Must assign a campus)",
      );
      return;
    }

    if (crudMode === "create") {
      if (
        members.some(
          (m) =>
            (m.pin?.toLowerCase() || "") ===
            (memberForm.pin?.toLowerCase() || ""),
        ) ||
        mentors.some(
          (m) =>
            (m.pin?.toLowerCase() || "") ===
            (memberForm.pin?.toLowerCase() || ""),
        ) ||
        managers.some(
          (m) =>
            (m.pin?.toLowerCase() || "") ===
            (memberForm.pin?.toLowerCase() || ""),
        )
      ) {
        toast.error("An account with this User PIN already exists.");
        return;
      }

      if (memberData.role === "mentor") {
        onAddMentor(memberData);
        toast.success(
          `Campus Coordinator "${memberData.name}" created successfully!`,
        );
      } else {
        onAddMember(memberData);
        toast.success(`Team Member "${memberData.name}" created successfully!`);
      }
    } else {
      if (
        selectedCrudPin !== memberForm.pin &&
        (members.some(
          (m) =>
            (m.pin?.toLowerCase() || "") ===
            (memberForm.pin?.toLowerCase() || ""),
        ) ||
          mentors.some(
            (m) =>
              (m.pin?.toLowerCase() || "") ===
              (memberForm.pin?.toLowerCase() || ""),
          ) ||
          managers.some(
            (m) =>
              (m.pin?.toLowerCase() || "") ===
              (memberForm.pin?.toLowerCase() || ""),
          ))
      ) {
        toast.error("An account with this User PIN already exists.");
        return;
      }
      if (memberForm.role !== selectedCrudRole) {
        onChangeUserRole(
          selectedCrudPin || "",
          selectedCrudRole || "member",
          memberForm.role,
          memberData,
        );
      } else {
        if (memberForm.role === "mentor") {
          onUpdateMentor(selectedCrudPin || "", memberData);
        } else {
          onUpdateMember(selectedCrudPin || "", memberData);
        }
        toast.success(
          `${memberData.role === "mentor" ? "Coordinator" : "Team Member"} "${memberData.name}" updated successfully!`,
        );
      }
    }

    // Reset Form & Close Modal
    setMemberForm({
      pin: "",
      name: "",
      email: "",
      password: "password",
      campus: "",
      mentorPin: "",
      designation: "",
      permissions: ["member_attendance", "member_notices", "member_post_notice"],
      avatarUrl: "",
      role: "member",
    });
    setCrudMode("create");
    setSelectedCrudPin(null);
    setIsRosterModalOpen(false);
  };

  // Handle Mentor CRUD submit
  const handleSaveMentorRoster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorForm.pin || !mentorForm.name || !mentorForm.email) {
      toast.error("Please fill out Name, Email, and PIN.");
      return;
    }

    const mentorData: any = {
      pin: mentorForm.pin.trim(),
      name: mentorForm.name.trim(),
      email: mentorForm.email.trim(),
      designation: mentorForm.designation.trim(),
      password: mentorForm.password.trim() || "password",
      role: mentorForm.role,
      campus: mentorForm.campus,
      mentorPin: mentorForm.mentorPin || undefined,
      permissions: mentorForm.permissions,
      avatarUrl: mentorForm.avatarUrl || undefined,
    };

    if (!mentorData.campus) {
      toast.error(
        "অবশ্যই একটি ক্যাম্পাস সিলেক্ট করতে হবে (Must assign a campus)",
      );
      return;
    }

    if (crudMode === "create") {
      if (
        mentors.some(
          (m) =>
            (m.pin?.toLowerCase() || "") ===
            (mentorForm.pin?.toLowerCase() || ""),
        ) ||
        members.some(
          (m) =>
            (m.pin?.toLowerCase() || "") ===
            (mentorForm.pin?.toLowerCase() || ""),
        ) ||
        managers.some(
          (m) =>
            (m.pin?.toLowerCase() || "") ===
            (mentorForm.pin?.toLowerCase() || ""),
        )
      ) {
        toast.error("An account with this User PIN already exists.");
        return;
      }
      onAddMentor(mentorData);
      toast.success(
        `Campus Coordinator "${mentorData.name}" created successfully!`,
      );
    } else {
      if (
        selectedCrudPin !== mentorForm.pin &&
        (mentors.some(
          (m) =>
            (m.pin?.toLowerCase() || "") ===
            (mentorForm.pin?.toLowerCase() || ""),
        ) ||
          members.some(
            (m) =>
              (m.pin?.toLowerCase() || "") ===
              (mentorForm.pin?.toLowerCase() || ""),
          ) ||
          managers.some(
            (m) =>
              (m.pin?.toLowerCase() || "") ===
              (mentorForm.pin?.toLowerCase() || ""),
          ))
      ) {
        toast.error("An account with this User PIN already exists.");
        return;
      }
      if (mentorForm.role !== "mentor") {
        onChangeUserRole(
          selectedCrudPin || "",
          "mentor",
          mentorForm.role,
          mentorData,
        );
      } else {
        onUpdateMentor(selectedCrudPin || "", mentorData);
        toast.success(
          `Campus Coordinator "${mentorData.name}" updated successfully!`,
        );
      }
    }

    // Reset Form & Close Modal
    setMentorForm({
      pin: "",
      name: "",
      email: "",
      password: "password",
      campus: "",
      mentorPin: "",
      designation: "",
      permissions: [
        "mentor_attendance",
        "mentor_notices",
        "mentor_history",
        
      ],
      avatarUrl: "",
      role: "mentor",
    });
    setCrudMode("create");
    setSelectedCrudPin(null);
    setIsRosterModalOpen(false);
  };

  // --- ASSIGNMENT STATE ---
  const [selectedMemberPin, setSelectedMemberPin] = useState<string>("");
  const [selectedMentorPin, setSelectedMentorPin] = useState<string>("");
  const [assignCampus, setAssignCampus] = useState<string>(
    () => campuses[0]?.name || "",
  );

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberPin || !selectedMentorPin || !assignCampus) {
      alert("Please select a member, a campus coordinator, and a campus.");
      return;
    }

    onUpdateAssignment(selectedMemberPin, selectedMentorPin, assignCampus);
    const mName = members.find((m) => m.pin === selectedMemberPin)?.name;
    const mentorName = mentors.find((m) => m.pin === selectedMentorPin)?.name;
    alert(
      `Successfully assigned ${mName} to Campus Coordinator ${mentorName} at ${assignCampus}!`,
    );
    setSelectedMemberPin("");
  };

  // --- FEEDBACK RESOLUTION STATE ---
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const [resolutionStatus, setResolutionStatus] = useState<
    Record<string, AttendanceStatus>
  >({});

  const handleResolveTicket = (
    feedback: AttendanceFeedback,
    action: "Resolved" | "Reviewed",
  ) => {
    const managerComment = commentInputs[feedback.pin] || "";
    if (action === "Resolved") {
      const selectedNewStatus = resolutionStatus[feedback.pin] || "Present";
      onUpdateReportStatus(
        feedback.reportPin,
        feedback.memberPin,
        selectedNewStatus,
      );
      onResolveFeedback(
        feedback.pin,
        `Status updated to ${selectedNewStatus}. ${managerComment}`.trim(),
        "Resolved",
      );
      alert(
        `Ticket resolved! Member attendance updated to "${selectedNewStatus}".`,
      );
    } else {
      onResolveFeedback(
        feedback.pin,
        managerComment || "Feedback reviewed and recorded.",
        "Reviewed",
      );
      alert("Ticket marked as reviewed.");
    }
  };

  // Missing attendance calculation logic
  const missingAttendanceData = React.useMemo(() => {
    const todayObj = new Date();
    const currentYear = todayObj.getFullYear();
    const currentMonth = todayObj.getMonth(); // 0-indexed
    const currentDay = todayObj.getDate();

    const missing: { date: string; campuses: string[] }[] = [];

    // Calculate missing dates from the 1st of the current month up to yesterday (currentDay - 1)
    if (currentDay > 1) {
      for (let d = 1; d < currentDay; d++) {
        const dateObj = new Date(currentYear, currentMonth, d);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
        const dd = String(dateObj.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const missingCampuses: string[] = [];
        campuses.forEach((campus) => {
          // Verify if this campus has any active team members or coordinators
          const hasPeople = [...members, ...mentors].some(
            (m) => m.campus === campus.name,
          );
          if (!hasPeople) return;

          // Check if report exists
          const reportExists = reports.some(
            (r) => r.date === dateStr && r.campus === campus.name,
          );
          if (!reportExists) {
            missingCampuses.push(campus.name);
          }
        });

        if (missingCampuses.length > 0) {
          missing.push({
            date: dateStr,
            campuses: missingCampuses,
          });
        }
      }
    }

    return {
      currentMonthMissing: missing,
      isFirstDayOfMonth: currentDay === 1,
    };
  }, [reports, campuses, members, mentors]);

  const notificationProblematicAttendances = React.useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const problematic: {
      date: string;
      campus: string;
      memberPin: string;
      memberName: string;
      issue: string;
      record: MemberAttendance;
      reportPin: string;
    }[] = [];

    reports.forEach((report) => {
      // Include today's reports as well
      if (report.date > today) return;

      report.records.forEach((record) => {
        const status = getEffectiveStatus(record);
        const hours = calculateWorkingHours(
          record.checkInTime,
          record.checkOutTime,
        );
        let issue = "";

        if (status === "Finger Punch Missing") {
          issue = "Finger Punch Missing";
        } else if (status === "Absent") {
          issue = "Absent";
        } else if (status === "< 6hr") {
          issue = `< 6hr (${Math.floor(hours || 0)}h ${Math.round(((hours || 0) % 1) * 60)}m)`;
        } else if (status === "< 10hrs") {
          issue = "< 10hrs (Low Hours)";
        } else if (status === "Late Entry") {
          issue = "Late Entry";
        } else if (status === "Early Leave") {
          issue = "Early Leave";
        }

        if (issue) {
          const notificationId = `${record.memberPin}-${report.date}-${issue}`;
          if (!dismissedNotifications.includes(notificationId)) {
            problematic.push({
              date: report.date,
              campus: report.campus,
              memberPin: record.memberPin,
              memberName: record.memberName,
              issue: issue,
              record: record,
              reportPin: report.pin,
            });
          }
        }
      });
    });
    return problematic;
  }, [reports, dismissedNotifications]);

  const notificationMissingAttendances = React.useMemo(() => {
    const missing: {
      date: string;
      campus: string;
      memberPin: string;
      memberName: string;
    }[] = [];
    const allUniqueMembers = Array.from(
      new Map([...members, ...mentors].map((m) => [m.pin, m])).values(),
    );

    reports.forEach((report) => {
      const campusMembers = allUniqueMembers.filter(
        (m) => m.campus === report.campus,
      );
      const campusRecordPins = new Set(report.records.map((r) => r.memberPin));

      campusMembers.forEach((member) => {
        if (!campusRecordPins.has(member.pin)) {
          const notificationId = `${member.pin}-${report.date}-absent`;
          if (!dismissedNotifications.includes(notificationId)) {
            missing.push({
              date: report.date,
              campus: report.campus,
              memberPin: member.pin,
              memberName: member.name,
            });
          }
        }
      });
    });
    return missing;
  }, [reports, members, mentors, dismissedNotifications]);

  const unreadProfileReqs = profileRequests.filter(
    (r) => r.status === "Pending" && !readRequestPins.includes(r.pin),
  );
  const unreadEditReqs = attendanceEditRequests.filter(
    (r) => r.status === "Pending" && !readRequestPins.includes(r.pin),
  );
  const unreadLeaveReqs = leaveRequests.filter(
    (r) => r.status === "Pending" && !readRequestPins.includes(r.pin),
  );

  const totalUnreadRequestsCount =
    unreadProfileReqs.length + unreadEditReqs.length + unreadLeaveReqs.length;
  const myEmails = emails.filter(e => e.toEmail === currentUser.email || e.toEmail === `${currentUser.pin}@portal.com`);
  const unreadEmailCount = myEmails.filter(e => !e.isRead).length;

  const totalNotificationBadgeCount =
    missingAttendanceData.currentMonthMissing.length +
    notificationProblematicAttendances.length +
    notificationMissingAttendances.length +
    totalUnreadRequestsCount +
    unreadEmailCount;


  const filteredAndSortedLeaveRequests = React.useMemo(() => {
    let result = [...leaveRequests];
    
    // 1. Search
    if (leaveSearchPin.trim()) {
      const q = leaveSearchPin.toLowerCase();
      result = result.filter(r => 
        r.memberPin.toLowerCase().includes(q) || 
        r.memberName.toLowerCase().includes(q)
      );
    }
    
    // 2. Status
    if (leaveFilterStatus !== 'All') {
      result = result.filter(r => r.status === leaveFilterStatus);
    }
    
    // 3. Leave Type
    if (leaveFilterType !== 'All') {
      result = result.filter(r => r.leaveType === leaveFilterType);
    }
    
    // 4. Month
    if (leaveFilterMonth !== 'All') {
      result = result.filter(r => r.startDate?.substring(0, 7) === leaveFilterMonth);
    }
    
    // 5. Sort
    result.sort((a, b) => {
      if (leaveSortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (leaveSortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        // duration
        const aStart = new Date(a.startDate).getTime();
        const aEnd = new Date(a.endDate).getTime();
        const aDur = (aEnd - aStart) / (1000 * 60 * 60 * 24);
        
        const bStart = new Date(b.startDate).getTime();
        const bEnd = new Date(b.endDate).getTime();
        const bDur = (bEnd - bStart) / (1000 * 60 * 60 * 24);
        
        if (leaveSortBy === 'duration_desc') return bDur - aDur;
        if (leaveSortBy === 'duration_asc') return aDur - bDur;
        return 0;
      }
    });
    
    return result;
  }, [leaveRequests, leaveSearchPin, leaveFilterStatus, leaveFilterType, leaveFilterMonth, leaveSortBy]);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Notification Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="text-left">
          <h2 className="text-md font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-4.5 h-4.5 text-indigo-600" />
            Mentor's Dashboard
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            
          </p>
          {!isSidebarOpen ? (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all shadow-3xs group"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Open Dashboard Menu</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-all shadow-3xs group"
            >
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Close Dashboard Menu</span>
            </button>
          )}
        </div>

        {/* Notification Bell Button & Popover */}
        <div className="relative self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${
              isNotificationsOpen
                ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                : "bg-indigo-50/50 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200"
            }`}
          >
            <Bell className="w-5 h-5" />
            {totalNotificationBadgeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {totalNotificationBadgeCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <>
              {/* Overlay background block to close popover when clicking outside */}
              <div
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsNotificationsOpen(false)}
              />

              {/* Notification Popover Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-[320px] sm:w-[440px] md:w-[480px] max-h-[520px] bg-white border border-indigo-100 rounded-3xl shadow-xl p-5 text-left z-50 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4.5 h-4.5 text-indigo-600" />
                    <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider font-mono">
                      Notifications & Requests
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 mt-3 px-1 gap-1 shrink-0">
                  {[
                    { id: "requests", label: "Requests", count: totalUnreadRequestsCount },
                    { id: "problematic", label: "Issues", count: notificationProblematicAttendances.length },
                    { id: "missing", label: "Missing", count: notificationMissingAttendances.length + missingAttendanceData.currentMonthMissing.length },
                    { id: "notices", label: "Notices ", count: unreadEmailCount },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setNotificationActiveTab(tab.id as any)}
                      className={`flex-1 pb-3 pt-1 px-1 text-[10px] font-black uppercase tracking-wider transition-all relative ${
                        notificationActiveTab === tab.id
                          ? "text-indigo-600"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {tab.label}
                        {tab.count > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] leading-none ${
                            notificationActiveTab === tab.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </div>
                      {notificationActiveTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div className="overflow-y-auto flex-1 pr-1 mt-4 space-y-5">
                  {/* --- TAB CONTENT: REQUESTS --- */}
                  {notificationActiveTab === "requests" && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Plus className="w-3.5 h-3.5 text-amber-500" />
                          New Requests ({totalUnreadRequestsCount})
                        </h4>
                        {totalUnreadRequestsCount > 0 && (
                          <button
                            onClick={markAllRequestsAsRead}
                            className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider cursor-pointer"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>

                      {totalUnreadRequestsCount === 0 ? (
                        <div className="p-3 bg-slate-50 rounded-2xl text-center text-[10px] text-slate-400 italic">
                          No new pending requests.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Unread Profile Requests */}
                          {unreadProfileReqs.map((req) => (
                            <div
                              key={req.pin}
                              onClick={() => {
                                setActiveTab("verification");
                                setIsNotificationsOpen(false);
                                window.scrollTo({ top: 300, behavior: "smooth" });
                              }}
                              className="flex items-start justify-between gap-2.5 p-3 bg-amber-50/30 border border-amber-100/70 hover:bg-amber-50/50 rounded-2xl transition-all cursor-pointer text-left"
                            >
                              <div className="flex gap-2 items-start">
                                <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[11px] font-bold text-slate-800">
                                    Profile Correction Request
                                  </p>
                                  <p className="text-[9px] text-slate-500 font-medium">
                                    {req.requestedName} (PIN: {req.requestedPin})
                                    Requested a name/PIN change.
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReadRequestPins((prev) => [...prev, req.pin]);
                                  toast.success("পঠিত হিসেবে চিহ্নিত করা হয়েছে!");
                                }}
                                className="p-1 hover:bg-amber-100/80 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                                title="Mark as Read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          {/* Unread Attendance Edit Requests */}
                          {unreadEditReqs.map((req) => (
                            <div
                              key={req.pin}
                              onClick={() => {
                                setActiveTab("edit_requests");
                                setIsNotificationsOpen(false);
                                window.scrollTo({ top: 300, behavior: "smooth" });
                              }}
                              className="flex items-start justify-between gap-2.5 p-3 bg-indigo-50/30 border border-indigo-100/50 hover:bg-indigo-50/50 rounded-2xl transition-all cursor-pointer text-left"
                            >
                              <div className="flex gap-2 items-start">
                                <Edit3 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[11px] font-bold text-slate-800">
                                    Attendance Correction Request
                                  </p>
                                  <p className="text-[9px] text-slate-500 font-medium">
                                    Coordinator {req.coordinatorName} requested an attendance change for {req.memberName}.
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReadRequestPins((prev) => [...prev, req.pin]);
                                  toast.success("পঠিত হিসেবে চিহ্নিত করা হয়েছে!");
                                }}
                                className="p-1 hover:bg-indigo-100/50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                                title="Mark as Read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          {/* Unread Leave Requests */}
                          {unreadLeaveReqs.map((req) => (
                            <div
                              key={req.pin}
                              onClick={() => {
                                setActiveTab("leave-requests");
                                setIsNotificationsOpen(false);
                                window.scrollTo({ top: 300, behavior: "smooth" });
                              }}
                              className="flex items-start justify-between gap-2.5 p-3 bg-rose-50/20 border border-rose-100/40 hover:bg-rose-50/40 rounded-2xl transition-all cursor-pointer text-left"
                            >
                              <div className="flex gap-2 items-start">
                                <ClipboardList className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[11px] font-bold text-slate-800">
                                    Leave Request
                                  </p>
                                  <p className="text-[9px] text-slate-500 font-medium">
                                    {req.memberName} requested {req.leaveType} leave. (Date: {req.startDate})
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReadRequestPins((prev) => [...prev, req.pin]);
                                  toast.success("পঠিত হিসেবে চিহ্নিত করা হয়েছে!");
                                }}
                                className="p-1 hover:bg-rose-100/50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                                title="Mark as Read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                        </div>
                      )}
                    </div>
                  )}

                  {notificationActiveTab === "notices" && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {unreadEmailCount === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                          <Inbox className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                          <p className="font-bold text-slate-500">No new notices</p>
                        </div>
                      ) : (
                        myEmails.filter(e => !e.isRead).map((msg) => (
                          <div
                            key={msg.pin}
                            className="flex flex-col p-4 bg-slate-50 border border-slate-150 rounded-2xl transition-all hover:bg-white hover:border-indigo-200 group relative text-left"
                          >
                            <div 
                              className="cursor-pointer"
                              onClick={() => {
                                onMarkEmailAsRead(msg.pin);
                                setActiveTab("notices");
                                setIsNotificationsOpen(false);
                                window.scrollTo({ top: 300, behavior: "smooth" });
                              }}
                            >
                              <div className="flex justify-between items-start mb-1.5">
                                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider font-mono">
                                  {msg.fromName}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold">
                                  {new Date(msg.date).toLocaleDateString()}
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-slate-800 line-clamp-1 mb-1">
                                {msg.subject}
                              </h4>
                              <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed italic">
                                "{msg.body}"
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkEmailAsRead(msg.pin);
                                toast.success("পঠিত হিসেবে চিহ্নিত করা হয়েছে!");
                              }}
                              className="absolute bottom-3 right-3 p-2 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                              title="Mark as Read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* --- TAB CONTENT: PROBLEMATIC --- */}
                  {notificationActiveTab === "problematic" && (
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Problematic Attendance ({notificationProblematicAttendances.length})
                      </h4>

                      {notificationProblematicAttendances.length === 0 ? (
                        <div className="p-3 bg-slate-50 rounded-2xl text-center text-[10px] text-slate-400 italic">
                          No problematic attendance records.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {notificationProblematicAttendances.map((m) => (
                            <div
                              key={`${m.date}-${m.memberPin}-${m.issue}`}
                              onClick={() => {
                                setAttendanceViewerDate(m.date);
                                setAttendanceViewerCampus(m.campus);
                                setActiveTab("attendance-viewer");
                                setIsNotificationsOpen(false);
                                window.scrollTo({ top: 300, behavior: "smooth" });
                              }}
                              className="flex items-center justify-between gap-2.5 p-3 bg-rose-50/30 border border-rose-100/50 hover:bg-rose-50/50 rounded-2xl transition-all cursor-pointer text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[11px] font-bold text-slate-800 truncate">
                                    {m.memberName} ({m.memberPin})
                                  </p>
                                  <span className="text-[8px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded shrink-0">
                                    {m.issue}
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                                  <Calendar className="w-3 h-3" /> {m.date} | 📍 {m.campus}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  handleDismissNotification(`${m.memberPin}-${m.date}-${m.issue}`, e);
                                }}
                                className="p-1.5 hover:bg-rose-100/80 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                                title="Mark as Read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- TAB CONTENT: MISSING --- */}
                  {notificationActiveTab === "missing" && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <UserMinus className="w-3.5 h-3.5 text-amber-600" />
                          Absent Member Records ({notificationMissingAttendances.length})
                        </h4>

                        {notificationMissingAttendances.length === 0 ? (
                          <div className="p-3 bg-slate-50 rounded-2xl text-center text-[10px] text-slate-400 italic">
                            No absent records.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {notificationMissingAttendances.map((m) => (
                              <div
                                key={`${m.date}-${m.memberPin}-absent`}
                                onClick={() => {
                                  setAttendanceViewerDate(m.date);
                                  setAttendanceViewerCampus(m.campus);
                                  setActiveTab("attendance-viewer");
                                  setIsNotificationsOpen(false);
                                  window.scrollTo({ top: 300, behavior: "smooth" });
                                }}
                                className="flex items-center justify-between gap-2.5 p-3 bg-amber-50/30 border border-amber-100/50 hover:bg-amber-50/50 rounded-2xl transition-all cursor-pointer text-left"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-bold text-slate-800 truncate font-sans">
                                    {m.memberName} ({m.memberPin})
                                  </p>
                                  <p className="text-[9px] text-slate-500 font-medium flex items-center gap-1 mt-1 font-sans">
                                    <Calendar className="w-3 h-3" /> {m.date} | 📍 {m.campus}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    handleDismissNotification(`${m.memberPin}-${m.date}-absent`, e);
                                  }}
                                  className="p-1.5 hover:bg-amber-100/80 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                                  title="Mark as Read"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <AlertCircle className="w-3.5 h-3.5 text-indigo-600" />
                          Attendance Alert ({missingAttendanceData.currentMonthMissing.length})
                        </h4>
                        <p className="text-[9px] text-slate-500 font-medium">
                          Campus attendance reports still pending for this month
                        </p>

                        {(() => {
                          const list = missingAttendanceData.currentMonthMissing;
                          if (list.length === 0) {
                            return (
                              <div className="py-2 text-center text-[10px] font-bold text-emerald-600">
                                🎉 All reports posted!
                              </div>
                            );
                          }
                          return (
                            <div className="space-y-2">
                              {list.map((item) => (
                                <div
                                  key={item.date}
                                  onClick={() => {
                                    setReportDate(item.date);
                                    if (item.campuses.length > 0) {
                                      setReportCampus(item.campuses[0]);
                                    }
                                    setActiveTab("attendance");
                                    setIsNotificationsOpen(false);
                                    window.scrollTo({ top: 300, behavior: "smooth" });
                                  }}
                                  className="bg-indigo-50/20 border border-indigo-100/70 rounded-2xl p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-indigo-50/50 transition-colors group"
                                >
                                  <p className="text-[10px] font-black text-indigo-950 flex items-center gap-1 font-mono">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                    {item.date}
                                  </p>
                                  <div className="flex items-center gap-1 text-[8px] font-bold text-indigo-400 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">
                                    Click to post
                                    <ChevronRight className="w-3 h-3" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
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
                  Manager's Menu
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
                {[
                  { id: "attendance", icon: FileSpreadsheet, label: "Post Attendance" },
                  { id: "attendance-viewer", icon: Users, label: "Team Member Attendance" },
                  { id: "members", icon: Users, label: "Team Members List" },
                  { id: "edit_requests", icon: Edit3, label: "Attendance Adjustments", count: attendanceEditRequests.filter(r => r.status === "Pending").length, color: "indigo" },
                  { id: "leave-requests", icon: ClipboardList, label: "Leave Requests", count: leaveRequests.filter(r => r.status === "Pending").length, color: "rose" },
                  { id: "roster", icon: Users, label: "Member Management" },
                  { id: "campuses", icon: MapPin, label: "Campus Settings" },
                  { id: "notices", icon: Megaphone, label: "Notice Board" },
                  { id: "verification", icon: Shield, label: "Profile Verification Requests", count: profileRequests.filter(r => r.status === "Pending").length, color: "rose" },
                  { id: "profile", icon: User, label: "Profile Settings" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setViewedMemberPin(null);
                      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 ${
                      activeTab === tab.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <tab.icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-normal text-left leading-tight break-words pr-5">
                      {tab.label}
                    </span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 ${tab.color === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'} text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white font-mono`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
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
        <div className={`flex-1 min-w-0 space-y-4 sm:space-y-6 relative transition-all duration-300 w-full`}>
          <ConfirmModal
            isOpen={!!confirmDeleteCampusName}
            onClose={() => setConfirmDeleteCampusName(null)}
            onConfirm={() => {
              if (confirmDeleteCampusName)
                onDeleteCampus(confirmDeleteCampusName);
              setConfirmDeleteCampusName(null);
            }}
            title="Delete Campus"
            message={`Are you sure you want to delete "${confirmDeleteCampusName}" campus? This action cannot be undone.`}
          />
          <ConfirmModal
            isOpen={!!confirmDeleteMemberPin}
            onClose={() => setConfirmDeleteMemberPin(null)}
            onConfirm={() => {
              if (confirmDeleteMemberPin)
                onDeleteMember(confirmDeleteMemberPin);
              setConfirmDeleteMemberPin(null);
            }}
            title="Delete Team Member"
            message="Are you sure you want to delete this team member? This action cannot be undone."
          />
          <ConfirmModal
            isOpen={!!confirmDeleteMentorPin}
            onClose={() => setConfirmDeleteMentorPin(null)}
            onConfirm={() => {
              if (confirmDeleteMentorPin)
                onDeleteMentor(confirmDeleteMentorPin);
              setConfirmDeleteMentorPin(null);
            }}
            title="Delete Campus Coordinator"
            message="Are you sure you want to delete this campus coordinator? This action cannot be undone."
          />
          <ConfirmModal
            isOpen={!!confirmDeleteLeavePin}
            onClose={() => setConfirmDeleteLeavePin(null)}
            onConfirm={() => {
              if (confirmDeleteLeavePin)
                onDeleteLeaveRequest(confirmDeleteLeavePin);
              setConfirmDeleteLeavePin(null);
            }}
            title="Delete Leave Request"
            message="Are you sure you want to delete this leave request? This action cannot be undone."
          />
          <ConfirmModal
            isOpen={!!confirmDeleteEditReqPin}
            onClose={() => setConfirmDeleteEditReqPin(null)}
            onConfirm={() => {
              if (confirmDeleteEditReqPin)
                onDeleteAttendanceEditRequest(confirmDeleteEditReqPin);
              setConfirmDeleteEditReqPin(null);
            }}
            title="Delete Edit Request"
            message="Are you sure you want to delete this edit request? This action cannot be undone."
          />
          <ConfirmModal
            isOpen={!!confirmDeleteAttendance}
            onClose={() => setConfirmDeleteAttendance(null)}
            onConfirm={() => {
              if (confirmDeleteAttendance) {
                onDeleteAttendanceRecord(
                  confirmDeleteAttendance.reportPin,
                  confirmDeleteAttendance.memberPin,
                );
              }
              setConfirmDeleteAttendance(null);
            }}
            title="Delete Attendance Record"
            message={`Are you sure you want to delete the attendance record for "${confirmDeleteAttendance?.memberName} (${confirmDeleteAttendance?.memberPin})"? This action cannot be undone.`}
          />
          <ConfirmModal
            isOpen={!!confirmDeleteReportInfo}
            onClose={() => setConfirmDeleteReportInfo(null)}
            onConfirm={() => {
              if (confirmDeleteReportInfo) {
                onDeleteReport(
                  confirmDeleteReportInfo.date,
                  confirmDeleteReportInfo.campus,
                );
              }
              setConfirmDeleteReportInfo(null);
            }}
            title="Delete Report"
            message={`Are you sure you want to delete all attendance records for "${confirmDeleteReportInfo?.date}" (${confirmDeleteReportInfo?.campus === "All" ? "all campuses" : confirmDeleteReportInfo?.campus})? This action cannot be undone.`}
          />

          <ConfirmModal
            isOpen={confirmDeletePreviewRowIndex !== null}
            onClose={() => setConfirmDeletePreviewRowIndex(null)}
            onConfirm={() => {
              if (confirmDeletePreviewRowIndex !== null) {
                const updated = [...parsedPreviewRows];
                updated.splice(confirmDeletePreviewRowIndex, 1);
                setParsedPreviewRows(updated);
                toast.success("Record cancelled!");
              }
              setConfirmDeletePreviewRowIndex(null);
            }}
            title="Delete Preview Record"
            message="Are you sure you want to delete this preview record?"
          />

          {/* Edit Preview Record Modal */}
          {editingPreviewRow && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xl max-w-lg w-full text-left space-y-6 overflow-y-auto max-h-[90vh]"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-indigo-600" />
                    Edit Preview Record
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingPreviewRow(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const updated = [...parsedPreviewRows];
                    updated[editingPreviewRow.index] = editingPreviewRow.record;
                    setParsedPreviewRows(updated);
                    setEditingPreviewRow(null);
                    toast.success("Record updated successfully!");
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">PIN</label>
                      <input
                        type="text"
                        required
                        value={editingPreviewRow.record.memberPin}
                        onChange={(e) => {
                          const updatedRecord = { ...editingPreviewRow.record, memberPin: e.target.value };
                          // Auto resolve member name if exists
                          const cleanPin = e.target.value.trim().replace(/^0+/, "");
                          const matchedMember = [...members, ...mentors].find((m) => {
                            const mPinClean = (m.pin || "").trim().replace(/^0+/, "");
                            return mPinClean.toLowerCase() === cleanPin.toLowerCase() ||
                                   (!isNaN(Number(mPinClean)) && !isNaN(Number(cleanPin)) && Number(mPinClean) === Number(cleanPin));
                          });
                          if (matchedMember) {
                            updatedRecord.memberName = matchedMember.name;
                          }
                          setEditingPreviewRow({ ...editingPreviewRow, record: updatedRecord });
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={editingPreviewRow.record.memberName}
                        onChange={(e) => setEditingPreviewRow({
                          ...editingPreviewRow,
                          record: { ...editingPreviewRow.record, memberName: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">In Time</label>
                      <ClockInput
                        value={editingPreviewRow.record.checkInTime || ""}
                        onChange={(val) => setEditingPreviewRow({
                          ...editingPreviewRow,
                          record: { ...editingPreviewRow.record, checkInTime: val }
                        })}
                        placeholder="e.g. 09:00 AM"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Out Time</label>
                      <ClockInput
                        value={editingPreviewRow.record.checkOutTime || ""}
                        onChange={(val) => setEditingPreviewRow({
                          ...editingPreviewRow,
                          record: { ...editingPreviewRow.record, checkOutTime: val }
                        })}
                        placeholder="e.g. 05:00 PM"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Late Entry</label>
                      <input
                        type="text"
                        placeholder="e.g. -"
                        value={editingPreviewRow.record.lateEntry || ""}
                        onChange={(e) => setEditingPreviewRow({
                          ...editingPreviewRow,
                          record: { ...editingPreviewRow.record, lateEntry: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Early Leave</label>
                      <input
                        type="text"
                        placeholder="e.g. 0:13"
                        value={editingPreviewRow.record.earlyLeave || ""}
                        onChange={(e) => setEditingPreviewRow({
                          ...editingPreviewRow,
                          record: { ...editingPreviewRow.record, earlyLeave: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">W. Hour (Working Hour)</label>
                      <input
                        type="text"
                        placeholder="e.g. 10:33"
                        value={editingPreviewRow.record.workingHour || ""}
                        onChange={(e) => setEditingPreviewRow({
                          ...editingPreviewRow,
                          record: { ...editingPreviewRow.record, workingHour: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Absent/Leave</label>
                      <input
                        type="text"
                        placeholder="e.g. -"
                        value={editingPreviewRow.record.absentOrLeave || ""}
                        onChange={(e) => setEditingPreviewRow({
                          ...editingPreviewRow,
                          record: { ...editingPreviewRow.record, absentOrLeave: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Zone</label>
                      <input
                        type="text"
                        placeholder="e.g. Concord Tower"
                        value={editingPreviewRow.record.zone || ""}
                        onChange={(e) => setEditingPreviewRow({
                          ...editingPreviewRow,
                          record: { ...editingPreviewRow.record, zone: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status</label>
                      <select
                        value={editingPreviewRow.record.status}
                        onChange={(e) => setEditingPreviewRow({
                          ...editingPreviewRow,
                          record: { ...editingPreviewRow.record, status: e.target.value as AttendanceStatus }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="Present">Present</option>
                        <option value="Late Entry">Late Entry</option>
                        <option value="Absent">Absent</option>
                        <option value="Leave">Leave</option>
                        <option value="Finger Punch Missing">Finger Punch Missing</option>
                        <option value="< 10hrs">&lt; 10hrs</option>
                        <option value="Half Day">Half Day</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Remarks</label>
                    <textarea
                      rows={2}
                      value={editingPreviewRow.record.remarks || ""}
                      onChange={(e) => setEditingPreviewRow({
                        ...editingPreviewRow,
                        record: { ...editingPreviewRow.record, remarks: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingPreviewRow(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

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
                  Back to Members List
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

          {/* Tab 1: POST ATTENDANCE */}
          {activeTab === "attendance" && viewedMemberPin === null && (
            <motion.div
              key="tab-attendance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-md text-left">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5 mb-2">
                  <Calendar className="w-5.5 h-5.5 text-indigo-600" />
                  Publish Attendance Reports
                </h2>
                <p className="text-xs text-slate-500 font-medium mb-6">
              
                </p>

                <form
                  onSubmit={handleDirectPostBulkAttendance}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Report Date
                    </label>
                    <input
                      type="date"
                      required
                      value={reportDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full max-w-md px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Paste Report Text
                    </label>
                    <textarea
                      rows={8}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder=""
                      className="w-full p-4 border border-slate-200 rounded-2xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {bulkError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium whitespace-pre-line font-mono">
                      {bulkError}
                    </div>
                  )}

                  {importSummary && (
                    <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-medium whitespace-pre-line">
                      <h4 className="font-extrabold text-emerald-900 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                        <Check className="w-4 h-4 text-emerald-600" />
                      Import Successfully (Import Summary)
                      </h4>
                      {importSummary}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                     Publish Attendance Report
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* Tab 2: TEAM MEMBER ATTENDANCE VIEWER */}
          {activeTab === "attendance-viewer" && viewedMemberPin === null && (
            <motion.div
              key="tab-attendance-viewer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-left space-y-6"
            >
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Team Member Attendance
                </h2>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-wrap items-end gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-Attendance Adjustmentsblack uppercase text-slate-500 tracking-wider mb-2">
                    Select Month (For Export)
                  </label>
                  <input
                    type="month"
                    value={attendanceViewerDate.substring(0, 7)}
                    onChange={(e) =>
                      setAttendanceViewerDate(e.target.value + "-01")
                    }
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                    Select Date (For View)
                  </label>
                  <input
                    type="date"
                    value={attendanceViewerDate}
                    onChange={(e) => setAttendanceViewerDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                    Select Campus
                  </label>
                  <select
                    value={attendanceViewerCampus}
                    onChange={(e) => setAttendanceViewerCampus(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="All">All Campuses</option>
                    {campuses.map((c) => (
                      <option key={`viewer-campus-${c.id}`} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                    Search by PIN
                  </label>
                  <input
                    type="text"
                    value={attendanceViewerPinSearch}
                    onChange={(e) =>
                      setAttendanceViewerPinSearch(e.target.value)
                    }
                    placeholder="Enter PIN..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                    Select Status Filter
                  </label>
                  <select
                    value={attendanceViewerStatus}
                    onChange={(e) => setAttendanceViewerStatus(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">Leave</option>
                    <option value="Late Entry">Late Entry</option>
                    <option value="Early Leave">Early Leave</option>
                    <option value="< 6hr">&lt; 6hrs</option>
                    <option value="< 10hrs">&lt; 10hrs</option>
                    <option value="Finger Punch Missing">Punch Missing</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const monthPrefix = attendanceViewerDate.substring(0, 7);
                      const wb = XLSX.utils.book_new();
                      const filtered = reports.filter(
                        (r) =>
                          r.date.startsWith(monthPrefix) &&
                          (attendanceViewerCampus === "All" ||
                            r.campus === attendanceViewerCampus),
                      );

                      const groupedByDate = filtered.reduce(
                        (acc, report) => {
                          if (!acc[report.date]) acc[report.date] = [];

                          report.records.forEach((rec) => {
                            const member = [...members, ...mentors].find(
                              (m) => m.pin === rec.memberPin,
                            );
                            const displayStatus = getEffectiveStatus(rec);

                            if (attendanceViewerStatus !== "All") {
                              if (displayStatus !== attendanceViewerStatus)
                                return;
                            }

                            if (
                              attendanceViewerPinSearch !== "" &&
                              !rec.memberPin.includes(attendanceViewerPinSearch)
                            )
                              return;

                            acc[report.date].push({
                              Campus: report.campus,
                              PIN: rec.memberPin,
                              Name: rec.memberName || member?.name || "Unknown",
                              Status: displayStatus,
                              "In Time": rec.checkInTime || "-",
                              "Out Time": rec.checkOutTime || "-",
                              Notes: rec.notes || "-",
                            });
                          });
                          return acc;
                        },
                        {} as Record<string, any[]>,
                      );

                      Object.keys(groupedByDate)
                        .sort()
                        .forEach((date) => {
                          const records = groupedByDate[date];
                          records.sort((a, b) =>
                            String(a.PIN).localeCompare(
                              String(b.PIN),
                              undefined,
                              { numeric: true, sensitivity: "base" },
                            ),
                          );
                          const ws = XLSX.utils.json_to_sheet(records);
                          XLSX.utils.book_append_sheet(wb, ws, date);
                        });

                      if (Object.keys(groupedByDate).length === 0) {
                        const ws = XLSX.utils.json_to_sheet([
                          {
                            Message: "No attendance data found for this month",
                          },
                        ]);
                        XLSX.utils.book_append_sheet(wb, ws, "No Data");
                      }

                      XLSX.writeFile(
                        wb,
                        `attendance_${monthPrefix}_${attendanceViewerCampus}.xlsx`,
                      );
                    }}
                    className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center gap-2 border border-indigo-200/50 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={() =>
                      setConfirmDeleteReportInfo({
                        date: attendanceViewerDate,
                        campus: attendanceViewerCampus,
                      })
                    }
                    className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all flex items-center gap-2 border border-rose-200/50 whitespace-nowrap"
                  >
                    <Trash className="w-4 h-4" />
                    Delete Date
                  </button>
                </div>
              </div>

              {missingAttendances.length > 0 && (
                <div className="mb-6 p-5 border border-amber-200 bg-amber-50 rounded-2xl">
                  <h3 className="text-sm font-black text-amber-900 flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    Missing Attendance Records ({missingAttendances.length})
                  </h3>
                  <p className="text-xs text-amber-800 mb-4 font-medium">
                    The following members are missing from this date's report.
                    You can manually add them below.
                  </p>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {missingAttendances.map((m) => (
                      <div
                        key={`${m.date}-${m.memberPin}`}
                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-slate-800 bg-amber-100 px-2 py-1 rounded">
                            {m.date}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {m.memberName} ({m.memberPin})
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {m.campus}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setAddingRecord({
                              date: m.date,
                              campus: m.campus,
                              record: {
                                memberPin: m.memberPin,
                                memberName: m.memberName,
                                status: "Present",
                                checkInTime: "",
                                checkOutTime: "",
                                notes: "",
                              },
                            });
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Record
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-slate-50/20">
                <table className="w-full min-w-[1200px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                      <th className="p-4">PIN</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">In Time</th>
                      <th className="p-4">Out Time</th>
                      <th className="p-4">Late Entry</th>
                      <th className="p-4">Early Leave</th>
                      <th className="p-4">W. Hour</th>
                      <th className="p-4">Absent/Leave</th>
                      <th className="p-4">Zone</th>
                      <th className="p-4 w-48">Remarks</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 w-12 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {reports
                      .filter(
                        (r) =>
                          r.date === attendanceViewerDate &&
                          (attendanceViewerCampus === "All" ||
                            r.campus === attendanceViewerCampus),
                      )
                      .flatMap((report) =>
                        report.records.map((record) => ({
                          ...record,
                          reportPin: report.pin,
                          campus: report.campus,
                        })),
                      )
                      .filter((attendee) => {
                        const matchesPin =
                          attendanceViewerPinSearch === "" ||
                          attendee.memberPin.includes(
                            attendanceViewerPinSearch,
                          );

                        // Identify current user's role and campus
                        const assignedCampus = campuses.find((c) =>
                          c.coordinatorPins?.includes(currentUser.pin),
                        );
                        const isHead =
                          assignedCampus &&
                          assignedCampus.coordinatorPins?.[0] ===
                            currentUser.pin;
                        const isDeputy =
                          assignedCampus &&
                          assignedCampus.coordinatorPins?.includes(
                            currentUser.pin,
                          ) &&
                          !isHead;
                        const headCoordinatorPin =
                          assignedCampus?.coordinatorPins?.[0];

                        // Deputy Coordinator restriction
                        if (
                          isDeputy &&
                          attendee.memberPin === headCoordinatorPin
                        )
                          return false;

                        const effectiveStatus = getEffectiveStatus(attendee);
                        const matchesStatus = attendanceViewerStatus === "All" || effectiveStatus === attendanceViewerStatus;
                        const matchesCampus = attendanceViewerCampus === "All" || attendee.campus === attendanceViewerCampus;
                        return matchesPin && matchesStatus && matchesCampus;
                      })
                      .sort((a, b) =>
                        a.memberPin.localeCompare(b.memberPin, undefined, {
                          numeric: true,
                          sensitivity: "base",
                        }),
                      )
                      .map((attendee, index) => {
                        const member = [...members, ...mentors].find(
                          (m) => m.pin === attendee.memberPin,
                        );
                        const effectiveStatus = getEffectiveStatus(attendee);
                        const hours = calculateWorkingHours(
                          attendee.checkInTime,
                          attendee.checkOutTime,
                        );
                        const workingHoursDisplay =
                          hours !== null
                            ? `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`
                            : "-";

                        return (
                          <tr
                            key={`${attendee.reportPin}-${attendee.memberPin}-${index}`}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="p-4 text-xs font-mono font-bold text-slate-700">
                              {attendee.memberPin}
                            </td>
                            <td className="p-4 text-xs font-semibold text-slate-800">
                                <span>
                                  {(attendee.memberName ||
                                    member?.name ||
                                    "Unknown").split('(')[0].trim()}
                                </span>
                            </td>
                            <td className="p-4 text-xs font-mono text-slate-600">
                              {attendee.checkInTime || "-"}
                            </td>
                            <td className="p-4 text-xs font-mono text-slate-600">
                              {attendee.checkOutTime || "-"}
                            </td>
                            <td className="p-4 text-xs font-mono text-slate-600">
                              {attendee.lateEntry ? (
                                <span className="text-amber-700 font-bold">
                                  {attendee.lateEntry}
                                </span>
                              ) : (effectiveStatus === "Late" || effectiveStatus === "Late Entry") ? (
                                <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                  Late Entry
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="p-4 text-xs font-mono text-slate-600">
                              {attendee.earlyLeave || "-"}
                            </td>
                            <td className="p-4 text-xs font-mono font-bold text-indigo-700">
                              {attendee.workingHour ||
                                workingHoursDisplay ||
                                "-"}
                            </td>
                            <td className="p-4 text-xs font-semibold text-slate-600">
                              {attendee.absentOrLeave ? (
                                <span className="text-rose-700 font-bold">
                                  {attendee.absentOrLeave}
                                </span>
                              ) : effectiveStatus === "Absent" ? (
                                <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[10px]">
                                  Absent
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="p-4 text-xs text-slate-600">
                              {attendee.zone || "-"}
                            </td>
                            <td
                              className="p-4 text-xs text-slate-600 max-w-[350px]"
                              title={`${attendee.remarks || ""} ${attendee.notes || ""}`.trim() || "-"}
                            >
                              <div className="flex flex-wrap gap-1 text-[11px] text-slate-600 w-full">
                                {Array.from(new Set(
                                  `${attendee.remarks || ""} ${attendee.notes || ""}`
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
                                          : "bg-slate-50/50 text-slate-600 border-slate-100/50"
                                      }`}
                                    >
                                      {isIn && <span className="font-bold text-blue-600 shrink-0 text-[9px] uppercase">IN:</span>}
                                      {isOut && <span className="font-bold text-amber-600 shrink-0 text-[9px] uppercase">OUT:</span>}
                                      <span className="leading-tight">{cleanText}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-800">
                                {renderStatusBadge(getEffectiveStatus(attendee))}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingRecord({
                                      reportPin: attendee.reportPin,
                                      memberPin: attendee.memberPin,
                                      record: attendee,
                                    })
                                  }
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold uppercase text-[10px] tracking-wider rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-indigo-200/50"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDeleteAttendance({
                                      reportPin: attendee.reportPin,
                                      memberPin: attendee.memberPin,
                                      memberName:
                                        attendee.memberName ||
                                        member?.name ||
                                        "Unknown",
                                    })
                                  }
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold uppercase text-[10px] tracking-wider rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-rose-200/50"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {editingRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 text-left space-y-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-1">
                          <Edit className="w-5 h-5 text-indigo-600" />
                          Edit Attendance Record
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Editing record for PIN:{" "}
                          <span className="font-bold text-slate-700">
                            {editingRecord.memberPin}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingRecord(null)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                          Status
                        </label>
                        <select
                          value={editingRecord.record.status}
                          onChange={(e) =>
                            setEditingRecord((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    record: {
                                      ...prev.record,
                                      status: e.target
                                        .value as AttendanceStatus,
                                    },
                                  }
                                : null,
                            )
                          }
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Leave">Leave</option>
                          <option value="Late Entry">Late Entry</option>
                          <option value="< 6hr">&lt; 6hrs</option>
                          <option value="< 10hrs">&lt; 10hrs</option>
                          <option value="Half Day">Half Day</option>
                          <option value="Finger Punch Missing">
                            Punch Missing
                          </option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Check In Time
                          </label>
                          <ClockInput
                            value={editingRecord.record.checkInTime || ""}
                            onChange={(val) =>
                              setEditingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        checkInTime: val,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. 09:00 AM"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Check Out Time
                          </label>
                          <ClockInput
                            value={editingRecord.record.checkOutTime || ""}
                            onChange={(val) =>
                              setEditingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        checkOutTime: val,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. 05:00 PM"
                          />
                        </div>
                      </div>
                      {/* Custom Excel Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Late Entry
                          </label>
                          <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={editingRecord.record.lateEntry || ""}
                            onChange={(e) =>
                              setEditingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        lateEntry: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. 00:15"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Early Leave
                          </label>
                          <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={editingRecord.record.earlyLeave || ""}
                            onChange={(e) =>
                              setEditingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        earlyLeave: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. 00:00"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Working Hour (W. Hour)
                          </label>
                          <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={editingRecord.record.workingHour || ""}
                            onChange={(e) =>
                              setEditingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        workingHour: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. 08:00"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Zone
                          </label>
                          <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={editingRecord.record.zone || ""}
                            onChange={(e) =>
                              setEditingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        zone: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. Dhaka"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Absent / Leave
                          </label>
                          <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={editingRecord.record.absentOrLeave || ""}
                            onChange={(e) =>
                              setEditingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        absentOrLeave: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. Casual Leave"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                          Notes / Remarks
                        </label>
                        <textarea
                          rows={2}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          value={editingRecord.record.remarks || editingRecord.record.notes || ""}
                          onChange={(e) =>
                            setEditingRecord((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    record: {
                                      ...prev.record,
                                      notes: e.target.value,
                                      remarks: e.target.value,
                                    },
                                  }
                                : null,
                            )
                          }
                          placeholder="Add notes..."
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setEditingRecord(null)}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onUpdateAttendanceRecord(
                            editingRecord.reportPin,
                            editingRecord.memberPin,
                            editingRecord.record,
                          );
                          setEditingRecord(null);
                        }}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors uppercase tracking-wider shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {addingRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 text-left space-y-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-1">
                          <Plus className="w-5 h-5 text-indigo-600" />
                          Add Attendance Record
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Adding record for PIN:{" "}
                          <span className="font-bold text-slate-700">
                            {addingRecord.record.memberPin}
                          </span>{" "}
                          on{" "}
                          <span className="font-bold text-slate-700">
                            {addingRecord.date}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => setAddingRecord(null)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                          Status
                        </label>
                        <select
                          value={addingRecord.record.status}
                          onChange={(e) =>
                            setAddingRecord((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    record: {
                                      ...prev.record,
                                      status: e.target
                                        .value as AttendanceStatus,
                                    },
                                  }
                                : null,
                            )
                          }
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Leave">Leave</option>
                          <option value="Late Entry">Late Entry</option>
                          <option value="< 6hr">&lt; 6hrs</option>
                          <option value="< 10hrs">&lt; 10hrs</option>
                          <option value="Half Day">Half Day</option>
                          <option value="Finger Punch Missing">
                            Punch Missing
                          </option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Check In Time
                          </label>
                          <ClockInput
                            value={addingRecord.record.checkInTime || ""}
                            onChange={(val) =>
                              setAddingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        checkInTime: val,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. 09:00 AM"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Check Out Time
                          </label>
                          <ClockInput
                            value={addingRecord.record.checkOutTime || ""}
                            onChange={(val) =>
                              setAddingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        checkOutTime: val,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. 05:00 PM"
                          />
                        </div>
                      </div>
                      {/* Custom Excel Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Late Entry
                          </label>
                          <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={addingRecord.record.lateEntry || ""}
                            onChange={(e) =>
                              setAddingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        lateEntry: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. 00:15"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Early Leave
                          </label>
                          <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={addingRecord.record.earlyLeave || ""}
                            onChange={(e) =>
                              setAddingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        earlyLeave: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. 00:00"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Working Hour (W. Hour)
                          </label>
                          <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={addingRecord.record.workingHour || ""}
                            onChange={(e) =>
                              setAddingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        workingHour: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. 08:00"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Zone
                          </label>
                          <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={addingRecord.record.zone || ""}
                            onChange={(e) =>
                              setAddingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        zone: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. Dhaka"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                            Absent / Leave
                          </label>
                          <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={addingRecord.record.absentOrLeave || ""}
                            onChange={(e) =>
                              setAddingRecord((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      record: {
                                        ...prev.record,
                                        absentOrLeave: e.target.value,
                                      },
                                    }
                                  : null,
                              )
                            }
                            placeholder="e.g. Casual Leave"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                          Notes / Remarks
                        </label>
                        <textarea
                          rows={2}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          value={addingRecord.record.remarks || addingRecord.record.notes || ""}
                          onChange={(e) =>
                            setAddingRecord((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    record: {
                                      ...prev.record,
                                      notes: e.target.value,
                                      remarks: e.target.value,
                                    },
                                  }
                                : null,
                            )
                          }
                          placeholder="Add notes..."
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setAddingRecord(null)}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onAddAttendanceRecord(
                            addingRecord.date,
                            addingRecord.campus,
                            addingRecord.record,
                          );
                          setAddingRecord(null);
                        }}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors uppercase tracking-wider shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Record
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 3: TEAM MEMBERS LIST */}
          {activeTab === "members" && viewedMemberPin === null && (
            <motion.div
              key="tab-members"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-left space-y-6"
            >
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Team Members List
                </h2>
              </div>
              {/* Member Search/Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Search by name"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="px-4 py-3 border border-slate-200 rounded-xl text-xs"
                />
                <select
                  value={memberCampusFilter}
                  onChange={(e) => setMemberCampusFilter(e.target.value)}
                  className="px-4 py-3 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="" key="filter-all">
                    All Campuses
                  </option>
                  {campuses.map((c) => (
                    <option key={`filter-campus-${c.id}`} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                      <th className="p-4">#</th>
                      <th className="p-4">PIN</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Campus</th>
                      <th className="p-4">Campus Coordinator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {filteredMembers
                      .sort((a, b) =>
                        a.pin.localeCompare(b.pin, undefined, {
                          numeric: true,
                          sensitivity: "base",
                        }),
                      )
                      .map((member, index) => {
                        const coordinator = [...managers, ...mentors].find(
                          (m) => m.pin === member.mentorPin,
                        );
                        return (
                          <tr 
                            key={member.pin}
                            onClick={() => {
                              navigate(`/attendance/${member.pin}`);
                            }}
                            className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                          >
                            <td className="p-4 text-xs font-mono text-slate-500">
                              {index + 1}
                            </td>
                            <td className="p-4 text-xs font-mono font-bold text-indigo-600">
                              {member.pin}
                            </td>
                            <td className="p-4 text-xs font-semibold text-slate-800">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-900">{member.name}</span>
                              </div>
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-600">
                              {member.campus}
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-600">
                              {coordinator ? `${coordinator.name} (${coordinator.pin})` : "Unassigned"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Tab: CAMPUS SETTINGS */}
          {activeTab === "campuses" && viewedMemberPin === null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-md">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-150 pb-5 mb-6">
                  <div className="text-left">
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5">
                      <MapPin className="w-5.5 h-5.5 text-indigo-600" />
                      Campus Settings
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Manage campuses and assign campus coordinators.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCampusModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Campus
                  </button>
                </div>

                <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                        <th className="p-4 w-12 text-center">#</th>
                        <th className="p-4">Campus Name</th>
                        <th className="p-4">Total Members</th>
                        <th className="p-4">Campus Coordinators</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {campuses.map((campus, index) => (
                        <tr
                          key={campus.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="p-4 text-xs font-mono text-slate-400 text-center">
                            {index + 1}
                          </td>
                          <td className="p-4 text-xs font-bold text-slate-800">
                            {campus.name}
                          </td>
                          <td className="p-4 text-xs font-bold text-indigo-600 bg-indigo-50/30">
                            <div className="flex items-center gap-1.5 justify-center w-fit px-2 py-1 rounded-lg border border-indigo-100">
                              <Users className="w-3.5 h-3.5" />
                              <span>
                                {(() => {
                                  const campusPins = new Set<string>();

                                  // Add all members and mentors belonging to this campus
                                  members.forEach((m) => {
                                    if (m.campus === campus.name)
                                      campusPins.add(m.pin);
                                  });
                                  mentors.forEach((m) => {
                                    if (m.campus === campus.name)
                                      campusPins.add(m.pin);
                                  });

                                  // Add coordinators (this includes managers assigned to this campus)
                                  if (campus.headCoordinatorPin)
                                    campusPins.add(campus.headCoordinatorPin);
                                  if (campus.deputyCoordinatorPins) {
                                    campus.deputyCoordinatorPins.forEach(
                                      (pin) => campusPins.add(pin),
                                    );
                                  }
                                  if (campus.coordinatorPins) {
                                    campus.coordinatorPins.forEach((pin) =>
                                      campusPins.add(pin),
                                    );
                                  }

                                  return campusPins.size;
                                })()}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-xs text-slate-600">
                            <div className="flex flex-col gap-1.5">
                              {campus.headCoordinatorPin ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
                                    Head
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {(() => {
                                      const m = [...managers, ...mentors, ...members].find(
                                        (x) => x.pin === campus.headCoordinatorPin,
                                      );
                                      return m ? `${m.name} (${m.pin})` : campus.headCoordinatorPin;
                                    })()}
                                  </span>
                                </div>
                              ) : (
                                campus.coordinatorPins &&
                                campus.coordinatorPins.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
                                      Head
                                    </span>
                                    <span className="font-bold text-slate-800">
                                      {(() => {
                                        const m = [...managers, ...mentors, ...members].find(
                                          (x) => x.pin === campus.coordinatorPins![0],
                                        );
                                        return m ? `${m.name} (${m.pin})` : campus.coordinatorPins![0];
                                      })()}
                                    </span>
                                  </div>
                                )
                              )}
                              {campus.deputyCoordinatorPins &&
                                campus.deputyCoordinatorPins.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                                      Deputies
                                    </span>
                                    <div className="text-slate-500 text-[11px]">
                                      {campus.deputyCoordinatorPins
                                        .map((pin) => {
                                          const person = [
                                            ...managers,
                                            ...mentors,
                                            ...members,
                                          ].find((m) => m.pin === pin);
                                          return person ? `${person.name} (${person.pin})` : pin;
                                        })
                                        .join(", ")}
                                    </div>
                                  </div>
                                )}
                              {!campus.headCoordinatorPin &&
                                (!campus.deputyCoordinatorPins ||
                                  campus.deputyCoordinatorPins.length === 0) &&
                                !campus.coordinatorPins?.length && (
                                  <span className="text-slate-400 italic">
                                    No coordinators assigned
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCampusName(campus.name);
                                  setEditCampusValue(campus.name);
                                  setEditCampusHead(
                                    campus.headCoordinatorPin || "",
                                  );
                                  setEditCampusDeputies(
                                    campus.deputyCoordinatorPins || [],
                                  );
                                  setEditCampusDeputyAccess(
                                    campus.deputyMemberAccess || {},
                                  );
                                }}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDeleteCampusName(campus.name)
                                }
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 4: FEEDBACK / REVIEW TICKETS */}
          {activeTab === "feedback" && viewedMemberPin === null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-left space-y-6"
            >
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Roster Feedback Tickets
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Resolve review requests and provide comments for late or absent
                  reports sent by campus coordinators and members.
                </p>
              </div>

              <div className="space-y-5">
                {feedbacks.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                    <CheckCircle className="w-12 h-12 text-emerald-500/80 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-600">
                      All clear! No feedbacks posted yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      No team member or campus coordinator has filed a complaint.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {feedbacks.map((fb) => (
                      <div
                        key={fb.pin}
                        className="p-5 border border-slate-200/80 rounded-2xl bg-white hover:border-slate-300 transition-all shadow-2xs text-left"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                          <div>
                            <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                              Ticket PIN: {fb.pin}
                            </span>
                            <h4 className="text-sm font-black text-slate-800 mt-2">
                              Requester:{" "}
                              <span className="text-indigo-600">
                                {fb.memberName}
                              </span>{" "}
                              (PIN:{" "}
                              <span className="font-mono">{fb.memberPin}</span>)
                            </h4>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              fb.status === "Pending"
                                ? "bg-amber-50 text-amber-700 border border-amber-150"
                                : "bg-green-50 text-green-700 border border-green-150"
                            }`}
                          >
                            {fb.status === "Pending"
                              ? "Pending"
                              : "Resolved"}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="text-xs text-slate-600 font-medium">
                            <strong className="text-slate-700">
                              Attendance Date:
                            </strong>{" "}
                            {fb.date} •{" "}
                            <strong className="text-slate-700">
                              Campus:
                            </strong>{" "}
                            {
                              members.find((m) => m.pin === fb.memberPin)
                                ?.campus
                            }
                          </div>
                          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                            <p className="text-xs font-bold text-rose-700">
                              Reason for review:
                            </p>
                            <p className="text-xs text-rose-800 font-medium mt-1">
                              "{fb.mentorComment}"
                            </p>
                          </div>
                        </div>

                        {fb.status === "Pending" ? (
                          <div className="space-y-3.5 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 font-mono">
                                  Select corrected status
                                </label>
                                <select
                                  value={resolutionStatus[fb.pin] || "Present"}
                                  onChange={(e) =>
                                    setResolutionStatus((prev) => ({
                                      ...prev,
                                      [fb.pin]: e.target
                                        .value as AttendanceStatus,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold"
                                >
                                  <option value="Present">
                                    Present
                                  </option>
                                  <option value="Leave">
                                    Leave
                                  </option>
                                  <option value="Finger Punch Missing">
                                    Punch Missing
                                  </option>
                                  <option value="Late Entry">Late Entry</option>
                                  <option value="Half Day">
                                    Half Day
                                  </option>
                                  <option value="Absent">
                                    Absent
                                  </option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5 font-mono">
                                  Manager Reply Comment
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Approved based on card proof."
                                  value={commentInputs[fb.pin] || ""}
                                  onChange={(e) =>
                                    setCommentInputs((prev) => ({
                                      ...prev,
                                      [fb.pin]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() =>
                                  handleResolveTicket(fb, "Resolved")
                                }
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                              >
                                Verify & Change Status
                              </button>
                              <button
                                onClick={() =>
                                  handleResolveTicket(fb, "Reviewed")
                                }
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                              >
                                Reviewed Only (Accept as Message)
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-left">
                            <p className="text-[10px] font-black uppercase text-slate-400 font-mono">
                              Manager Comment:
                            </p>
                            <p className="text-slate-600 italic">
                              "{fb.managerComment || "No comment left."}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 4: ROSTER CRUD MANAGEMENT WITH MODAL CREATION/UPDATES */}
          {activeTab === "roster" && viewedMemberPin === null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-md">
                {/* Header section */}
                <div className="border-b border-slate-150 pb-5 mb-6 space-y-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5">
                      <Shield className="w-5.5 h-5.5 text-indigo-600" />
                      Member Management
                    </h2>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            try {
                              const dataBuffer = evt.target?.result;
                              const wb = XLSX.read(dataBuffer, {
                                type: "array",
                              });
                              const wsname = wb.SheetNames[0];
                              const ws = wb.Sheets[wsname];
                              const data = XLSX.utils.sheet_to_json(
                                ws,
                              ) as any[];

                              if (data.length === 0) {
                                toast.error(
                                  "No data found in Excel file!",
                                );
                                return;
                              }

                              const normalizedData = data.map((row) => {
                                const norm: any = {};
                                for (const k in row) {
                                  norm[k.trim().toLowerCase()] = row[k];
                                }
                                return norm;
                              });

                              // Data validation and creation
                              let successCount = 0;
                              normalizedData.forEach((row, idx) => {
                                const pin = String(
                                  row.pin || row.id || "",
                                ).trim();
                                const name = String(row.name || "").trim();
                                const email = String(row.email || "").trim();
                                const campusName = String(
                                  row.campus || "",
                                ).trim();
                                const coordinatorName = String(
                                  row.coordinator || row.mentor || "",
                                ).trim();
                                const designation = String(row.designation || row.title || "").trim();

                                if (pin && name && email && campusName) {
                                  // Find a mentor for this campus
                                  const campusObj = campuses.find(
                                    (c) => c.name === campusName,
                                  );
                                  let mentorPin = "";
                                  if (coordinatorName) {
                                    mentorPin =
                                      mentors.find(
                                        (m) =>
                                          m.name.toLowerCase() ===
                                          coordinatorName.toLowerCase(),
                                      )?.pin || "";
                                  }

                                  // Default to head coordinator if no coordinator specified
                                  if (!mentorPin && !coordinatorName) {
                                    mentorPin =
                                      campusObj?.headCoordinatorPin ||
                                      (campusObj?.coordinatorPins &&
                                        campusObj.coordinatorPins[0]) ||
                                      "";
                                  }

                                  onAddMember({
                                    pin,
                                    name,
                                    role: "member",
                                    email,
                                    designation,
                                    password: "password",
                                    campus: campusName,
                                    mentorPin,
                                    permissions: [
                                      "member_attendance",
                                      "member_notices",
                                      "member_post_notice"
                                    ],
                                    avatarUrl: "",
                                  });
                                  successCount++;
                                }
                              });

                              toast.success(
                                `${successCount} members imported successfully!`,
                              );
                            } catch (err) {
                              console.error(err);
                              toast.error(
                                "Error processing Excel file!",
                              );
                            }
                          };
                          reader.readAsArrayBuffer(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById("excel-upload")?.click()
                        }
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-xs whitespace-nowrap"
                        title="Create members via Excel upload"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel Import
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsExcelGuideOpen(true)}
                        className="flex items-center justify-center w-9 h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all cursor-pointer border border-emerald-200 shrink-0"
                        title="Excel Import Guide"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCrudMode("create");
                          setMemberForm({
                            pin: "",
                            name: "",
                            email: "",
                            password: "password",
                            campus: "",
                            mentorPin: "",
                            designation: "",
                            permissions: [
                              "member_attendance",
                              "member_notices",
                              "member_post_notice"
                            ],
                            avatarUrl: "",
                            role: "member",
                          });
                          setIsRosterModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-xs hover:shadow-md whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Member
                      </button>
                    </div>
                  </div>

                  {/* Count & stats displayed elegantly below the main action controls */}
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                      Total Users:{" "}
                      {
                        Array.from(
                          new Set([
                            ...members.map((m) => m.pin),
                            ...mentors.map((m) => m.pin),
                          ]),
                        ).length
                      }
                    </span>

                    {members.filter((m) => !m.mentorPin).length > 0 && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        Unassigned: {members.filter((m) => !m.mentorPin).length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Search Filter Box */}
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="Search by name, PIN, or email..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                  <select
                    value={rosterCampusFilter}
                    onChange={(e) => setRosterCampusFilter(e.target.value)}
                    className="w-full md:w-64 px-4 py-3 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    <option value="all" key="roster-all">
                      All Campuses
                    </option>
                    {campuses.map((c) => (
                      <option key={`roster-campus-${c.id}`} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* Unassigned Only Toggle */}
                  <button
                    onClick={() => setRosterUnassignedOnly(!rosterUnassignedOnly)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 h-[42px] ${
                      rosterUnassignedOnly
                        ? "bg-rose-50 text-rose-700 border-rose-200 ring-4 ring-rose-500/10"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {rosterUnassignedOnly ? "Unassigned Only" : "Show All"}
                  </button>
                  
                  {/* Bulk Toggle Controls */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter PINs (comma separated)"
                      value={bulkPinInput}
                      onChange={(e) => setBulkPinInput(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 w-48"
                    />
                    <button
                      onClick={() => {
                        const pins = bulkPinInput.split(',').map(p => p.trim());
                        pins.forEach(pin => {
                          const user = members.find(m => m.pin === pin) || mentors.find(m => m.pin === pin);
                          if (user) {
                            const updatedUser = { ...user, isActive: !user.isActive };
                            if (user.role === 'mentor') {
                              onUpdateMentor(pin, updatedUser as Mentor);
                            } else {
                              onUpdateMember(pin, updatedUser as TeamMember);
                            }
                          }
                        });
                        setBulkPinInput("");
                      }}
                      className="text-xs font-black text-white bg-indigo-600 px-3 py-1.5 rounded-lg"
                    >
                      Multiple Deactivate
                    </button>
                  </div>
                </div>

                {/* Table display of Roster */}
                <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                        <th className="p-4 w-12 text-center">#</th>
                        <th className="p-4">Profile</th>
                        <th className="p-4">PIN</th>
                        <th className="p-4">Campus</th>
                        <th className="p-4">Campus Coordinator</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {(() => {
                        const mergedMap = new Map<string, any>();
                        members.forEach((m) => mergedMap.set(m.pin, { ...m }));
                        mentors.forEach((m) => {
                          const existing = mergedMap.get(m.pin);
                          if (existing) {
                            // Keep both roles info if needed, but for display we prefer mentor
                            mergedMap.set(m.pin, {
                              ...existing,
                              ...m,
                              role: "mentor",
                              isBoth: true,
                            });
                          } else {
                            mergedMap.set(m.pin, { ...m });
                          }
                        });
                        return Array.from(mergedMap.values());
                      })()
                        .filter((m) => {
                          const matchesSearch =
                            (m.name?.toLowerCase() || "").includes(
                              rosterSearch.toLowerCase(),
                            ) ||
                            (m.pin?.toLowerCase() || "").includes(
                              rosterSearch.toLowerCase(),
                            ) ||
                            (m.email?.toLowerCase() || "").includes(
                              rosterSearch.toLowerCase(),
                            );
                          const matchesCampus =
                            rosterCampusFilter === "all" ||
                            m.campus === rosterCampusFilter;

                          const matchesUnassigned =
                            !rosterUnassignedOnly ||
                            (m.role === "member" && !m.mentorPin);

                          // Identify current user's role and campus
                          const assignedCampusForUser = campuses.find((c) =>
                            c.coordinatorPins?.includes(currentUser.pin),
                          );
                          const isHeadForUser =
                            assignedCampusForUser &&
                            assignedCampusForUser.coordinatorPins?.[0] ===
                              currentUser.pin;
                          const isDeputyForUser =
                            assignedCampusForUser &&
                            assignedCampusForUser.coordinatorPins?.includes(
                              currentUser.pin,
                            ) &&
                            !isHeadForUser;
                          const headCoordinatorPinForUser =
                            assignedCampusForUser?.coordinatorPins?.[0];

                          // Deputy Coordinator restriction
                          if (
                            isDeputyForUser &&
                            m.pin === headCoordinatorPinForUser
                          )
                            return false;

                          return matchesSearch && matchesCampus && matchesUnassigned;
                        })
                        .sort((a, b) =>
                          a.pin.localeCompare(b.pin, undefined, {
                            numeric: true,
                            sensitivity: "base",
                          }),
                        )
                        .map((member, index) => {
                          const mentor = (mentors || []).find(
                            (m) => m.pin === member.mentorPin,
                          );
                          const memberPerms = member.permissions || [
                            "member_attendance",
                            "member_notices",
                          ];
                          return (
                            <tr
                              key={member.pin}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="p-4 text-xs font-mono text-slate-400 text-center">
                                {index + 1}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <UserAvatar user={member} size="sm" />
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                                      {member.name}
                                      {member.isBoth && (
                                        <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-100 px-1 py-0.5 rounded uppercase font-black flex items-center gap-1">
                                          <ShieldCheck className="w-2.5 h-2.5" />
                                          Team Member & Coord
                                        </span>
                                      )}
                                      {member.designation && (
                                        <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 py-0.5 rounded uppercase font-black">
                                          {member.designation}
                                        </span>
                                      )}
                                      {!member.isBoth &&
                                        member.role === "mentor" && !member.designation && (
                                          <span className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1 py-0.5 rounded uppercase font-black">
                                            Campus Coordinator
                                          </span>
                                        )}
                                      {!member.isBoth &&
                                        member.role === "member" && !member.designation && (
                                          <span className="text-[8px] bg-slate-50 text-slate-500 border border-slate-200 px-1 py-0.5 rounded uppercase font-black">
                                            Team Member
                                          </span>
                                        )}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-mono truncate">
                                      {member.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                               <td className="p-4 text-xs font-mono font-bold text-slate-700">
                                <div className="flex items-center gap-2">
                                  {member.pin}
                                </div>
                              </td>
                              <td className="p-4 text-xs">
                                <span className="text-[10px] bg-indigo-50 border border-indigo-100/50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md">
                                  {member.campus}
                                </span>
                              </td>
                              <td className="p-4 text-xs text-slate-600 font-medium">
                                {(() => {
                                  // If this member is the Head Coordinator of their campus, they report to the Manager
                                  const myCampus = campuses.find(
                                    (c) => c.name === member.campus,
                                  );
                                  const isHead =
                                    myCampus?.headCoordinatorPin === member.pin;
                                  if (isHead)
                                    return `${managers[0]?.name || "Admin"} (${managers[0]?.pin || "M-01"})`;

                                  // If they report to a specific mentorPin
                                  const assignedCoordinator = [
                                    ...managers,
                                    ...mentors,
                                  ].find((m) => m.pin === member.mentorPin);
                                  if (assignedCoordinator) {
                                    return `${assignedCoordinator.name} (${assignedCoordinator.pin})`;
                                  }

                                  // Fallback: report to campus Head
                                  const headPin =
                                    myCampus?.headCoordinatorPin ||
                                    myCampus?.coordinatorPins?.[0];
                                  if (headPin && headPin !== member.pin) {
                                    const head = [...managers, ...mentors].find(
                                      (m) => m.pin === headPin,
                                    );
                                    return head
                                      ? `${head.name} (${head.pin}) (Head)`
                                      : "Unassigned";
                                  }

                                  return "Unassigned";
                                })()}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCrudMode("edit");
                                      setSelectedCrudPin(member.pin);
                                      setSelectedCrudRole(member.role);
                                      setMemberForm({
                                        pin: member.pin,
                                        name: member.name,
                                        email: member.email,
                                        designation: member.designation || "",
                                        password: "",
                                        campus:
                                          member.campus ||
                                          campuses[0]?.name ||
                                          "",
                                        mentorPin: member.mentorPin || "",
                                        permissions: member.permissions || (member.role === 'mentor' ? [
                                          "mentor_attendance",
                                          "mentor_notices",
                                          "mentor_history",
                                          "mentor_leave",
                                          "mentor_post_notice"
                                        ] : [
                                          "member_attendance",
                                          "member_notices",
                                          "member_post_notice"
                                        ]),
                                        avatarUrl: member.avatarUrl || "",
                                        role: member.role || "member",
                                      });
                                      setIsRosterModalOpen(true);
                                    }}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const updatedUser = { ...member, isActive: !member.isActive };
                                      if (member.role === 'mentor') {
                                        onUpdateMentor(member.pin, updatedUser as Mentor);
                                      } else {
                                        onUpdateMember(member.pin, updatedUser as TeamMember);
                                      }
                                    }}
                                    className={`w-8 h-4 rounded-full transition-colors flex items-center p-0.5 ${member.isActive === false ? 'bg-slate-300' : 'bg-indigo-600'}`}
                                  >
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${member.isActive === false ? '' : 'translate-x-4'}`} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      member.role === "mentor"
                                        ? setConfirmDeleteMentorPin(member.pin)
                                        : setConfirmDeleteMemberPin(member.pin)
                                    }
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* EXCEL GUIDE MODAL */}
              {isExcelGuideOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 text-left"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-1">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                          Excel Import Guide
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Guide on how to add many members or coordinators at once.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsExcelGuideOpen(false)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <span className="font-extrabold text-emerald-900 uppercase tracking-wider block mb-2 text-xs">
                          1. Excel File Format (Columns):
                        </span>
                        <p className="text-xs text-emerald-800 mb-2">
                                                 The first line of your Excel sheet must contain the following
                          headers (exact spelling is required):
                        </p>
                        <ul className="list-disc list-inside font-bold text-slate-700 space-y-1 text-xs pl-1">
                          <li>
                            PIN{" "}
                            <span className="font-normal text-slate-500">
                           
                            </span>
                          </li>
                          <li>
                            Name{" "}
                            <span className="font-normal text-slate-500">
                             
                            </span>
                          </li>
                          <li>
                            Email{" "}
                            <span className="font-normal text-slate-500">
                             
                            </span>
                          </li>
                          <li>
                            Campus{" "}
                            <span className="font-normal text-slate-500">
                        
                            </span>
                          </li>
                          <li>
                            Designation{" "}
                            <span className="font-normal text-slate-500">
                          
                            </span>
                          </li>
                         
                        </ul>
                      </div>
                     
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => setIsExcelGuideOpen(false)}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Got it
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* EDIT/ADD MODAL OVERLAY */}
              {isRosterModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-6xl w-full p-0 flex flex-col text-left overflow-hidden max-h-[85vh]"
                  >
                    <div className="flex items-center justify-between border-b border-slate-150 p-6 shrink-0 bg-white z-10 sticky top-0">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-extrabold text-slate-800 text-sm">
                          {crudMode === "create" ? "Add New" : "Edit Details:"}{" "}
                          Team Member
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRosterModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                      <form
                        onSubmit={handleSaveMemberRoster}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* PIN */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                              User PIN / Student PIN
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 101"
                              value={memberForm.pin}
                              onChange={(e) =>
                                setMemberForm((prev) => ({
                                  ...prev,
                                  pin: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                            />
                          </div>

                          {/* Name */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                              Full Name
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. John Doe"
                              value={memberForm.name}
                              onChange={(e) =>
                                setMemberForm((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                            />
                          </div>

                          {/* Email */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              required
                              placeholder="e.g. john@portal.com"
                              value={memberForm.email}
                              onChange={(e) =>
                                setMemberForm((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>

                          {/* Designation */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                              Designation
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Executive Member"
                              value={memberForm.designation}
                              onChange={(e) =>
                                setMemberForm((prev) => ({
                                  ...prev,
                                  designation: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                            />
                          </div>

                          {/* Password */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                              Portal Password
                            </label>
                            <input
                              type="text"
                              required={crudMode === "create"}
                              placeholder="Password"
                              value={memberForm.password}
                              onChange={(e) =>
                                setMemberForm((prev) => ({
                                  ...prev,
                                  password: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                            />
                          </div>

                          {/* Role edit disabled */}

                          {/* Campus */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                              Campus Location
                            </label>
                            <select
                              value={memberForm.campus}
                              onChange={(e) =>
                                setMemberForm((prev) => ({
                                  ...prev,
                                  campus: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                            >
                              <option value="" key="member-campus-placeholder">
                                Select Campus
                              </option>
                              {campuses.map((c) => (
                                <option
                                  key={`member-form-campus-${c.id}`}
                                  value={c.name}
                                >
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Campus Coordinator */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                              Campus Coordinator
                            </label>
                            <select
                              value={memberForm.mentorPin}
                              onChange={(e) =>
                                setMemberForm((prev) => ({
                                  ...prev,
                                  mentorPin: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                            >
                              <option value="">
                                No Campus Coordinator (Unassigned)
                              </option>
                              {/* Managers */}
                              {managers.map((m) => (
                                <option
                                  key={`mgr-option-${m.pin}`}
                                  value={m.pin}
                                >
                                  {m.name} 
                                </option>
                              ))}
                              {/* coordinators assigned to this campus */}
                              {mentors
                                .filter((m) => m.campus === memberForm.campus)
                                .map((m) => (
                                  <option
                                    key={`coord-option-${m.pin}`}
                                    value={m.pin}
                                  >
                                    {m.name} (Coordinator)
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                          {/* Base64 Avatar Uploader */}
                          <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                              Profile Picture (Base64 Profile Picture)
                            </label>
                            <div
                              className="border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/10 rounded-2xl p-4 text-center cursor-pointer transition-all relative group mb-2"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files?.[0];
                                if (file) {
                                  if (file.size > 200 * 1024) {
                                    alert(
                                      "Image size cannot exceed 200 KB."
                                    );
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === "string") {
                                      setMemberForm((p) => ({
                                        ...p,
                                        avatarUrl: reader.result as string,
                                      }));
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              onClick={() =>
                                document
                                  .getElementById("modal-avatar-upload")
                                  ?.click()
                              }
                            >
                              <input
                                id="modal-avatar-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 200 * 1024) {
                                      alert(
                                        "Image size cannot exceed 200 KB."
                                      );
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      if (typeof reader.result === "string") {
                                        setMemberForm((p) => ({
                                          ...p,
                                          avatarUrl: reader.result as string,
                                        }));
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                              <div className="flex flex-col items-center justify-center gap-1">
                                {memberForm.avatarUrl ? (
                                  <img
                                    src={memberForm.avatarUrl}
                                    alt="Preview"
                                    className="w-14 h-14 rounded-full border-2 border-indigo-100 object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100";
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                    <Upload className="w-4 h-4" />
                                  </div>
                                )}
                                <span className="text-[10px] font-extrabold text-slate-600 mt-0.5">
                                  Drag or click to upload photo
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  Converted to Base64 instantly
                                </span>
                              </div>
                            </div>
                            <input
                              type="url"
                              placeholder="Or provide a direct image link..."
                              value={
                                memberForm.avatarUrl &&
                                memberForm.avatarUrl.startsWith("data:")
                                  ? ""
                                  : memberForm.avatarUrl
                              }
                              onChange={(e) =>
                                setMemberForm((prev) => ({
                                  ...prev,
                                  avatarUrl: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                            />
                          </div>

                          {/* Permissions */}
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                              Configure Menu Permissions
                            </label>
                            
                            {memberForm.role === 'mentor' ? (
                              <div className="space-y-3">
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input type="checkbox" checked={memberForm.permissions.includes("mentor_attendance")} onChange={(e) => { const checked = e.target.checked; setMemberForm((prev) => ({ ...prev, permissions: checked ? [...prev.permissions, "mentor_attendance"] : prev.permissions.filter((p) => p !== "mentor_attendance") })); }} className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" />
                                  View Team Attendance
                                </label>
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input type="checkbox" checked={memberForm.permissions.includes("mentor_leave")} onChange={(e) => { const checked = e.target.checked; setMemberForm((prev) => ({ ...prev, permissions: checked ? [...prev.permissions, "mentor_leave"] : prev.permissions.filter((p) => p !== "mentor_leave") })); }} className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" />
                                  Manage Leave Requests
                                </label>
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input type="checkbox" checked={memberForm.permissions.includes("mentor_history")} onChange={(e) => { const checked = e.target.checked; setMemberForm((prev) => ({ ...prev, permissions: checked ? [...prev.permissions, "mentor_history"] : prev.permissions.filter((p) => p !== "mentor_history") })); }} className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" />
                                  Manage Adjustments
                                </label>
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input type="checkbox" checked={memberForm.permissions.includes("mentor_notices")} onChange={(e) => { const checked = e.target.checked; setMemberForm((prev) => ({ ...prev, permissions: checked ? [...prev.permissions, "mentor_notices"] : prev.permissions.filter((p) => p !== "mentor_notices") })); }} className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" />
                                  View Notice Board
                                </label>
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input type="checkbox" checked={memberForm.permissions.includes("mentor_post_notice")} onChange={(e) => { const checked = e.target.checked; setMemberForm((prev) => ({ ...prev, permissions: checked ? [...prev.permissions, "mentor_post_notice"] : prev.permissions.filter((p) => p !== "mentor_post_notice") })); }} className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" />
                                  Post Notices
                                </label>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={memberForm.permissions.includes(
                                      "member_attendance",
                                    )}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setMemberForm((prev) => ({
                                        ...prev,
                                        permissions: checked
                                          ? [
                                              ...prev.permissions,
                                              "member_attendance",
                                            ]
                                          : prev.permissions.filter(
                                              (p) => p !== "member_attendance",
                                            ),
                                      }));
                                    }}
                                    className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-550 cursor-pointer w-4 h-4"
                                  />
                                  Attendance Form
                                </label>
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={memberForm.permissions.includes(
                                      "member_notices",
                                    )}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setMemberForm((prev) => ({
                                        ...prev,
                                        permissions: checked
                                          ? [
                                              ...prev.permissions,
                                              "member_notices",
                                            ]
                                          : prev.permissions.filter(
                                              (p) => p !== "member_notices",
                                            ),
                                      }));
                                    }}
                                    className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-550 cursor-pointer w-4 h-4"
                                  />
                                  Bulletins / Notice Board
                                </label>
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={memberForm.permissions.includes(
                                      "member_post_notice",
                                    )}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setMemberForm((prev) => ({
                                        ...prev,
                                        permissions: checked
                                          ? [
                                              ...prev.permissions,
                                              "member_post_notice",
                                            ]
                                          : prev.permissions.filter(
                                              (p) => p !== "member_post_notice",
                                            ),
                                      }));
                                    }}
                                    className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-550 cursor-pointer w-4 h-4"
                                  />
                                  Post Notices 
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2.5 pt-6 border-t border-slate-150 bg-white sticky bottom-0 z-10">
                          <button
                            type="submit"
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors shadow-2xs"
                          >
                            {crudMode === "create"
                              ? "Create Team Member"
                              : "Save Changes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsRosterModalOpen(false)}
                            className="px-6 py-3 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 4b: NOTICE BOARD ACCESSIBLE TO MANAGER */}
          {activeTab === "notices" && viewedMemberPin === null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-left"
            >
              <NoticeBoard
                notices={notices}
                onAddNotice={onAddNotice}
                onDeleteNoticeRequest={onDeleteNotice}
                onUpdateNotice={onUpdateNotice}
                canPost={true}
                currentUser={currentUser}
                campuses={campuses.map((c) => c.name)}
              />
            </motion.div>
          )}

          {/* Tab 5: PROFILE VERIFICATION REQUESTS */}
          {activeTab === "verification" && viewedMemberPin === null && (
            <motion.div
              key="tab-verification"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs text-left space-y-6"
            >
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Profile Verification Requests
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
               
                </p>
              </div>

              <div className="space-y-4">
                {profileRequests.filter((r) => r.status === "Pending")
                  .length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                    <CheckCircle className="w-12 h-12 text-emerald-500/80 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-600">
                      No pending verification
                      requests
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {profileRequests
                      .filter((r) => r.status === "Pending")
                      .map((request) => (
                        <div
                          key={request.pin}
                          className="p-5 border border-slate-200/80 rounded-2xl bg-white hover:border-slate-300 transition-all shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                        >
                          <div className="space-y-1.5 text-left">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-700 font-mono">
                                {request.userRole === "member"
                                  ? "Team Member"
                                  : "Campus Coordinator"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold font-mono">
                                Date:{" "}
                                {new Date(
                                  request.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-800">
                              Requester:{" "}
                              <span className="text-indigo-600">
                                {request.currentName}
                              </span>{" "}
                              (PIN:{" "}
                              <span className="font-mono">
                                {request.userPin}
                              </span>
                              )
                            </h4>

                            {/* Detailed comparison */}
                            <div className="mt-3 grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-3 rounded-xl max-w-md">
                              <div>
                                <p className="text-[9px] font-bold uppercase text-slate-400">
                                  Current Information (Current)
                                </p>
                                <p className="text-xs font-semibold text-slate-600 mt-1">
                                  Name: {request.currentName}
                                </p>
                                <p className="text-xs font-mono text-slate-600 mt-0.5">
                                  PIN: {request.currentPin}
                                </p>
                              </div>
                              <div className="border-l border-slate-200 pl-4">
                                <p className="text-[9px] font-bold uppercase text-indigo-500">
                                  Requested Information (Requested)
                                </p>
                                <p className="text-xs font-black text-indigo-700 mt-1">
                                  Name: {request.requestedName}
                                </p>
                                <p className="text-xs font-mono font-black text-indigo-700 mt-0.5">
                                  PIN: {request.requestedPin}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                            <button
                              onClick={() => {
                                onApproveProfileRequest(request.pin);
                                alert(
                                  "Profile correction request successfully verified and submitted!",
                                );
                              }}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                            >
                              <ThumbsUp className="w-4 h-4" />
                              Verify & Submit
                            </button>
                            <button
                              onClick={() => {
                                onRejectProfileRequest(request.pin);
                                toast.success(
                                  "Request has been rejected.",
                                );
                              }}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold rounded-xl cursor-pointer transition-colors whitespace-nowrap"
                            >
                              <ThumbsDown className="w-4 h-4" />
                              Reject Request
                            </button>
                            <button
                              onClick={() => {
                                onDeleteProfileRequest(request.pin);
                              }}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors whitespace-nowrap"
                            >
                              <Trash className="w-4 h-4 text-slate-500" />
                              Delete Request
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* History of approved / rejected requests */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">
              Request History
                </h3>
                <div className="space-y-3">
                  {profileRequests.filter((r) => r.status !== "Pending")
                    .length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic">
                   
                    </p>
                  ) : (
                    profileRequests
                      .filter((r) => r.status !== "Pending")
                      .map((req) => (
                        <div
                          key={req.pin}
                          className="flex justify-between items-center p-3.5 border border-slate-100 rounded-xl text-xs bg-slate-50/50"
                        >
                          <div className="text-left space-y-0.5">
                            <p className="font-bold text-slate-700">
                              {req.requestedName} (PIN: {req.requestedPin})
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Requester PIN: {req.userPin} • {req.userRole}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                req.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-150"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {req.status === "Approved"
                                ? "Approved"
                                : "Rejected"}
                            </span>
                            <button
                              onClick={() => {
                                onDeleteProfileRequest(req.pin);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                              title="Delete History"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Attendance Edit Requests Panel */}
          {activeTab === "edit_requests" && viewedMemberPin === null && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 text-left"
            >
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="border-b border-slate-100 pb-5 mb-6">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                    <Edit3 className="w-5.5 h-5.5 text-indigo-600" />
                    Attendance Adjustments
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                  
                  </p>
                </div>

                {/* Quick Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-indigo-50/45 rounded-2xl border border-indigo-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pending Edit Requests
                    </p>
                    <p className="text-2xl font-black text-indigo-700 mt-1">
                      {
                        attendanceEditRequests.filter(
                          (r) => r.status === "Pending",
                        ).length
                      }
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50/45 rounded-2xl border border-emerald-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Approved
                    </p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">
                      {
                        attendanceEditRequests.filter(
                          (r) => r.status === "Approved",
                        ).length
                      }
                    </p>
                  </div>
                  <div className="p-4 bg-rose-50/45 rounded-2xl border border-rose-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Rejected
                    </p>
                    <p className="text-2xl font-black text-rose-700 mt-1">
                      {
                        attendanceEditRequests.filter(
                          (r) => r.status === "Rejected",
                        ).length
                      }
                    </p>
                  </div>
                </div>

                {attendanceEditRequests.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-12 text-center text-slate-400">
                    <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-bold text-slate-600">
                      No attendance edit requests found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      If a campus coordinator applies for a correction, it will
                      be displayed here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {selectedEditReqPins.length > 0 && (
                        <button
                          onClick={() => {
                            selectedEditReqPins.forEach((pin) => {
                              const req = attendanceEditRequests.find((r) => r.pin === pin);
                              if (req && req.status === "Pending") {
                                onResolveAttendanceEditRequest(req.pin, "Approved", req.managerComment || "");
                              }
                            });
                            setSelectedEditReqPins([]);
                            toast.success(`${selectedEditReqPins.length} requests successfully approved!`);
                          }}
                          className="px-4 py-2 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Bulk Approve ({selectedEditReqPins.length})
                        </button>
                      )}
                    </div>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-[#f8f9fa] shadow-inner p-1">
                      <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1400px] bg-white border border-[#e0e0e0]">
                          <thead>
                            <tr className="bg-[#f8f9fa] text-[10px] font-black uppercase tracking-wider text-[#3c4043] border-b border-[#e0e0e0]">
                              <th className="p-2 text-center w-12 border border-[#e0e0e0] font-bold">
                                <input
                                  type="checkbox"
                                  checked={
                                    attendanceEditRequests.filter(r => r.status === "Pending").length > 0 &&
                                    attendanceEditRequests
                                      .filter(r => r.status === "Pending")
                                      .every(r => selectedEditReqPins.includes(r.pin))
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      const pendingPins = attendanceEditRequests
                                        .filter(r => r.status === "Pending")
                                        .map(r => r.pin);
                                      setSelectedEditReqPins(pendingPins);
                                    } else {
                                      setSelectedEditReqPins([]);
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer animate-none"
                                />
                              </th>
                              <th className="p-2 text-center w-12 border border-[#e0e0e0] font-bold">
                                SL
                              </th>
                              <th className="p-2 border border-[#e0e0e0] font-bold">
                                PIN
                              </th>
                              <th className="p-2 border border-[#e0e0e0] font-bold">
                                Name
                              </th>
                              <th className="p-2 border border-[#e0e0e0] font-bold">
                                Date
                              </th>
                              <th className="p-2 border border-[#e0e0e0] font-bold">
                                In time
                              </th>
                              <th className="p-2 border border-[#e0e0e0] font-bold">
                                Out time
                              </th>
                              <th className="p-2 border border-[#e0e0e0] font-bold">
                                Reason
                              </th>
                              <th className="p-2 border border-[#e0e0e0] font-bold">
                                Campus
                              </th>
                              <th className="p-2 border border-[#e0e0e0] font-bold">
                                Status
                              </th>
                              <th className="p-2 border border-[#e0e0e0] font-bold">
                                Remarks
                              </th>
                              <th className="p-2 text-center w-28 border border-[#e0e0e0] font-bold">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 bg-white">
                            {attendanceEditRequests.map((req, index) => {
                              const report = reports.find(
                                (r) => r.pin === req.reportPin,
                              );
                              const record = report?.records.find(
                                (rec) => rec.memberPin === req.memberPin,
                              );
                              const inTime = record?.checkInTime || "--:--";
                              const outTime = record?.checkOutTime || "--:--";
                              const memberCampus =
                                members.find((m) => m.pin === req.memberPin)?.campus || "N/A";

                              return (
                                <tr
                                  key={req.pin}
                                  className={`hover:bg-[#f1f3f4]/80 transition-colors ${
                                    req.status === "Pending"
                                      ? "bg-amber-50/20"
                                      : ""
                                  }`}
                                >
                                  <td className="p-2 text-center border border-[#e0e0e0]">
                                    <input
                                      type="checkbox"
                                      disabled={req.status !== "Pending"}
                                      checked={selectedEditReqPins.includes(req.pin)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedEditReqPins(prev => [...prev, req.pin]);
                                        } else {
                                          setSelectedEditReqPins(prev => prev.filter(pin => pin !== req.pin));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    />
                                  </td>
                                  <td className="p-2 text-center text-[11px] font-bold text-slate-400 font-mono border border-[#e0e0e0]">
                                    {index + 1}
                                  </td>
                                  <td className="p-2 text-[11px] font-mono font-bold text-slate-700 border border-[#e0e0e0]">
                                    {req.memberPin}
                                  </td>
                                  <td className="p-2 text-[11px] font-semibold text-slate-800 border border-[#e0e0e0]">
                                    {req.memberName}
                                  </td>
                                  <td className="p-2 text-[11px] font-medium text-slate-600 font-mono border border-[#e0e0e0]">
                                    {req.date}
                                  </td>
                                  <td className="p-2 text-[11px] font-mono border border-[#e0e0e0]">
                                    <div className="flex flex-col gap-0.5">
                                      <span className={req.requestedCheckIn ? "line-through text-slate-400 font-medium" : "font-semibold text-slate-600"}>
                                        {inTime}
                                      </span>
                                      {req.requestedCheckIn && (
                                        <span className="text-indigo-600 font-extrabold text-[10px] bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded max-w-max mt-0.5">
                                          {req.requestedCheckIn}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2 text-[11px] font-mono border border-[#e0e0e0]">
                                    <div className="flex flex-col gap-0.5">
                                      <span className={req.requestedCheckOut ? "line-through text-slate-400 font-medium" : "font-semibold text-slate-600"}>
                                        {outTime}
                                      </span>
                                      {req.requestedCheckOut && (
                                        <span className="text-indigo-600 font-extrabold text-[10px] bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded max-w-max mt-0.5">
                                          {req.requestedCheckOut}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2 text-[11px] border border-[#e0e0e0]">
                                    <div className="space-y-1 max-w-[280px]">
                                      <div className="flex items-center gap-1.5">
                                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-150 px-1.5 py-0.5 rounded text-[10px] font-black">
                                          {req.requestedStatus}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50/50 p-1.5 rounded-lg border border-slate-100 mt-1">
                                        {req.reason}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="p-2 text-[11px] font-medium text-slate-600 border border-[#e0e0e0]">
                                    <span className="bg-slate-100 text-slate-700 border border-slate-200/50 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase">
                                      {memberCampus}
                                    </span>
                                  </td>
                                  <td className="p-2 text-[11px] font-semibold border border-[#e0e0e0]">
                                    <select
                                      value={req.status}
                                      onChange={(e) => {
                                        const newStatus = e.target.value as
                                          "Pending" | "Approved" | "Rejected";
                                        onResolveAttendanceEditRequest(
                                          req.pin,
                                          newStatus,
                                          req.managerComment !== undefined
                                            ? req.managerComment
                                            : editRemarks[req.pin] || "",
                                        );
                                      }}
                                      className={`px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-300 focus:outline-none text-[11px] font-bold cursor-pointer transition-colors w-full uppercase ${
                                        req.status === "Pending"
                                          ? "bg-amber-100 text-amber-800 border-amber-200"
                                          : req.status === "Approved"
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                            : "bg-rose-100 text-rose-800 border-rose-200"
                                      }`}
                                    >
                                      <option value="Pending">PENDING</option>
                                      <option value="Approved">APPROVED</option>
                                      <option value="Rejected">REJECTED</option>
                                    </select>
                                  </td>
                                  <td className="p-2 text-[11px] border border-[#e0e0e0]">
                                    <input
                                      type="text"
                                      placeholder="Remarks (মন্তব্য)..."
                                      value={
                                        req.managerComment !== undefined
                                          ? req.managerComment
                                          : editRemarks[req.pin] || ""
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditRemarks((prev) => ({
                                          ...prev,
                                          [req.pin]: val,
                                        }));
                                      }}
                                      onBlur={(e) => {
                                        onResolveAttendanceEditRequest(
                                          req.pin,
                                          req.status,
                                          e.target.value,
                                        );
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          onResolveAttendanceEditRequest(
                                            req.pin,
                                            req.status,
                                            (e.target as HTMLInputElement).value,
                                          );
                                          (e.target as HTMLInputElement).blur();
                                          toast.success("Remarks updated!");
                                        }
                                      }}
                                      className="w-full px-2 py-1 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded text-[11px] focus:outline-none bg-transparent hover:bg-white focus:bg-white min-w-[130px] font-medium"
                                    />
                                  </td>
                                  <td className="p-2 text-center text-[11px] border border-[#e0e0e0]">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {req.status === "Pending" && (
                                        <button
                                          onClick={() => {
                                            onResolveAttendanceEditRequest(req.pin, "Approved", req.managerComment || "");
                                            toast.success("Request successfully approved!");
                                          }}
                                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                          title="Approve"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => startEditRequest(req)}
                                        className="p-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                        title="Edit"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          setConfirmDeleteEditReqPin(req.pin)
                                        }
                                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                        title="Delete"
                                      >
                                        <Trash className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

          {/* Leave Requests Panel */}
          {activeTab === "leave-requests" && viewedMemberPin === null && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 text-left"
            >
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="border-b border-slate-100 pb-5 mb-6">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                    <ClipboardList className="w-5.5 h-5.5 text-rose-600" />
                    Leave Requests
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-4 mb-6 mt-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Search Member</label>
                    <input
                      type="text"
                      placeholder="Search PIN or Name..."
                      value={leaveSearchPin}
                      onChange={(e) => setLeaveSearchPin(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Filter Status</label>
                    <select
                      value={leaveFilterStatus}
                      onChange={(e) => setLeaveFilterStatus(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Filter Leave Type</label>
                    <select
                      value={leaveFilterType}
                      onChange={(e) => setLeaveFilterType(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Filter Month</label>
                    <select
                      value={leaveFilterMonth}
                      onChange={(e) => setLeaveFilterMonth(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="All">All Months</option>
                      {Array.from(new Set(leaveRequests.filter(r => r.startDate).map(r => r.startDate.substring(0, 7))))
                        .sort((a, b) => b.localeCompare(a))
                        .map(ym => {
                          const [year, month] = ym.split('-');
                          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                          return (
                            <option key={ym} value={ym}>
                              {date.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Sort By</label>
                    <select
                      value={leaveSortBy}
                      onChange={(e) => setLeaveSortBy(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="duration_desc">Duration (High to Low)</option>
                      <option value="duration_asc">Duration (Low to High)</option>
                    </select>
                  </div>
                </div>

                {/* Bulk Actions Bar */}
                <AnimatePresence>
                  {selectedLeavePins.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">
                          {selectedLeavePins.length}
                        </div>
                        <div>
                          <p className="text-xs font-black text-indigo-950 uppercase tracking-tight">Bulk Actions Selected</p>
                          <p className="text-[10px] font-bold text-indigo-400">Update leave requests in bulk</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            selectedLeavePins.forEach(pin => onResolveLeaveRequest(pin, "Approved"));
                            setSelectedLeavePins([]);
                            toast.success(`Successfully approved ${selectedLeavePins.length} requests!`);
                          }}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve All
                        </button>
                        <button
                          onClick={() => {
                            selectedLeavePins.forEach(pin => onResolveLeaveRequest(pin, "Rejected"));
                            setSelectedLeavePins([]);
                            toast.success(`Successfully rejected ${selectedLeavePins.length} requests!`);
                          }}
                          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all flex items-center gap-2 shadow-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject All
                        </button>
                        <button
                          onClick={() => setSelectedLeavePins([])}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-3xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-indigo-50/45 rounded-2xl border border-indigo-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pending Leave Requests
                    </p>
                    <p className="text-2xl font-black text-indigo-700 mt-1">
                      {
                        leaveRequests.filter((r) => r.status === "Pending")
                          .length
                      }
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50/45 rounded-2xl border border-emerald-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Approved
                    </p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">
                      {
                        leaveRequests.filter((r) => r.status === "Approved")
                          .length
                      }
                    </p>
                  </div>
                  <div className="p-4 bg-rose-50/45 rounded-2xl border border-rose-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Rejected
                    </p>
                    <p className="text-2xl font-black text-rose-700 mt-1">
                      {
                        leaveRequests.filter((r) => r.status === "Rejected")
                          .length
                      }
                    </p>
                  </div>
                </div>

                {filteredAndSortedLeaveRequests.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-12 text-center text-slate-400">
                    <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-bold text-slate-600">
                      No leave requests found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      If a coordinator sends a leave request for team members,
                      it will be displayed here.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-[#f8f9fa] shadow-inner p-1">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1400px] bg-white border border-[#e0e0e0]">
                        <thead>
                          <tr className="bg-[#f8f9fa] text-[10px] font-black uppercase tracking-wider text-[#3c4043] border-b border-[#e0e0e0]">
                            <th className="p-2 text-center w-10 border border-[#e0e0e0]">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={selectedLeavePins.length === filteredAndSortedLeaveRequests.length && filteredAndSortedLeaveRequests.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLeavePins(filteredAndSortedLeaveRequests.map(r => r.pin));
                                  } else {
                                    setSelectedLeavePins([]);
                                  }
                                }}
                              />
                            </th>
                            <th className="p-2 text-center w-12 border border-[#e0e0e0] font-bold">
                              SL
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              Name
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              Pin
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              From
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              To
                            </th>
                            <th className="p-2 text-center w-16 border border-[#e0e0e0] font-bold">
                              Days
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              Reason
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              Responsible Person Name
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              Responsible Person PIN
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              Leave Type
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              Status
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              Campus
                            </th>
                            <th className="p-2 border border-[#e0e0e0] font-bold">
                              Remarks
                            </th>
                            <th className="p-2 text-center w-36 border border-[#e0e0e0] font-bold">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 bg-white">
                          {filteredAndSortedLeaveRequests
                            .map((req, index) => {
                              const isEditing = editingLeavePin === req.pin;
                              const start = new Date(
                                isEditing
                                  ? leaveEditForm.startDate || req.startDate
                                  : req.startDate,
                              );
                              const end = new Date(
                                isEditing
                                  ? leaveEditForm.endDate || req.endDate
                                  : req.endDate,
                              );
                              const diffTime = Math.abs(
                                end.getTime() - start.getTime(),
                              );
                              const diffDays =
                                Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                              const pinToLookup = isEditing
                                ? leaveEditForm.memberPin
                                : req.memberPin;
                              const memberCampus =
                                members.find((m) => m.pin === pinToLookup)?.campus ||
                                mentors.find((m) => m.pin === pinToLookup)?.campus ||
                                "N/A";

                              const handleCopyDetails = (
                                r: LeaveRequest,
                                days: number,
                              ) => {
                                const text = `Member: ${r.memberName} (PIN: ${r.memberPin}) | Leave Type: ${r.leaveType} | From: ${r.startDate} To: ${r.endDate} (${days} days) | Reason: ${r.reason} | Responsible: ${r.coordinatorName} (${r.coordinatorPin})`;
                                navigator.clipboard.writeText(text);
                                toast.success("Leave details copied!");
                              };

                              return (
                                <tr
                                  key={req.pin}
                                  className={`hover:bg-[#f1f3f4]/80 transition-colors ${
                                    req.status === "Pending"
                                      ? "bg-amber-50/20"
                                      : ""
                                  } ${selectedLeavePins.includes(req.pin) ? "bg-indigo-50/40" : ""}`}
                                >
                                  <td className="p-2 text-center border border-[#e0e0e0]">
                                    <input
                                      type="checkbox"
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      checked={selectedLeavePins.includes(req.pin)}
                                      onChange={() => {
                                        setSelectedLeavePins(prev => 
                                          prev.includes(req.pin) 
                                            ? prev.filter(p => p !== req.pin)
                                            : [...prev, req.pin]
                                        );
                                      }}
                                    />
                                  </td>
                                  <td className="p-2 text-center text-[11px] font-bold text-slate-400 font-mono border border-[#e0e0e0]">
                                    {index + 1}
                                  </td>
                                  <td className="p-2 text-[11px] font-semibold text-slate-800 border border-[#e0e0e0]">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={leaveEditForm.memberName || ""}
                                        onChange={(e) =>
                                          setLeaveEditForm((prev) => ({
                                            ...prev,
                                            memberName: e.target.value,
                                          }))
                                        }
                                        className="w-full px-1 py-0.5 border border-indigo-300 rounded text-[11px] bg-white font-semibold"
                                      />
                                    ) : (
                                      req.memberName
                                    )}
                                  </td>
                                  <td className="p-2 text-[11px] font-mono font-bold text-slate-700 border border-[#e0e0e0]">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={leaveEditForm.memberPin || ""}
                                        onChange={(e) =>
                                          setLeaveEditForm((prev) => ({
                                            ...prev,
                                            memberPin: e.target.value,
                                          }))
                                        }
                                        className="w-full px-1 py-0.5 border border-indigo-300 rounded text-[11px] bg-white font-mono font-bold"
                                      />
                                    ) : (
                                      req.memberPin
                                    )}
                                  </td>
                                  <td className="p-2 text-[11px] font-medium text-slate-600 font-mono border border-[#e0e0e0]">
                                    {isEditing ? (
                                      <input
                                        type="date"
                                        value={leaveEditForm.startDate || ""}
                                        onChange={(e) =>
                                          setLeaveEditForm((prev) => ({
                                            ...prev,
                                            startDate: e.target.value,
                                          }))
                                        }
                                        className="w-full px-1 py-0.5 border border-indigo-300 rounded text-[11px] bg-white font-mono"
                                      />
                                    ) : (
                                      formatDateLong(req.startDate)
                                    )}
                                  </td>
                                  <td className="p-2 text-[11px] font-medium text-slate-600 font-mono border border-[#e0e0e0]">
                                    {isEditing ? (
                                      <input
                                        type="date"
                                        value={leaveEditForm.endDate || ""}
                                        onChange={(e) =>
                                          setLeaveEditForm((prev) => ({
                                            ...prev,
                                            endDate: e.target.value,
                                          }))
                                        }
                                        className="w-full px-1 py-0.5 border border-indigo-300 rounded text-[11px] bg-white font-mono"
                                      />
                                    ) : (
                                      formatDateLong(req.endDate)
                                    )}
                                  </td>
                                  <td className="p-2 text-center text-[11px] font-bold text-slate-700 font-mono border border-[#e0e0e0]">
                                    {diffDays}
                                  </td>
                                  <td className="p-2 text-[11px] border border-[#e0e0e0]">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={leaveEditForm.reason || ""}
                                        onChange={(e) =>
                                          setLeaveEditForm((prev) => ({
                                            ...prev,
                                            reason: e.target.value,
                                          }))
                                        }
                                        className="w-full px-1.5 py-0.5 border border-indigo-300 rounded text-[11px] bg-white italic"
                                      />
                                    ) : (
                                      <p
                                        className="text-[11px] text-[#3c4043] italic font-medium leading-relaxed max-w-[200px] truncate"
                                        title={req.reason}
                                      >
                                        "{req.reason}"
                                      </p>
                                    )}
                                  </td>
                                  <td className="p-2 text-[11px] font-semibold text-slate-700 border border-[#e0e0e0]">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={
                                          leaveEditForm.responsiblePersonName || ""
                                        }
                                        onChange={(e) =>
                                          setLeaveEditForm((prev) => ({
                                            ...prev,
                                            responsiblePersonName: e.target.value,
                                          }))
                                        }
                                        className="w-full px-1 py-0.5 border border-indigo-300 rounded text-[11px] bg-white font-semibold"
                                      />
                                    ) : (
                                      req.responsiblePersonName || req.coordinatorName
                                    )}
                                  </td>
                                  <td className="p-2 text-[11px] font-mono font-bold text-slate-500 border border-[#e0e0e0]">
                                    {isEditing ? (
                                      <div className="w-full px-1 py-0.5 border border-slate-200 rounded text-[11px] bg-slate-50 font-mono font-bold text-slate-400 cursor-not-allowed">
                                        {req.responsiblePersonPin || req.coordinatorPin}
                                      </div>
                                    ) : (
                                      req.responsiblePersonPin || req.coordinatorPin
                                    )}
                                  </td>
                                  <td className="p-2 text-[11px] font-semibold border border-[#e0e0e0]">
                                    {isEditing ? (
                                      <select
                                        value={
                                          leaveEditForm.leaveType || "Casual Leave"
                                        }
                                        onChange={(e) =>
                                          setLeaveEditForm((prev) => ({
                                            ...prev,
                                            leaveType: e.target.value as any,
                                          }))
                                        }
                                        className="px-1 py-0.5 border border-indigo-300 rounded text-[11px] bg-white w-full"
                                      >
                                        <option value="Casual Leave">Casual Leave</option>
                                        <option value="Medical Leave">Medical Leave</option>
                                        <option value="Special Leave">Special Leave</option>
                                        <option value="Paternity Leave">Paternity Leave</option>
                                        <option value="Maternity Leave">Maternity Leave</option>
                                        <option value="Earn Leave">Earn Leave</option>
                                        <option value="Weekend Adjustment">Weekend Adjustment</option>
                                        <option value="Holiday Adjustment">Holiday Adjustment</option>
                                        <option value="Sick Leave">Sick Leave</option>
                                        <option value="Emergency Leave">Emergency Leave</option>
                                        <option value="Other Leave">Other Leave</option>
                                      </select>
                                    ) : (
                                      <span
                                        className={`text-[11px] font-semibold ${
                                          req.leaveType?.includes("Casual")
                                            ? "text-blue-700"
                                            : req.leaveType?.includes("Medical") || req.leaveType?.includes("Sick")
                                              ? "text-emerald-700"
                                              : req.leaveType?.includes("Special")
                                                ? "text-purple-700"
                                                : req.leaveType?.includes("Paternity")
                                                  ? "text-cyan-700"
                                                  : req.leaveType?.includes("Maternity")
                                                    ? "text-pink-700"
                                                    : req.leaveType?.includes("Earn")
                                                      ? "text-indigo-700"
                                                      : req.leaveType?.includes("Weekend")
                                                        ? "text-orange-700"
                                                        : req.leaveType?.includes("Holiday")
                                                          ? "text-amber-700"
                                                          : "text-slate-700"
                                        }`}
                                      >
                                        {req.leaveType}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center text-[11px] font-semibold border border-[#e0e0e0]">
                                    <span
                                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                        req.status === "Pending"
                                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                                          : req.status === "Approved"
                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                            : "bg-rose-100 text-rose-800 border border-rose-200"
                                      }`}
                                    >
                                      {req.status}
                                    </span>
                                  </td>
                                  <td className="p-2 text-[11px] font-medium text-slate-600 border border-[#e0e0e0]">
                                    <span className="bg-slate-100 text-slate-700 border border-slate-200/50 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase">
                                      {memberCampus}
                                    </span>
                                  </td>
                                  <td className="p-2 text-[11px] border border-[#e0e0e0]">
                                    <input
                                      type="text"
                                      placeholder="Remarks (মন্তব্য)..."
                                      value={
                                        leaveRemarks[req.pin] !== undefined
                                          ? leaveRemarks[req.pin]
                                          : req.managerComment || ""
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setLeaveRemarks((prev) => ({
                                          ...prev,
                                          [req.pin]: val,
                                        }));
                                      }}
                                      onBlur={(e) => {
                                        onResolveLeaveRequest(
                                          req.pin,
                                          req.status,
                                          e.target.value,
                                        );
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          onResolveLeaveRequest(
                                            req.pin,
                                            req.status,
                                            (e.target as HTMLInputElement)
                                              .value,
                                          );
                                          (e.target as HTMLInputElement).blur();
                                          toast.success("Remarks updated!");
                                        }
                                      }}
                                      className="w-full px-2 py-1 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded text-[11px] focus:outline-none bg-transparent hover:bg-white focus:bg-white min-w-[130px] font-medium"
                                    />
                                  </td>
                                  <td className="p-2 text-center text-[11px] border border-[#e0e0e0]">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {isEditing ? (
                                        <>
                                          <button
                                            onClick={saveEditLeave}
                                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition-colors"
                                            title="Save"
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              setEditingLeavePin(null)
                                            }
                                            className="p-1 bg-slate-500 hover:bg-slate-600 text-white rounded cursor-pointer transition-colors"
                                            title="Cancel"
                                          >
                                            <AlertCircle className="w-4 h-4" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => startEditLeave(req)}
                                            className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                            title="Edit"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                          {req.status !== "Approved" && (
                                            <button
                                              onClick={() => onResolveLeaveRequest(req.pin, "Approved", leaveRemarks[req.pin] !== undefined ? leaveRemarks[req.pin] : req.managerComment)}
                                              className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                              title="Approve"
                                            >
                                              <CheckCircle className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {req.status !== "Rejected" && (
                                            <button
                                              onClick={() => onResolveLeaveRequest(req.pin, "Rejected", leaveRemarks[req.pin] !== undefined ? leaveRemarks[req.pin] : req.managerComment)}
                                              className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                              title="Reject"
                                            >
                                              <XCircle className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {req.status !== "Pending" && (
                                            <button
                                              onClick={() => onResolveLeaveRequest(req.pin, "Pending", leaveRemarks[req.pin] !== undefined ? leaveRemarks[req.pin] : req.managerComment)}
                                              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                              title="Mark as Pending"
                                            >
                                              <AlertCircle className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          <button
                                            onClick={() =>
                                              setConfirmDeleteLeavePin(req.pin)
                                            }
                                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                            title="Delete"
                                          >
                                            <Trash className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleCopyDetails(req, diffDays)
                                            }
                                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                                            title="Copy Leave details"
                                          >
                                            <ClipboardList className="w-4 h-4" />
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
            </motion.div>
          )}

          {/* Tab 6: PROFILE SETTINGS */}
          {activeTab === "profile" && viewedMemberPin === null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ProfileSettings
                currentUser={currentUser}
                userRole="manager"
                profileRequests={[]} // Empty for manager
                onSubmitProfileRequest={() => {}} // No-op for manager
                onInstantUpdate={(updatedFields) => {
                  onInstantUpdate(updatedFields);
                }}
              />
            </motion.div>
          )}
        </div>
        {/* Close lg:col-span-10 */}
      </div>
      {/* Close grid */}
      {/* Modal for editing campus */}
      <CampusEditModal
        isOpen={!!editingCampusName}
        onClose={() => setEditingCampusName(null)}
        campusName={editingCampusName || ""}
        editValue={editCampusValue}
        setEditValue={setEditCampusValue}
        headPin={editCampusHead}
        setHeadPin={setEditCampusHead}
        deputyPins={editCampusDeputies}
        setDeputyPins={setEditCampusDeputies}
        deputyAccessMap={editCampusDeputyAccess}
        setDeputyAccessMap={setEditCampusDeputyAccess}
        mentors={mentors}
        members={members}
        managers={managers}
        campuses={campuses}
        onUpdate={onUpdateCampus}
      />
      <CampusAddModal
        isOpen={isAddCampusModalOpen}
        onClose={() => setIsAddCampusModalOpen(false)}
        onAdd={onAddCampus}
        members={members}
        mentors={mentors}
        managers={managers}
        campuses={campuses}
      />

      <AttendanceAdjustmentEditModal
        isOpen={!!editingReqPin}
        onClose={() => setEditingReqPin(null)}
        request={reqEditForm}
        onSave={saveEditRequest}
      />

      {/* Edit Leave Request Overlay Modal */}
      <AnimatePresence>
        {editingLeavePin && leaveEditForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
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
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex gap-4">
                     <div>
                       <span className="text-[10px] text-slate-400 block">Name</span>
                       <input 
                         type="text" 
                         value={leaveEditForm.memberName || ''}
                         onChange={e => setLeaveEditForm(prev => ({...prev, memberName: e.target.value}))}
                         className="bg-transparent font-bold text-slate-700 outline-none"
                       />
                     </div>
                     <div>
                       <span className="text-[10px] text-slate-400 block">PIN</span>
                       <input 
                         type="text" 
                         value={leaveEditForm.memberPin || ''}
                         onChange={e => setLeaveEditForm(prev => ({...prev, memberPin: e.target.value}))}
                         className="bg-transparent font-bold text-slate-700 outline-none"
                       />
                     </div>
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
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Emergency Leave">Emergency Leave</option>
                      <option value="Other Leave">Other Leave</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 font-mono">
                      Responsible Person PIN
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-semibold text-slate-400 cursor-not-allowed">
                      {leaveEditForm.responsiblePersonPin || leaveEditForm.coordinatorPin || "N/A"}
                    </div>
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
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLeavePin(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditLeave}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Separate Campus Edit Modal Component for better readability
function CampusEditModal({
  isOpen,
  onClose,
  campusName,
  editValue,
  setEditValue,
  headPin,
  setHeadPin,
  deputyPins,
  setDeputyPins,
  deputyAccessMap,
  setDeputyAccessMap,
  mentors,
  members,
  managers,
  campuses,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  campusName: string;
  editValue: string;
  setEditValue: (val: string) => void;
  headPin: string;
  setHeadPin: (val: string) => void;
  deputyPins: string[];
  setDeputyPins: React.Dispatch<React.SetStateAction<string[]>>;
  deputyAccessMap: Record<string, string[]>;
  setDeputyAccessMap: React.Dispatch<
    React.SetStateAction<Record<string, string[]>>
  >;
  mentors: Mentor[];
  members: TeamMember[];
  managers: UserType[];
  campuses: Campus[];
  onUpdate: (
    oldName: string,
    newName: string,
    headPin?: string,
    deputyPins?: string[],
    deputyMemberAccess?: Record<string, string[]>,
  ) => void;
}) {
  if (!isOpen) return null;
  const [headSearch, setHeadSearch] = useState("");
  const [deputySearch, setDeputySearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [expandedDeputy, setExpandedDeputy] = useState<string | null>(null);
  const [showHeadDropdown, setShowHeadDropdown] = useState(false);
  const [showDeputyDropdown, setShowDeputyDropdown] = useState(false);

  const eligibleUsers = (() => {
    const map = new Map<string, any>();
    // Managers are always eligible for any campus
    if (managers && Array.isArray(managers)) {
      managers.forEach((u: any) => {
        if (!map.has(u.pin)) map.set(u.pin, u);
      });
    }
    // Mentors and members are eligible if they belong to this campus
    [...mentors, ...members].forEach((u: any) => {
      if (u.campus === campusName) {
        if (!map.has(u.pin)) map.set(u.pin, u);
      }
    });
    return Array.from(map.values());
  })();

  const campusMembers = members.filter((m) => m.campus === campusName);

  const selectedHead = eligibleUsers.find((u) => u.pin === headPin);



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Edit Campus
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {campusName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Campus Name
            </label>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-800 shadow-sm"
              placeholder="Enter campus name..."
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-2 ml-1">
                Head Campus Coordinator (Dropdown & Search)
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowHeadDropdown(!showHeadDropdown);
                    if (!showHeadDropdown) setShowDeputyDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-800 text-left mb-2"
                >
                  <div className="flex items-center gap-2">
                    {selectedHead ? (
                      <>
                        <UserAvatar user={selectedHead} size="sm" />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">
                            {selectedHead.name}{" "}
                            <span className="text-[10px] text-slate-400">
                              #{selectedHead.pin}
                            </span>
                          </span>
                          {selectedHead.designation && (
                            <span className="text-[10px] text-indigo-600 font-bold -mt-1">
                              {selectedHead.designation}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400">
                        Select Head Coordinator...
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-indigo-400 transition-transform ${showHeadDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showHeadDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by PIN or Name..."
                          value={headSearch}
                          onChange={(e) => setHeadSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {eligibleUsers
                        .filter((m) => {
                          const searchMatch = m.name.toLowerCase().includes(headSearch.toLowerCase()) ||
                                            m.pin.toLowerCase().includes(headSearch.toLowerCase());
                          
                          if (!searchMatch) return false;

                          const assignedToOtherCampus = campuses.find(
                            (c) =>
                              c.name !== campusName &&
                              (c.headCoordinatorPin === m.pin ||
                                c.deputyCoordinatorPins?.includes(m.pin)),
                          );
                          return !assignedToOtherCampus;
                        })
                        .map((m) => (
                          <button
                            key={m.pin}
                            onClick={() => {
                              setHeadPin(m.pin);
                              setDeputyPins((prev) =>
                                prev.filter((p) => p !== m.pin),
                              );
                              setShowHeadDropdown(false);
                              setHeadSearch("");
                            }}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all border ${headPin === m.pin ? "bg-indigo-600 border-indigo-600 text-white" : "hover:bg-slate-50 border-transparent text-slate-600"}`}
                          >
                            <UserAvatar user={m} size="sm" />
                            <div className="flex flex-col items-start text-left">
                              <span className="text-xs font-bold capitalize">
                                {m.name}{" "}
                                <span
                                  className={`text-[9px] ${headPin === m.pin ? "text-indigo-100" : "text-slate-400"}`}
                                >
                                  #{m.pin}
                                </span>
                              </span>
                              {m.designation && (
                                <span className={`text-[8px] font-bold ${headPin === m.pin ? "text-indigo-100/80" : "text-slate-500"}`}>
                                  {m.designation}
                                </span>
                              )}
                            </div>
                            {headPin === m.pin && (
                              <Check className="w-4 h-4 ml-auto" />
                            )}
                          </button>
                        ))}
                      {eligibleUsers.length === 0 && (
                        <p className="text-[10px] text-slate-400 text-center py-4">
                          No eligible members found in this campus.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Deputy Campus Coordinators (Dropdown & Search)
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeputyDropdown(!showDeputyDropdown);
                    if (!showDeputyDropdown) setShowHeadDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-800 text-left mb-2 shadow-sm"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {deputyPins.length > 0 ? (
                      <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
                        {deputyPins.map((pin) => {
                          const deputy = eligibleUsers.find(
                            (u) => u.pin === pin,
                          );
                          return (
                            <span
                              key={pin}
                              className="flex-shrink-0 px-2 py-1 bg-slate-100 text-[10px] rounded-lg text-slate-600 border border-slate-200 flex items-center gap-1"
                            >
                              {deputy?.name}
                              <X
                                className="w-2.5 h-2.5 cursor-pointer hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeputyPins((prev) =>
                                    prev.filter((p) => p !== pin),
                                  );
                                }}
                              />
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-400">
                        Select Deputy Coordinators...
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${showDeputyDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showDeputyDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search by PIN or Name..."
                          value={deputySearch}
                          onChange={(e) => setDeputySearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                      {eligibleUsers
                        .filter((m) => {
                          if (m.pin === headPin) return false;

                          const searchMatch = m.name.toLowerCase().includes(deputySearch.toLowerCase()) ||
                                            m.pin.toLowerCase().includes(deputySearch.toLowerCase());
                          
                          if (!searchMatch) return false;

                          const assignedToOtherCampus = campuses.find(
                            (c) =>
                              c.name !== campusName &&
                              (c.headCoordinatorPin === m.pin ||
                                c.deputyCoordinatorPins?.includes(m.pin)),
                          );
                          return !assignedToOtherCampus;
                        })
                        .map((m) => (
                          <label
                            key={m.pin}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100 group"
                          >
                            <input
                              type="checkbox"
                              checked={deputyPins.includes(m.pin)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDeputyPins((prev) => [...prev, m.pin]);
                                } else {
                                  setDeputyPins((prev) =>
                                    prev.filter((p) => p !== m.pin),
                                  );
                                  setDeputyAccessMap((prev) => {
                                    const next = { ...prev };
                                    delete next[m.pin];
                                    return next;
                                  });
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex items-center gap-2">
                              <UserAvatar user={m} size="sm" />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-700 transition-colors capitalize">
                                  {m.name}{" "}
                                  <span className="text-[9px] font-mono text-slate-400 opacity-60 ml-1">
                                    #{m.pin}
                                  </span>
                                </span>
                                {m.designation && (
                                  <span className="text-[8px] font-bold text-slate-500">
                                    {m.designation}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deputy Member Access Section */}
            {deputyPins.length > 0 && (
              <div className="mt-8 space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Deputy Member Access Control
                  </label>
                </div>
                <div className="space-y-3">
                  {deputyPins.map((dPin) => {
                    const deputy = eligibleUsers.find((u) => u.pin === dPin);
                    const isExpanded = expandedDeputy === dPin;
                    const accessList = deputyAccessMap[dPin] || [];

                    return (
                      <div
                        key={dPin}
                        className="border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDeputy(isExpanded ? null : dPin)
                          }
                          className="w-full px-4 py-3 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <UserAvatar user={deputy} size="sm" />
                            <div className="text-left">
                              <p className="text-xs font-bold text-slate-700">
                                {deputy?.name}
                              </p>
                              <p className="text-[9px] text-slate-400 font-medium">
                                {accessList.length} members assigned
                              </p>
                            </div>
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="p-4 bg-white space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                Select members this deputy can manage:
                              </p>
                              <div className="flex items-center gap-3">
                                <input
                                  type="text"
                                  placeholder="Search by name or pin..."
                                  value={memberSearch}
                                  onChange={(e) =>
                                    setMemberSearch(e.target.value)
                                  }
                                  className="text-[10px] border border-slate-200 rounded-lg px-2 py-1"
                                />
                                <label className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={(() => {
                                      const filtered = campusMembers.filter(
                                        (m) => {
                                          const query = memberSearch
                                            .toLowerCase()
                                            .trim();
                                          return (
                                            m.name
                                              .toLowerCase()
                                              .includes(query) ||
                                            String(m.pin)
                                              .toLowerCase()
                                              .includes(query)
                                          );
                                        },
                                      );
                                      return (
                                        filtered.length > 0 &&
                                        filtered.every((m) =>
                                          accessList.includes(m.pin),
                                        )
                                      );
                                    })()}
                                    onChange={(e) => {
                                      const filtered = campusMembers.filter(
                                        (m) => {
                                          const query = memberSearch
                                            .toLowerCase()
                                            .trim();
                                          return (
                                            m.name
                                              .toLowerCase()
                                              .includes(query) ||
                                            String(m.pin)
                                              .toLowerCase()
                                              .includes(query)
                                          );
                                        },
                                      );
                                      if (e.target.checked) {
                                        setDeputyAccessMap({
                                          ...deputyAccessMap,
                                          [dPin]: Array.from(
                                            new Set([
                                              ...accessList,
                                              ...filtered.map((m) => m.pin),
                                            ]),
                                          ),
                                        });
                                      } else {
                                        setDeputyAccessMap({
                                          ...deputyAccessMap,
                                          [dPin]: accessList.filter(
                                            (p) =>
                                              !filtered
                                                .map((m) => m.pin)
                                                .includes(p),
                                          ),
                                        });
                                      }
                                    }}
                                  />
                                  Select All
                                </label>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {campusMembers
                                .filter((m) => {
                                  const query = memberSearch
                                    .toLowerCase()
                                    .trim();
                                  return (
                                    m.name.toLowerCase().includes(query) ||
                                    String(m.pin).toLowerCase().includes(query)
                                  );
                                })
                                .map((member) => (
                                  <label
                                    key={member.pin}
                                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-slate-100"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={accessList.includes(member.pin)}
                                      onChange={(e) => {
                                        const currentAccess =
                                          deputyAccessMap[dPin] || [];
                                        if (e.target.checked) {
                                          setDeputyAccessMap({
                                            ...deputyAccessMap,
                                            [dPin]: [
                                              ...currentAccess,
                                              member.pin,
                                            ],
                                          });
                                        } else {
                                          setDeputyAccessMap({
                                            ...deputyAccessMap,
                                            [dPin]: currentAccess.filter(
                                              (p) => p !== member.pin,
                                            ),
                                          });
                                        }
                                      }}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs font-medium text-slate-600">
                                      {member.name}{" "}
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        ({member.pin})
                                      </span>
                                    </span>
                                  </label>
                                ))}
                            </div>
                            {campusMembers.length === 0 && (
                              <p className="text-xs text-slate-400 italic text-center py-2">
                                No members in this campus yet.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={() => {
              onUpdate(
                campusName,
                editValue,
                headPin || "",
                deputyPins,
                deputyAccessMap,
              );
              onClose();
            }}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CampusAddModal({
  isOpen,
  onClose,
  onAdd,
  members,
  mentors,
  managers,
  campuses,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    name: string,
    headPin?: string,
    deputyPins?: string[],
    deputyMemberAccess?: Record<string, string[]>,
  ) => void;
  members: TeamMember[];
  mentors: Mentor[];
  managers: UserType[];
  campuses: Campus[];
}) {
  const [name, setName] = useState("");

  if (!isOpen) return null;



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-[40vw] max-h-[50vh] flex flex-col overflow-hidden border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Add Campus
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Campus Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-800 shadow-sm"
              placeholder="Enter campus name..."
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onAdd(name, undefined, [], {});
              onClose();
              setName("");
            }}
            disabled={!name.trim()}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Campus
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AttendanceAdjustmentEditModal({
  isOpen,
  onClose,
  request,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  request: Partial<AttendanceEditRequest>;
  onSave: (updated: Partial<AttendanceEditRequest>) => void;
}) {
  const [memberPin, setMemberPin] = useState("");
  const [memberName, setMemberName] = useState("");
  const [date, setDate] = useState("");
  const [requestedStatus, setRequestedStatus] = useState<AttendanceStatus>("Present");
  const [requestedCheckIn, setRequestedCheckIn] = useState("");
  const [requestedCheckOut, setRequestedCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [managerComment, setManagerComment] = useState("");

  useEffect(() => {
    if (request) {
      setMemberPin(request.memberPin || "");
      setMemberName(request.memberName || "");
      setDate(request.date || "");
      setRequestedStatus(request.requestedStatus || "Present");
      setRequestedCheckIn(request.requestedCheckIn || "");
      setRequestedCheckOut(request.requestedCheckOut || "");
      setReason(request.reason || "");
      setManagerComment(request.managerComment || "");
    }
  }, [request]);

  if (!isOpen) return null;

  // Real-time Working Hours logic
  let workingHoursText = "";
  let workingHoursError = "";
  let isValidTime = true;

  if (requestedCheckIn || requestedCheckOut) {
    if (requestedCheckIn && requestedCheckOut) {
      const inMins = parseTimeToMinutes(requestedCheckIn);
      const outMins = parseTimeToMinutes(requestedCheckOut);

      if (inMins === null) {
        workingHoursError = "Invalid In Time format! (e.g. 09:00 AM)";
        isValidTime = false;
      } else if (outMins === null) {
        workingHoursError = "Out Time Missing";
        isValidTime = false;
      } else {
        let diffMins = outMins - inMins;
        if (diffMins < 0) diffMins += 24 * 60;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        workingHoursText = `Working Hour: ${hours} Hour ${mins} Min`;
      }
    } else {
      workingHoursError = "Both In Time and Out Time must be provided!";
      isValidTime = false;
    }
  }

  const handleSave = () => {
    if (!isValidTime) {
      toast.error(workingHoursError || "Please enter valid times!");
      return;
    }
    onSave({
      ...request,
      memberPin,
      memberName,
      date,
      requestedStatus,
      requestedCheckIn: requestedCheckIn || undefined,
      requestedCheckOut: requestedCheckOut || undefined,
      reason,
      managerComment,
    });
    toast.success("Request updated successfully!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200"
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-black text-slate-800 tracking-tight">
              Edit Attendance Adjustment
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Member Name
              </label>
              <input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                PIN
              </label>
              <input
                type="text"
                value={memberPin}
                onChange={(e) => setMemberPin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Requested Status
              </label>
              <select
                value={requestedStatus}
                onChange={(e) => setRequestedStatus(e.target.value as AttendanceStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
              >
                <option value="Present">Present</option>
                <option value="Leave">Leave</option>
                <option value="Late Entry">Late Entry</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-indigo-50/20 p-3 rounded-xl border border-indigo-100/50">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                In Time
              </label>
              <input
                type="text"
                value={requestedCheckIn}
                onChange={(e) => setRequestedCheckIn(e.target.value)}
                placeholder="e.g. 09:00 AM"
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-700 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                Out Time
              </label>
              <input
                type="text"
                value={requestedCheckOut}
                onChange={(e) => setRequestedCheckOut(e.target.value)}
                placeholder="e.g. 05:00 PM"
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-700 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Live Clock Logic Display */}
            <div className="col-span-2 mt-1">
              {workingHoursText && (
                <div className="text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-150 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {workingHoursText}
                </div>
              )}
              {workingHoursError && (
                <div className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-150 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 leading-tight">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {workingHoursError}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
              placeholder="Reason..."
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-indigo-500 uppercase tracking-wider mb-1">
              Manager Remarks
            </label>
            <input
              type="text"
              value={managerComment}
              onChange={(e) => setManagerComment(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-indigo-150 rounded-lg text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              placeholder="Enter manager comment..."
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
