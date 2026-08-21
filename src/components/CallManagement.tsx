import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { optimizeImage, optimizeBase64, uploadImageToImgBB } from "../utils/imageUtils";
import CameraModal from "./CameraModal";
import { motion, AnimatePresence } from "motion/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Phone,
  Upload,
  Users,
  User as UserIcon,
  Headphones,
  BarChart3,
  CheckCircle2,
  Check,
  Clock,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  MessageSquare,
  Send,
  UserPlus,
  UserMinus,
  Trash2,
  Download,
  ChevronRight,
  Plus,
  X,
  FileText,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Calendar,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Globe,
  Link as LinkIcon,
  ArrowRight,
  ExternalLink,
  CheckSquare,
  Square,
  Building2,
  ChevronDown,
  Clipboard as ClipboardIcon,
  Copy,
  Camera,
  Image as ImageIcon,
  Loader2,
  Edit3,
} from "lucide-react";
import {
  CallTask,
  TeamMember,
  Mentor,
  Role,
  User as UserType,
  Campus,
  Branch,
} from "../types";

interface CallManagementProps {
  currentUser: UserType;
  members: TeamMember[];
  mentors: Mentor[];
  campuses: Campus[];
  branches: Branch[];
  onRefreshEmails?: () => void;
}

const getTodayLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function SearchableMemberSelect({
  value,
  onChange,
  options,
  prefixLabel,
  title,
  showAllOption = true,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { pin: string; name: string }[];
  prefixLabel: string;
  title?: string;
  showAllOption?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedMember = useMemo(() => {
    if (value === "all" || value === "unassigned") return null;
    return options.find((m) => m.pin === value);
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.pin.toLowerCase().includes(q),
    );
  }, [options, search]);

  const displayLabel = useMemo(() => {
    if (value === "all") return `${prefixLabel}: All`;
    if (value === "unassigned") return `${prefixLabel}: Unassigned`;
    if (selectedMember)
      return `${prefixLabel}: ${selectedMember.name} (${selectedMember.pin})`;
    return `${prefixLabel}: ${value}`;
  }, [value, prefixLabel, selectedMember]);

  const isActive = value !== "all" && value !== "unassigned";

  return (
    <div className="relative w-full" ref={containerRef} title={title}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 bg-white border text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer transition-colors ${
          isActive
            ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
            : "border-slate-200/80 text-slate-700 hover:border-slate-300"
        }`}
      >
        <span className="truncate flex-1 text-left">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${
            isOpen ? "rotate-180 text-indigo-600" : "text-slate-400"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1.5 min-w-[220px]">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member or PIN..."
              autoFocus
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1 text-xs">
            {showAllOption && (!search ||
              "all".includes(search.toLowerCase()) ||
              "সকল".includes(search)) && (
              <button
                type="button"
                onClick={() => {
                  onChange("all");
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-between transition-colors ${
                  value === "all"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{prefixLabel}: All</span>
                {value === "all" && (
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                )}
              </button>
            )}

            {showAllOption && (!search ||
              "unassigned".includes(search.toLowerCase()) ||
              "আনএসাইন".includes(search)) && (
              <button
                type="button"
                onClick={() => {
                  onChange("unassigned");
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-between transition-colors ${
                  value === "unassigned"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{prefixLabel}: Unassigned</span>
                {value === "unassigned" && (
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                )}
              </button>
            )}

            {filteredOptions.length === 0 &&
            search &&
            !"all".includes(search.toLowerCase()) &&
            !"unassigned".includes(search.toLowerCase()) ? (
              <div className="text-center py-3 text-xs text-slate-400 font-medium">
                No member found
              </div>
            ) : (
              filteredOptions.map((m) => {
                const isSelected = value === m.pin;
                return (
                  <button
                    key={`opt-${prefixLabel}-${m.pin}`}
                    type="button"
                    onClick={() => {
                      onChange(m.pin);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate pr-1">
                      {m.name}{" "}
                      <span className="text-slate-400 font-normal">
                        ({m.pin})
                      </span>
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CallManagement({
  currentUser,
  members,
  mentors,
  campuses,
  branches,
  onRefreshEmails,
}: CallManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "dashboard" | "management" | "my-tasks" | "live-instruction" | "status-summary"
  >(
    currentUser.role === "manager" ||
      currentUser.role === "mentor" ||
      currentUser.permissions?.includes("can_upload_call_info")
      ? "dashboard"
      : "my-tasks",
  );
  const [tasks, setTasks] = useState<CallTask[]>(() => {
    try {
      const cached = sessionStorage.getItem(`call_tasks_cache_${currentUser.pin}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const selectedTasksAreAllFeedbackUnassigned = useMemo(() => {
    if (selectedTasks.length === 0) return false;
    return tasks
      .filter((t) => selectedTasks.includes(t.id))
      .every((t) => !t.assignedToPin || t.assignedToPin.trim() === "");
  }, [tasks, selectedTasks]);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveSearchRegNo, setLiveSearchRegNo] = useState("");
  const [liveFoundTask, setLiveFoundTask] = useState<CallTask | null>(null);
  const [liveComment, setLiveComment] = useState("");
  const [liveStatus, setLiveStatus] = useState<"Pending" | "Completed">(
    "Pending",
  );
  const [liveInstructorName, setLiveInstructorName] = useState(
    currentUser.name,
  );
  const [liveInstructorPin, setLiveInstructorPin] = useState(currentUser.pin);
  const [isLiveInstructorTeacher, setIsLiveInstructorTeacher] = useState(false);
  const [isUpdatingLive, setIsUpdatingLive] = useState(false);
  const [liveStatusFilter, setLiveStatusFilter] = useState<string>("all");
  const [dateTypeFilter, setDateTypeFilter] = useState<
    "all" | "live" | "feedback"
  >("all");
  const [fromDateFilter, setFromDateFilter] = useState<string>("");
  const [toDateFilter, setToDateFilter] = useState<string>("");
  const [feedbackStatusFilter, setFeedbackStatusFilter] =
    useState<string>("all");
  const [feedbackDetailFilter, setFeedbackDetailFilter] =
    useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [campusFilter, setCampusFilter] = useState<string>("all");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [branchSearchQuery, setBranchSearchQuery] = useState<string>("");
  const [isBranchFilterOpen, setIsBranchFilterOpen] = useState<boolean>(false);
  const [dashboardCampusFilter, setDashboardCampusFilter] =
    useState<string>("all");
  const [dashboardClassFilter, setDashboardClassFilter] =
    useState<string>("all");
  const [statusSummaryDate, setStatusSummaryDate] = useState<string>(
    getTodayLocalDate(),
  );
  const [statusSummarySearch, setStatusSummarySearch] = useState<string>("");
  const [statusSummaryCampusFilter, setStatusSummaryCampusFilter] =
    useState<string>("all");
  const [statusSummaryFilterMode, setStatusSummaryFilterMode] = useState<
    "active" | "all"
  >("active");
  const [assignFilter, setAssignFilter] = useState<string>("all");
  const [liveAssignFilter, setLiveAssignFilter] = useState<string>("all");
  const [liveAssignedMemberFilter, setLiveAssignedMemberFilter] = useState<string>("all");
  const [feedbackAssignedMemberFilter, setFeedbackAssignedMemberFilter] = useState<string>("all");
  const [bulkAssignType, setBulkAssignType] = useState<
    "feedback" | "live" | "both"
  >("feedback");
  const [rangeAssignType, setRangeAssignType] = useState<
    "feedback" | "live" | "both"
  >("both");

  // All unique members for assigned member filters
  const allFilterMembers = useMemo(() => {
    const map = new Map<string, { pin: string; name: string }>();
    [...members, ...mentors].forEach((m) => {
      if (m.pin && m.name) {
        map.set(m.pin, { pin: m.pin, name: m.name });
      }
    });
    tasks.forEach((t) => {
      if (t.assignedToPin && t.assignedToName) {
        if (!map.has(t.assignedToPin)) {
          map.set(t.assignedToPin, { pin: t.assignedToPin, name: t.assignedToName });
        }
      }
      if (t.liveAssignedToPin && t.liveAssignedToName) {
        if (!map.has(t.liveAssignedToPin)) {
          map.set(t.liveAssignedToPin, { pin: t.liveAssignedToPin, name: t.liveAssignedToName });
        }
      }
      if (t.liveInstructorPin && t.liveInstructorName) {
        if (!map.has(t.liveInstructorPin)) {
          map.set(t.liveInstructorPin, { pin: t.liveInstructorPin, name: t.liveInstructorName });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [members, mentors, tasks]);

  const feedbackFilterMembers = useMemo(() => {
    if (currentUser.role === "member") {
      return [{ pin: currentUser.pin, name: currentUser.name }];
    }
    return allFilterMembers;
  }, [currentUser, allFilterMembers]);

  const assignableMembers = useMemo(() => {
    let list = [...members];
    // If not a manager, filter by campus
    if (currentUser.role !== 'manager') {
        list = list.filter(m => m.campus && m.campus === currentUser.campus);
    }
    return list.map(m => ({ pin: m.pin, name: m.name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [members, currentUser]);

  // Script / Khata Image & Link
  const [liveInstructionImages, setLiveInstructionImages] = useState<string[]>([]);
  const [liveInstructionLink, setLiveInstructionLink] = useState<string>("");
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"live" | "modal">("live");
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [showOnlyWithImages, setShowOnlyWithImages] = useState(false);

  const isGoogleDriveLink = (url: string) => {
    return (
      url.includes("drive.google.com") || url.includes("docs.google.com/uc")
    );
  };

  const parseMultipleImages = (val: string | null | undefined): string[] => {
    if (!val) return [];
    const trimmed = val.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return [trimmed];
  };

  const handleImagePaste = async (
    e: React.ClipboardEvent,
    callback: (dataUrl: string) => void,
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          try {
            const imgUrl = await uploadImageToImgBB(file);
            callback(imgUrl);
            toast.success("Image pasted & uploaded to ImgBB");
          } catch (err) {
            console.error("Paste ImgBB upload failed:", err);
          }
        }
        return;
      }
    }
  };

  // Unassign Modal State
  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<{
    type: "single" | "range" | "bulk";
    taskId?: string;
    taskIds?: string[];
  } | null>(null);
  const [unassignChoice, setUnassignChoice] = useState<
    "live" | "feedback" | "both"
  >("both");

  // Individual Assign Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<CallTask | null>(null);
  const [assignChoice, setAssignChoice] = useState<
    "feedback" | "live" | "both"
  >("feedback");
  const [assignTargetMember, setAssignTargetMember] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

  const [selectedClassForUpload, setSelectedClassForUpload] = useState("");
  const [deleteAllTargetClass, setDeleteAllTargetClass] =
    useState<string>("all");
  const [deletePassword, setDeletePassword] = useState("");

  // Delete & Unassign Spinner States
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);

  // Merit List Comparison State
  const [isMeritListModalOpen, setIsMeritListModalOpen] = useState(false);
  const [meritTargetClass, setMeritTargetClass] = useState("");
  const [isCheckingMerit, setIsCheckingMerit] = useState(false);
  const [meritResult, setMeritResult] = useState<{
    totalInMeritList: number;
    matchedCount: number;
    missingCount: number;
    missingStudents: any[];
    matchedStudents: any[];
    allStudents: any[];
  } | null>(null);
  const [selectedMissingIndexes, setSelectedMissingIndexes] = useState<
    number[]
  >([]);
  const [isImportingMissing, setIsImportingMissing] = useState(false);
  const [meritAssigneePin, setMeritAssigneePin] = useState<string>("");

  // Edit Class Name State
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [editClassOldName, setEditClassOldName] = useState("");
  const [editClassNewName, setEditClassNewName] = useState("");
  const [isRenamingClass, setIsRenamingClass] = useState(false);

  const isCoordinator =
    currentUser.role === "manager" ||
    currentUser.role === "mentor" ||
    currentUser.role === "coordinator";
  const canUpload =
    currentUser.role === "manager" ||
    currentUser.permissions?.includes("can_upload_call_info");
  const canViewStatusSummary =
    currentUser.role === "manager" ||
    currentUser.permissions?.includes("can_view_status_summary");
  const showManagementTabs = isCoordinator || canUpload;

  const mentorPins = useMemo(
    () => new Set(mentors.map((m) => m.pin)),
    [mentors],
  );

  const getTaskAssignPermissions = useCallback(
    (
      task: CallTask,
      user: { pin: string; role?: string; permissions?: string[] },
      userCanUpload: boolean,
    ) => {
      if (userCanUpload) {
        return { canAssignFeedback: true, canAssignLive: true };
      }

      const isFeedbackAssignedToSelf = task.assignedToPin === user.pin;
      const isLiveAssignedToSelf =
        task.liveAssignedToPin === user.pin ||
        task.liveInstructorPin === user.pin;

      const isAssignedToSelfAny =
        isFeedbackAssignedToSelf || isLiveAssignedToSelf;

      if (isAssignedToSelfAny) {
        return {
          canAssignFeedback: isFeedbackAssignedToSelf,
          canAssignLive: isLiveAssignedToSelf,
        };
      }

      const isFeedbackAssignedToOther = Boolean(
        task.assignedToPin && task.assignedToPin !== user.pin,
      );
      const isLiveAssignedToOther = Boolean(
        (task.liveAssignedToPin && task.liveAssignedToPin !== user.pin) ||
          (task.liveInstructorPin && task.liveInstructorPin !== user.pin),
      );

      return {
        canAssignFeedback: !isFeedbackAssignedToOther,
        canAssignLive: !isLiveAssignedToOther,
      };
    },
    [],
  );

  // Drag to scroll logic
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Skip table drag scroll if clicking interactive controls or text selection elements
    const target = e.target as HTMLElement;
    if (
      target.closest("input, button, select, textarea, a, svg, [data-selectable='true']") ||
      target.closest(".select-text") ||
      target.classList.contains("select-text")
    ) {
      return;
    }
    if (!tableContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - tableContainerRef.current.offsetLeft);
    setScrollLeft(tableContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    if (!tableContainerRef.current) return;
    setIsDragging(false);
    tableContainerRef.current.style.cursor = "grab";
    tableContainerRef.current.style.removeProperty("user-select");
  };

  const handleMouseUp = () => {
    if (!tableContainerRef.current) return;
    setIsDragging(false);
    tableContainerRef.current.style.cursor = "grab";
    tableContainerRef.current.style.removeProperty("user-select");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableContainerRef.current) return;
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    if (Math.abs(x - startX) > 5) {
      tableContainerRef.current.style.userSelect = "none";
      tableContainerRef.current.style.cursor = "grabbing";
    }
    tableContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleLiveSearch = () => {
    const query = liveSearchRegNo.trim().toLowerCase();
    if (!query) {
      toast.error("Please enter a registration or roll number");
      return;
    }
    setIsSearchingLive(true);
    setLiveFoundTask(null);
    setTimeout(async () => {
      let found = tasks.find(
        (t) =>
          t.registrationNo?.trim().toLowerCase() === query ||
          t.rollNo?.trim().toLowerCase() === query ||
          (t as any).roll?.trim().toLowerCase() === query,
      );
      if (found) {
        if ((found as any).hasLiveInstructionImage && !found.liveInstructionImage) {
          try {
            const res = await fetch(`/api/call-tasks/${found.id}`);
            if (res.ok) {
              const fullTask = await res.json();
              found = { ...found, liveInstructionImage: fullTask.liveInstructionImage };
            }
          } catch (err) {}
        }
        setLiveFoundTask(found);
        setLiveStatus(found.liveInstructionStatus);
        setLiveComment(found.liveInstructionComment || "");
        setLiveInstructorName(found.liveInstructorName || currentUser.name);
        setLiveInstructorPin(found.liveInstructorPin || currentUser.pin);
        setIsLiveInstructorTeacher(found.isLiveInstructorTeacher || false);
        setLiveInstructionImages(parseMultipleImages(found.liveInstructionImage));
        setLiveInstructionLink(found.liveInstructionLink || "");
      } else {
        toast.error("Student not found in your campus data");
        setLiveFoundTask(null);
      }
      setIsSearchingLive(false);
    }, 600);
  };

  const handleUpdateLiveInstruction = async () => {
    if (!liveFoundTask) return;
    if (currentUser?.role !== "manager" && liveStatus === "Pending") {
      toast.error("Cannot save while status is Pending. Please change status to 'Completed'.");
      return;
    }
    if (!liveComment || !liveComment.trim()) {
      toast.error("Please write the Live Instruction comment");
      return;
    }
    setIsUpdatingLive(true);
    const today = getTodayLocalDate();
    const isNewCompletion =
      liveStatus === "Completed" &&
      (liveFoundTask.liveInstructionStatus !== "Completed" ||
        !liveFoundTask.liveInstructionSubmitDate);
    const submitDate =
      liveStatus === "Completed"
        ? isNewCompletion
          ? today
          : liveFoundTask.liveInstructionSubmitDate || today
        : undefined;
    const imagesJson = JSON.stringify(liveInstructionImages);
    try {
      await handleUpdateTask(liveFoundTask.id, {
        liveInstructionStatus: liveStatus,
        liveInstructionComment: liveComment,
        liveInstructorName,
        liveInstructorPin,
        isLiveInstructorTeacher,
        liveInstructionImage: imagesJson,
        liveInstructionLink,
        liveInstructionSubmitDate: submitDate,
      });
      setLiveFoundTask((prev) =>
        prev
          ? {
              ...prev,
              liveInstructionStatus: liveStatus,
              liveInstructionComment: liveComment,
              liveInstructorName,
              liveInstructorPin,
              isLiveInstructorTeacher,
              liveInstructionImage: imagesJson,
              liveInstructionLink,
              liveInstructionSubmitDate: submitDate,
            }
          : null,
      );
      toast.success("Live Instruction updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    } finally {
      setIsUpdatingLive(false);
    }
  };

  const tasksLoadedRef = useRef(false);

  useEffect(() => {
    const showLoader = !tasksLoadedRef.current;
    fetchTasks(showLoader);
  }, [activeSubTab, currentUser.pin]);

  const fetchTasks = async (showLoader = true) => {
    if (showLoader && tasks.length === 0) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (activeSubTab === "my-tasks") {
        params.append("assignedToPin", currentUser.pin);
      } else if (activeSubTab === "live-instruction") {
        if (!canUpload && currentUser.campus && currentUser.campus !== "All") {
          params.append("campus", currentUser.campus);
          params.append("userPin", currentUser.pin);
        }
      } else if (!showManagementTabs) {
        params.append("assignedToPin", currentUser.pin);
      } else if (!canUpload && currentUser.campus && currentUser.campus !== "All") {
        params.append("campus", currentUser.campus);
        params.append("userPin", currentUser.pin);
      }

      const res = await fetch(`/api/call-tasks?${params.toString()}`);
      if (!res.ok) {
        console.error("Failed to fetch tasks, status:", res.status);
        return;
      }
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTasks(data);
          tasksLoadedRef.current = true;
          try {
            sessionStorage.setItem(`call_tasks_cache_${currentUser.pin}`, JSON.stringify(data));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetClass = selectedClassForUpload.trim();
    if (!targetClass) {
      toast.error("Please provide a class name for the upload first.");
      if (e.target) e.target.value = "";
      return;
    }

    const classExists = uniqueClasses.some(
      (c: any) => c && typeof c === "string" && c.toLowerCase() === targetClass.toLowerCase()
    );

    if (classExists) {
      toast.error(
        "This class already exists. Please use the 'Sync Missing Students' Menu (Sync New Students button) to upload or sync students for existing classes.",
        { duration: 6000 }
      );
      if (e.target) e.target.value = "";
      return;
    }

    setIsUploading(true);
    const reader = new window.FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const getValue = (row: any, keys: string[]) => {
          const rowKeys = Object.keys(row);
          for (const key of keys) {
            const normalizedTargetKey = key
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            const foundKey = rowKeys.find(
              (k) =>
                k.toLowerCase().replace(/[^a-z0-9]/g, "") ===
                normalizedTargetKey,
            );
            if (
              foundKey &&
              row[foundKey] !== undefined &&
              row[foundKey] !== null
            ) {
              return row[foundKey];
            }
          }
          return "";
        };

        const isHeaderValue = (val: string) => {
          if (!val) return false;
          const norm = val.toLowerCase().replace(/[^a-z0-9]/g, "");
          return [
            "sl",
            "slno",
            "serial",
            "serialno",
            "registration",
            "reg",
            "regno",
            "registrationno",
            "pin",
            "id",
            "roll",
            "rollno",
            "examroll",
            "studentname",
            "fullname",
            "name",
            "nickname",
            "student",
            "mobile",
            "phone",
            "contact",
            "mobilenumber",
            "mobilepersonal",
            "total",
            "count",
            "page",
            "header",
            "footer",
            "signature",
            "summary",
          ].includes(norm);
        };

        const validRows = data.filter((row) => {
          const reg = String(
            getValue(row, [
              "registration no.",
              "registration no",
              "reg no",
              "reg. no.",
              "pin",
              "id",
            ]) || "",
          ).trim();
          const roll = String(
            getValue(row, ["roll no.", "roll no", "roll"]) || "",
          ).trim();
          const name = String(
            getValue(row, ["full name", "student name", "name", "student"]) ||
              "",
          ).trim();
          const phone = String(
            getValue(row, [
              "mobile number(personal)",
              "mobile number (personal)",
              "mobile personal",
              "mobile",
              "phone",
            ]) || "",
          ).trim();

          if (
            isHeaderValue(reg) ||
            isHeaderValue(roll) ||
            isHeaderValue(name) ||
            isHeaderValue(phone)
          ) {
            return false;
          }

          return Boolean(reg || roll || name || phone);
        });

        const newTasks: Partial<CallTask>[] = validRows.map((row, idx) => {
          const rawBranch = getValue(row, ["branch"]);
          const branchName = String(rawBranch || "").trim();
          let campusName = String(getValue(row, ["campus"]) || "").trim();

          if (!campusName && branchName) {
            const normalizedBranchName = branchName
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            const branchObj = branches.find((b) => {
              const systemBranchName = b.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
              return (
                systemBranchName === normalizedBranchName ||
                systemBranchName.startsWith(normalizedBranchName) ||
                normalizedBranchName.startsWith(systemBranchName)
              );
            });
            if (branchObj && branchObj.campusId) {
              campusName =
                campuses.find((c) => c.id === branchObj.campusId)?.name || "";
            }
          }

          // If still no campus, and coordinator has one, default to it
          if (!campusName && currentUser.campus) {
            campusName = currentUser.campus;
          }

          return {
            id: `task-${Date.now()}-${idx}`,
            sl: String(idx + 1),
            registrationNo: String(
              getValue(row, [
                "registration no.",
                "registration no",
                "reg no",
                "reg. no.",
              ]) || "",
            ),
            studentName: String(
              getValue(row, ["full name", "student name", "name", "student"]) ||
                "",
            ),
            mobilePersonal: String(
              getValue(row, [
                "mobile number(personal)",
                "mobile number (personal)",
                "mobile personal",
                "mobile",
              ]) || "",
            ),
            mobileFather: String(
              getValue(row, [
                "mobile number(father)",
                "mobile number (father)",
                "father mobile",
              ]) || "",
            ),
            mobileMother: String(
              getValue(row, [
                "mobile number(mother)",
                "mobile number (mother)",
                "mother mobile",
              ]) || "",
            ),
            branch: branchName,

            rollNo: String(getValue(row, ["roll no.", "roll no"]) || ""),
            nickName: String(
              getValue(row, ["nick name", "nickname", "nick"]) || "",
            ),
            gender: String(getValue(row, ["gender"]) || ""),
            institute: String(getValue(row, ["institute"]) || ""),
            fatherName: String(
              getValue(row, ["father name", "fathers name"]) || "",
            ),
            motherName: String(
              getValue(row, ["mother name", "mothers name"]) || "",
            ),
            className: selectedClassForUpload,
            centralMerit: String(
              getValue(row, [
                "central merit",
                "centralmerit",
                "central merit pos",
                "central merit position",
                "central merit rank",
                "central rank",
                "centralmeritlist",
                "merit position",
                "merit rank",
                "merit pos",
                "merit",
                "branch merit",
                "branchmerit",
                "rank",
              ]) || "",
            ).trim(),
            meritPosition: String(
              getValue(row, [
                "central merit",
                "centralmerit",
                "central merit pos",
                "central merit position",
                "central merit rank",
                "central rank",
                "centralmeritlist",
                "merit position",
                "merit rank",
                "merit pos",
                "merit",
                "branch merit",
                "branchmerit",
                "rank",
              ]) || "",
            ).trim(),
            marks: String(
              getValue(row, [
                "marks",
                "score",
                "total marks",
                "totalmarks",
                "total obtained marks",
                "obtained marks",
                "mcq marks",
                "written marks",
              ]) || "",
            ).trim(),
            liveInstructionStatus: "Pending",
            feedbackStatus: "Pending",
            createdByPin: currentUser.pin,
            createdAt: new Date().toISOString(),
          };
        });

        if (newTasks.length === 0) {
          toast.error("No valid student rows found in the selected Excel sheet.");
          setIsUploading(false);
          return;
        }

        const uniqueBranchesInUpload = Array.from(
          new Set(newTasks.map((t) => t.branch).filter((b): b is string => Boolean(b && b.trim()))),
        );

        setExcelPreviewTasks(newTasks);
        setExcelPreviewStats({
          studentCount: newTasks.length,
          branchCount: uniqueBranchesInUpload.length,
        });
        setExcelPreviewClassName(selectedClassForUpload);
        setIsAddStudentModalOpen(false); // Close the entry modal so preview can show
      } catch (err) {
        console.error("Excel parsing error:", err);
        toast.error("Error parsing Excel file");
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmExcelUpload = async () => {
    if (!excelPreviewTasks || excelPreviewTasks.length === 0) return;
    setIsUploading(true);
    try {
      const res = await fetch("/api/call-tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(excelPreviewTasks),
      });

      if (res.ok) {
        const result = await res.json();
        fetchTasks();
        if (result.addedCount > 0 && result.duplicateCount > 0) {
          toast.success(
            `Added ${result.addedCount} new student(s). ${result.duplicateCount} duplicate(s) were blocked.`,
          );
        } else if (result.addedCount > 0) {
          toast.success(
            `Successfully imported ${result.addedCount} student(s).`,
          );
        } else if (result.duplicateCount > 0) {
          toast.error(
            `All ${result.duplicateCount} student(s) in this file already exist. Duplicate upload blocked.`,
          );
        } else {
          toast("No new tasks added.");
        }
      } else {
        toast.error("Failed to import tasks");
      }
    } catch (err) {
      console.error("Excel import error:", err);
      toast.error("Error importing Excel file");
    } finally {
      setIsUploading(false);
      setExcelPreviewTasks(null);
      setExcelPreviewStats(null);
      setExcelPreviewClassName("");
    }
  };

  // Check Merit List Handler
  const handleCheckMeritList = async (fileStudentList: any[]) => {
    setIsCheckingMerit(true);
    try {
      if (!meritTargetClass) {
        toast.error(
          "Please select an existing class from the dropdown before importing.",
        );
        setIsCheckingMerit(false);
        return;
      }
      const bodyData = { studentList: fileStudentList };

      const res = await fetch("/api/fetch-merit-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMeritResult(data);
        const missingIdxs = data.missingStudents.map(
          (_: any, idx: number) => idx,
        );
        setSelectedMissingIndexes(missingIdxs);
        toast.success(
          `Merit List checked! Found ${data.missingCount} missing students.`,
        );
      } else {
        toast.error(data.error || "Failed to process Merit List");
      }
    } catch (err: any) {
      console.error("Merit List Check Error:", err);
      toast.error("Error connecting to server to process Merit List");
    } finally {
      setIsCheckingMerit(false);
    }
  };

  // Upload Excel specifically for Merit List
  const handleMeritFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!meritTargetClass) {
      toast.error(
        "Please select an existing class from the dropdown before uploading a file.",
      );
      if (e.target) e.target.value = "";
      return;
    }

    setIsCheckingMerit(true);
    const reader = new window.FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // 2D Sheet parsing to auto-detect header row even with top title rows
        const rawSheetData = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: "",
        }) as any[][];
        let excelRows: any[] = [];

        if (rawSheetData && rawSheetData.length > 0) {
          let headerIdx = -1;
          for (let r = 0; r < Math.min(rawSheetData.length, 10); r++) {
            const rowCells = rawSheetData[r].map((c) =>
              String(c || "")
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]/g, ""),
            );
            const matchCount = rowCells.filter(
              (c) =>
                c.includes("reg") ||
                c.includes("roll") ||
                c.includes("name") ||
                c.includes("mobile") ||
                c.includes("phone") ||
                c.includes("branch") ||
                c.includes("sl") ||
                c.includes("pin"),
            ).length;
            if (matchCount >= 2) {
              headerIdx = r;
              break;
            }
          }

          if (headerIdx !== -1) {
            const headers = rawSheetData[headerIdx].map((h) =>
              String(h || "").trim(),
            );
            for (let r = headerIdx + 1; r < rawSheetData.length; r++) {
              const rowData = rawSheetData[r];
              if (
                !rowData ||
                rowData.every((c) => !c || String(c).trim() === "")
              )
                continue;
              const rowObj: any = {};
              headers.forEach((headerName, colIdx) => {
                if (headerName) {
                  rowObj[headerName] =
                    rowData[colIdx] !== undefined ? rowData[colIdx] : "";
                }
              });
              excelRows.push(rowObj);
            }
          } else {
            excelRows = XLSX.utils.sheet_to_json(ws) as any[];
          }
        }

        const parsedList: any[] = [];
        excelRows.forEach((row) => {
          const getValue = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const k of keys) {
              const normKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
              const found = rowKeys.find(
                (rk) =>
                  rk.toLowerCase().replace(/[^a-z0-9]/g, "") === normKey,
              );
              if (found && row[found] !== undefined && row[found] !== null)
                return String(row[found]).trim();
            }
            return "";
          };

          const reg = getValue([
            "registrationno",
            "registration",
            "regno",
            "reg",
            "pin",
            "studentid",
            "regnumber",
            "registrationnumber",
            "id",
          ]);
          const roll = getValue([
            "rollno",
            "roll",
            "examroll",
            "rollnumber",
            "examrollno",
          ]);
          const fullName = getValue([
            "fullname",
            "studentname",
            "name",
            "student",
          ]);
          const nickName = getValue(["nickname", "nick"]);
          const mobilePersonal = getValue([
            "mobilenumberpersonal",
            "mobilepersonal",
            "personalphonenumberp",
            "personalmobile",
            "personalphone",
            "personalcontact",
            "contactnumber",
            "mobilenumber",
            "mobile",
            "phone",
            "contact",
          ]);
          const mobileFather = getValue([
            "mobilenumberfather",
            "mobilefather",
            "fathermobile",
            "fatherphone",
            "guardianphone",
            "guardianmobile",
            "numbera",
          ]);
          const mobileMother = getValue([
            "mobilenumbermother",
            "mobilemother",
            "mothermobile",
            "motherphone",
            "numberb",
          ]);
          const rawBranch = getValue([
            "branch",
            "branchname",
            "campus",
            "campusname",
            "centre",
            "center",
          ]);

          const isHeaderValue = (val: string) => {
            if (!val) return false;
            const norm = val.toLowerCase().replace(/[^a-z0-9]/g, "");
            return [
              "sl",
              "slno",
              "serial",
              "serialno",
              "registration",
              "reg",
              "regno",
              "registrationno",
              "pin",
              "id",
              "roll",
              "rollno",
              "examroll",
              "studentname",
              "fullname",
              "name",
              "nickname",
              "student",
              "mobile",
              "phone",
              "contact",
              "mobilenumber",
              "mobilepersonal",
              "total",
              "count",
              "page",
              "header",
              "footer",
              "signature",
              "summary",
            ].includes(norm);
          };

          // Skip header or summary rows
          if (
            isHeaderValue(reg) ||
            isHeaderValue(roll) ||
            isHeaderValue(fullName) ||
            isHeaderValue(mobilePersonal)
          ) {
            return;
          }

          // Skip completely empty/blank trailing rows
          if (
            !reg &&
            !roll &&
            !fullName &&
            !nickName &&
            !mobilePersonal &&
            !mobileFather &&
            !mobileMother
          ) {
            return;
          }

          const studentName =
            fullName ||
            nickName ||
            (reg ? `Student ${reg}` : roll ? `Student ${roll}` : "");
          if (!studentName) return;

          // Branch & Campus matching
          const branchName = rawBranch ? String(rawBranch).trim() : "";
          let campusName = "";
          if (branchName) {
            const normalizedBranchName = branchName
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            const branchObj = branches.find((b) => {
              const systemBranchName = b.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
              return (
                systemBranchName === normalizedBranchName ||
                systemBranchName.startsWith(normalizedBranchName) ||
                normalizedBranchName.startsWith(systemBranchName)
              );
            });
            if (branchObj && branchObj.campusId) {
              campusName =
                campuses.find((c) => c.id === branchObj.campusId)?.name || "";
            }
          }
          if (!campusName && currentUser.campus) {
            campusName = currentUser.campus;
          }

          parsedList.push({
            sl:
              getValue([
                "sl",
                "serial",
                "slno",
                "rank",
                "meritposition",
                "meritrank",
                "meritpos",
              ]) || String(parsedList.length + 1),
            registrationNo: reg,
            pin: reg,
            rollNo: roll,
            roll: roll,
            fullName: fullName || studentName,
            studentName: studentName,
            nickName: nickName,
            gender: getValue(["gender", "sex"]),
            institute: getValue([
              "institute",
              "institution",
              "school",
              "college",
            ]),
            fatherName: getValue(["fathername", "fathersname", "father"]),
            motherName: getValue(["mothername", "mothersname", "mother"]),
            mobilePersonal: mobilePersonal,
            mobileFather: mobileFather,
            mobileMother: mobileMother,
            branch: branchName,
            campus: campusName,
            className:
              getValue([
                "coursebat",
                "coursebatch",
                "course",
                "class",
                "classname",
                "program",
                "batch",
              ]) ||
              meritTargetClass ||
              "Default",
            marks: getValue([
              "marks",
              "score",
              "totalmarks",
              "totalobtainedmarks",
              "obtainedmarks",
              "mcqmark",
              "writtenmark",
            ]),
            centralMerit: getValue([
              "centralmerit",
              "centralmeritpos",
              "centralmeritposition",
              "centralmeritrank",
              "centralrank",
              "centralmeritlist",
              "meritposition",
              "meritrank",
              "meritpos",
              "rank",
              "branchmerit",
              "merit",
            ]),
            meritPosition: getValue([
              "centralmerit",
              "centralmeritpos",
              "centralmeritposition",
              "centralmeritrank",
              "centralrank",
              "centralmeritlist",
              "meritposition",
              "meritrank",
              "meritpos",
              "rank",
              "branchmerit",
              "merit",
            ]),
            liveInstructionStatus: "Pending",
            feedbackStatus: "Pending",
          });
        });

        await handleCheckMeritList(parsedList);
      } catch (err) {
        console.error("Merit Excel parsing error:", err);
        toast.error("Error reading Excel file");
        setIsCheckingMerit(false);
      } finally {
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  // Import selected missing students to Call Tasks
  const handleImportMissingStudents = async () => {
    if (!meritResult || selectedMissingIndexes.length === 0) {
      toast.error("No missing students selected to import");
      return;
    }

    setIsImportingMissing(true);
    try {
      const selectedMissing = selectedMissingIndexes
        .map((i) => meritResult.missingStudents[i])
        .filter(Boolean)
        .filter((st) => {
          const reg = (st.registrationNo || st.pin || "").trim();
          const roll = (st.rollNo || st.roll || "").trim();
          const phone = (
            st.mobilePersonal ||
            st.mobileFather ||
            st.mobileMother ||
            ""
          ).trim();
          const name = (
            st.studentName ||
            st.fullName ||
            st.nickName ||
            ""
          ).trim();
          if (
            !reg &&
            !roll &&
            !phone &&
            (!name || name.match(/^student\s*\d+$/i))
          ) {
            return false;
          }
          return true;
        });

      if (selectedMissing.length === 0) {
        toast.error("No valid missing student records selected");
        setIsImportingMissing(false);
        return;
      }

      const assignedMember = meritAssigneePin
        ? members.find((m) => m.pin === meritAssigneePin)
        : null;

      const newTasks: Partial<CallTask>[] = selectedMissing.map((st, idx) => {
        let campusName = st.campus || "";
        if (!campusName && st.branch) {
          const normalizedBranchName = st.branch
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
          const branchObj = branches.find((b) => {
            const systemBranchName = b.name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            return (
              systemBranchName === normalizedBranchName ||
              systemBranchName.startsWith(normalizedBranchName) ||
              normalizedBranchName.startsWith(systemBranchName)
            );
          });
          if (branchObj && branchObj.campusId) {
            campusName =
              campuses.find((c) => c.id === branchObj.campusId)?.name || "";
          }
        }
        if (!campusName) {
          campusName = currentUser.campus || "";
        }

        return {
          ...st,
          id: `task-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          sl: st.sl || String(tasks.length + idx + 1),
          registrationNo: st.registrationNo || st.pin || st.roll || "",
          rollNo: st.rollNo || st.roll || st.pin || "",
          pin: st.pin || st.registrationNo || "",
          roll: st.roll || st.rollNo || "",
          studentName:
            st.studentName ||
            st.fullName ||
            st.nickName ||
            "Unknown Student",
          nickName: st.nickName || "",
          mobilePersonal: st.mobilePersonal || "",
          mobileFather: st.mobileFather || "",
          mobileMother: st.mobileMother || "",
          branch: st.branch || "",
          campus: campusName,
          gender: st.gender || "",
          institute: st.institute || "",
          fatherName: st.fatherName || "",
          motherName: st.motherName || "",
          className: meritTargetClass || st.className || "Default",
          marks: st.marks || "",
          centralMerit: st.centralMerit || st.meritPosition || "",
          meritPosition: st.meritPosition || st.centralMerit || "",
          assignedToPin: assignedMember ? assignedMember.pin : undefined,
          assignedToName: assignedMember ? assignedMember.name : undefined,
          liveInstructionStatus: "Pending",
          feedbackStatus: "Pending",
          createdByPin: currentUser.pin,
          createdAt: new Date().toISOString(),
        };
      });

      const res = await fetch("/api/call-tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTasks),
      });

      if (res.ok) {
        const result = await res.json();
        await fetchTasks();
        if (result.addedCount > 0 && result.duplicateCount > 0) {
          toast.success(
            `Imported ${result.addedCount} missing student(s). ${result.duplicateCount} duplicate(s) blocked.`,
          );
        } else if (result.addedCount > 0) {
          toast.success(
            `Successfully imported ${result.addedCount} missing student(s) to Call Tasks!`,
          );
        } else if (result.duplicateCount > 0) {
          toast.error(
            `Selected missing student(s) already exist in Call Tasks (duplicate blocked).`,
          );
        } else {
          toast("No missing students added.");
        }
        setIsMeritListModalOpen(false);
        setMeritResult(null);
      } else {
        toast.error("Failed to import missing students");
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Error saving missing students");
    } finally {
      setIsImportingMissing(false);
    }
  };

  const handleAssignTasks = async (
    memberPin: string,
    assignType: "feedback" | "live" | "both" = bulkAssignType,
  ) => {
    if (selectedTasks.length === 0) return;
    const member = members.find((m) => m.pin === memberPin);
    if (!member) return;

    try {
      const payload: any = {
        taskIds: selectedTasks,
        assignType,
      };

      if (assignType === "feedback" || assignType === "both") {
        payload.assignedToPin = member.pin;
        payload.assignedToName = member.name;
      }
      if (assignType === "live" || assignType === "both") {
        payload.liveAssignedToPin = member.pin;
        payload.liveAssignedToName = member.name;
      }

      const res = await fetch("/api/call-tasks/assign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchTasks();
        if (onRefreshEmails) onRefreshEmails();
        setSelectedTasks([]);
        const typeText =
          assignType === "live"
            ? "Live Instruction"
            : assignType === "both"
              ? "Both"
              : "Feedback";
        toast.success(
          `Assigned ${selectedTasks.length} tasks (${typeText}) to ${member.name}`,
        );
      }
    } catch (err) {
      console.error("Assignment error:", err);
    }
  };

  const confirmUnassign = async (choice: "live" | "feedback" | "both") => {
    if (!unassignTarget) return;

    let targetIds: string[] = [];
    if (unassignTarget.type === "single" && unassignTarget.taskId) {
      targetIds = [unassignTarget.taskId];
    } else if (unassignTarget.type === "bulk") {
      targetIds = selectedTasks;
    } else if (unassignTarget.type === "range" && unassignTarget.taskIds) {
      targetIds = unassignTarget.taskIds;
    }

    if (targetIds.length === 0) {
      toast.error("No tasks selected to unassign");
      setIsUnassignModalOpen(false);
      return;
    }

    setIsUnassigning(true);
    try {
      const payload: any = {
        taskIds: targetIds,
        assignType: choice,
      };

      if (choice === "feedback" || choice === "both") {
        payload.assignedToPin = null;
        payload.assignedToName = null;
      }
      if (choice === "live" || choice === "both") {
        payload.liveAssignedToPin = null;
        payload.liveAssignedToName = null;
      }

      const res = await fetch("/api/call-tasks/assign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => {
            if (!targetIds.includes(t.id)) return t;
            const updated = { ...t };
            if (choice === "feedback" || choice === "both") {
              updated.assignedToPin = undefined;
              updated.assignedToName = undefined;
            }
            if (choice === "live" || choice === "both") {
              updated.liveAssignedToPin = undefined;
              updated.liveAssignedToName = undefined;
            }
            return updated;
          })
        );
        if (unassignTarget.type === "bulk") setSelectedTasks([]);
        if (unassignTarget.type === "range") setIsRangeModalOpen(false);
        setIsUnassignModalOpen(false);
        const choiceText =
          choice === "live"
            ? "Live Instruction"
            : choice === "feedback"
              ? "Feedback"
              : "Both (Live & Feedback)";
        toast.success(`Unassigned ${targetIds.length} tasks (${choiceText})`);
      } else {
        toast.error("Failed to unassign task(s)");
      }
    } catch (err) {
      console.error("Unassignment error:", err);
      toast.error("Failed to unassign task(s)");
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleUnassignTask = (taskId: string) => {
    setUnassignTarget({ type: "single", taskId });
    setIsUnassignModalOpen(true);
  };

  const handleUpdateTask = async (
    taskId: string,
    updates: Partial<CallTask>,
  ) => {
    const existingTask = tasks.find((t) => t.id === taskId);
    const finalUpdates = { ...updates };

    if (finalUpdates.feedbackStatus === "Completed") {
      if (
        !finalUpdates.assignedToPin &&
        (!existingTask || !existingTask.assignedToPin)
      ) {
        finalUpdates.assignedToPin = currentUser.pin;
        finalUpdates.assignedToName = currentUser.name;
      }
    }

    if (finalUpdates.liveInstructionStatus === "Completed") {
      if (
        !finalUpdates.liveInstructorPin &&
        (!existingTask || !existingTask.liveInstructorPin)
      ) {
        finalUpdates.liveInstructorPin = currentUser.pin;
        finalUpdates.liveInstructorName = currentUser.name;
      }
      if (
        !finalUpdates.liveAssignedToPin &&
        (!existingTask || !existingTask.liveAssignedToPin)
      ) {
        finalUpdates.liveAssignedToPin = currentUser.pin;
        finalUpdates.liveAssignedToName = currentUser.name;
      }
    }

    try {
      const res = await fetch(`/api/call-tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalUpdates),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...finalUpdates } : t)),
        );
        if (onRefreshEmails) onRefreshEmails();
      }
    } catch (err) {
      console.error("Update task error:", err);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    return false;
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeletingTask(true);
    try {
      const res = await fetch(`/api/call-tasks/${taskToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskToDelete));
        setSelectedTasks((prev) => prev.filter((id) => id !== taskToDelete));
        setTaskToDelete(null);
        setTaskModalOpen(false);
        toast.success("Task deleted successfully");
      } else {
        toast.error("Failed to delete task");
      }
    } catch (err) {
      console.error("Delete task error:", err);
      toast.error("Failed to delete task");
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleDeleteClass = () => {
    if (!selectedClassForUpload) {
      toast.error("Please select or type a class to delete.");
      return;
    }
    setIsDeleteClassModalOpen(true);
  };

  const confirmDeleteClass = async () => {
    if (!deletePassword) {
      toast.error("Password is required to delete class records");
      return;
    }
    setIsDeletingClass(true);
    try {
      const authRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.pin,
          password: deletePassword,
        }),
      });
      if (!authRes.ok) {
        toast.error("Incorrect password!");
        return;
      }

      const res = await fetch(
        `/api/call-tasks/class/${encodeURIComponent(selectedClassForUpload)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setTasks((prev) =>
          prev.filter((t) => t.className !== selectedClassForUpload),
        );
        setSelectedTasks([]);
        setSelectedClassForUpload("");
        setIsDeleteClassModalOpen(false);
        setDeletePassword("");
        toast.success(`Tasks for class ${selectedClassForUpload} deleted successfully`);
      } else {
        toast.error("Failed to delete class tasks");
      }
    } catch (err) {
      console.error("Delete class error:", err);
      toast.error("Failed to delete class tasks");
    } finally {
      setIsDeletingClass(false);
    }
  };

  const handleDeleteAllTasks = async () => {
    if (!deletePassword) {
      toast.error("Password is required to delete records");
      return;
    }
    setIsDeletingAll(true);
    try {
      const authRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.pin,
          password: deletePassword,
        }),
      });
      if (!authRes.ok) {
        toast.error("Incorrect password!");
        return;
      }

      const url =
        deleteAllTargetClass === "all"
          ? "/api/call-tasks"
          : `/api/call-tasks/class/${encodeURIComponent(deleteAllTargetClass)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        if (deleteAllTargetClass === "all") {
          setTasks([]);
        } else {
          setTasks((prev) =>
            prev.filter((t) => t.className !== deleteAllTargetClass),
          );
        }
        setSelectedTasks([]);
        setIsDeleteAllModalOpen(false);
        setDeleteAllTargetClass("all");
        setDeletePassword("");
        toast.success("Tasks deleted successfully");
      } else {
        toast.error("Failed to delete records");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete records");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleRenameClass = async () => {
    if (!editClassOldName) {
      toast.error("Please select a class to edit!");
      return;
    }
    if (!editClassNewName.trim()) {
      toast.error("Please enter a new class name!");
      return;
    }
    if (editClassOldName.trim() === editClassNewName.trim()) {
      toast.error("New class name is the same as current class name!");
      return;
    }

    setIsRenamingClass(true);
    try {
      const res = await fetch("/api/call-tasks/rename-class", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldClassName: editClassOldName,
          newClassName: editClassNewName.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.className === editClassOldName
              ? { ...t, className: editClassNewName.trim() }
              : t
          )
        );
        toast.success(`Class "${editClassOldName}" renamed to "${editClassNewName.trim()}" successfully!`);
        setIsEditClassModalOpen(false);
        setEditClassOldName("");
        setEditClassNewName("");
      } else {
        toast.error(data?.error || "Failed to rename class");
      }
    } catch (err) {
      console.error("Rename class error:", err);
      toast.error("Failed to rename class");
    } finally {
      setIsRenamingClass(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentFormData.studentName || !newStudentFormData.className) {
      toast.error("Full Name and Class are required");
      return;
    }

    let campusName = String(newStudentFormData.campus || "").trim();
    const branchName = String(newStudentFormData.branch || "").trim();

    if (!campusName && branchName) {
      const normalizedBranchName = branchName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const branchObj = branches.find((b) => {
        const systemBranchName = b.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          systemBranchName === normalizedBranchName ||
          systemBranchName.startsWith(normalizedBranchName) ||
          normalizedBranchName.startsWith(systemBranchName)
        );
      });
      if (branchObj && branchObj.campusId) {
        campusName =
          campuses.find((c) => c.id === branchObj.campusId)?.name || "";
      }
    }

    // Default to coordinator's campus ONLY if it's NOT 'All'
    if (!campusName && currentUser.campus && currentUser.campus !== "All") {
      campusName = currentUser.campus;
    }

    try {
      const newTask = {
        ...newStudentFormData,
        id: `task-${Date.now()}`,
        sl: String(tasks.length + 1),
        liveInstructionStatus: "Pending",
        feedbackStatus: "Pending",
        createdByPin: currentUser.pin,
        createdAt: new Date().toISOString(),
        campus: campusName,
      };
      const res = await fetch("/api/call-tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([newTask]),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.addedCount > 0) {
          fetchTasks();
          setIsAddStudentModalOpen(false);
          setNewStudentFormData({});
          toast.success("Student added successfully");
        } else {
          toast.error("Student already exists in system! Duplicate blocked.");
        }
      } else {
        toast.error("Failed to add student");
      }
    } catch (err) {
      console.error("Failed to add student", err);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const campusAndBranchMaps = useMemo(() => {
    const campusNameMap = new Map<string, string>();
    const branchToCampusMap = new Map<string, string>();

    campuses.forEach((c) => {
      if (!c.name) return;
      const officialName = c.name.trim();
      campusNameMap.set(officialName.toLowerCase(), officialName);
      if (c.id) campusNameMap.set(c.id.toLowerCase(), officialName);
    });

    const campusIdToOfficialMap = new Map<string, string>();
    campuses.forEach((c) => {
      if (c.id && c.name) campusIdToOfficialMap.set(c.id, c.name.trim());
      if (c.name) campusIdToOfficialMap.set(c.name.trim(), c.name.trim());
    });

    branches.forEach((b) => {
      if (!b.name) return;
      const cleanBranch = b.name.trim().toLowerCase();
      if (b.campusId && campusIdToOfficialMap.has(b.campusId)) {
        branchToCampusMap.set(cleanBranch, campusIdToOfficialMap.get(b.campusId)!);
      }
    });

    return { campusNameMap, branchToCampusMap };
  }, [branches, campuses]);

  const getTaskCampus = useCallback(
    (task: CallTask): string => {
      if (task.campus && task.campus.trim()) {
        const direct = task.campus.trim();
        const official = campusAndBranchMaps.campusNameMap.get(direct.toLowerCase());
        if (official) return official;
        return direct;
      }

      if (task.branch) {
        const cleanBranch = task.branch.trim().toLowerCase();
        const mappedCampus = campusAndBranchMaps.branchToCampusMap.get(cleanBranch);
        if (mappedCampus) return mappedCampus;

        const cleanBranchKeyword = cleanBranch
          .replace(/udvash|unmesh|branch|\(.*\)/gi, "")
          .trim();

        const matchedCampus = campuses.find((c) => {
          if (!c.name) return false;
          const cleanCampus = c.name.toLowerCase().replace("campus", "").trim();
          return (
            cleanBranch.includes(cleanCampus) ||
            (cleanBranchKeyword.length > 2 && cleanCampus.includes(cleanBranchKeyword))
          );
        });
        if (matchedCampus && matchedCampus.name) return matchedCampus.name.trim();
      }
      return "";
    },
    [campusAndBranchMaps, campuses],
  );

  const isOnlineTask = useCallback((task: CallTask | Partial<CallTask>) => {
    const cn = (task.className || "").toLowerCase();
    const br = (task.branch || "").toLowerCase();
    const ca = (task.campus || "").toLowerCase();
    return (
      cn.includes("online") ||
      cn.includes("অনলাইন") ||
      br === "online" ||
      br === "অনলাইন" ||
      ca === "online" ||
      ca === "অনলাইন"
    );
  }, []);

  const isAssignedToOtherMember = useCallback((task: CallTask, userPin: string) => {
    return Boolean(
      (task.assignedToPin && task.assignedToPin !== userPin) ||
        (task.liveAssignedToPin && task.liveAssignedToPin !== userPin) ||
        (task.liveInstructorPin && task.liveInstructorPin !== userPin),
    );
  }, []);

  const isAssignedSolelyToSelf = useCallback(
    (task: CallTask, userPin: string) => {
      const isAssignedToSelf = Boolean(
        task.assignedToPin === userPin ||
          task.liveAssignedToPin === userPin ||
          task.liveInstructorPin === userPin,
      );
      return isAssignedToSelf && !isAssignedToOtherMember(task, userPin);
    },
    [isAssignedToOtherMember],
  );

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const isAssignedToSelf = Boolean(
          task.assignedToPin === currentUser.pin ||
            task.liveAssignedToPin === currentUser.pin ||
            task.liveInstructorPin === currentUser.pin,
        );

        const isAssignedToOther = isAssignedToOtherMember(task, currentUser.pin);

        // SubTab Specific Rule 1: My Assigned Calls tab
        if (activeSubTab === "my-tasks") {
          if (!isAssignedToSelf) return false;
        }

        // SubTab Specific Rule 2: Call Management tab
        if (activeSubTab === "management") {
          const isUserCoordinator =
            currentUser.role === "mentor" || (isCoordinator && !canUpload);
          if (isUserCoordinator) {
            // Hide calls assigned solely to coordinator self until assigned to a team member
            if (isAssignedSolelyToSelf(task, currentUser.pin)) {
              return false;
            }
          }
        }

        const isUserCoordinator =
          currentUser.role === "mentor" || (isCoordinator && !canUpload);
        if (isUserCoordinator && activeSubTab !== "my-tasks") {
          // Exclude unassigned online class tasks
          if (isOnlineTask(task)) {
            const isAssigned = Boolean(
              task.assignedToPin || task.liveAssignedToPin || task.liveInstructorPin,
            );
            if (!isAssigned) return false;
          } else {
            // Non-online tasks must belong to coordinator's campus branches
            const taskCampus = getTaskCampus(task);
            const userCampus = currentUser.campus;
            if (userCampus && userCampus !== "All") {
              const b = branches.find((br) => br.name === task.branch);
              const isMyBranch = b && b.campusId && campuses.find((c) => c.id === b.campusId)?.name === userCampus;
              const isMyCampus = taskCampus === userCampus || task.campus === userCampus;
              if (!isMyBranch && !isMyCampus) {
                return false;
              }
            }
          }
        }

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          task.studentName?.toLowerCase().includes(q) ||
          task.registrationNo.toLowerCase().includes(q) ||
          task.mobilePersonal.includes(q) ||
          (task.centralMerit && String(task.centralMerit).toLowerCase().includes(q)) ||
          (task.meritPosition && String(task.meritPosition).toLowerCase().includes(q));

        const isOnline = isOnlineTask(task);

        // Campus matching
        const taskCampus = getTaskCampus(task);
        const matchesCampus =
          campusFilter === "all" ||
          (campusFilter === "unassigned"
            ? !taskCampus || taskCampus.trim() === ""
            : taskCampus === campusFilter || task.campus === campusFilter);

        // Branch matching
        const matchesBranch =
          selectedBranches.length === 0 ||
          selectedBranches.includes(task.branch);

        const matchesLiveStatus =
          liveStatusFilter === "all" ||
          task.liveInstructionStatus === liveStatusFilter;
        const matchesFeedbackStatus =
          feedbackStatusFilter === "all" ||
          task.feedbackStatus === feedbackStatusFilter;
        const standardFeedbackOptions = ["N/R", "Off", "Busy", "Irregular", "Satisfied", "Class Problem", "Syllabus Problem", "Notify Later"];
        const matchesFeedbackDetail =
          feedbackDetailFilter === "all" ||
          (feedbackDetailFilter === "Others"
            ? !standardFeedbackOptions.includes(task.feedbackComment || "") && Boolean(task.feedbackComment)
            : task.feedbackComment === feedbackDetailFilter);
        const matchesClass =
          classFilter === "all" || task.className === classFilter;
        const matchesAssign =
          assignFilter === "all" ||
          (assignFilter === "Assigned"
            ? !!task.assignedToPin
            : !task.assignedToPin);
        const matchesLiveAssign =
          liveAssignFilter === "all" ||
          (liveAssignFilter === "Assigned"
            ? !!task.liveAssignedToPin || !!task.liveInstructorPin
            : !task.liveAssignedToPin && !task.liveInstructorPin);

        const matchesLiveAssignedMember =
          liveAssignedMemberFilter === "all" ||
          (liveAssignedMemberFilter === "unassigned"
            ? !task.liveAssignedToPin && !task.liveInstructorPin
            : task.liveAssignedToPin === liveAssignedMemberFilter ||
              task.liveInstructorPin === liveAssignedMemberFilter ||
              task.liveAssignedToName === liveAssignedMemberFilter ||
              task.liveInstructorName === liveAssignedMemberFilter);

        const matchesFeedbackAssignedMember =
          feedbackAssignedMemberFilter === "all" ||
          (feedbackAssignedMemberFilter === "unassigned"
            ? !task.assignedToPin
            : task.assignedToPin === feedbackAssignedMemberFilter ||
              task.assignedToName === feedbackAssignedMemberFilter);

        const matchesImageFilter =
          !showOnlyWithImages || (task as any).hasLiveInstructionImage;

        // Date Filtering Logic
        const checkDateInRange = (dStr?: string) => {
          if (!dStr) return false;
          const dateOnly = dStr.split("T")[0];
          if (fromDateFilter && dateOnly < fromDateFilter) return false;
          if (toDateFilter && dateOnly > toDateFilter) return false;
          return true;
        };

        let matchesDate = true;
        if (fromDateFilter || toDateFilter) {
          if (dateTypeFilter === "live") {
            matchesDate = checkDateInRange(task.liveInstructionSubmitDate);
          } else if (dateTypeFilter === "feedback") {
            matchesDate = checkDateInRange(task.feedbackSubmitDate);
          } else {
            matchesDate =
              checkDateInRange(task.liveInstructionSubmitDate) ||
              checkDateInRange(task.feedbackSubmitDate);
          }
        }

        if (!matchesImageFilter) return false;

        return (
          matchesSearch &&
          matchesCampus &&
          matchesLiveStatus &&
          matchesFeedbackStatus &&
          matchesFeedbackDetail &&
          matchesClass &&
          matchesAssign &&
          matchesLiveAssign &&
          matchesLiveAssignedMember &&
          matchesFeedbackAssignedMember &&
          matchesDate &&
          matchesBranch
        );
      })
      .sort((a, b) => {
        const isUserCoordinator = currentUser.role === "manager" || currentUser.role === "mentor";
        if (isUserCoordinator) {
          const isLiveUnassignedA = !a.liveAssignedToPin && !a.liveInstructorPin;
          const isFeedbackUnassignedA = !a.assignedToPin;
          const isLiveUnassignedB = !b.liveAssignedToPin && !b.liveInstructorPin;
          const isFeedbackUnassignedB = !b.assignedToPin;

          // Score 0: Both live and feedback are unassigned
          // Score 1: Only one of them is unassigned
          // Score 2: Both are assigned
          const getScore = (isLiveUn: boolean, isFeedUn: boolean) => {
            if (isLiveUn && isFeedUn) return 0;
            if (isLiveUn || isFeedUn) return 1;
            return 2;
          };

          const scoreA = getScore(isLiveUnassignedA, isFeedbackUnassignedA);
          const scoreB = getScore(isLiveUnassignedB, isFeedbackUnassignedB);

          if (scoreA !== scoreB) {
            return scoreA - scoreB;
          }
        }

        const numA = parseInt(a.sl);
        const numB = parseInt(b.sl);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.sl.localeCompare(b.sl);
      });
  }, [
    tasks,
    currentUser.pin,
    currentUser.role,
    currentUser.campus,
    activeSubTab,
    isCoordinator,
    canUpload,
    branches,
    campuses,
    searchQuery,
    campusFilter,
    selectedBranches,
    liveStatusFilter,
    feedbackStatusFilter,
    feedbackDetailFilter,
    classFilter,
    assignFilter,
    liveAssignFilter,
    liveAssignedMemberFilter,
    feedbackAssignedMemberFilter,
    showOnlyWithImages,
    fromDateFilter,
    toDateFilter,
    dateTypeFilter,
    isAssignedToOtherMember,
    isAssignedSolelyToSelf,
    isOnlineTask,
    getTaskCampus,
  ]);

  const handleExportToExcel = async () => {
    if (!filteredTasks || filteredTasks.length === 0) {
      toast.error("No tasks available to export");
      return;
    }

    setIsExporting(true);
    try {
      // Small timeout to allow UI state update (spinner) to render before processing
      await new Promise((resolve) => setTimeout(resolve, 80));

      const exportData = filteredTasks.map((t, idx) => ({
        "SL": idx + 1,
        "Student Name": t.studentName || "",
        "Nick Name": t.nickName || "",
        "Reg No": t.registrationNo || "",
        "Roll No": t.rollNo || (t as any).roll || "",
        "Central Merit": t.centralMerit || t.meritPosition || "",
        "Personal Contact": t.mobilePersonal || "",
        "Father Contact": t.mobileFather || "",
        "Mother Contact": t.mobileMother || "",
        "Branch": t.branch || "",
        "Class": t.className || "",
        "Campus": getTaskCampus(t) || t.campus || "",
        "Live Instruction Status": t.liveInstructionStatus || "Pending",
        "Live Instruction Date": t.liveInstructionSubmitDate || "",
        "Live Instruction Assigned Member": t.liveAssignedToName || "",
        "Live Instructor Name": t.liveInstructorName || "",
        "Live Instruction Comment": t.liveInstructionComment || "",
        "Feedback Status": t.feedbackStatus || "Pending",
        "Feedback Date": t.feedbackSubmitDate || "",
        "Feedback Assigned Team Member": t.assignedToName || "",
        "Feedback Comment": t.feedbackComment || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Call Tasks");

      const fileName = `Call_Tasks_${getTodayLocalDate()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success(`Exported ${filteredTasks.length} student call tasks to Excel!`);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("An error occurred while exporting");
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(filteredTasks.length / pageSize);
  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize,
    );
  }, [filteredTasks, currentPage, pageSize]);

  const [jumpPageInput, setJumpPageInput] = useState<string>("");

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpPageInput("");
    } else {
      toast.error(`Please enter a page number between 1 and ${totalPages}`);
    }
  };

  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentFormData, setNewStudentFormData] = useState<
    Partial<CallTask>
  >({});

  // New States for Add Students Enhancements
  const [manualBranchSearchQuery, setManualBranchSearchQuery] = useState("");
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isCustomClassMode, setIsCustomClassMode] = useState(false);
  const [excelPreviewTasks, setExcelPreviewTasks] = useState<Partial<CallTask>[] | null>(null);
  const [excelPreviewStats, setExcelPreviewStats] = useState<{ studentCount: number; branchCount: number } | null>(null);
  const [excelPreviewClassName, setExcelPreviewClassName] = useState("");
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"live" | "feedback" | "student">(
    "live",
  );
  const [editingTask, setEditingTask] = useState<CallTask | null>(null);
  const [modalFormData, setModalFormData] = useState<Partial<CallTask>>({});

  const openTaskModal = async (task: CallTask, targetTab?: "live" | "feedback") => {
    let currentTask = { ...task };
    setEditingTask(currentTask);
    setModalFormData(currentTask);
    
    if ((currentTask as any).hasLiveInstructionImage && !currentTask.liveInstructionImage) {
      try {
        const res = await fetch(`/api/call-tasks/${currentTask.id}`);
        if (res.ok) {
          const fullTask = await res.json();
          currentTask = { ...currentTask, liveInstructionImage: fullTask.liveInstructionImage };
          setEditingTask(currentTask);
          setModalFormData(currentTask);
        }
      } catch (err) {}
    }

    if (targetTab) {
      setModalTab(targetTab);
    } else if (!canUpload && currentUser.role === "member") {
      const isAssignedLive =
        currentTask.liveAssignedToPin === currentUser.pin ||
        currentTask.liveInstructorPin === currentUser.pin;
      const isAssignedFeedback = currentTask.assignedToPin === currentUser.pin;
      if (isAssignedLive && !isAssignedFeedback) {
        setModalTab("live");
      } else if (isAssignedFeedback && !isAssignedLive) {
        setModalTab("feedback");
      } else {
        setModalTab("live");
      }
    } else {
      setModalTab("live");
    }
    setTaskModalOpen(true);
  };

  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeTargetMembers, setRangeTargetMembers] = useState<string[]>([]);
  const [rangeMemberSearch, setRangeMemberSearch] = useState("");
  const [bulkMemberPin, setBulkMemberPin] = useState("");
  const [rangeAction, setRangeAction] = useState<"assign" | "unassign">(
    "assign",
  );

  const tasksInRange = useMemo(() => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    if (isNaN(start) || isNaN(end)) return [];
    // Use visual index (start-1 to end) from filteredTasks
    return filteredTasks.slice(Math.max(0, start - 1), Math.min(filteredTasks.length, end));
  }, [rangeStart, rangeEnd, filteredTasks]);

  const getValidMembers = (taskSubset: CallTask[]) => {
    const allAssignable = [...members, ...mentors];

    // Managers or users with management/upload permissions can assign to ANY member across all campuses
    if (canUpload || currentUser.campus === "All") {
      return allAssignable;
    }

    // For others (Coordinators, mentors, etc.), filter by campus
    const myCampusMembers = members.filter(
      (m) => {
          if (currentUser.role === 'coordinator') return m.campus === currentUser.campus;
          return m.campus === currentUser.campus || m.mentorPin === currentUser.pin;
      }
    );

    if (taskSubset.length === 0) return myCampusMembers;

    // Check if task subset belongs to an Online class
    const isOnlineTaskSet = taskSubset.some((t) =>
      /online/i.test(t.className || "") || isOnlineTask(t)
    );

    if (isOnlineTaskSet) {
      return myCampusMembers;
    }

    const taskBranches = [...new Set(taskSubset.map((t) => t.branch))];

    if (taskBranches.length > 1 && currentUser.role !== "mentor") return []; // If range has students from multiple branches, assignment not allowed
    const campusId = branches.find((b) => b.name === taskBranches[0])?.campusId;
    if (!campusId) return myCampusMembers;
    const campusObj = campuses.find((c) => c.id === campusId);
    if (!campusObj) return myCampusMembers;

    // Intersect task campus with user campus
    if (campusObj.name !== currentUser.campus) {
      const isAssignedToCurrentUser = taskSubset.every(
        (t) =>
          t.assignedToPin === currentUser.pin ||
          t.liveAssignedToPin === currentUser.pin
      );
      if (!isAssignedToCurrentUser) {
        return []; // Coordinator cannot assign tasks from another campus unless assigned to them
      }
    }

    return myCampusMembers;
  };

  const renderMemberOptions = (memberList: (TeamMember | Mentor)[]) => {
    if (!memberList || memberList.length === 0) return null;
    const grouped: { [campus: string]: (TeamMember | Mentor)[] } = {};
    memberList.forEach((m) => {
      const campus = m.campus || "General / Other";
      if (!grouped[campus]) grouped[campus] = [];
      grouped[campus].push(m);
    });

    const sortedCampuses = Object.keys(grouped).sort();

    return sortedCampuses.map((campusName) => (
      <optgroup key={campusName} label={` ${campusName}`}>
        {grouped[campusName].map((m) => (
          <option key={m.pin} value={m.pin}>
            {m.name} ({m.campus || "General"}) - PIN: {m.pin}
          </option>
        ))}
      </optgroup>
    ));
  };

  const handleRangeAssign = async () => {
    if (rangeAction === "assign") {
      if (!rangeStart || !rangeEnd || rangeTargetMembers.length === 0) {
        toast.error("Please fill all range assignment fields and select a member");
        return;
      }
    } else {
      if (!rangeStart || !rangeEnd) {
        toast.error("Please fill start and end SL");
        return;
      }
    }

    if (tasksInRange.length === 0) {
      toast.error("No tasks found in this visual serial range");
      return;
    }

    let taskIdsToProcess: string[] = [];
    let selectedMembers: any[] = [];

    if (rangeAction === "assign") {
      const isOnlineRange = tasksInRange.some((t) =>
        /online/i.test(t.className || ""),
      );
      const taskBranches = [...new Set(tasksInRange.map((t) => t.branch))];
      if (!isOnlineRange && taskBranches.length > 1 && !showManagementTabs) {
        toast.error(
          "Cannot assign tasks when multiple branches are present in the selected serial range",
        );
        return;
      }

      // Check if any of the tasks in the selected range already have an assignment for the selected assignment type
      const alreadyAssignedSLs: number[] = [];
      tasksInRange.forEach((t, i) => {
        const isAssigned =
          rangeAssignType === "feedback"
            ? !!t.assignedToPin
            : rangeAssignType === "live"
            ? !!(t.liveAssignedToPin || t.liveInstructorPin)
            : !!t.assignedToPin;
        if (isAssigned) {
          const sl = Math.max(0, parseInt(rangeStart) - 1) + i + 1;
          alreadyAssignedSLs.push(sl);
        }
      });

      if (alreadyAssignedSLs.length > 0) {
        toast.error(
          `সিরিয়াল নম্বর ${alreadyAssignedSLs.join(", ")} অলরেডি এসাইন করা আছে। দয়া করে আগে আন-এসাইন করুন।`
        );
        return;
      }

      const validMembersForRange = getValidMembers(tasksInRange);
      selectedMembers = validMembersForRange.filter((m) => rangeTargetMembers.includes(m.pin));

      if (selectedMembers.length === 0) {
        toast.error(
          "Selected member is not authorized for this branch/campus range",
        );
        return;
      }
      taskIdsToProcess = tasksInRange.map((t) => t.id);
    } else {
      // Unassign only assigned tasks
      taskIdsToProcess = tasksInRange
        .filter(
          (t) => t.assignedToPin || t.liveAssignedToPin || t.liveInstructorPin,
        )
        .map((t) => t.id);
      if (taskIdsToProcess.length === 0) {
        toast.error("No assigned tasks found in this range to unassign");
        return;
      }
      setUnassignTarget({ type: "range", taskIds: taskIdsToProcess });
      setIsUnassignModalOpen(true);
      return;
    }

    try {
      const payload: any = {
        taskIds: taskIdsToProcess,
        assignType: rangeAssignType,
        memberPins: selectedMembers.map(m => ({ pin: m.pin, name: m.name }))
      };

      const res = await fetch("/api/call-tasks/assign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchTasks();
        if (onRefreshEmails) onRefreshEmails();
        setIsRangeModalOpen(false);
        setRangeStart("");
        setRangeEnd("");
        setRangeTargetMembers([]);
        setRangeMemberSearch("");
        toast.success(
          `Successfully assigned ${taskIdsToProcess.length} tasks to ${selectedMembers[0]?.name || "member"}. Completed tasks' data was preserved.`,
        );
      }
    } catch (err) {
      console.error("Range operation error:", err);
      toast.error("Operation failed");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    campusFilter,
    liveStatusFilter,
    dateTypeFilter,
    fromDateFilter,
    toDateFilter,
    feedbackStatusFilter,
    feedbackDetailFilter,
    classFilter,
    assignFilter,
    selectedBranches,
  ]);

  const uniqueClasses = Array.from(
    new Set(tasks.map((t) => t.className)),
  ).filter(Boolean);

  const availableCampuses = useMemo(() => {
    const set = new Set<string>();
    campuses.forEach((c) => {
      if (c.name && c.name.trim()) set.add(c.name.trim());
    });
    members.forEach((m) => {
      if (m.campus && m.campus.trim()) set.add(m.campus.trim());
    });
    tasks.forEach((t) => {
      const camp = getTaskCampus(t);
      if (camp) set.add(camp);
    });
    return Array.from(set).sort();
  }, [campuses, members, tasks, branches]);

  const availableBranches = useMemo(() => {
    let fromTasks = tasks
      .map((t) => t.branch)
      .filter((b): b is string => Boolean(b && b.trim()));

    const userCampusName = currentUser.campus;
    if (userCampusName && userCampusName !== "All" && !canUpload) {
      const userCampusObj = campuses.find(
        (c) => c.name?.trim().toLowerCase() === userCampusName.trim().toLowerCase()
      );
      if (userCampusObj) {
        const campusBranchesSet = new Set(
          branches
            .filter((b) => b.campusId === userCampusObj.id)
            .map((b) => b.name?.trim().toLowerCase())
        );

        tasks.forEach((t) => {
          const tCamp = getTaskCampus(t);
          if (tCamp && tCamp.toLowerCase() === userCampusName.trim().toLowerCase() && t.branch) {
            campusBranchesSet.add(t.branch.trim().toLowerCase());
          }
        });

        fromTasks = fromTasks.filter((b) => campusBranchesSet.has(b.trim().toLowerCase()));
      }
    }
    return Array.from(new Set(fromTasks)).sort();
  }, [tasks, campuses, branches, currentUser.campus, canUpload, getTaskCampus]);

  const mergedBranches = useMemo(() => {
    const set = new Set<string>();
    
    let filteredBranches = branches;
    const userCampusName = currentUser.campus;
    if (userCampusName && userCampusName !== "All" && !canUpload) {
      const userCampusObj = campuses.find(
        (c) => c.name?.trim().toLowerCase() === userCampusName.trim().toLowerCase()
      );
      if (userCampusObj) {
        filteredBranches = branches.filter((b) => b.campusId === userCampusObj.id);
      }
    }

    filteredBranches.forEach((b) => {
      if (b.name) set.add(b.name.trim());
    });
    availableBranches.forEach((b) => {
      if (b) set.add(b.trim());
    });
    return Array.from(set).sort();
  }, [branches, availableBranches, campuses, currentUser.campus, canUpload]);

  const filteredDashboardTasks = useMemo(() => {
    let baseTasks = tasks;
    if (currentUser.role === "mentor" || (isCoordinator && !canUpload)) {
      baseTasks = tasks.filter((task) => {
        // Exclude tasks assigned solely to coordinator self (waiting to be assigned to team members)
        if (isAssignedSolelyToSelf(task, currentUser.pin)) {
          return false;
        }

        // Exclude unassigned online class tasks
        if (isOnlineTask(task)) {
          const isAssigned = Boolean(
            task.assignedToPin || task.liveAssignedToPin || task.liveInstructorPin,
          );
          if (!isAssigned) return false;
        } else {
          // Non-online tasks must belong to coordinator's campus branches
          const taskCampus = getTaskCampus(task);
          const userCampus = currentUser.campus;
          if (userCampus && userCampus !== "All") {
            const b = branches.find((br) => br.name === task.branch);
            const isMyBranch = b && b.campusId && campuses.find((c) => c.id === b.campusId)?.name === userCampus;
            const isMyCampus = taskCampus === userCampus || task.campus === userCampus;
            if (!isMyBranch && !isMyCampus) {
              return false;
            }
          }
        }

        return true;
      });
    }
    let filtered = baseTasks;

    if (dashboardClassFilter !== "all") {
      filtered = filtered.filter((t) => t.className === dashboardClassFilter);
    }

    if (dashboardCampusFilter !== "all") {
      filtered = filtered.filter((t) => {
        const taskCampus = getTaskCampus(t);
        return dashboardCampusFilter === "unassigned"
          ? !taskCampus || taskCampus.trim() === ""
          : taskCampus === dashboardCampusFilter || t.campus === dashboardCampusFilter;
      });
    }

    return filtered;
  }, [
    tasks,
    isCoordinator,
    canUpload,
    dashboardClassFilter,
    dashboardCampusFilter,
    currentUser.role,
    currentUser.pin,
    isAssignedSolelyToSelf,
    isOnlineTask,
    getTaskCampus,
  ]);

  const totalTasks = filteredDashboardTasks.length;
  const liveCompleted = filteredDashboardTasks.filter(
    (t) => t.liveInstructionStatus === "Completed",
  ).length;
  const livePending = filteredDashboardTasks.filter(
    (t) => t.liveInstructionStatus === "Pending",
  ).length;
  const feedbackCompleted = filteredDashboardTasks.filter(
    (t) => t.feedbackStatus === "Completed",
  ).length;
  const feedbackPending = filteredDashboardTasks.filter(
    (t) => t.feedbackStatus === "Pending",
  ).length;

  const liveCompletedPercent =
    totalTasks > 0 ? Math.round((liveCompleted / totalTasks) * 100) : 0;
  const livePendingPercent =
    totalTasks > 0 ? Math.round((livePending / totalTasks) * 100) : 0;
  const feedbackCompletedPercent =
    totalTasks > 0 ? Math.round((feedbackCompleted / totalTasks) * 100) : 0;
  const feedbackPendingPercent =
    totalTasks > 0 ? Math.round((feedbackPending / totalTasks) * 100) : 0;

  const liveData = [
    { name: "Completed", value: liveCompleted },
    { name: "Pending", value: livePending },
  ];

  const feedbackData = [
    { name: "Completed", value: feedbackCompleted },
    { name: "Pending", value: feedbackPending },
  ];

  const standardFeedbackOptions = ["N/R", "Off", "Busy", "Irregular", "Satisfied", "Class Problem", "Syllabus Problem", "Notify Later"];
  const feedbackDetailCounts: Record<string, number> = {
    "N/R": 0,
    "Off": 0,
    "Busy": 0,
    "Irregular": 0,
    "Satisfied": 0,
    "Class Problem": 0,
    "Syllabus Problem": 0,
    "Notify Later": 0,
    "Others": 0,
  };

  filteredDashboardTasks.forEach((t) => {
    const comment = t.feedbackComment || "";
    if (standardFeedbackOptions.includes(comment)) {
      feedbackDetailCounts[comment]++;
    } else if (comment.trim()) {
      feedbackDetailCounts["Others"]++;
    }
  });

  const feedbackDetailChartData = Object.keys(feedbackDetailCounts).map((key) => ({
    name: key,
    value: feedbackDetailCounts[key],
  }));

  const memberPerformanceData = useMemo(() => {
    const data: Record<
      string,
      {
        name: string;
        liveCompleted: number;
        feedbackCompleted: number;
        totalCompleted: number;
        livePending: number;
        feedbackPending: number;
        totalPending: number;
      }
    > = {};

    filteredDashboardTasks.forEach((t) => {
      // For feedback assignment
      if (t.assignedToPin) {
        const pin = t.assignedToPin;
        if (!data[pin]) {
          data[pin] = {
            name: t.assignedToName || pin,
            liveCompleted: 0,
            feedbackCompleted: 0,
            totalCompleted: 0,
            livePending: 0,
            feedbackPending: 0,
            totalPending: 0,
          };
        }
        if (t.feedbackStatus === "Completed") {
          data[pin].feedbackCompleted++;
          data[pin].totalCompleted++;
        } else {
          data[pin].feedbackPending++;
          data[pin].totalPending++;
        }
      }

      // For live instruction assignment
      if (t.liveAssignedToPin) {
        const pin = t.liveAssignedToPin;
        if (!data[pin]) {
          data[pin] = {
            name: t.liveAssignedToName || pin,
            liveCompleted: 0,
            feedbackCompleted: 0,
            totalCompleted: 0,
            livePending: 0,
            feedbackPending: 0,
            totalPending: 0,
          };
        }
        if (t.liveInstructionStatus === "Completed") {
          data[pin].liveCompleted++;
          data[pin].totalCompleted++;
        } else {
          data[pin].livePending++;
          data[pin].totalPending++;
        }
      }
    });

    return Object.values(data)
      .sort(
        (a, b) =>
          b.totalCompleted - a.totalCompleted ||
          b.totalCompleted + b.totalPending - (a.totalCompleted + a.totalPending),
      )
      .slice(0, 10); // top 10
  }, [filteredDashboardTasks]);

  const isManagerPin = useCallback(
    (pin: string) => {
      if (!pin) return true;
      if (currentUser.role === "manager" && currentUser.pin === pin) return true;
      const m = members.find((u) => u.pin === pin);
      if (m && (m.role as string) === "manager") return true;
      const mentor = mentors.find((u) => u.pin === pin);
      if (mentor && (mentor as any).role === "manager") return true;
      return false;
    },
    [currentUser, members, mentors],
  );

  const getMemberCampus = useCallback(
    (m: { campus?: string; branch?: string }) => {
      if (m.campus && m.campus.trim()) {
        const direct = m.campus.trim();
        const official =
          campusAndBranchMaps.campusNameMap.get(direct.toLowerCase());
        return official || direct;
      }
      if (m.branch) {
        const cleanBranch = m.branch.trim().toLowerCase();
        const mapped = campusAndBranchMaps.branchToCampusMap.get(cleanBranch);
        if (mapped) return mapped;
        const matched = campuses.find(
          (c) =>
            c.name &&
            cleanBranch.includes(
              c.name.toLowerCase().replace("campus", "").trim(),
            ),
        );
        if (matched && matched.name) return matched.name.trim();
      }
      return "Unassigned";
    },
    [campusAndBranchMaps, campuses],
  );

  const effectiveStatusSummaryCampus = useMemo(() => {
    if (
      currentUser.role !== "manager" &&
      !currentUser.permissions?.includes("can_upload_call_info") &&
      currentUser.campus &&
      currentUser.campus !== "All"
    ) {
      return currentUser.campus;
    }
    return statusSummaryCampusFilter;
  }, [currentUser, statusSummaryCampusFilter]);

  const statusSummaryMemberData = useMemo(() => {
    const memberMap = new Map<
      string,
      {
        pin: string;
        name: string;
        liveCount: number;
        feedbackCount: number;
        totalCount: number;
      }
    >();

    const addKnownUser = (u: {
      pin: string;
      name: string;
      role?: string;
      campus?: string;
      branch?: string;
    }) => {
      if (!u.pin) return;
      if (u.role === "manager" || isManagerPin(u.pin)) return;

      const memCampus = getMemberCampus(u);
      if (
        effectiveStatusSummaryCampus !== "all" &&
        memCampus.toLowerCase() !== effectiveStatusSummaryCampus.toLowerCase()
      ) {
        return;
      }

      if (!memberMap.has(u.pin)) {
        memberMap.set(u.pin, {
          pin: u.pin,
          name: u.name || u.pin,
          liveCount: 0,
          feedbackCount: 0,
          totalCount: 0,
        });
      }
    };

    members.forEach(addKnownUser);
    mentors.forEach(addKnownUser);
    if (
      currentUser &&
      currentUser.role !== "manager" &&
      !isManagerPin(currentUser.pin)
    ) {
      addKnownUser(currentUser);
    }

    const checkDateMatch = (dStr?: string) => {
      if (!dStr) return false;
      const dateOnly = dStr.split("T")[0].split(" ")[0];
      return dateOnly === statusSummaryDate;
    };

    tasks.forEach((t) => {
      const tCamp = getTaskCampus(t) || t.campus || "";
      if (
        effectiveStatusSummaryCampus !== "all" &&
        tCamp &&
        tCamp.toLowerCase() !== effectiveStatusSummaryCampus.toLowerCase()
      ) {
        return;
      }

      // Live Instruction call on selected date
      if (
        t.liveInstructionStatus === "Completed" ||
        t.liveInstructionSubmitDate
      ) {
        const targetDate = t.liveInstructionSubmitDate || t.completedAt;
        if (checkDateMatch(targetDate)) {
          const pin = t.liveInstructorPin || t.liveAssignedToPin;
          const name = t.liveInstructorName || t.liveAssignedToName || pin;
          if (pin && !isManagerPin(pin)) {
            if (!memberMap.has(pin)) {
              memberMap.set(pin, {
                pin,
                name: name || pin,
                liveCount: 0,
                feedbackCount: 0,
                totalCount: 0,
              });
            }
            const rec = memberMap.get(pin)!;
            rec.liveCount++;
            rec.totalCount++;
          }
        }
      }

      // Feedback call on selected date
      if (t.feedbackStatus === "Completed" || t.feedbackSubmitDate) {
        const targetDate = t.feedbackSubmitDate || t.completedAt;
        if (checkDateMatch(targetDate)) {
          const pin = t.assignedToPin;
          const name = t.assignedToName || pin;
          if (pin && !isManagerPin(pin)) {
            if (!memberMap.has(pin)) {
              memberMap.set(pin, {
                pin,
                name: name || pin,
                liveCount: 0,
                feedbackCount: 0,
                totalCount: 0,
              });
            }
            const rec = memberMap.get(pin)!;
            rec.feedbackCount++;
            rec.totalCount++;
          }
        }
      }
    });

    return Array.from(memberMap.values()).sort(
      (a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name),
    );
  }, [
    tasks,
    members,
    mentors,
    currentUser,
    statusSummaryDate,
    isManagerPin,
    effectiveStatusSummaryCampus,
    getMemberCampus,
    getTaskCampus,
  ]);

  const filteredStatusSummaryMembers = useMemo(() => {
    return statusSummaryMemberData.filter((m) => {
      if (statusSummaryFilterMode === "active" && m.totalCount === 0) {
        return false;
      }
      if (statusSummarySearch.trim()) {
        const q = statusSummarySearch.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchPin = m.pin.toLowerCase().includes(q);
        if (!matchName && !matchPin) return false;
      }
      return true;
    });
  }, [statusSummaryMemberData, statusSummaryFilterMode, statusSummarySearch]);

  const summaryTotalCalls = useMemo(
    () => statusSummaryMemberData.reduce((acc, m) => acc + m.totalCount, 0),
    [statusSummaryMemberData],
  );

  const summaryTotalLiveCalls = useMemo(
    () => statusSummaryMemberData.reduce((acc, m) => acc + m.liveCount, 0),
    [statusSummaryMemberData],
  );

  const summaryTotalFeedbackCalls = useMemo(
    () => statusSummaryMemberData.reduce((acc, m) => acc + m.feedbackCount, 0),
    [statusSummaryMemberData],
  );

  const summaryActiveMembersCount = useMemo(
    () => statusSummaryMemberData.filter((m) => m.totalCount > 0).length,
    [statusSummaryMemberData],
  );

  const tasksByBranchData = useMemo(() => {
    const data: Record<string, { fullName: string; name: string; total: number }> = {};
    filteredDashboardTasks.forEach((t) => {
      const branch = (t.branch || "Unknown").trim();
      if (!data[branch]) {
        const cleanName =
          branch
            .replace(/[\s\-_]*(?:Udvash[\s\-_]*Unmesh|Udvash|Unmesh)\b/gi, "")
            .trim() || branch;
        data[branch] = { fullName: branch, name: cleanName, total: 0 };
      }
      data[branch].total++;
    });
    return Object.values(data)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredDashboardTasks]);

  const tasksByCampusData = useMemo(() => {
    const data: Record<
      string,
      {
        name: string;
        total: number;
        liveCompleted: number;
        feedbackCompleted: number;
        livePending: number;
        feedbackPending: number;
      }
    > = {};
    filteredDashboardTasks.forEach((t) => {
      const resolved = getTaskCampus(t) || t.campus;
      const campusName =
        resolved && resolved.trim() ? resolved.trim() : "Unassigned Campus";
      if (!data[campusName]) {
        data[campusName] = {
          name: campusName,
          total: 0,
          liveCompleted: 0,
          feedbackCompleted: 0,
          livePending: 0,
          feedbackPending: 0,
        };
      }
      data[campusName].total++;

      if (t.liveInstructionStatus === "Completed") {
        data[campusName].liveCompleted++;
      } else {
        data[campusName].livePending++;
      }

      if (t.feedbackStatus === "Completed") {
        data[campusName].feedbackCompleted++;
      } else {
        data[campusName].feedbackPending++;
      }
    });
    return Object.values(data).sort((a, b) => b.total - a.total);
  }, [filteredDashboardTasks, getTaskCampus]);

  const COLORS = ["#10b981", "#f59e0b"];

  return (
    <div className="space-y-6">
      {/* Sub-tabs Header */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 md:gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto border border-slate-200/60 overflow-x-auto scrollbar-hide flex-nowrap">
          {showManagementTabs && (
            <>
              <button
                onClick={() => setActiveSubTab("dashboard")}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${activeSubTab === "dashboard" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveSubTab("management")}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${activeSubTab === "management" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
              >
                Call Management
              </button>
            </>
          )}
          {currentUser.role !== "manager" && (
            <button
              onClick={() => setActiveSubTab("my-tasks")}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${activeSubTab === "my-tasks" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              {showManagementTabs ? "My Assigned Calls" : "Call Management"}
            </button>
          )}
          <button
            onClick={() => setActiveSubTab("live-instruction")}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${activeSubTab === "live-instruction" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
          >
            Live Instruction
          </button>
          {canViewStatusSummary && (
            <button
              onClick={() => setActiveSubTab("status-summary")}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${activeSubTab === "status-summary" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              Status Summary
            </button>
          )}
        </div>

        {activeSubTab === "management" && canUpload && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
            <button
              onClick={() => {
                const firstClass = uniqueClasses[0] || "";
                setEditClassOldName(firstClass);
                setEditClassNewName(firstClass);
                setIsEditClassModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-indigo-200 cursor-pointer whitespace-nowrap"
              title="Edit Existing Class Name"
            >
              <Edit3 className="w-3.5 h-3.5 shrink-0" />
              <span>Edit Class Name</span>
            </button>
            <button
              onClick={() => {
                setMeritResult(null);
                setIsMeritListModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-purple-200 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Sync New Students</span>
            </button>
            <button
              onClick={() => setIsAddStudentModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-indigo-200 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Add Students +</span>
            </button>
            {tasks.length > 0 && (
              <button
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200/80 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete All</span>
              </button>
            )}
            {/* <button
              onClick={() => fetchTasks(true)}
              title="Refresh Server Data"
              className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center cursor-pointer shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button> */}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === "dashboard" && showManagementTabs && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <RotateCcw className="w-12 h-12 text-indigo-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-white rounded-full" />
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-sm font-black text-slate-800 uppercase tracking-widest animate-pulse">
                   Dashboard Preparing...                               
                    It will take less than 2 min, Keep Patience

                  </p>
                  <div className="flex gap-1 justify-center">
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Dashboard Campus & Class Filters */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Dashboard Overview
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Filter statistics and analytics by campus and class
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    {(currentUser.role === "manager" || canUpload) && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
                        <span className="text-xs font-bold text-slate-600">Campus:</span>
                        <select
                          value={dashboardCampusFilter}
                          onChange={(e) => setDashboardCampusFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 w-full sm:w-48 cursor-pointer"
                        >
                          <option value="all">All Campuses</option>
                          <option value="unassigned"> Unassigned</option>
                          {availableCampuses.map((camp) => (
                            <option key={camp} value={camp}>
                               {camp}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-600">Class:</span>
                      {!loading && (
                        <select
                          value={dashboardClassFilter}
                          onChange={(e) => setDashboardClassFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 w-full sm:w-48 cursor-pointer"
                        >
                          <option value="all">All Classes</option>
                          {uniqueClasses.map((cls) => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
            >
              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2 md:mb-4">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <Phone className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                  </div>
                  <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Tasks
                  </span>
                </div>
                <div className="text-xl md:text-2xl font-black text-slate-800">
                  {totalTasks}
                </div>
                <div className="text-[10px] md:text-xs text-slate-500 mt-1">
                  Total assigned calls
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2 md:mb-4">
                  <div className="p-2 bg-emerald-50 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                  </div>
                  <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Live Instruction Completed
                  </span>
                </div>
                <div className="text-xl md:text-2xl font-black text-slate-800">
                  {liveCompleted}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${liveCompletedPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600">{liveCompletedPercent}%</span>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2 md:mb-4">
                  <div className="p-2 bg-amber-50 rounded-xl">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                  </div>
                  <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Live Instruction Pending
                  </span>
                </div>
                <div className="text-xl md:text-2xl font-black text-slate-800">
                  {livePending}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${livePendingPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-amber-500"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-amber-600">{livePendingPercent}%</span>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2 md:mb-4">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                  </div>
                  <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Feedback Completed
                  </span>
                </div>
                <div className="text-xl md:text-2xl font-black text-slate-800">
                  {feedbackCompleted}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${feedbackCompletedPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-indigo-600"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600">{feedbackCompletedPercent}%</span>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2 md:mb-4">
                  <div className="p-2 bg-amber-50 rounded-xl">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                  </div>
                  <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Feedback Pending
                  </span>
                </div>
                <div className="text-xl md:text-2xl font-black text-slate-800">
                  {feedbackPending}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${feedbackPendingPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-amber-500"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-amber-600">{feedbackPendingPercent}%</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Pie Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 mb-4">
                  Live Instruction Status Distribution
                </h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={liveData}
                        cx="50%"
                        cy="42%"
                        innerRadius={55}
                        outerRadius={78}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {liveData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px", fontWeight: "bold" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 mb-4">
                  Feedback Status Distribution
                </h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={feedbackData}
                        cx="50%"
                        cy="42%"
                        innerRadius={55}
                        outerRadius={78}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {feedbackData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px", fontWeight: "bold" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bar Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 mb-4">
                  Feedback Details Distribution
                </h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={feedbackDetailChartData}
                      margin={{ top: 15, right: 15, left: 10, bottom: 55 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                      />
                      <Bar
                        dataKey="value"
                        name="Count"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 mb-4">
                  Top 10 Members by Performance
                </h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={memberPerformanceData}
                      margin={{ top: 15, right: 15, left: 10, bottom: 55 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                      />
                      <Legend
                        wrapperStyle={{
                          fontSize: "12px",
                          fontWeight: "bold",
                          paddingTop: "5px",
                        }}
                      />
                      <Bar
                        dataKey="liveCompleted"
                        name="Live Instruction"
                        stackId="a"
                        fill="#10b981"
                        radius={[0, 0, 4, 4]}
                      />
                      <Bar
                        dataKey="feedbackCompleted"
                        name="Feedback"
                        stackId="a"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 mb-4">
                  Top 10 Branches by Task Volume
                </h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tasksByBranchData}
                      margin={{ top: 15, right: 15, left: 10, bottom: 55 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                        labelFormatter={(_label, payload) => {
                          return (payload && payload[0]?.payload?.fullName) || _label;
                        }}
                      />
                      <Bar
                        dataKey="total"
                        name="Total Tasks"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 mb-4">
                  Task Volume by Campus
                </h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tasksByCampusData}
                      margin={{ top: 15, right: 15, left: 10, bottom: 55 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                      />
                      <Legend
                        wrapperStyle={{
                          fontSize: "12px",
                          fontWeight: "bold",
                          paddingTop: "5px",
                        }}
                      />
                      <Bar
                        dataKey="total"
                        name="Total Task"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="liveCompleted"
                        name="Live Instruction Completed"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="feedbackCompleted"
                        name="Feedback Completed"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="livePending"
                        name="Live Instruction Pending"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="feedbackPending"
                        name="Feedback Pending"
                        fill="#f43f5e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
              </>
            )}
          </motion.div>
        )}

        {activeSubTab === "live-instruction" && (
          <motion.div
            key="live-instruction"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm max-w-5xl mx-auto"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center pb-2 border-b border-slate-100">
                <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-2">
                  <span>Live Instruction Center</span>
                </h3>
                <p className="text-[11px] md:text-xs text-slate-500 font-bold mt-1">
                  Search students by Registration or Roll Number and update instruction logs
                </p>
              </div>

              {/* Layout Grid: 1-Column for search if not found, 2-Columns if student is found to minimize height */}
              <div className={`grid grid-cols-1 ${liveFoundTask ? "lg:grid-cols-12" : "max-w-xl mx-auto"} gap-6 md:gap-8 items-start`}>
                
                {/* LEFT COLUMN: Search & Student Information (Col Span 5) */}
                <div className={`${liveFoundTask ? "lg:col-span-5" : "w-full"} space-y-4`}>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Search Student Reg No / Roll No
                    </label>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Enter Registration or Roll No."
                          value={liveSearchRegNo}
                          onChange={(e) => setLiveSearchRegNo(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleLiveSearch();
                          }}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <div className="absolute left-3 top-2.5 flex items-center justify-center">
                          {isSearchingLive ? (
                            <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <Search className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleLiveSearch}
                        disabled={isSearchingLive}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-100 shrink-0"
                      >
                        {isSearchingLive ? "Searching" : "Search"}
                      </button>
                    </div>
                  </div>

                  {/* Searching Indicator */}
                  {isSearchingLive && (
                    <div className="p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                      <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs font-bold text-slate-500">Searching student database...</span>
                    </div>
                  )}

                  {/* Student Details Card (Only if found) */}
                  {liveFoundTask && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100 text-left space-y-4"
                    >
                      <div className="border-b border-indigo-100/50 pb-2 mb-2">
                        <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                          Active Student Profile
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Student Name
                          </div>
                          <div className="text-xs font-black text-slate-800">
                            {liveFoundTask.studentName || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Nick Name
                          </div>
                          <div className="text-xs font-black text-slate-800">
                            {liveFoundTask.nickName || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Reg No
                          </div>
                          <div className="text-xs font-mono font-black text-indigo-600 flex items-center gap-1.5 select-text cursor-text">
                            <span className="select-text">{liveFoundTask.registrationNo}</span>
                            <button
                              type="button"
                              className="p-1 hover:bg-indigo-100/60 rounded text-indigo-400 hover:text-indigo-700 transition-colors"
                              title="Copy Registration Number"
                              onClick={() => {
                                navigator.clipboard.writeText(liveFoundTask.registrationNo);
                                toast.success(`Copied Reg No: ${liveFoundTask.registrationNo}`);
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Roll No
                          </div>
                          <div className="text-xs font-mono font-black text-slate-700">
                            {liveFoundTask.rollNo || (liveFoundTask as any).roll || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Branch & Class
                          </div>
                          <div className="text-xs font-bold text-slate-700">
                            {liveFoundTask.branch} / {liveFoundTask.className}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Personal Contact
                          </div>
                          <div className="text-xs font-bold text-slate-700">
                            {liveFoundTask.mobilePersonal ? (
                              <a
                                href={`tel:${liveFoundTask.mobilePersonal}`}
                                className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 font-bold"
                                title={`Call Personal: ${liveFoundTask.mobilePersonal}`}
                              >
                                <span>{liveFoundTask.mobilePersonal}</span>
                                <Phone className="w-3 h-3 text-indigo-500" />
                              </a>
                            ) : (
                              "N/A"
                            )}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Parents Contact Numbers
                          </div>
                          <div className="text-xs font-bold text-slate-700 grid grid-cols-2 gap-1 mt-0.5 bg-white/60 p-2 rounded-lg border border-slate-100">
                            <div>
                              Father:{" "}
                              {liveFoundTask.mobileFather ? (
                                <a
                                  href={`tel:${liveFoundTask.mobileFather}`}
                                  className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 font-bold ml-0.5"
                                  title={`Call Father: ${liveFoundTask.mobileFather}`}
                                >
                                  <span>{liveFoundTask.mobileFather}</span>
                                  <Phone className="w-2.5 h-2.5 text-indigo-500" />
                                </a>
                              ) : (
                                "N/A"
                              )}
                            </div>
                            <div>
                              Mother:{" "}
                              {liveFoundTask.mobileMother ? (
                                <a
                                  href={`tel:${liveFoundTask.mobileMother}`}
                                  className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 font-bold ml-0.5"
                                  title={`Call Mother: ${liveFoundTask.mobileMother}`}
                                >
                                  <span>{liveFoundTask.mobileMother}</span>
                                  <Phone className="w-2.5 h-2.5 text-indigo-500" />
                                </a>
                              ) : (
                                "N/A"
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Feedback Status & Date Section */}
                        <div className="sm:col-span-2 pt-2 border-t border-indigo-100/60 mt-1">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Feedback Information
                          </div>
                          <div className="grid grid-cols-2 gap-2 bg-white/80 p-3 rounded-xl border border-indigo-100/80 shadow-xs">
                            <div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Feedback Status
                              </div>
                              <div className="mt-0.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  liveFoundTask.feedbackStatus === "Completed"
                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}>
                                  {liveFoundTask.feedbackStatus || "Pending"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Feedback Date
                              </div>
                              <div className="text-xs font-bold text-slate-700 mt-1">
                                {liveFoundTask.feedbackSubmitDate || liveFoundTask.completedAt || "Not Submitted"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* RIGHT COLUMN: Form & Multiple Image Management (Col Span 7) */}
                {liveFoundTask && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-7 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 space-y-4 text-left"
                  >
                    {/* Status & Instructor details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                          Live Instruction Status
                        </label>
                        <div className="flex gap-2">
                          {["Pending", "Completed"].map((s) => {
                            const isDisabled = s === "Pending" && currentUser?.role !== "manager" && liveFoundTask?.liveInstructionStatus === "Completed";
                            return (
                              <button
                                key={s}
                                onClick={() => setLiveStatus(s as any)}
                                disabled={isDisabled}
                                className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                  isDisabled
                                    ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                                    : liveStatus === s
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-end pb-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="liveTabTeacherCheckbox"
                            checked={isLiveInstructorTeacher}
                            onChange={(e) =>
                              setIsLiveInstructorTeacher(e.target.checked)
                            }
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label
                            htmlFor="liveTabTeacherCheckbox"
                            className="text-xs font-bold text-slate-700 cursor-pointer"
                          >
                            Teacher Role
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Instructor Name
                        </label>
                        <input
                          type="text"
                          value={liveInstructorName}
                          onChange={(e) =>
                            setLiveInstructorName(e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Instructor PIN
                        </label>
                        <input
                          type="text"
                          value={liveInstructorPin}
                          onChange={(e) => setLiveInstructorPin(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Live Instruction Comment
                      </label>
                      <textarea
                        value={liveComment}
                        onChange={(e) => setLiveComment(e.target.value)}
                        placeholder="Write detailed instruction review comment here..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-16"
                      />
                    </div>

                    {/* Multiple Images Upload & Paste Section */}
                    <div className="border-t border-slate-200/60 pt-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Attached Exam Scripts ({liveInstructionImages.length} Images)
                      </label>
                      
                      {/* Controls Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3">
                        <div className="sm:col-span-8 flex gap-1">
                          <input
                            type="text"
                            placeholder="Add Image URL (Link)"
                            value={liveInstructionLink}
                            onChange={(e) => setLiveInstructionLink(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && liveInstructionLink.trim()) {
                                setLiveInstructionImages(prev => [...prev, liveInstructionLink.trim()]);
                                setLiveInstructionLink("");
                                toast.success("Image URL added");
                              }
                            }}
                            className="flex-grow px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (liveInstructionLink.trim()) {
                                setLiveInstructionImages(prev => [...prev, liveInstructionLink.trim()]);
                                setLiveInstructionLink("");
                                toast.success("Image URL added");
                              }
                            }}
                            className="px-3 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-black"
                          >
                            Add
                          </button>
                        </div>
                        
                        <div className="sm:col-span-4 relative">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={async (e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                for (const file of Array.from(files) as File[]) {
                                  try {
                                    const imgUrl = await uploadImageToImgBB(file);
                                    setLiveInstructionImages((prev) => [
                                      ...prev,
                                      imgUrl,
                                    ]);
                                  } catch (err) {
                                    console.error(
                                      "ImgBB upload failed:",
                                      err,
                                    );
                                  }
                                }
                                toast.success(`${files.length} images uploaded`);
                              }
                            }}
                            className="hidden"
                            id="liveTabExamScriptUpload"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label
                              htmlFor="liveTabExamScriptUpload"
                              className="flex items-center justify-center gap-1.5 bg-indigo-50 border border-indigo-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-indigo-100 cursor-pointer transition-colors text-indigo-700 h-10"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setCameraTarget("live");
                                setIsCameraOpen(true);
                              }}
                              className="flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-indigo-700 transition-colors h-10"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Camera</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Paste Box & Gallery Grid side by side */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div 
                          onPaste={(e) => handleImagePaste(e, (url) => {
                            setLiveInstructionImages(prev => [...prev, url]);
                          })}
                          className="sm:col-span-5 p-3.5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-indigo-300 transition-all cursor-pointer text-center flex flex-col items-center justify-center"
                        >
                          <ClipboardIcon className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[9px] font-bold text-slate-500 block leading-tight">
                            Click & Paste Here
                          </span>
                          <span className="text-[8px] text-slate-400 block mt-0.5 font-mono">
                            (Ctrl+V)
                          </span>
                        </div>

                        {/* Thumbnail gallery */}
                        <div className="sm:col-span-7 bg-slate-100/40 p-2 rounded-xl border border-slate-200/40 min-h-[72px] flex items-center">
                          {liveInstructionImages.length === 0 ? (
                            <div className="text-[10px] text-slate-400 font-bold text-center w-full">
                              No images attached. Paste or upload.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 overflow-x-auto w-full max-h-24 p-0.5">
                                {liveInstructionImages.map((imgUrl, idx) => (
                                  <div
                                    key={idx}
                                    className="relative group shrink-0"
                                  >
                                    {isGoogleDriveLink(imgUrl) ? (
                                      <div
                                        className="w-12 h-12 flex flex-col items-center justify-center bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                                        onClick={() =>
                                          window.open(imgUrl, "_blank")
                                        }
                                        title="View on Google Drive"
                                      >
                                        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-[10px] text-white font-bold">
                                          G
                                        </div>
                                        <span className="text-[7px] font-bold text-blue-600 mt-0.5">
                                          Drive
                                        </span>
                                      </div>
                                    ) : (
                                      <img
                                        src={imgUrl}
                                        alt={`Preview ${idx + 1}`}
                                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                                        onClick={() => {
                                          setViewingImageUrl(imgUrl);
                                          setIsImageViewerOpen(true);
                                        }}
                                      />
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLiveInstructionImages((prev) =>
                                          prev.filter((_, i) => i !== idx),
                                        );
                                        toast.success("Image removed");
                                      }}
                                      className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white p-0.5 rounded-full hover:bg-rose-600 transition-colors shadow"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleUpdateLiveInstruction}
                        disabled={isUpdatingLive}
                        className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 disabled:bg-emerald-400 transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        {isUpdatingLive ? "Saving Changes..." : "Save Live Instruction Info"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === "status-summary" && canViewStatusSummary && (
          <motion.div
            key="status-summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              {/* Header & Title */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-xs">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">
                      Status Summary
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Call completed count by each member for the selected date
                    </p>
                  </div>
                </div>

                {/* Date Selector & Campus Filter & Quick Shortcuts */}
                <div className="flex flex-wrap items-center gap-2">
                  {currentUser.role === "manager" ||
                  currentUser.permissions?.includes("can_upload_call_info") ||
                  currentUser.campus === "All" ||
                  !currentUser.campus ? (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-2xs">
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-slate-500 hidden sm:inline">Campus:</span>
                      <select
                        value={statusSummaryCampusFilter}
                        onChange={(e) => setStatusSummaryCampusFilter(e.target.value)}
                        className="bg-transparent focus:outline-none cursor-pointer font-bold text-slate-800 text-xs"
                      >
                        <option value="all">All Campuses</option>
                        {availableCampuses.map((camp) => (
                          <option key={camp} value={camp}>
                            {camp}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-800 shadow-2xs">
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Campus: {currentUser.campus}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-2xs">
                    <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-slate-500 hidden sm:inline">Date:</span>
                    <input
                      type="date"
                      value={statusSummaryDate}
                      onChange={(e) => setStatusSummaryDate(e.target.value)}
                      className="bg-transparent focus:outline-none cursor-pointer font-bold text-slate-800 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => setStatusSummaryDate(getTodayLocalDate())}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      statusSummaryDate === getTodayLocalDate()
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl">
                  <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                    Total Calls
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-indigo-900 mt-0.5">
                    {summaryTotalCalls}
                  </p>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                    Live Instruction Calls
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-900 mt-0.5">
                    {summaryTotalLiveCalls}
                  </p>
                </div>
                <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl">
                  <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
                    Feedback Calls
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-purple-900 mt-0.5">
                    {summaryTotalFeedbackCalls}
                  </p>
                </div>
                <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl">
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                    Active Callers
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-amber-900 mt-0.5">
                    {summaryActiveMembersCount}
                  </p>
                </div>
              </div>

              {/* Filter Mode & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => setStatusSummaryFilterMode("active")}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusSummaryFilterMode === "active"
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Active Callers ({summaryActiveMembersCount})
                  </button>
                  <button
                    onClick={() => setStatusSummaryFilterMode("all")}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusSummaryFilterMode === "all"
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Campus Members 
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search member name or PIN..."
                    value={statusSummarySearch}
                    onChange={(e) => setStatusSummarySearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                </div>
              </div>

              {/* Grid of Members */}
              {filteredStatusSummaryMembers.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">
                    No member call records found for {statusSummaryDate}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {statusSummaryFilterMode === "active"
                      ? "No calls recorded for members on this date yet."
                      : "Try adjusting your search query or selecting another date."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredStatusSummaryMembers.map((m) => (
                    <div
                      key={m.pin}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        m.totalCount > 0
                          ? "bg-gradient-to-br from-indigo-50/60 to-emerald-50/40 border-indigo-200 shadow-2xs"
                          : "bg-slate-50/80 border-slate-200/90"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs font-extrabold text-slate-800 truncate"
                            title={m.name}
                          >
                            {m.name}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                            PIN: <span className="font-mono">{m.pin}</span>
                          </p>
                        </div>
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-xl shrink-0 ${
                            m.totalCount > 0
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {m.totalCount} {m.totalCount === 1 ? "call" : "calls"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/70">
                        <span className="truncate" title="Live Instruction Calls">
                          Live Instruction:{" "}
                          <strong className="text-emerald-600 font-extrabold">
                            {m.liveCount}
                          </strong>
                        </span>
                        <span className="truncate" title="Feedback Calls">
                          Feedback:{" "}
                          <strong className="text-indigo-600 font-extrabold">
                            {m.feedbackCount}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {(activeSubTab === "management" || activeSubTab === "my-tasks") && (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Responsive Organized Filter Panel */}
            <div className="p-3.5 md:p-4 border-b border-slate-100 bg-slate-50/80 space-y-3">
              {/* Row 1: Search & Core Campus / Branch / Class Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-center">
                {/* Search Bar */}
                <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search (SL, Name, Roll, PIN, Contact)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Campus Filter Dropdown */}
                <div className="relative">
                  <select
                    value={campusFilter}
                    onChange={(e) => setCampusFilter(e.target.value)}
                    className={`w-full bg-white border text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer ${
                      campusFilter !== "all"
                        ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
                        : "border-slate-200/80 text-slate-700"
                    }`}
                  >
                    <option value="all">Campus: All</option>
                    <option value="unassigned">Unassigned</option>
                    {availableCampuses.map((camp) => (
                      <option key={camp} value={camp}>
                        {camp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch Checkbox Filter Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsBranchFilterOpen((prev) => !prev)}
                    className={`w-full bg-white border text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      selectedBranches.length > 0
                        ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
                        : "border-slate-200/80 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2
                        className={`w-3.5 h-3.5 flex-shrink-0 ${selectedBranches.length > 0 ? "text-indigo-600" : "text-slate-400"}`}
                      />
                      <span className="truncate">
                        {selectedBranches.length === 0
                          ? "Branch: All"
                          : selectedBranches.length === 1
                            ? `Branch: ${selectedBranches[0]}`
                            : `Branch: (${selectedBranches.length} selected)`}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isBranchFilterOpen ? "rotate-180" : ""} ${selectedBranches.length > 0 ? "text-indigo-600" : "text-slate-400"}`}
                    />
                  </button>

                  {/* Popover Dropdown */}
                  {isBranchFilterOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20 bg-transparent"
                        onClick={() => setIsBranchFilterOpen(false)}
                      />
                      <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 p-3 space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                            Select Branch
                          </span>
                          {selectedBranches.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedBranches([])}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={branchSearchQuery}
                            onChange={(e) =>
                              setBranchSearchQuery(e.target.value)
                            }
                            placeholder="Search branch..."
                            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                          />
                          {branchSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setBranchSearchQuery("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Quick Select Buttons */}
                        <div className="flex items-center justify-between text-[11px] font-bold px-1 text-slate-500 border-b border-slate-100 pb-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const matching = availableBranches.filter((b) =>
                                b
                                  .toLowerCase()
                                  .includes(branchSearchQuery.toLowerCase()),
                              );
                              const combined = Array.from(
                                new Set([...selectedBranches, ...matching]),
                              );
                              setSelectedBranches(combined);
                            }}
                            className="text-indigo-600 hover:underline"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBranches([])}
                            className="text-slate-400 hover:text-slate-600 hover:underline"
                          >
                            Deselect All
                          </button>
                        </div>

                        {/* Scrollable Checkbox List */}
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                          {availableBranches.filter((b) =>
                            b
                              .toLowerCase()
                              .includes(branchSearchQuery.toLowerCase()),
                          ).length === 0 ? (
                            <div className="text-center py-3 text-xs text-slate-400 font-medium">
                              No branch found
                            </div>
                          ) : (
                            availableBranches
                              .filter((b) =>
                                b
                                  .toLowerCase()
                                  .includes(branchSearchQuery.toLowerCase()),
                              )
                              .map((branchName) => {
                                const isChecked =
                                  selectedBranches.includes(branchName);
                                return (
                                  <label
                                    key={branchName}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedBranches((prev) => [
                                            ...prev,
                                            branchName,
                                          ]);
                                        } else {
                                          setSelectedBranches((prev) =>
                                            prev.filter(
                                              (b) => b !== branchName,
                                            ),
                                          );
                                        }
                                      }}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span className="truncate flex-1">
                                      {branchName}
                                    </span>
                                  </label>
                                );
                              })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Class Filter */}
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200/80 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-xs cursor-pointer"
                >
                  <option value="all">Class: All</option>
                  {uniqueClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2: Status & Assignment Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 items-center pt-1">
                <select
                  value={liveAssignFilter}
                  onChange={(e) => setLiveAssignFilter(e.target.value)}
                  className={`w-full bg-white border text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer transition-colors ${
                    liveAssignFilter !== "all"
                      ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
                      : "border-slate-200/80 text-slate-700"
                  }`}
                >
                  <option value="all">Live Instruction Assign: All</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Unassigned">Unassigned</option>
                </select>

                <SearchableMemberSelect
                  value={liveAssignedMemberFilter}
                  onChange={(val) => setLiveAssignedMemberFilter(val)}
                  options={allFilterMembers}
                  prefixLabel="Live Instruction Member"
                  title="Live Instruction Assigned Member"
                />

                <select
                  value={liveStatusFilter}
                  onChange={(e) => setLiveStatusFilter(e.target.value)}
                  className={`w-full bg-white border text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer transition-colors ${
                    liveStatusFilter !== "all"
                      ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
                      : "border-slate-200/80 text-slate-700"
                  }`}
                >
                  <option value="all">Live Instruction Status: All</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>

                <select
                  value={assignFilter}
                  onChange={(e) => setAssignFilter(e.target.value)}
                  className={`w-full bg-white border text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer transition-colors ${
                    assignFilter !== "all"
                      ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
                      : "border-slate-200/80 text-slate-700"
                  }`}
                >
                  <option value="all">Feedback Assign: All</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Unassigned">Unassigned</option>
                </select>

                <SearchableMemberSelect
                  value={feedbackAssignedMemberFilter}
                  onChange={(val) => setFeedbackAssignedMemberFilter(val)}
                  options={feedbackFilterMembers}
                  prefixLabel="Feedback Member"
                  title="Feedback Assigned Team Member"
                />

                <select
                  value={feedbackStatusFilter}
                  onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                  className={`w-full bg-white border text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer transition-colors ${
                    feedbackStatusFilter !== "all"
                      ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
                      : "border-slate-200/80 text-slate-700"
                  }`}
                >
                  <option value="all">Feedback Status: All</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>

                <select
                  value={feedbackDetailFilter}
                  onChange={(e) => setFeedbackDetailFilter(e.target.value)}
                  className={`w-full bg-white border text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer transition-colors ${
                    feedbackDetailFilter !== "all"
                      ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
                      : "border-slate-200/80 text-slate-700"
                  }`}
                >
                  <option value="all">Feedback Detail: All</option>
                  <option value="N/R">N/R</option>
                  <option value="Off">Off</option>
                  <option value="Busy">Busy</option>
                  <option value="Irregular">Irregular</option>
                  <option value="Satisfied">Satisfied</option>
                  <option value="Class Problem">Class Problem</option>
                  <option value="Syllabus Problem">Syllabus Problem</option>
                  <option value="Notify Later">Notify Later</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Row 3: Date Filters & Action Tools */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between pt-2 border-t border-slate-200/60">
                {/* Date Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-indigo-700 font-bold text-[11px] justify-center sm:justify-start w-full sm:w-auto">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Date Filter:</span>
                  </div>

                  {/* Target Date Type Selection */}
                  <select
                    value={dateTypeFilter}
                    onChange={(e) =>
                      setDateTypeFilter(
                        e.target.value as "all" | "live" | "feedback",
                      )
                    }
                    className="w-full sm:w-auto bg-white border border-slate-200/80 text-xs font-bold text-slate-700 px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-xs cursor-pointer"
                  >
                    <option value="all">
                      All
                    </option>
                    <option value="live">Live Instruction</option>
                    <option value="feedback">Feedback</option>
                  </select>

                  <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-xs shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 w-full">
                      <span className="text-[10px] font-black uppercase text-indigo-600 shrink-0">
                        From
                      </span>
                      <input
                        type="date"
                        value={fromDateFilter}
                        onChange={(e) => setFromDateFilter(e.target.value)}
                        title="From Date"
                        className="bg-transparent text-xs font-bold focus:outline-none text-slate-700 cursor-pointer w-full"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-xs shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 w-full">
                      <span className="text-[10px] font-black uppercase text-indigo-600 shrink-0">
                        To
                      </span>
                      <input
                        type="date"
                        value={toDateFilter}
                        onChange={(e) => setToDateFilter(e.target.value)}
                        title="To Date"
                        className="bg-transparent text-xs font-bold focus:outline-none text-slate-700 cursor-pointer w-full"
                      />
                    </div>
                  </div>

                  {/* Reset All Filters Button */}
                  {(searchQuery ||
                    campusFilter !== "all" ||
                    liveStatusFilter !== "all" ||
                    feedbackStatusFilter !== "all" ||
                    feedbackDetailFilter !== "all" ||
                    classFilter !== "all" ||
                    assignFilter !== "all" ||
                    liveAssignFilter !== "all" ||
                    liveAssignedMemberFilter !== "all" ||
                    feedbackAssignedMemberFilter !== "all" ||
                    dateTypeFilter !== "all" ||
                    fromDateFilter ||
                    toDateFilter ||
                    selectedBranches.length > 0) && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setCampusFilter("all");
                        setLiveStatusFilter("all");
                        setFeedbackStatusFilter("all");
                        setFeedbackDetailFilter("all");
                        setClassFilter("all");
                        setAssignFilter("all");
                        setLiveAssignFilter("all");
                        setLiveAssignedMemberFilter("all");
                        setFeedbackAssignedMemberFilter("all");
                        setDateTypeFilter("all");
                        setFromDateFilter("");
                        setToDateFilter("");
                        setSelectedBranches([]);
                        setBranchSearchQuery("");
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 transition-colors shadow-xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>

                {/* Right Action Tools */}
                {(activeSubTab === "management" ||
                  activeSubTab === "my-tasks") && (
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/40 w-full sm:w-auto">
                    {canUpload && (
                      <button
                        onClick={() => setShowOnlyWithImages(!showOnlyWithImages)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs whitespace-nowrap ${
                          showOnlyWithImages
                            ? "bg-indigo-600 text-white shadow-indigo-200"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{showOnlyWithImages ? "With Images" : "Only Images"}</span>
                      </button>
                    )}
                    <button
                      onClick={handleExportToExcel}
                      disabled={isExporting}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-emerald-200 whitespace-nowrap cursor-pointer"
                      title="Export filtered call tasks to Excel"
                    >
                      {isExporting ? (
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{isExporting ? "Exporting..." : "Export"}</span>
                    </button>
                    {showManagementTabs && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsRangeModalOpen(true)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs whitespace-nowrap"
                        >
                          <UserPlus className="w-3.5 h-3.5 shrink-0" />
                          <span>By SL Range</span>
                        </button>
                        {(currentUser.role === "manager" || isCoordinator || canUpload) &&
                          selectedTasksAreAllFeedbackUnassigned && (
                            <button
                              onClick={() => setIsBulkAssignModalOpen(true)}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs whitespace-nowrap"
                            >
                              <UserPlus className="w-3.5 h-3.5 shrink-0" />
                              <span>Assign Feedback</span>
                            </button>
                          )}
                      </div>
                    )}
                    {selectedTasks.length > 0 &&
                      tasks.some(
                        (t) =>
                          selectedTasks.includes(t.id) &&
                          (t.assignedToPin ||
                            t.liveAssignedToPin ||
                            t.liveInstructorPin),
                      ) && (
                        <button
                          onClick={() => {
                            setUnassignTarget({ type: "bulk" });
                            setIsUnassignModalOpen(true);
                          }}
                          className="flex-1 sm:flex-none px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap animate-in fade-in slide-in-from-right-2"
                        >
                          <UserMinus className="w-3.5 h-3.5 shrink-0" />
                          <span>Unassign Selected</span>
                        </button>
                      )}
                  </div>
                )}
              </div>
            </div>

            <div
              ref={tableContainerRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className="overflow-x-auto cursor-grab active:cursor-grabbing scrollbar-hide"
              style={{ scrollBehavior: isDragging ? "auto" : "smooth" }}
            >
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {(activeSubTab === "management" ||
                      activeSubTab === "my-tasks") &&
                      currentUser.role !== "member" && (
                      <th className="p-4 w-10 ">
                        <input
                          type="checkbox"
                          checked={
                            paginatedTasks.length > 0 &&
                            paginatedTasks.every((t) =>
                              selectedTasks.includes(t.id),
                            )
                          }
                          onChange={() => {
                            const isAllVisibleSelected =
                              paginatedTasks.length > 0 &&
                              paginatedTasks.every((t) =>
                                selectedTasks.includes(t.id),
                              );
                            if (isAllVisibleSelected) {
                              setSelectedTasks((prev) =>
                                prev.filter(
                                  (id) =>
                                    !paginatedTasks.some((t) => t.id === id),
                                ),
                              );
                            } else {
                              setSelectedTasks((prev) => {
                                const newSelection = new Set(prev);
                                paginatedTasks.forEach((t) =>
                                  newSelection.add(t.id),
                                );
                                return Array.from(newSelection);
                              });
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 "
                        />
                      </th>
                    )}
                    <th className="p-4 w-12 text-center">SL</th>
                    <th className="p-4 text-center">Full Name</th>
                    <th className="p-4 text-center">Nick Name</th>
                    <th className="p-4 text-center">Contact</th>
                    <th className="p-4 text-center">Branch</th>
                    <th className="p-4 text-center">Class</th>
                    <th className="p-4 text-center">Central Merit</th>
                    <th className="p-4 text-center">Campus</th>
                    <th className="p-4 text-center">Live Instruction Status</th>
                    <th className="p-4 text-center">Live Instruction Date</th>
                    <th className="p-4 text-center">Live Instruction Assign Status</th>
                    <th className="p-4 text-center">Live Instruction Assigned Member</th>
                    <th className="p-4 text-center">Live Instructor Name</th>
                    <th className="p-4 text-center">Feedback Status</th>
                    <th className="p-4 text-center">Feedback Date</th>
                    <th className="p-4 text-center">Feedback Assign Status</th>
                    <th className="p-4 text-center">Feedback Assigned Team Member</th>
                    <th className="p-4 text-center">Assigned to Coordinator</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={
                          (activeSubTab === "management" ||
                            activeSubTab === "my-tasks") &&
                          currentUser.role !== "member"
                            ? 20
                            : 19
                        }
                        className="p-16 text-center"
                      >
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="relative">
                            <RotateCcw className="w-10 h-10 text-indigo-600 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-5 h-5 bg-white rounded-full" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-black text-slate-800 uppercase tracking-widest animate-pulse">
                              Loading tasks...
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                              It will take less than 2 min, Keep Patience
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          (activeSubTab === "management" ||
                            activeSubTab === "my-tasks") &&
                          currentUser.role !== "member"
                            ? 20
                            : 19
                        }
                        className="p-8 text-center text-slate-400 font-medium italic"
                      >
                        No tasks found.
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((task, index) => (
                      <motion.tr
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.01 }}
                        key={task.id}
                        className={`hover:bg-slate-50/30 transition-colors ${selectedTasks.includes(task.id) ? "bg-indigo-50/20" : ""}`}
                      >
                        {(activeSubTab === "management" ||
                          activeSubTab === "my-tasks") &&
                          currentUser.role !== "member" && (
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedTasks.includes(task.id)}
                              onChange={() => toggleTaskSelection(task.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                        )}
                        <td className="p-4 font-black text-slate-400">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="p-4 select-text">
                          <div
                            className="font-bold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer select-text"
                            onClick={() => {
                              const sel = window.getSelection()?.toString();
                              if (sel && sel.trim().length > 0) return;
                              openTaskModal(task);
                            }}
                          >
                            {task.studentName || "-"}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1.5 select-text">
                            <span className="text-slate-400 font-bold select-none">Reg:</span>
                            <span
                              className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md select-text cursor-text border border-indigo-200/80 hover:bg-indigo-100/80 transition-colors inline-block"
                              title="Click & drag mouse cursor to select Student Reg No"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {task.registrationNo}
                            </span>
                            <button
                              type="button"
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                              title="Copy Registration Number"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(task.registrationNo);
                                toast.success(`Copied Reg No: ${task.registrationNo}`);
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700">
                            {task.nickName || "-"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-300 w-4">
                                S:
                              </span>
                              {task.mobilePersonal ? (
                                <a
                                  href={`tel:${task.mobilePersonal}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-bold text-slate-700 hover:text-indigo-600 hover:underline flex items-center gap-1 group transition-colors"
                                  title={`Call Student: ${task.mobilePersonal}`}
                                >
                                  <span>{task.mobilePersonal}</span>
                                  <Phone className="w-2.5 h-2.5 text-indigo-500 opacity-60 group-hover:opacity-100 shrink-0" />
                                </a>
                              ) : (
                                <span className="font-medium text-slate-400">-</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-300 w-4">
                                F:
                              </span>
                              {task.mobileFather ? (
                                <a
                                  href={`tel:${task.mobileFather}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-bold text-slate-700 hover:text-indigo-600 hover:underline flex items-center gap-1 group transition-colors"
                                  title={`Call Father: ${task.mobileFather}`}
                                >
                                  <span>{task.mobileFather}</span>
                                  <Phone className="w-2.5 h-2.5 text-indigo-500 opacity-60 group-hover:opacity-100 shrink-0" />
                                </a>
                              ) : (
                                <span className="font-medium text-slate-400">-</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-300 w-4">
                                M:
                              </span>
                              {task.mobileMother ? (
                                <a
                                  href={`tel:${task.mobileMother}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-bold text-slate-700 hover:text-indigo-600 hover:underline flex items-center gap-1 group transition-colors"
                                  title={`Call Mother: ${task.mobileMother}`}
                                >
                                  <span>{task.mobileMother}</span>
                                  <Phone className="w-2.5 h-2.5 text-indigo-500 opacity-60 group-hover:opacity-100 shrink-0" />
                                </a>
                              ) : (
                                <span className="font-medium text-slate-400">-</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-700">
                            {task.branch || "-"}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="font-bold text-indigo-600 bg-indigo-50/60 border border-indigo-100/80 px-2.5 py-1 rounded-lg inline-block text-[11px] whitespace-nowrap">
                            {task.className || "-"}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {task.centralMerit || task.meritPosition ? (
                            <div className="font-mono font-bold text-amber-800 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-lg inline-block text-[11px] select-text">
                              {task.centralMerit || task.meritPosition}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-bold">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="font-extrabold text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded-md border border-indigo-100 inline-block text-[11px] whitespace-nowrap">
                            {getTaskCampus(task) || "Unassigned"}
                          </div>
                        </td>
                        <td
                          className="p-4 cursor-pointer"
                          onClick={() => openTaskModal(task, "live")}
                        >
                          <div
                            className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase hover:opacity-80 transition-opacity ${
                              task.liveInstructionStatus === "Completed"
                                ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20"
                                : "bg-amber-50 text-amber-600 ring-1 ring-amber-500/20"
                            }`}
                          >
                            {task.liveInstructionStatus}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-mono text-slate-600 text-[11px]">
                            {task.liveInstructionSubmitDate || "-"}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div
                            className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                              (task.liveAssignedToPin &&
                                !mentorPins.has(task.liveAssignedToPin)) ||
                              task.liveInstructorPin
                                ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20"
                                : "bg-rose-50 text-rose-600 ring-1 ring-rose-500/20"
                            }`}
                          >
                            {(task.liveAssignedToPin &&
                              !mentorPins.has(task.liveAssignedToPin)) ||
                            task.liveInstructorPin
                              ? "Assigned"
                              : "Unassigned"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700 text-[10px]">
                            {task.liveAssignedToPin &&
                            mentorPins.has(task.liveAssignedToPin)
                              ? "-"
                              : task.liveAssignedToName || "-"}
                          </div>
                          {task.liveAssignedToPin &&
                            !mentorPins.has(task.liveAssignedToPin) && (
                              <div className="text-[9px] text-slate-400 font-mono">
                                Pin: {task.liveAssignedToPin}
                              </div>
                            )}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700 text-[10px]">
                            {task.liveInstructorPin &&
                            mentorPins.has(task.liveInstructorPin)
                              ? "-"
                              : task.liveInstructorName || "-"}
                          </div>
                          {task.liveInstructorPin &&
                            !mentorPins.has(task.liveInstructorPin) && (
                              <div className="text-[9px] text-slate-400 font-mono">
                                Pin: {task.liveInstructorPin}
                              </div>
                            )}
                          {task.isLiveInstructorTeacher && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[8px] font-bold">
                              Teacher
                            </span>
                          )}
                        </td>
                        <td
                          className="p-4 cursor-pointer"
                          onClick={() => openTaskModal(task, "feedback")}
                        >
                          <div
                            className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase hover:opacity-80 transition-opacity ${
                              task.feedbackStatus === "Completed"
                                ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20"
                                : "bg-amber-50 text-amber-600 ring-1 ring-amber-500/20"
                            }`}
                          >
                            {task.feedbackStatus}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-mono text-slate-600 text-[11px]">
                            {task.feedbackSubmitDate || "-"}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div
                            className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                              task.assignedToPin
                                ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20"
                                : "bg-rose-50 text-rose-600 ring-1 ring-rose-500/20"
                            }`}
                          >
                            {task.assignedToPin
                              ? "Assigned"
                              : "Unassigned"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700 text-[10px]">
                            {task.assignedToName || "-"}
                          </div>
                          {task.assignedToPin && (
                            <div className="text-[9px] text-slate-400 font-mono">
                              Pin: {task.assignedToPin}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-indigo-600 text-[10px]">
                            {task.liveAssignedToPin &&
                            mentorPins.has(task.liveAssignedToPin)
                              ? task.liveAssignedToName
                              : task.assignedToPin
                                ? task.assignedToName
                                : "-"}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            {showManagementTabs &&
                              (() => {
                                const { canAssignFeedback, canAssignLive } =
                                  getTaskAssignPermissions(
                                    task,
                                    currentUser,
                                    canUpload,
                                  );

                                if (!canAssignFeedback && !canAssignLive) {
                                  return null;
                                }

                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAssignTarget(task);
                                      if (canAssignFeedback && canAssignLive) {
                                        setAssignChoice("both");
                                      } else if (canAssignFeedback) {
                                        setAssignChoice("feedback");
                                      } else {
                                        setAssignChoice("live");
                                      }
                                      setIsAssignModalOpen(true);
                                    }}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="Assign Task"
                                  >
                                    <UserPlus className="w-4 h-4" />
                                  </button>
                                );
                              })()}
                            {(task.assignedToPin ||
                              task.liveAssignedToPin ||
                              task.liveInstructorPin) &&
                              showManagementTabs && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnassignTask(task.id);
                                  }}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Unassign Task"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTaskModal(task);
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canUpload && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Task"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    Rows per page:
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-2 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="500">500</option>
                    <option value="1000">1000</option>
                    <option value={Math.max(filteredTasks.length, 1)}>
                      All
                    </option>
                  </select>
                </div>

                {/* Page Range Info */}
                <div className="text-xs font-bold text-slate-500 flex flex-wrap items-center gap-2 hidden sm:flex">
                  <span>
                    Showing{" "}
                    <span className="text-indigo-600 font-extrabold">
                      {filteredTasks.length > 0
                        ? (currentPage - 1) * pageSize + 1
                        : 0}
                    </span>{" "}
                    to{" "}
                    <span className="text-indigo-600 font-extrabold">
                      {Math.min(currentPage * pageSize, filteredTasks.length)}
                    </span>{" "}
                    of{" "}
                    <span className="text-slate-800 font-black">
                      {filteredTasks.length}
                    </span>{" "}
                    students
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>
                    Page{" "}
                    <span className="text-indigo-600 font-extrabold">
                      {totalPages > 0 ? currentPage : 0}
                    </span>{" "}
                    of{" "}
                    <span className="text-slate-800 font-black">
                      {totalPages}
                    </span>
                  </span>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      title="First Page"
                      className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:text-indigo-600 hover:border-indigo-600 transition-all shadow-sm"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      title="Previous Page"
                      className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:text-indigo-600 hover:border-indigo-600 transition-all shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Quick Page Number Pills */}
                    <div className="flex items-center gap-1 mx-1">
                      {(() => {
                        const pageNumbers: (number | string)[] = [];
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++)
                            pageNumbers.push(i);
                        } else {
                          pageNumbers.push(1);
                          if (currentPage > 3) pageNumbers.push("...");
                          const start = Math.max(2, currentPage - 1);
                          const end = Math.min(totalPages - 1, currentPage + 1);
                          for (let i = start; i <= end; i++)
                            pageNumbers.push(i);
                          if (currentPage < totalPages - 2)
                            pageNumbers.push("...");
                          pageNumbers.push(totalPages);
                        }

                        return pageNumbers.map((p, idx) => {
                          if (typeof p === "string") {
                            return (
                              <span
                                key={`dots-${idx}`}
                                className="px-1 text-xs text-slate-400 font-bold"
                              >
                                ...
                              </span>
                            );
                          }
                          return (
                            <button
                              key={`page-${p}`}
                              onClick={() => setCurrentPage(p)}
                              className={`min-w-[28px] h-7 px-2 text-xs font-bold rounded-xl transition-all ${
                                currentPage === p
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600"
                              }`}
                            >
                              {p}
                            </button>
                          );
                        });
                      })()}
                    </div>

                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      title="Next Page"
                      className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:text-indigo-600 hover:border-indigo-600 transition-all shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      title="Last Page"
                      className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:text-indigo-600 hover:border-indigo-600 transition-all shadow-sm"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Jump to Page Form */}
                  <form
                    onSubmit={handleJumpToPage}
                    className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm"
                  >
                    <span className="text-[11px] font-bold text-slate-500 pl-2">
                      Go to page:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value)}
                      placeholder={String(currentPage)}
                      className="w-12 px-1.5 py-0.5 text-xs font-bold text-center bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-all"
                    >
                      Go
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Detail Modal for Feedback */}
      <AnimatePresence>
        {taskModalOpen && editingTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl my-auto space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <span>Task Details & Management</span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                      SL: {editingTask.sl}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Student:{" "}
                    <span className="font-bold text-slate-800">
                      {modalFormData.studentName || "N/A"}
                    </span>{" "}
                    ({modalFormData.nickName || "N/A"}) | Reg:{" "}
                    <span className="font-bold text-slate-800">
                      {modalFormData.registrationNo || "N/A"}
                    </span>{" "}
                    | Mobile:{" "}
                    {modalFormData.mobilePersonal ? (
                      <a
                        href={`tel:${modalFormData.mobilePersonal}`}
                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
                        title={`Call Student Mobile: ${modalFormData.mobilePersonal}`}
                      >
                        <span>{modalFormData.mobilePersonal}</span>
                        <Phone className="w-3 h-3 text-indigo-500" />
                      </a>
                    ) : (
                      <span className="font-bold text-slate-800">N/A</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setTaskModalOpen(false)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Partition Tabs */}
              {(() => {
                const isAssignedLive =
                  canUpload ||
                  currentUser.role !== "member" ||
                  editingTask?.liveAssignedToPin === currentUser.pin ||
                  editingTask?.liveInstructorPin === currentUser.pin ||
                  (!editingTask?.liveAssignedToPin && !editingTask?.liveInstructorPin);
                const isAssignedFeedback =
                  canUpload ||
                  currentUser.role !== "member" ||
                  editingTask?.assignedToPin === currentUser.pin ||
                  !editingTask?.assignedToPin;

                const visibleTabs = [];
                if (isAssignedLive) visibleTabs.push("live");
                if (isAssignedFeedback) visibleTabs.push("feedback");
                visibleTabs.push("student");

                const gridColsClass =
                  visibleTabs.length === 3
                    ? "grid-cols-3"
                    : visibleTabs.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-1";

                return (
                  <div
                    className={`grid ${gridColsClass} gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80`}
                  >
                    {isAssignedLive && (
                      <button
                        type="button"
                        onClick={() => setModalTab("live")}
                        className={`flex items-center justify-center gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-black transition-all ${
                          modalTab === "live"
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                        }`}
                      >
                        <Headphones className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Live Instruction</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold hidden sm:inline-block ${
                            modalTab === "live"
                              ? "bg-white/20 text-white"
                              : modalFormData.liveInstructionStatus ===
                                  "Completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {modalFormData.liveInstructionStatus === "Completed"
                            ? "Done"
                            : "Pending"}
                        </span>
                      </button>
                    )}

                    {isAssignedFeedback && (
                      <button
                        type="button"
                        onClick={() => setModalTab("feedback")}
                        className={`flex items-center justify-center gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-black transition-all ${
                          modalTab === "feedback"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Feedback</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold hidden sm:inline-block ${
                            modalTab === "feedback"
                              ? "bg-white/20 text-white"
                              : modalFormData.feedbackStatus === "Completed"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {modalFormData.feedbackStatus === "Completed"
                            ? "Done"
                            : "Pending"}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setModalTab("student")}
                      className={`flex items-center justify-center gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-black transition-all ${
                        modalTab === "student"
                          ? "bg-slate-800 text-white shadow-md"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      <UserIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Student Info</span>
                    </button>
                  </div>
                );
              })()}

              {/* Tab 1: Live Instruction Section */}
              {modalTab === "live" && (
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Headphones className="w-4 h-4 text-emerald-600" />
                      Live Instruction Details
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        modalFormData.liveInstructionStatus === "Completed"
                          ? "bg-emerald-200 text-emerald-900 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {modalFormData.liveInstructionStatus || "Pending"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-wider mb-1">
                        Live Instruction Status
                      </label>
                      <select
                        value={modalFormData.liveInstructionStatus || "Pending"}
                        onChange={(e) => {
                          const val = e.target.value as "Pending" | "Completed";
                          const today = getTodayLocalDate();
                          setModalFormData({
                            ...modalFormData,
                            liveInstructionStatus: val,
                            liveInstructionSubmitDate:
                              val === "Completed"
                                ? modalFormData.liveInstructionSubmitDate ||
                                  today
                                : undefined,
                          });
                        }}
                        className="w-full bg-white border border-emerald-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 cursor-pointer"
                      >
                        <option 
                          value="Pending" 
                          disabled={currentUser?.role !== "manager" && editingTask?.liveInstructionStatus === "Completed"}
                        >
                          Pending
                        </option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-wider mb-1">
                        Live Instruction Date
                      </label>
                      <input
                        type="date"
                        value={modalFormData.liveInstructionSubmitDate || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            liveInstructionSubmitDate: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-emerald-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 cursor-pointer"
                      />
                    </div>

                    {(canUpload ||
                      (editingTask &&
                        getTaskAssignPermissions(
                          editingTask,
                          currentUser,
                          canUpload,
                        ).canAssignLive)) && (
                      <div className="sm:col-span-2 ">
                        <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-wider mb-1 ">
                          Live Instruction Assigned Member
                        </label>
                        <select
                          value={modalFormData.liveAssignedToPin || ""}
                          onChange={(e) => {
                            const selectedPin = e.target.value;
                            const allPeople = [...members, ...mentors];
                            const foundMember = allPeople.find(
                              (m) => m.pin === selectedPin,
                            );
                            setModalFormData({
                              ...modalFormData,
                              liveAssignedToPin: foundMember
                                ? foundMember.pin
                                : undefined,
                              liveAssignedToName: foundMember
                                ? foundMember.name
                                : undefined,
                            });
                          }}
                          className="w-full bg-white border border-emerald-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {renderMemberOptions(getValidMembers([editingTask]))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-wider mb-1">
                        Live Instructor Name
                      </label>
                      <input
                        type="text"
                        value={modalFormData.liveInstructorName || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            liveInstructorName: e.target.value,
                          })
                        }
                        placeholder="Instructor Name"
                        className="w-full bg-white border border-emerald-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-wider mb-1">
                        Live Instructor PIN
                      </label>
                      <input
                        type="text"
                        value={modalFormData.liveInstructorPin || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            liveInstructorPin: e.target.value,
                          })
                        }
                        placeholder="Instructor PIN"
                        className="w-full bg-white border border-emerald-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        id="modalTeacherCheckbox"
                        checked={modalFormData.isLiveInstructorTeacher || false}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            isLiveInstructorTeacher: e.target.checked,
                          })
                        }
                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label
                        htmlFor="modalTeacherCheckbox"
                        className="text-xs font-bold text-emerald-900 cursor-pointer"
                      >
                        Teacher
                      </label>
                    </div>

                    <div className="sm:col-span-2 space-y-2 border-t border-emerald-200/60 pt-3">
                      <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-wider">
                        Exam Script Images ({parseMultipleImages(modalFormData.liveInstructionImage).length} Attached)
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-8 flex gap-1">
                          <input
                            type="text"
                            placeholder="Image URL (Link)"
                            value={modalFormData.liveInstructionLink || ""}
                            onChange={(e) =>
                              setModalFormData({
                                ...modalFormData,
                                liveInstructionLink: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && modalFormData.liveInstructionLink?.trim()) {
                                const current = parseMultipleImages(modalFormData.liveInstructionImage);
                                const updated = [...current, modalFormData.liveInstructionLink.trim()];
                                setModalFormData({
                                  ...modalFormData,
                                  liveInstructionImage: JSON.stringify(updated),
                                  liveInstructionLink: "",
                                });
                                toast.success("Image URL added to modal");
                              }
                            }}
                            className="flex-grow bg-white border border-emerald-200 text-[10px] font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (modalFormData.liveInstructionLink?.trim()) {
                                const current = parseMultipleImages(modalFormData.liveInstructionImage);
                                const updated = [...current, modalFormData.liveInstructionLink.trim()];
                                setModalFormData({
                                  ...modalFormData,
                                  liveInstructionImage: JSON.stringify(updated),
                                  liveInstructionLink: "",
                                });
                                toast.success("Image URL added to modal");
                              }
                            }}
                            className="px-2.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-xl text-[10px] font-black"
                          >
                            Add
                          </button>
                        </div>
                        <div className="sm:col-span-4 relative">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={async (e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                for (const file of Array.from(files) as File[]) {
                                  try {
                                    const imgUrl = await uploadImageToImgBB(file);
                                    const current = parseMultipleImages(
                                      modalFormData.liveInstructionImage,
                                    );
                                    const updated = [...current, imgUrl];
                                    setModalFormData((prev) => ({
                                      ...prev,
                                      liveInstructionImage:
                                        JSON.stringify(updated),
                                    }));
                                  } catch (err) {
                                    console.error(
                                      "Image optimization failed:",
                                      err,
                                    );
                                  }
                                }
                                toast.success(`${files.length} images uploaded`);
                              }
                            }}
                            className="hidden"
                            id="modalExamScriptUpload"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <label
                              htmlFor="modalExamScriptUpload"
                              className="flex items-center justify-center gap-1.5 bg-white border border-emerald-200 text-[10px] font-bold px-3 py-2 rounded-xl hover:bg-emerald-50 cursor-pointer transition-colors text-emerald-700 h-10"
                              title="Click to upload image"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setCameraTarget("modal");
                                setIsCameraOpen(true);
                              }}
                              className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-[10px] font-bold px-3 py-2 rounded-xl hover:bg-emerald-700 transition-colors h-10"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Camera</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Paste area & gallery row */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-2">
                        {/* Dedicated Paste Zone */}
                        <div 
                          onPaste={(e) => handleImagePaste(e, (url) => {
                            const current = parseMultipleImages(modalFormData.liveInstructionImage);
                            const updated = [...current, url];
                            setModalFormData(prev => ({
                              ...prev,
                              liveInstructionImage: JSON.stringify(updated)
                            }));
                          })}
                          className="sm:col-span-5 p-2.5 border-2 border-dashed border-emerald-100 rounded-xl bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer group text-center flex flex-col items-center justify-center"
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <ClipboardIcon className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
                            <span className="text-[8px] font-bold text-emerald-600/70 group-hover:text-emerald-700 leading-tight">
                              Click & Paste Image (Ctrl+V)
                            </span>
                          </div>
                        </div>

                        {/* Modal thumbnail gallery */}
                        <div className="sm:col-span-7 bg-emerald-50/10 p-2 rounded-xl border border-emerald-100 min-h-[56px] flex items-center">
                          {parseMultipleImages(modalFormData.liveInstructionImage).length === 0 ? (
                            <div className="text-[9px] text-emerald-600/50 font-bold text-center w-full">
                              No images attached.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 overflow-x-auto w-full max-h-20 p-0.5">
                              {parseMultipleImages(
                                modalFormData.liveInstructionImage,
                              ).map((imgUrl, idx) => (
                                <div
                                  key={idx}
                                  className="relative group shrink-0"
                                >
                                  {isGoogleDriveLink(imgUrl) ? (
                                    <div
                                      className="w-10 h-10 flex flex-col items-center justify-center bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                                      onClick={() =>
                                        window.open(imgUrl, "_blank")
                                      }
                                      title="View on Google Drive"
                                    >
                                      <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[8px] text-white font-bold">
                                        G
                                      </div>
                                      <span className="text-[6px] font-bold text-blue-600 mt-0.5">
                                        Drive
                                      </span>
                                    </div>
                                  ) : (
                                    <img
                                      src={imgUrl}
                                      alt={`Preview ${idx + 1}`}
                                      className="w-10 h-10 object-cover rounded-lg border border-emerald-200 cursor-pointer hover:opacity-90"
                                      onClick={() => {
                                        setViewingImageUrl(imgUrl);
                                        setIsImageViewerOpen(true);
                                      }}
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = parseMultipleImages(
                                        modalFormData.liveInstructionImage,
                                      );
                                      const updated = current.filter(
                                        (_, i) => i !== idx,
                                      );
                                      setModalFormData({
                                        ...modalFormData,
                                        liveInstructionImage:
                                          JSON.stringify(updated),
                                      });
                                      toast.success("Image removed");
                                    }}
                                    className="absolute -top-1 -right-1 bg-rose-500 text-white p-0.5 rounded-full hover:bg-rose-600 transition-colors shadow"
                                  >
                                    <X className="w-2 h-2" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black text-emerald-900 uppercase tracking-wider mb-1">
                        Live Instruction Comment
                      </label>
                      <textarea
                        value={modalFormData.liveInstructionComment || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            liveInstructionComment: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full bg-white border border-emerald-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 resize-none"
                        placeholder="Enter live instruction comments..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Feedback Section */}
              {modalTab === "feedback" && (
                <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      Feedback Details
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        modalFormData.feedbackStatus === "Completed"
                          ? "bg-indigo-200 text-indigo-900 border border-indigo-300"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {modalFormData.feedbackStatus || "Pending"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-indigo-900 uppercase tracking-wider mb-1">
                        Feedback Status
                      </label>
                      <select
                        value={modalFormData.feedbackStatus || "Pending"}
                        onChange={(e) => {
                          const val = e.target.value as "Pending" | "Completed";
                          const today = getTodayLocalDate();
                          setModalFormData({
                            ...modalFormData,
                            feedbackStatus: val,
                            feedbackSubmitDate:
                              val === "Completed"
                                ? modalFormData.feedbackSubmitDate || today
                                : undefined,
                          });
                        }}
                        className="w-full bg-white border border-indigo-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"
                      >
                        <option 
                          value="Pending" 
                          disabled={currentUser?.role !== "manager" && editingTask?.feedbackStatus === "Completed"}
                        >
                          Pending
                        </option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-indigo-900 uppercase tracking-wider mb-1">
                        Feedback Date
                      </label>
                      <input
                        type="date"
                        value={modalFormData.feedbackSubmitDate || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            feedbackSubmitDate: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-indigo-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"
                      />
                    </div>

                    {(canUpload ||
                      (editingTask &&
                        getTaskAssignPermissions(
                          editingTask,
                          currentUser,
                          canUpload,
                        ).canAssignFeedback)) && (
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black text-indigo-900 uppercase tracking-wider mb-1">
                          Feedback Assigned Member
                        </label>
                        <select
                          value={modalFormData.assignedToPin || ""}
                          onChange={(e) => {
                            const selectedPin = e.target.value;
                            const allPeople = [...members, ...mentors];
                            const foundMember = allPeople.find(
                              (m) => m.pin === selectedPin,
                            );
                            setModalFormData({
                              ...modalFormData,
                              assignedToPin: foundMember
                                ? foundMember.pin
                                : undefined,
                              assignedToName: foundMember
                                ? foundMember.name
                                : undefined,
                            });
                          }}
                          className="w-full bg-white border border-indigo-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {renderMemberOptions(getValidMembers([editingTask]))}
                        </select>
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black text-indigo-900 uppercase tracking-wider mb-1">
                        Feedback Detail / Option
                      </label>
                      <select
                        value={
                          ["N/R", "Off", "Busy", "Irregular", "Satisfied", "Class Problem", "Syllabus Problem", "Notify Later"].includes(modalFormData.feedbackComment || "")
                            ? modalFormData.feedbackComment
                            : "Others"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "Others") {
                            setModalFormData({
                              ...modalFormData,
                              feedbackComment: ["N/R", "Off", "Busy", "Irregular", "Satisfied", "Class Problem", "Syllabus Problem", "Notify Later"].includes(modalFormData.feedbackComment || "") ? "" : modalFormData.feedbackComment,
                            });
                          } else {
                            setModalFormData({
                              ...modalFormData,
                              feedbackComment: val,
                            });
                          }
                        }}
                        className="w-full bg-white border border-indigo-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"
                      >
                        <option value="N/R">🟢 N/R</option>
                        <option value="Off">🔴 Off</option>
                        <option value="Busy">🟤 Busy</option>
                        <option value="Irregular">🟣 Irregular</option>
                        <option value="Satisfied">🟢 Satisfied</option>
                        <option value="Class Problem">🟠 Class Problem</option>
                        <option value="Syllabus Problem">📘 Syllabus Problem</option>
                        <option value="Notify Later">🟡 Notify Later</option>
                        <option value="Others">✏️ Others (Custom Comment)</option>
                      </select>
                    </div>

                    {(!["N/R", "Off", "Busy", "Irregular", "Satisfied", "Class Problem", "Syllabus Problem", "Notify Later"].includes(modalFormData.feedbackComment || "")) && (
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black text-indigo-900 uppercase tracking-wider mb-1">
                          Feedback Comment (Others)
                        </label>
                        <textarea
                          value={modalFormData.feedbackComment || ""}
                          onChange={(e) =>
                            setModalFormData({
                              ...modalFormData,
                              feedbackComment: e.target.value,
                            })
                          }
                          rows={3}
                          className="w-full bg-white border border-indigo-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 resize-none"
                          placeholder="Enter feedback comments..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Student Information Section */}
              {modalTab === "student" && (
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                    <UserIcon className="w-4 h-4 text-slate-600" />
                    <span>
                      Student Basic Information 
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Full Name 
                      </label>
                      <input
                        type="text"
                        value={modalFormData.studentName || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            studentName: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Nick Name 
                      </label>
                      <input
                        type="text"
                        value={modalFormData.nickName || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            nickName: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Registration No 
                      </label>
                      <input
                        type="text"
                        value={modalFormData.registrationNo || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            registrationNo: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Roll No 
                      </label>
                      <input
                        type="text"
                        value={modalFormData.rollNo || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            rollNo: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Central Merit
                      </label>
                      <input
                        type="text"
                        value={modalFormData.centralMerit || modalFormData.meritPosition || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            centralMerit: e.target.value,
                            meritPosition: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        placeholder="e.g. 1024"
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Gender
                      </label>
                      <input
                        type="text"
                        value={modalFormData.gender || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            gender: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={modalFormData.branch || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            branch: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Class Name
                      </label>
                      <input
                        type="text"
                        value={modalFormData.className || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            className: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Institute
                      </label>
                      <input
                        type="text"
                        value={modalFormData.institute || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            institute: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-black text-slate-500 uppercase">
                          Personal Mobile
                        </label>
                        {modalFormData.mobilePersonal && (
                          <a
                            href={`tel:${modalFormData.mobilePersonal}`}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                            title={`Call Personal Mobile: ${modalFormData.mobilePersonal}`}
                          >
                            <Phone className="w-2.5 h-2.5" /> Call
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        value={modalFormData.mobilePersonal || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            mobilePersonal: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Father's Name
                      </label>
                      <input
                        type="text"
                        value={modalFormData.fatherName || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            fatherName: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-black text-slate-500 uppercase">
                          Father's Mobile 
                        </label>
                        {modalFormData.mobileFather && (
                          <a
                            href={`tel:${modalFormData.mobileFather}`}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                            title={`Call Father's Mobile: ${modalFormData.mobileFather}`}
                          >
                            <Phone className="w-2.5 h-2.5" /> Call
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        value={modalFormData.mobileFather || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            mobileFather: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Mother's Name 
                      </label>
                      <input
                        type="text"
                        value={modalFormData.motherName || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            motherName: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-black text-slate-500 uppercase">
                          Mother's Mobile
                        </label>
                        {modalFormData.mobileMother && (
                          <a
                            href={`tel:${modalFormData.mobileMother}`}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                            title={`Call Mother's Mobile: ${modalFormData.mobileMother}`}
                          >
                            <Phone className="w-2.5 h-2.5" /> Call
                          </a>
                        )}
                      </div>
                      <input
                        type="text"
                        value={modalFormData.mobileMother || ""}
                        onChange={(e) =>
                          setModalFormData({
                            ...modalFormData,
                            mobileMother: e.target.value,
                          })
                        }
                        disabled={!canUpload}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                {canUpload && (
                  <button
                    onClick={() => {
                      handleDeleteTask(editingTask.id);
                    }}
                    className="px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
                  >
                    Delete Task
                  </button>
                )}

                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => setTaskModalOpen(false)}
                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const newLiveStatus = modalFormData.liveInstructionStatus;
                      const newFeedbackStatus = modalFormData.feedbackStatus;

                      if (modalTab === "live") {
                        if (currentUser?.role !== "manager" && (newLiveStatus === "Pending" || newLiveStatus !== "Completed")) {
                          toast.error(
                            "Cannot save while Live Instruction Status is Pending. Please change status to 'Completed'.",
                          );
                          return;
                        }
                      }

                      if (modalTab === "feedback") {
                        const comment = modalFormData.feedbackComment || "";
                        const isExempt = ["N/R", "Off", "Busy"].includes(comment);
                        if (!isExempt) {
                          if (
                            currentUser?.role !== "manager" &&
                            (newFeedbackStatus === "Pending" ||
                            newFeedbackStatus !== "Completed")
                          ) {
                            toast.error(
                              "Cannot save while Feedback Status is Pending. Please change status to 'Completed' (unless comment is N/R, Off, or Busy).",
                            );
                            return;
                          }
                        }
                      }

                      let updatedData = { ...modalFormData };
                      if (!canUpload && currentUser.role === "member") {
                        if (
                          newLiveStatus === "Completed" &&
                          !updatedData.liveInstructorName
                        ) {
                          updatedData.liveInstructorName = currentUser.name;
                          updatedData.liveInstructorPin = currentUser.pin;
                        }
                      }

                      if (newLiveStatus === "Completed") {
                        if (!updatedData.liveInstructionSubmitDate) {
                          toast.error(
                            "Please provide the Live Instruction date",
                          );
                          return;
                        }
                        if (!updatedData.liveInstructionComment?.trim()) {
                          toast.error(
                            "Please write the Live Instruction comment",
                          );
                          return;
                        }
                        if (
                          !updatedData.liveInstructorName?.trim() ||
                          !updatedData.liveInstructorPin?.trim()
                        ) {
                          toast.error(
                            "Instructor name and PIN are required for Live Instruction",
                          );
                          return;
                        }
                      }

                      if (newFeedbackStatus === "Completed") {
                        if (!updatedData.feedbackSubmitDate) {
                          toast.error(
                            "Please provide the Feedback date",
                          );
                          return;
                        }
                        if (!updatedData.feedbackComment?.trim()) {
                          toast.error(
                            "Please write the Feedback comment",
                          );
                          return;
                        }
                        if (!updatedData.assignedToPin) {
                          updatedData.assignedToPin = currentUser.pin;
                          updatedData.assignedToName = currentUser.name;
                        }
                      }

                      const liveSubmitDate =
                        newLiveStatus === "Completed"
                          ? updatedData.liveInstructionSubmitDate
                          : undefined;

                      const feedbackSubmitDate =
                        newFeedbackStatus === "Completed"
                          ? updatedData.feedbackSubmitDate
                          : undefined;

                      handleUpdateTask(editingTask.id, {
                        ...updatedData,
                        liveInstructionSubmitDate: liveSubmitDate,
                        feedbackSubmitDate: feedbackSubmitDate,
                        completedAt:
                          newLiveStatus === "Completed" &&
                          newFeedbackStatus === "Completed"
                            ? editingTask.completedAt ||
                              new Date().toISOString()
                            : undefined,
                      });
                      setTaskModalOpen(false);
                      toast.success("Call updated successfully");
                    }}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-indigo-100"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Range Assignment Modal */}
      <AnimatePresence>
        {isRangeModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-5 md:p-6 w-full max-w-2xl lg:max-w-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    By SL Range Assignment
                  </h3>
                  {tasksInRange.length > 0 && (
                    <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                      {tasksInRange.length} Task(s) Selected
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsRangeModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto pr-1 flex-1 min-h-0">
                {/* Left Column: Action, SL Range, Assignment Type */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">
                      Select Action
                    </label>
                    <div className="flex gap-2 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
                      {(["assign", "unassign"] as const).map((action) => (
                        <button
                          key={action}
                          onClick={() => setRangeAction(action)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            rangeAction === action
                              ? action === "assign"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-rose-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-800"
                          }`}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                        Start SL
                      </label>
                      <input
                        type="number"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        placeholder="e.g. 1"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                        End SL
                      </label>
                      <input
                        type="number"
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        placeholder="e.g. 100"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  {rangeAction === "assign" && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                        Assignment Type
                      </label>
                      <select
                        value={rangeAssignType}
                        onChange={(e) =>
                          setRangeAssignType(
                            e.target.value as "feedback" | "live" | "both",
                          )
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="both">Both (Feedback & Live Instruction)</option>
                        <option value="feedback">Feedback Call Only</option>
                        <option value="live">Live Instruction Only</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Right Column: Member Selection (Single Select Radio Button + PIN Search) */}
                {rangeAction === "assign" ? (
                  <div className="flex flex-col min-h-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase block">
                        Assign To Member (Single Select)
                      </label>
                      {rangeTargetMembers.length > 0 && (
                        <button
                          onClick={() => setRangeTargetMembers([])}
                          className="text-[10px] font-bold text-rose-600 hover:underline"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    {/* PIN / Name Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={rangeMemberSearch}
                        onChange={(e) => setRangeMemberSearch(e.target.value)}
                        placeholder="Search member by Name or PIN..."
                        className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      />
                      {rangeMemberSearch && (
                        <button
                          type="button"
                          onClick={() => setRangeMemberSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Radio Options List */}
                    <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto bg-slate-50/70 border border-slate-200 rounded-2xl p-2 space-y-1.5">
                      {(() => {
                        const valid = getValidMembers(tasksInRange);
                        const filtered = rangeMemberSearch.trim()
                          ? valid.filter(
                              (m) =>
                                m.name
                                  .toLowerCase()
                                  .includes(rangeMemberSearch.toLowerCase()) ||
                                m.pin
                                  .toLowerCase()
                                  .includes(rangeMemberSearch.toLowerCase()),
                            )
                          : valid;

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-6 text-xs font-medium text-slate-400">
                              No matching team member found
                            </div>
                          );
                        }

                        return filtered.map((m) => {
                          const isSelected = rangeTargetMembers.includes(m.pin);
                          return (
                            <label
                              key={`range-m-${m.pin}`}
                              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                                isSelected
                                  ? "bg-indigo-50/90 border-indigo-300 shadow-xs ring-1 ring-indigo-400/30"
                                  : "bg-white hover:bg-slate-100/70 border-slate-200/60"
                              }`}
                            >
                              <input
                                type="radio"
                                name="rangeTargetMemberRadio"
                                checked={isSelected}
                                onChange={() => setRangeTargetMembers([m.pin])}
                                className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 shrink-0 cursor-pointer"
                              />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {m.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  PIN: {m.pin} {m.campus ? `• ${m.campus}` : ""}
                                </span>
                              </div>
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-rose-50/50 border border-rose-100 rounded-2xl p-6 text-center">
                    <UserMinus className="w-8 h-8 text-rose-500 mb-2" />
                    <span className="text-xs font-bold text-rose-700">
                      Unassignment Mode
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 mt-1">
                      This will unassign all assigned tasks within the specified SL range.
                    </span>
                  </div>
                )}
              </div>

              {/* Footer Execute Button */}
              <div className="pt-3 border-t border-slate-100 mt-3 shrink-0">
                <button
                  onClick={handleRangeAssign}
                  className={`w-full py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md ${
                    rangeAction === "assign"
                      ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-100"
                  }`}
                >
                  Execute{" "}
                  {rangeAction === "assign" ? "Assignment" : "Unassignment"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unassign Confirmation Modal */}
      <AnimatePresence>
        {isUnassignModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-rose-100"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-rose-600 font-black text-sm uppercase tracking-wider">
                  <UserMinus className="w-5 h-5" />
                  <span>Confirm Unassign</span>
                </div>
                <button
                  onClick={() => setIsUnassignModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <p className="text-xs text-slate-600 font-medium mb-4">
                {unassignTarget?.type === "bulk" ? (
                  <span className="block mb-2 font-black text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                 Total   {selectedTasks.length} Persons will be unassigned from the selected tasks.
                  </span>
                ) : unassignTarget?.type === "range" ? (
                  <span className="block mb-2 font-black text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                   {unassignTarget.taskIds?.length || 0} 
                  </span>
                ) : null}
                Select which assignment type do you want to unassign? 
              </p>

              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="unassignChoice"
                    value="feedback"
                    checked={unassignChoice === "feedback"}
                    onChange={() => setUnassignChoice("feedback")}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Feedback Assignment
                    </div>
                    <div className="text-[10px] text-slate-500">
                     
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="unassignChoice"
                    value="live"
                    checked={unassignChoice === "live"}
                    onChange={() => setUnassignChoice("live")}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Live Instruction Assignment
                    </div>
                    <div className="text-[10px] text-slate-500">
                      
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="unassignChoice"
                    value="both"
                    checked={unassignChoice === "both"}
                    onChange={() => setUnassignChoice("both")}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-rose-700">
                      Both Assignments
                    </div>
                    <div className="text-[10px] text-slate-500">
                      
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsUnassignModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmUnassign(unassignChoice)}
                  disabled={isUnassigning}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-100 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isUnassigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Unassigning...</span>
                    </>
                  ) : (
                    <span>Confirm Unassign</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isBulkAssignModalOpen && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-indigo-100"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Assign Feedback
                </h3>
                <button
                  onClick={() => setIsBulkAssignModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <SearchableMemberSelect
                  value={bulkMemberPin}
                  onChange={setBulkMemberPin}
                  options={assignableMembers}
                  prefixLabel="Member"
                  title="Assign to Team Member"
                  showAllOption={false}
                />
              </div>

              <button
                onClick={() => {
                  if (bulkMemberPin) {
                    handleAssignTasks(bulkMemberPin, "feedback");
                    setIsBulkAssignModalOpen(false);
                    setBulkMemberPin("");
                  } else {
                    toast.error("Please select a member");
                  }
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg mt-4"
              >
               Assign
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Individual Assign Modal */}
      <AnimatePresence>
        {isAssignModalOpen && assignTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-indigo-100"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-wider">
                  <UserPlus className="w-5 h-5" />
                  <span>Assign Member (SL: {assignTarget.sl})</span>
                </div>
                <button
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setAssignTarget(null);
                    setAssignTargetMember("");
                    setMemberSearchQuery("");
                    setIsMemberDropdownOpen(false);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                    Assignment Type
                  </label>
                  {(() => {
                    const { canAssignFeedback, canAssignLive } = assignTarget
                      ? getTaskAssignPermissions(
                          assignTarget,
                          currentUser,
                          canUpload,
                        )
                      : { canAssignFeedback: true, canAssignLive: true };

                    return (
                      <select
                        value={
                          !canAssignFeedback && assignChoice === "feedback"
                            ? "live"
                            : !canAssignLive && assignChoice === "live"
                              ? "feedback"
                              : assignChoice
                        }
                        onChange={(e) =>
                          setAssignChoice(e.target.value as any)
                        }
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {canAssignFeedback && (
                          <option value="feedback">Feedback Assign Only</option>
                        )}
                        {canAssignLive && (
                          <option value="live">
                            Live Instruction Assign Only
                          </option>
                        )}
                        {canAssignFeedback && canAssignLive && (
                          <option value="both">
                            Both (Feedback & Live Instruction)
                          </option>
                        )}
                      </select>
                    );
                  })()}
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                    Assign To Member
                  </label>

                  {/* Custom Searchable Dropdown */}
                  {(() => {
                    const validMembers = getValidMembers([assignTarget]);
                    const selectedMember = validMembers.find(
                      (m) => m.pin === assignTargetMember
                    );

                    return (
                      <div className="relative">
                        {/* Selector Trigger Button */}
                        <button
                          type="button"
                          onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-slate-100/80 transition-colors"
                        >
                          <span className={selectedMember ? "text-slate-800 font-bold" : "text-slate-400 font-normal"}>
                            {selectedMember
                              ? `${selectedMember.name} (${selectedMember.campus || "Main"} - PIN: ${selectedMember.pin})`
                              : "Select Member..."}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                              isMemberDropdownOpen ? "rotate-180 text-indigo-600" : ""
                            }`}
                          />
                        </button>

                        {/* Dropdown Menu Overlay */}
                        {isMemberDropdownOpen && (
                          <div className="absolute z-50 left-0 right-0 bottom-full mb-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-2 space-y-2">
                            {/* Search Input inside Dropdown */}
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                autoFocus
                                placeholder="Search member by name, PIN, campus..."
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                              />
                              {memberSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setMemberSearchQuery("")}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Options List */}
                            <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignTargetMember("");
                                  setIsMemberDropdownOpen(false);
                                  setMemberSearchQuery("");
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                                  !assignTargetMember
                                    ? "bg-slate-100 font-bold text-slate-800"
                                    : "hover:bg-slate-50 text-slate-500"
                                }`}
                              >
                                <span>Select Member...</span>
                                {!assignTargetMember && <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />}
                              </button>

                              {(() => {
                                const filtered = validMembers.filter((m) => {
                                  if (!memberSearchQuery.trim()) return true;
                                  const q = memberSearchQuery.toLowerCase().trim();
                                  return (
                                    m.name.toLowerCase().includes(q) ||
                                    (m.campus && m.campus.toLowerCase().includes(q)) ||
                                    (m.pin && m.pin.toLowerCase().includes(q))
                                  );
                                });

                                if (filtered.length === 0) {
                                  return (
                                    <p className="text-[11px] text-slate-400 p-3 text-center">
                                      No member found matching "{memberSearchQuery}"
                                    </p>
                                  );
                                }

                                return filtered.map((m) => (
                                  <button
                                    key={m.pin}
                                    type="button"
                                    onClick={() => {
                                      setAssignTargetMember(m.pin);
                                      setIsMemberDropdownOpen(false);
                                      setMemberSearchQuery("");
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                                      assignTargetMember === m.pin
                                        ? "bg-indigo-600 text-white font-bold"
                                        : "hover:bg-indigo-50 text-slate-700"
                                    }`}
                                  >
                                    <div>
                                      <span className="font-semibold">{m.name}</span>
                                      <span
                                        className={`text-[10px] ml-2 ${
                                          assignTargetMember === m.pin
                                            ? "text-indigo-200"
                                            : "text-slate-400"
                                        }`}
                                      >
                                        {m.campus} • PIN: {m.pin}
                                      </span>
                                    </div>
                                    {assignTargetMember === m.pin && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                    )}
                                  </button>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setAssignTarget(null);
                    setAssignTargetMember("");
                    setMemberSearchQuery("");
                    setIsMemberDropdownOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!assignTargetMember) {
                      toast.error("Please select a member to assign.");
                      return;
                    }
                    const updates: Partial<CallTask> = {};
                    const allPeople = [...members, ...mentors];
                    const selectedMember = allPeople.find(
                      (m) => m.pin === assignTargetMember,
                    );
                    const mName = selectedMember?.name || "";

                    const { canAssignFeedback, canAssignLive } = assignTarget
                      ? getTaskAssignPermissions(
                          assignTarget,
                          currentUser,
                          canUpload,
                        )
                      : { canAssignFeedback: true, canAssignLive: true };

                    let effectiveChoice = assignChoice;
                    if (
                      !canAssignFeedback &&
                      (effectiveChoice === "feedback" ||
                        effectiveChoice === "both")
                    ) {
                      effectiveChoice = "live";
                    }
                    if (
                      !canAssignLive &&
                      (effectiveChoice === "live" ||
                        effectiveChoice === "both")
                    ) {
                      effectiveChoice = "feedback";
                    }

                    if (
                      (effectiveChoice === "feedback" ||
                        effectiveChoice === "both") &&
                      canAssignFeedback
                    ) {
                      updates.assignedToPin = assignTargetMember;
                      updates.assignedToName = mName;
                    }
                    if (
                      (effectiveChoice === "live" ||
                        effectiveChoice === "both") &&
                      canAssignLive
                    ) {
                      updates.liveAssignedToPin = assignTargetMember;
                      updates.liveAssignedToName = mName;
                    }
                    handleUpdateTask(assignTarget.id, updates);
                    toast.success("Assigned successfully");
                    setIsAssignModalOpen(false);
                    setAssignTarget(null);
                    setAssignTargetMember("");
                    setMemberSearchQuery("");
                    setIsMemberDropdownOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100"
                >
                  Confirm Assign
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Class Confirmation Modal */}
      <AnimatePresence>
        {isDeleteClassModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-rose-100"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-rose-50 rounded-full">
                  <Trash2 className="w-8 h-8 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    Delete Class Records?
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-2 mb-4">
                    Are you sure you want to delete all tasks for class{" "}
                    <span className="text-rose-600">
                      {selectedClassForUpload}
                    </span>
                    ? This action cannot be undone.
                  </p>
                  <div className="w-full text-left space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                        Your Password to Confirm
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Enter your portal password"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col w-full gap-2 pt-4">
                  <button
                    onClick={confirmDeleteClass}
                    disabled={isDeletingClass}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg hover:shadow-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isDeletingClass ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Deleting Class...</span>
                      </>
                    ) : (
                      <span>Confirm Delete Class</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsDeleteClassModalOpen(false);
                      setDeletePassword("");
                    }}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {isDeleteAllModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-rose-100"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-rose-50 rounded-full">
                  <Trash2 className="w-8 h-8 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    Delete All Records?
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-2 mb-4">
                    Are you sure you want to delete records? This action cannot
                    be undone.
                  </p>

                  <div className="w-full text-left space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                        Target Class
                      </label>
                      <select
                        value={deleteAllTargetClass}
                        onChange={(e) => {
                          setDeleteAllTargetClass(e.target.value);
                          setDeletePassword("");
                        }}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      >
                        <option value="all">
                          All
                        </option>
                        {Array.from(new Set(tasks.map((t) => t.className)))
                          .filter(Boolean)
                          .sort()
                          .map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                        Your Password to Confirm
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Enter your portal password"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col w-full gap-2 pt-4">
                  <button
                    onClick={handleDeleteAllTasks}
                    disabled={isDeletingAll}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg hover:shadow-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isDeletingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <span>Confirm Delete All</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsDeleteAllModalOpen(false);
                      setDeletePassword("");
                    }}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Single Task Delete Confirmation Modal */}
      {/* Add Student Modal */}
      <AnimatePresence>
        {isAddStudentModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl my-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  Add Students
                </h3>
                <button
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Manual Entry Section */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-4">
                    Manual Entry
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={newStudentFormData.studentName || ""}
                        onChange={(e) =>
                          setNewStudentFormData({
                            ...newStudentFormData,
                            studentName: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-xs font-medium px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Class *
                      </label>
                      <select
                        value={newStudentFormData.className || ""}
                        onChange={(e) => {
                          setNewStudentFormData({
                            ...newStudentFormData,
                            className: e.target.value,
                          });
                        }}
                        className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 h-[34px]"
                      >
                        <option value="">Select Class</option>
                        {uniqueClasses.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Reg No
                      </label>
                      <input
                        type="text"
                        value={newStudentFormData.registrationNo || ""}
                        onChange={(e) =>
                          setNewStudentFormData({
                            ...newStudentFormData,
                            registrationNo: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-xs font-medium px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Nick Name
                      </label>
                      <input
                        type="text"
                        value={newStudentFormData.nickName || ""}
                        onChange={(e) =>
                          setNewStudentFormData({
                            ...newStudentFormData,
                            nickName: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-xs font-medium px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Branch
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                          className="w-full bg-white border border-slate-200 text-xs font-medium px-3 py-2 rounded-xl text-left flex justify-between items-center focus:outline-none focus:border-indigo-500 h-[34px]"
                        >
                          <span className="truncate">
                            {newStudentFormData.branch || "Select Branch"}
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                        </button>
                        {isBranchDropdownOpen && (
                          <div className="absolute left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50">
                            <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
                              <input
                                type="text"
                                placeholder="Search branch..."
                                value={manualBranchSearchQuery}
                                onChange={(e) => setManualBranchSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="py-1">
                              {mergedBranches.filter(b => b.toLowerCase().includes(manualBranchSearchQuery.toLowerCase())).length > 0 ? (
                                mergedBranches
                                  .filter(b => b.toLowerCase().includes(manualBranchSearchQuery.toLowerCase()))
                                  .map((br) => (
                                    <button
                                      key={br}
                                      type="button"
                                      onClick={() => {
                                        setNewStudentFormData({
                                          ...newStudentFormData,
                                          branch: br,
                                        });
                                        setIsBranchDropdownOpen(false);
                                        setManualBranchSearchQuery("");
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-950 font-medium transition-colors"
                                    >
                                      {br}
                                    </button>
                                  ))
                              ) : (
                                <div className="px-3 py-2 text-xs text-slate-400 font-medium text-center">
                                  No branches found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Student Mobile
                      </label>
                      <input
                        type="text"
                        value={newStudentFormData.mobilePersonal || ""}
                        onChange={(e) =>
                          setNewStudentFormData({
                            ...newStudentFormData,
                            mobilePersonal: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-xs font-medium px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Father Mobile
                      </label>
                      <input
                        type="text"
                        value={newStudentFormData.mobileFather || ""}
                        onChange={(e) =>
                          setNewStudentFormData({
                            ...newStudentFormData,
                            mobileFather: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-xs font-medium px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Mother Mobile
                      </label>
                      <input
                        type="text"
                        value={newStudentFormData.mobileMother || ""}
                        onChange={(e) =>
                          setNewStudentFormData({
                            ...newStudentFormData,
                            mobileMother: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-slate-200 text-xs font-medium px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleAddStudent}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
                    >
                      Add Student
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    OR
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Excel Upload Section */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-end gap-4">
                  <div className="flex-grow w-full">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Class for Excel Upload *
                    </label>
                    <input
                      type="text"
                      list="class-options"
                      value={selectedClassForUpload}
                      onChange={(e) =>
                        setSelectedClassForUpload(e.target.value)
                      }
                      placeholder="Enter class name (Required for upload)"
                      className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <label
                    className={`flex-shrink-0 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md w-full sm:w-auto ${!selectedClassForUpload ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-200"}`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Excel
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        if (!selectedClassForUpload) {
                          toast.error(
                            "Please provide a class name for the upload first.",
                          );
                          return;
                        }
                        handleFileUpload(e);
                        setIsAddStudentModalOpen(false);
                      }}
                      className="hidden"
                      disabled={!selectedClassForUpload}
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Excel Upload Preview Modal */}
      <AnimatePresence>
        {excelPreviewTasks && excelPreviewStats && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-5 sm:p-7 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-indigo-100 my-auto overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                      New Class Student Upload Preview
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
                      Verify upload details, student counts, and branch distributions before confirming
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setExcelPreviewTasks(null);
                    setExcelPreviewStats(null);
                    setExcelPreviewClassName("");
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="py-4 space-y-5 overflow-y-auto flex-grow pr-1">
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  You are about to upload students for a <span className="text-indigo-600 font-extrabold">new class</span>. Please review the statistics and preview data below before confirming:
                </p>

                {/* Overview Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-100 p-3.5 rounded-2xl text-center">
                    <div className="text-xs font-bold text-slate-500">
                      Class Name
                    </div>
                    <div className="text-base font-black text-slate-800 bg-indigo-50/50 py-1 px-3 rounded-xl inline-block mt-1">
                      {excelPreviewClassName}
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-3.5 rounded-2xl text-center border border-emerald-100">
                    <div className="text-xs font-bold text-emerald-600">
                      Total Students to Upload
                    </div>
                    <div className="text-xl font-black text-emerald-700 mt-1">
                      {excelPreviewStats.studentCount} Students
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3.5 rounded-2xl text-center border border-blue-200">
                    <div className="text-xs font-bold text-blue-600">
                      Total Unique Branches
                    </div>
                    <div className="text-xl font-black text-blue-700 mt-1">
                      {excelPreviewStats.branchCount} Branches
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Excel Data Sample Preview ({excelPreviewTasks.length} Rows)
                    </span>
                  </h4>

                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-2.5">SL</th>
                          <th className="p-2.5">Reg No</th>
                          <th className="p-2.5">Student Name</th>
                          <th className="p-2.5">Central Merit</th>
                          <th className="p-2.5">Branch</th>
                          <th className="p-2.5">Mobile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {excelPreviewTasks.slice(0, 50).map((st, i) => (
                          <tr key={i} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-bold text-slate-700">
                              {i + 1}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-indigo-600 select-text cursor-text">
                              {st.registrationNo || st.pin || "—"}
                            </td>
                            <td className="p-2.5 font-bold text-slate-800">
                              {st.studentName || "—"}
                            </td>
                            <td className="p-2.5 font-bold text-amber-700 font-mono">
                              {st.centralMerit || st.meritPosition || "—"}
                            </td>
                            <td className="p-2.5 font-medium text-slate-600">
                              {st.branch || "—"}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">
                              {st.mobilePersonal ? (
                                <a
                                  href={`tel:${st.mobilePersonal}`}
                                  className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 font-bold"
                                  title={`Call: ${st.mobilePersonal}`}
                                >
                                  <span>{st.mobilePersonal}</span>
                                  <Phone className="w-2.5 h-2.5 text-indigo-500" />
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                        {excelPreviewTasks.length > 50 && (
                          <tr>
                            <td colSpan={5} className="p-3 text-center text-xs text-slate-400 font-bold bg-slate-50">
                              ... and {excelPreviewTasks.length - 50} more student records.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-slate-100 flex-shrink-0">
                  <button
                    onClick={() => {
                      if (isUploading) return;
                      setExcelPreviewTasks(null);
                      setExcelPreviewStats(null);
                      setExcelPreviewClassName("");
                    }}
                    disabled={isUploading}
                    className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmExcelUpload}
                    disabled={isUploading}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Adding Student Info...</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        <span>Confirm & Add Student Info</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-rose-100"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-rose-50 rounded-full">
                  <Trash2 className="w-8 h-8 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    Delete Task?
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-2">
                    Are you sure you want to delete this task? This action
                    cannot be undone.
                  </p>
                </div>
                <div className="flex flex-col w-full gap-2 pt-4">
                  <button
                    onClick={confirmDeleteTask}
                    disabled={isDeletingTask}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg hover:shadow-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isDeletingTask ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <span>Confirm Delete</span>
                    )}
                  </button>
                  <button
                    onClick={() => setTaskToDelete(null)}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Class Name Modal */}
      <AnimatePresence>
        {isEditClassModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-5 sm:p-7 w-full max-w-lg flex flex-col shadow-2xl border border-indigo-100 my-auto overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Edit3 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                      Edit Existing Class Name
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
                      Select a class and update its name across all call records
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditClassModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="py-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Existing Class:
                  </label>
                  {uniqueClasses.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                      No existing classes found.
                    </p>
                  ) : (
                    <select
                      value={editClassOldName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditClassOldName(val);
                        setEditClassNewName(val);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"
                    >
                      {uniqueClasses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    New Class Name:
                  </label>
                  <input
                    type="text"
                    value={editClassNewName}
                    onChange={(e) => setEditClassNewName(e.target.value)}
                    placeholder="Enter new class name..."
                    className="w-full bg-white border border-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditClassModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRenamingClass || !editClassOldName || !editClassNewName.trim()}
                  onClick={handleRenameClass}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 cursor-pointer"
                >
                  {isRenamingClass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      <span>Update Class Name</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Merit List Sync & Missing Student Finder Modal */}
      <AnimatePresence>
        {isMeritListModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-5 sm:p-7 w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl border border-indigo-100 my-auto overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                      Merit List Check & Missing Student Data Import
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
                      Check program-wise merit lists and filter missing students
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMeritListModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="py-4 space-y-5 overflow-y-auto flex-grow pr-1">
                {/* Existing Class Dropdown Selector */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 flex-shrink-0">
                    Select Existing Target Class for Import:
                  </label>
                  <select
                    value={meritTargetClass}
                    onChange={(e) => setMeritTargetClass(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer text-slate-800"
                  >
                    <option value="">-- Select Existing Class --</option>
                    {uniqueClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upload File Section */}
                <div className="space-y-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 text-center">
                  <label className="block text-xs font-bold text-emerald-900 mb-2">
                    Upload Merit List Excel / CSV File
                  </label>
                  <label
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200 ${!meritTargetClass || isCheckingMerit ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
                  >
                    {isCheckingMerit ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Checking & Parsing File...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Select File (.xlsx, .xls, .csv)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      disabled={!meritTargetClass || isCheckingMerit}
                      onChange={handleMeritFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Results Section */}
                {meritResult && (
                  <div className="space-y-4 pt-2 border-t border-slate-200">
                    {/* Overview Badges */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-100 p-3.5 rounded-2xl text-center">
                        <div className="text-xs font-bold text-slate-500">
                          Total in Merit List
                        </div>
                        <div className="text-xl font-black text-slate-800">
                          {meritResult.totalInMeritList} Students
                        </div>
                      </div>
                      <div className="bg-emerald-50 p-3.5 rounded-2xl text-center border border-emerald-100">
                        <div className="text-xs font-bold text-emerald-600">
                          Already in Call List
                        </div>
                        <div className="text-xl font-black text-emerald-700">
                          {meritResult.matchedCount} Students
                        </div>
                      </div>
                      <div className="bg-rose-50 p-3.5 rounded-2xl text-center border border-rose-200">
                        <div className="text-xs font-bold text-rose-600">
                          Missing Students (Not Found)
                        </div>
                        <div className="text-xl font-black text-rose-700">
                          {meritResult.missingCount} Students
                        </div>
                      </div>
                    </div>

                    {/* Missing Student Table */}
                    {meritResult.missingCount > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>
                              Missing Students List ({meritResult.missingCount})
                            </span>
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (
                                  selectedMissingIndexes.length ===
                                  meritResult.missingStudents.length
                                ) {
                                  setSelectedMissingIndexes([]);
                                } else {
                                  setSelectedMissingIndexes(
                                    meritResult.missingStudents.map(
                                      (_, i) => i,
                                    ),
                                  );
                                }
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:underline"
                            >
                              {selectedMissingIndexes.length ===
                              meritResult.missingStudents.length
                                ? "Deselect All"
                                : "Select All"}
                            </button>
                          </div>
                        </div>

                        <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                              <tr>
                                <th className="p-2.5 w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selectedMissingIndexes.length ===
                                        meritResult.missingStudents.length &&
                                      meritResult.missingStudents.length > 0
                                    }
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMissingIndexes(
                                          meritResult.missingStudents.map(
                                            (_, i) => i,
                                          ),
                                        );
                                      } else {
                                        setSelectedMissingIndexes([]);
                                      }
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </th>
                                <th className="p-2.5 whitespace-nowrap">SL / Central Merit</th>
                                <th className="p-2.5 whitespace-nowrap">Reg Number</th>
                                <th className="p-2.5 whitespace-nowrap">Roll Number</th>
                                <th className="p-2.5 whitespace-nowrap">FULL NAME</th>
                                <th className="p-2.5 whitespace-nowrap">NICK NAME</th>
                                <th className="p-2.5 whitespace-nowrap">Contact Number</th>
                                <th className="p-2.5 whitespace-nowrap">Branch</th>
                                <th className="p-2.5 whitespace-nowrap">Student Info</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {meritResult.missingStudents.map((st, i) => {
                                const isSelected =
                                  selectedMissingIndexes.includes(i);
                                const reg = st.registrationNo || st.pin || "";
                                const roll = st.rollNo || st.roll || "";
                                const name = st.studentName || st.fullName || "";
                                const nick = st.nickName || "";
                                const branch = st.branch || st.campus || "";
                                const pPhone = st.mobilePersonal || "";
                                const fPhone = st.mobileFather || "";
                                const mPhone = st.mobileMother || "";

                                return (
                                  <tr
                                    key={i}
                                    className={`hover:bg-slate-50/80 ${isSelected ? "bg-indigo-50/30" : ""}`}
                                  >
                                    <td className="p-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedMissingIndexes(
                                              (prev) => [...prev, i],
                                            );
                                          } else {
                                            setSelectedMissingIndexes((prev) =>
                                              prev.filter((idx) => idx !== i),
                                            );
                                          }
                                        }}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-2.5 font-bold text-slate-700 whitespace-nowrap">
                                      {st.centralMerit || st.meritPosition || st.sl || i + 1}
                                    </td>
                                    <td className="p-2.5 font-mono font-bold text-indigo-600 select-text cursor-text whitespace-nowrap">
                                      {reg || "—"}
                                    </td>
                                    <td className="p-2.5 font-mono font-bold text-slate-700 select-text cursor-text whitespace-nowrap">
                                      {roll || "—"}
                                    </td>
                                    <td className="p-2.5 font-bold text-slate-800 whitespace-nowrap">
                                      {name || "—"}
                                    </td>
                                    <td className="p-2.5 font-medium text-slate-600 whitespace-nowrap">
                                      {nick || "—"}
                                    </td>
                                    <td className="p-2.5 text-slate-700 min-w-[200px]">
                                      <div className="space-y-1 text-[11px]">
                                        {pPhone && (
                                          <div className="flex items-center gap-1">
                                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                                              Personal:
                                            </span>
                                            <a
                                              href={`tel:${pPhone}`}
                                              className="text-indigo-600 hover:underline font-mono font-bold inline-flex items-center gap-1"
                                            >
                                              {pPhone}
                                              <Phone className="w-2.5 h-2.5 text-indigo-400" />
                                            </a>
                                          </div>
                                        )}
                                        {fPhone && (
                                          <div className="flex items-center gap-1">
                                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px]">
                                              Father:
                                            </span>
                                            <a
                                              href={`tel:${fPhone}`}
                                              className="text-slate-700 hover:underline font-mono font-medium inline-flex items-center gap-1"
                                            >
                                              {fPhone}
                                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                                            </a>
                                          </div>
                                        )}
                                        {mPhone && (
                                          <div className="flex items-center gap-1">
                                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px]">
                                              Mother:
                                            </span>
                                            <a
                                              href={`tel:${mPhone}`}
                                              className="text-slate-700 hover:underline font-mono font-medium inline-flex items-center gap-1"
                                            >
                                              {mPhone}
                                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                                            </a>
                                          </div>
                                        )}
                                        {!pPhone && !fPhone && !mPhone && (
                                          <span className="text-slate-400 italic">—</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2.5 font-bold text-slate-700 whitespace-nowrap">
                                      {branch ? (
                                        <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold">
                                          {branch}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">—</span>
                                      )}
                                    </td>
                                    <td className="p-2.5 text-slate-600 min-w-[180px]">
                                      <div className="space-y-0.5 text-[11px]">
                                        {st.className && (
                                          <div>
                                            <span className="font-bold text-slate-700">Class:</span> {st.className}
                                          </div>
                                        )}
                                       
                                        {st.institute && (
                                          <div>
                                            <span className="font-bold text-slate-700">Inst:</span> {st.institute}
                                          </div>
                                        )}
                                        {st.gender && (
                                          <div>
                                            <span className="font-bold text-slate-700">Gender:</span> {st.gender}
                                          </div>
                                        )}
                                        {(st.fatherName || st.motherName) && (
                                          <div>
                                            <span className="font-bold text-slate-700">Parents:</span> {st.fatherName || ""}{st.fatherName && st.motherName ? " / " : ""}{st.motherName || ""}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="pt-2 space-y-3">
                          {/* Assignee Selection */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <UserPlus className="w-4 h-4 text-indigo-600" />
                              <span>
                                Assign Feedback Selected Students To (Optional):
                              </span>
                            </div>
                            <select
                              value={meritAssigneePin}
                              onChange={(e) =>
                                setMeritAssigneePin(e.target.value)
                              }
                              className="bg-white border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 min-w-[220px]"
                            >
                              <option value="">Unassigned (Leave Empty)</option>
                              {(/online/i.test(meritTargetClass)
                                ? members
                                : showManagementTabs
                                  ? (canUpload || currentUser.campus === "All")
                                    ? members
                                    : members.filter(
                                        (m) => m.campus === currentUser.campus,
                                      )
                                  : members.filter(
                                      (m) => m.campus === currentUser.campus,
                                    )
                              ).map((m) => (
                                <option key={m.pin} value={m.pin}>
                                  {m.name} ({m.campus})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex justify-end">
                            <button
                              onClick={handleImportMissingStudents}
                              disabled={
                                isImportingMissing ||
                                selectedMissingIndexes.length === 0
                              }
                              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-100 flex items-center gap-2 disabled:opacity-50"
                            >
                              {isImportingMissing ? (
                                <RotateCcw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              <span>
                                Add to Call List (
                                {selectedMissingIndexes.length} Students)
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-emerald-50 rounded-2xl text-center border border-emerald-100 space-y-1">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                        <h4 className="text-sm font-black text-emerald-800">
                          All Students Already Added!
                        </h4>
                        <p className="text-xs text-emerald-600 font-medium">
                          All students from the merit list already exist in the
                          call system. No missing students found.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isImageViewerOpen && viewingImageUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
            >
              <button
                onClick={() => {
                  setIsImageViewerOpen(false);
                  setViewingImageUrl("");
                }}
                className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title="Close Viewer"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="w-full h-full overflow-auto flex justify-center custom-scrollbar">
                <img
                  src={viewingImageUrl}
                  alt="Exam Script Full View"
                  className="max-w-full h-auto rounded-lg shadow-2xl"
                />
              </div>
              <div className="mt-4 flex gap-3">
                <a
                  href={viewingImageUrl}
                  download="exam-script.png"
                  className="px-6 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <a
                  href={viewingImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={async (base64) => {
          try {
            const imgUrl = await uploadImageToImgBB(base64);
            if (cameraTarget === "live") {
              setLiveInstructionImages((prev) => [...prev, imgUrl]);
            } else {
              const current = parseMultipleImages(
                modalFormData.liveInstructionImage,
              );
              const updated = [...current, imgUrl];
              setModalFormData((prev) => ({
                ...prev,
                liveInstructionImage: JSON.stringify(updated),
              }));
            }
            toast.success("Image captured & uploaded to ImgBB");
          } catch (err) {
            console.error("Camera ImgBB upload failed:", err);
            toast.error("Failed to upload image to ImgBB");
          }
        }}
      />
      {/* ... could add a more detailed modal here if needed ... */}
    </div>
  );
}
