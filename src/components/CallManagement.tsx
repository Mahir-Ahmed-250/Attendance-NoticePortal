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

export default function CallManagement({
  currentUser,
  members,
  mentors,
  campuses,
  branches,
  onRefreshEmails,
}: CallManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "dashboard" | "management" | "my-tasks" | "live-instruction"
  >(
    currentUser.role === "manager" ||
      currentUser.role === "mentor" ||
      currentUser.permissions?.includes("can_upload_call_info")
      ? "dashboard"
      : "my-tasks",
  );
  const [tasks, setTasks] = useState<CallTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
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
  const [assignFilter, setAssignFilter] = useState<string>("all");
  const [liveAssignFilter, setLiveAssignFilter] = useState<string>("all");
  const [bulkAssignType, setBulkAssignType] = useState<
    "feedback" | "live" | "both"
  >("feedback");
  const [rangeAssignType, setRangeAssignType] = useState<
    "feedback" | "live" | "both"
  >("both");

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

  const isCoordinator =
    currentUser.role === "manager" || currentUser.role === "mentor";
  const canUpload =
    currentUser.role === "manager" ||
    currentUser.permissions?.includes("can_upload_call_info");
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
    if (!liveSearchRegNo.trim()) {
      toast.error("Please enter a registration number");
      return;
    }
    setIsSearchingLive(true);
    setLiveFoundTask(null);
    setTimeout(() => {
      const found = tasks.find(
        (t) => t.registrationNo === liveSearchRegNo.trim(),
      );
      setIsSearchingLive(false);
      if (found) {
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
    }, 600);
  };

  const handleUpdateLiveInstruction = async () => {
    if (!liveFoundTask) return;
    if (liveStatus === "Pending") {
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

  useEffect(() => {
    fetchTasks();
  }, [activeSubTab, currentUser.pin]);

  const fetchTasks = async () => {
    setLoading(true);
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
        const excelRows = XLSX.utils.sheet_to_json(ws) as any[];

        const parsedList: any[] = [];
        excelRows.forEach((row, idx) => {
          const getValue = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const k of keys) {
              const normKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
              const found = rowKeys.find(
                (rk) => rk.toLowerCase().replace(/[^a-z0-9]/g, "") === normKey,
              );
              if (found && row[found] !== undefined && row[found] !== null)
                return String(row[found]).trim();
            }
            return "";
          };

          const reg = getValue([
            "registration",
            "reg",
            "regno",
            "registrationno",
            "pin",
            "studentid",
            "id",
          ]);
          const roll = getValue(["rollno", "roll", "examroll"]);
          const fullName = getValue(["fullname", "studentname", "name"]);
          const nickName = getValue(["nickname", "nick"]);
          const mobilePersonal = getValue([
            "mobilepersonal",
            "personalphonenumberp",
            "mobile",
            "phone",
            "contact",
          ]);
          const mobileFather = getValue([
            "numbera",
            "mobilefather",
            "fatherphone",
            "guardianphone",
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
            !mobileFather
          ) {
            return;
          }

          const studentName =
            fullName ||
            nickName ||
            (reg ? `Student ${reg}` : roll ? `Student ${roll}` : "");
          if (!studentName) return;

          parsedList.push({
            sl:
              getValue(["sl", "serial", "slno"]) ||
              String(parsedList.length + 1),
            registrationNo: reg,
            pin: reg,
            rollNo: roll,
            roll: roll,
            nickName: nickName,
            studentName: studentName,
            gender: getValue(["gender", "sex"]),
            institute: getValue(["institute", "school", "college"]),
            fatherName: getValue(["fathername", "father"]),
            motherName: getValue(["mothername", "mother"]),
            mobilePersonal: mobilePersonal,
            mobileFather: mobileFather,
            branch: getValue(["branch"]) || getValue(["campus"]),
            className:
              getValue([
                "coursebat",
                "coursebatch",
                "course",
                "class",
                "program",
                "batch",
              ]) ||
              meritTargetClass ||
              "Default",
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
          const name = (st.studentName || st.nickName || "").trim();
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
        let campusName = st.campus || currentUser.campus || "";
        return {
          ...st,
          id: `task-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          sl: st.sl || String(tasks.length + idx + 1),
          registrationNo: st.registrationNo || st.pin || st.roll || "",
          rollNo: st.rollNo || st.roll || st.pin || "",
          pin: st.pin || st.registrationNo || "",
          roll: st.roll || st.rollNo || "",
          studentName: st.studentName || st.nickName || "Unknown Student",
          className: meritTargetClass || st.className || "Default",
          mobilePersonal: st.mobilePersonal || "",
          mobileFather: st.mobileFather || "",
          mobileMother: st.mobileMother || "",
          branch: st.branch || st.campus || "",
          campus: campusName,
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
        fetchTasks();
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
      }
    } catch (err) {
      console.error("Unassignment error:", err);
      toast.error("Failed to unassign task(s)");
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
    try {
      const res = await fetch(`/api/call-tasks/${taskToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskToDelete));
        setSelectedTasks((prev) => prev.filter((id) => id !== taskToDelete));
        setTaskToDelete(null);
        setTaskModalOpen(false); // also close task modal if open
      }
    } catch (err) {
      console.error("Delete task error:", err);
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
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("Verification failed");
      return;
    }

    try {
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
      }
    } catch (err) {
      console.error("Delete class error:", err);
      toast.error("Failed to delete class tasks");
    }
  };

  const handleDeleteAllTasks = async () => {
    if (!deletePassword) {
      toast.error("Password is required to delete records");
      return;
    }
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
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("Verification failed");
      return;
    }

    try {
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
        toast.success(
          deleteAllTargetClass === "all"
            ? "All call tasks deleted successfully"
            : `Tasks for class ${deleteAllTargetClass} deleted successfully`,
        );
      }
    } catch (err) {
      console.error("Delete tasks error:", err);
      toast.error("Failed to delete tasks");
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
  const [pageSize, setPageSize] = useState(50);

  const getTaskCampus = useCallback(
    (task: CallTask): string => {
      if (task.campus && task.campus.trim()) {
        const directCampus = task.campus.trim();
        const official = campuses.find(
          (c) => c.name?.trim().toLowerCase() === directCampus.toLowerCase() || c.id === directCampus,
        );
        if (official && official.name) return official.name.trim();
        return directCampus;
      }

      if (task.branch) {
        const cleanBranch = task.branch.trim();
        const branchObj = branches.find(
          (b) =>
            b.name?.trim() === cleanBranch ||
            b.name?.trim().toLowerCase() === cleanBranch.toLowerCase(),
        );
        if (branchObj && branchObj.campusId) {
          const campusObj = campuses.find(
            (c) => c.id === branchObj.campusId || c.name === branchObj.campusId,
          );
          if (campusObj && campusObj.name) return campusObj.name.trim();
        }
        const cleanBranchKeyword = cleanBranch
          .toLowerCase()
          .replace(/udvash|unmesh|branch|\(.*\)/gi, "")
          .trim();

        const matchedCampus = campuses.find((c) => {
          if (!c.name) return false;
          const cleanCampus = c.name.toLowerCase().replace("campus", "").trim();
          return (
            cleanBranch.toLowerCase().includes(cleanCampus) ||
            (cleanBranchKeyword.length > 2 && cleanCampus.includes(cleanBranchKeyword))
          );
        });
        if (matchedCampus && matchedCampus.name) return matchedCampus.name.trim();
      }
      return "";
    },
    [branches, campuses],
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

  const filteredTasks = tasks
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

      const matchesSearch =
        task.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.registrationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.mobilePersonal.includes(searchQuery);

      const isOnline = isOnlineTask(task);

      // Campus matching
      const taskCampus = getTaskCampus(task);
      const matchesCampus =
        campusFilter === "all" ||
        taskCampus === campusFilter ||
        task.campus === campusFilter;

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
      const standardFeedbackOptions = ["N/R", "Off", "Busy", "Irregular", "Satisfied", "Class Problem", "Notify Later"];
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

      const matchesImageFilter =
        !showOnlyWithImages ||
        (task.liveInstructionImage &&
          parseMultipleImages(task.liveInstructionImage).length > 0);

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

  const totalPages = Math.ceil(filteredTasks.length / pageSize);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

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

  const openTaskModal = (task: CallTask) => {
    setEditingTask(task);
    setModalFormData(task);
    if (!canUpload && currentUser.role === "member") {
      const isAssignedLive =
        task.liveAssignedToPin === currentUser.pin ||
        task.liveInstructorPin === currentUser.pin;
      const isAssignedFeedback = task.assignedToPin === currentUser.pin;
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
  const [rangeTargetMember, setRangeTargetMember] = useState("");
  const [rangeAction, setRangeAction] = useState<"assign" | "unassign">(
    "assign",
  );

  const tasksInRange = useMemo(() => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    if (isNaN(start) || isNaN(end)) return [];
    return filteredTasks.filter((t) => {
      const sl = parseInt(t.sl);
      return !isNaN(sl) && sl >= start && sl <= end;
    });
  }, [rangeStart, rangeEnd, filteredTasks]);

  const getValidMembers = (taskSubset: CallTask[]) => {
    const allAssignable = [...members, ...mentors];

    // Managers or users with management/upload permissions can assign to ANY member across all campuses
    if (canUpload || currentUser.campus === "All") {
      return allAssignable;
    }

    // For others (Coordinators), they can only see team members under them
    const myCampusMembers = members.filter(
      (m) => m.campus === currentUser.campus || m.mentorPin === currentUser.pin,
    );

    if (taskSubset.length === 0) return myCampusMembers;

    // Check if task subset belongs to an Online class
    const isOnlineTaskSet = taskSubset.some((t) =>
      /online/i.test(t.className || ""),
    );

    if (isOnlineTaskSet) {
      return myCampusMembers;
    }

    const taskBranches = [...new Set(taskSubset.map((t) => t.branch))];

    if (taskBranches.length > 1 && currentUser.role !== "mentor") return []; // If range has students from multiple branches, assignment not allowed
    const isAllowed = taskSubset.every((t) => {
      const b = branches.find((br) => br.name === t.branch);
      const cId = b?.campusId;
      const cName = campuses.find((c) => c.id === cId)?.name;

      const isMyCampus = cName === currentUser.campus || !cName;
      const isAssignedToMe =
        t.assignedToPin === currentUser.pin ||
        t.liveAssignedToPin === currentUser.pin;

      return isMyCampus || isAssignedToMe;
    });

    if (!isAllowed) {
      return []; // Coordinator cannot assign tasks from another campus unless assigned to them
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
      <optgroup key={campusName} label={`📍 ${campusName}`}>
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
      if (!rangeStart || !rangeEnd || !rangeTargetMember) {
        toast.error("Please fill all range assignment fields");
        return;
      }
    } else {
      if (!rangeStart || !rangeEnd) {
        toast.error("Please fill start and end SL");
        return;
      }
    }

    if (tasksInRange.length === 0) {
      toast.error("No tasks found in this serial range");
      return;
    }

    let taskIdsToProcess: string[] = [];
    let member: any = null;

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

      const validMembersForRange = getValidMembers(tasksInRange);
      member = validMembersForRange.find((m) => m.pin === rangeTargetMember);

      if (!member) {
        toast.error(
          "This member is not authorized for this branch/campus range",
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
        assignType: "both",
        assignedToPin: member.pin,
        assignedToName: member.name,
        liveAssignedToPin: member.pin,
        liveAssignedToName: member.name,
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
        setRangeTargetMember("");
        toast.success(
          `Successfully assigned ${taskIdsToProcess.length} tasks (Both) to ${member.name}`,
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
    const fromTasks = tasks
      .map((t) => t.branch)
      .filter((b): b is string => Boolean(b && b.trim()));
    return Array.from(new Set(fromTasks)).sort();
  }, [tasks]);

  const mergedBranches = useMemo(() => {
    const set = new Set<string>();
    branches.forEach((b) => {
      if (b.name) set.add(b.name.trim());
    });
    availableBranches.forEach((b) => {
      if (b) set.add(b.trim());
    });
    return Array.from(set).sort();
  }, [branches, availableBranches]);

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
        }

        return true;
      });
    }
    let filtered = baseTasks;

    if (dashboardClassFilter !== "all") {
      filtered = filtered.filter((t) => t.className === dashboardClassFilter);
    }

    if (dashboardCampusFilter !== "all") {
      filtered = filtered.filter(
        (t) =>
          getTaskCampus(t) === dashboardCampusFilter ||
          t.campus === dashboardCampusFilter,
      );
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

  const standardFeedbackOptions = ["N/R", "Off", "Busy", "Irregular", "Satisfied", "Class Problem", "Notify Later"];
  const feedbackDetailCounts: Record<string, number> = {
    "N/R": 0,
    "Off": 0,
    "Busy": 0,
    "Irregular": 0,
    "Satisfied": 0,
    "Class Problem": 0,
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
      { name: string; completed: number; pending: number }
    > = {};

    filteredDashboardTasks.forEach((t) => {
      // For feedback
      if (t.assignedToPin) {
        if (!data[t.assignedToPin]) {
          data[t.assignedToPin] = {
            name: t.assignedToName || t.assignedToPin,
            completed: 0,
            pending: 0,
          };
        }
        if (t.feedbackStatus === "Completed") data[t.assignedToPin].completed++;
        else data[t.assignedToPin].pending++;
      }

      // For live instruction
      if (t.liveAssignedToPin) {
        if (!data[t.liveAssignedToPin]) {
          data[t.liveAssignedToPin] = {
            name: t.liveAssignedToName || t.liveAssignedToPin,
            completed: 0,
            pending: 0,
          };
        }
        if (t.liveInstructionStatus === "Completed")
          data[t.liveAssignedToPin].completed++;
        else data[t.liveAssignedToPin].pending++;
      }
    });

    return Object.values(data)
      .sort((a, b) => b.completed + b.pending - (a.completed + a.pending))
      .slice(0, 10); // top 10
  }, [filteredDashboardTasks]);

  const tasksByBranchData = useMemo(() => {
    const data: Record<string, { name: string; total: number }> = {};
    filteredDashboardTasks.forEach((t) => {
      const branch = t.branch || "Unknown";
      if (!data[branch]) {
        data[branch] = { name: branch, total: 0 };
      }
      data[branch].total++;
    });
    return Object.values(data)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredDashboardTasks]);

  const tasksByCampusData = useMemo(() => {
    const data: Record<string, { name: string; completed: number; pending: number; total: number }> = {};
    filteredDashboardTasks.forEach((t) => {
      const resolved = getTaskCampus(t) || t.campus;
      const campusName = resolved && resolved.trim() ? resolved.trim() : "Unassigned Campus";
      if (!data[campusName]) {
        data[campusName] = { name: campusName, completed: 0, pending: 0, total: 0 };
      }
      data[campusName].total++;
      if (t.feedbackStatus === "Completed" || t.liveInstructionStatus === "Completed") {
        data[campusName].completed++;
      } else {
        data[campusName].pending++;
      }
    });
    return Object.values(data).sort((a, b) => b.total - a.total);
  }, [filteredDashboardTasks, getTaskCampus]);

  const COLORS = ["#10b981", "#f59e0b"];

  return (
    <div className="space-y-6">
      {/* Sub-tabs Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl">
          {showManagementTabs && (
            <>
              <button
                onClick={() => setActiveSubTab("dashboard")}
                className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeSubTab === "dashboard" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveSubTab("management")}
                className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeSubTab === "management" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Call Management
              </button>
            </>
          )}
          {currentUser.role !== "manager" && (
            <button
              onClick={() => setActiveSubTab("my-tasks")}
              className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeSubTab === "my-tasks" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {showManagementTabs ? "My Assigned Calls" : "Call Management"}
            </button>
          )}
          <button
            onClick={() => setActiveSubTab("live-instruction")}
            className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${activeSubTab === "live-instruction" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Live Instruction
          </button>
        </div>

        {activeSubTab === "management" && canUpload && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMeritResult(null);
                setIsMeritListModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-200"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Sync New Students</span>
            </button>
            <button
              onClick={() => setIsAddStudentModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200"
            >
              <Upload className="w-4 h-4" />
              Add Students +
            </button>
            {tasks.length > 0 && (
              <button
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            )}
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
                    Preparing Dashboard
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
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-600">Campus:</span>
                      <select
                        value={dashboardCampusFilter}
                        onChange={(e) => setDashboardCampusFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 w-full sm:w-48 cursor-pointer"
                      >
                        <option value="all">All Campuses</option>
                        {availableCampuses.map((camp) => (
                          <option key={camp} value={camp}>
                       {camp}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-slate-600">Class:</span>
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
                      margin={{ top: 15, right: 15, left: -10, bottom: 55 }}
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
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
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
                      margin={{ top: 15, right: 15, left: -10, bottom: 55 }}
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
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
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
                        dataKey="completed"
                        name="Completed"
                        stackId="a"
                        fill="#10b981"
                        radius={[0, 0, 4, 4]}
                      />
                      <Bar
                        dataKey="pending"
                        name="Pending"
                        stackId="a"
                        fill="#f59e0b"
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
                      margin={{ top: 15, right: 15, left: -10, bottom: 55 }}
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
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
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
                      margin={{ top: 15, right: 15, left: -10, bottom: 55 }}
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
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
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
                        dataKey="completed"
                        name="Completed"
                        stackId="a"
                        fill="#06b6d4"
                        radius={[0, 0, 4, 4]}
                      />
                      <Bar
                        dataKey="pending"
                        name="Pending"
                        stackId="a"
                        fill="#8b5cf6"
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
                  Search students by Registration Number and update instruction logs
                </p>
              </div>

              {/* Layout Grid: 1-Column for search if not found, 2-Columns if student is found to minimize height */}
              <div className={`grid grid-cols-1 ${liveFoundTask ? "lg:grid-cols-12" : "max-w-xl mx-auto"} gap-6 md:gap-8 items-start`}>
                
                {/* LEFT COLUMN: Search & Student Information (Col Span 5) */}
                <div className={`${liveFoundTask ? "lg:col-span-5" : "w-full"} space-y-4`}>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Search Student Reg No
                    </label>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Enter Registration No."
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
                            {liveFoundTask.mobilePersonal || "N/A"}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Parents Contact Numbers
                          </div>
                          <div className="text-xs font-bold text-slate-700 grid grid-cols-2 gap-1 mt-0.5 bg-white/60 p-2 rounded-lg border border-slate-100">
                            <div>Father: {liveFoundTask.mobileFather || "N/A"}</div>
                            <div>Mother: {liveFoundTask.mobileMother || "N/A"}</div>
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
                          {["Pending", "Completed"].map((s) => (
                            <button
                              key={s}
                              onClick={() => setLiveStatus(s as any)}
                              className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                liveStatus === s
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-center pt-1">
                <select
                  value={liveAssignFilter}
                  onChange={(e) => setLiveAssignFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200/80 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-xs cursor-pointer"
                >
                  <option value="all">Live Instruction Assign: All</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Unassigned">Unassigned</option>
                </select>

                <select
                  value={liveStatusFilter}
                  onChange={(e) => setLiveStatusFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200/80 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-xs cursor-pointer"
                >
                  <option value="all">Live Instruction Status: All</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
                <select
                  value={assignFilter}
                  onChange={(e) => setAssignFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200/80 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-xs cursor-pointer"
                >
                  <option value="all">Feedback Assign: All</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
                <select
                  value={feedbackStatusFilter}
                  onChange={(e) => setFeedbackStatusFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200/80 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-xs cursor-pointer"
                >
                  <option value="all">Feedback Status: All</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
                <select
                  value={feedbackDetailFilter}
                  onChange={(e) => setFeedbackDetailFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200/80 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-xs cursor-pointer"
                >
                  <option value="all">Feedback Detail: All</option>
                  <option value="N/R">N/R</option>
                  <option value="Off">Off</option>
                  <option value="Busy">Busy</option>
                  <option value="Irregular">Irregular</option>
                  <option value="Satisfied">Satisfied</option>
                  <option value="Class Problem">Class Problem</option>
                  <option value="Notify Later">Notify Later</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Row 3: Date Filters & Action Tools */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between pt-2 border-t border-slate-200/60">
                {/* Date Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-indigo-700 font-bold text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
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
                    className="bg-white border border-slate-200/80 text-[11px] sm:text-xs font-bold text-slate-700 px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-xs cursor-pointer"
                  >
                    <option value="all">
                      All
                    </option>
                    <option value="live">Live Instruction</option>
                    <option value="feedback">Feedback</option>
                  </select>

                  <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-xs shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <span className="text-[10px] font-black uppercase text-indigo-600">
                      From
                    </span>
                    <input
                      type="date"
                      value={fromDateFilter}
                      onChange={(e) => setFromDateFilter(e.target.value)}
                      title="From Date"
                      className="bg-transparent text-[10px] sm:text-xs font-bold focus:outline-none text-slate-700 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-xs shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <span className="text-[10px] font-black uppercase text-indigo-600">
                      To
                    </span>
                    <input
                      type="date"
                      value={toDateFilter}
                      onChange={(e) => setToDateFilter(e.target.value)}
                      title="To Date"
                      className="bg-transparent text-[10px] sm:text-xs font-bold focus:outline-none text-slate-700 cursor-pointer"
                    />
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
                  <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto pb-1 scrollbar-hide">
                    {canUpload && (
                      <button
                        onClick={() => setShowOnlyWithImages(!showOnlyWithImages)}
                        className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-xs ${
                          showOnlyWithImages
                            ? "bg-indigo-600 text-white shadow-indigo-200"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{showOnlyWithImages ? "With Images" : "Only Images"}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsRangeModalOpen(true)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-sm whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      By SL Range
                    </button>
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
                          className="flex-shrink-0 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-600 rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap animate-in fade-in slide-in-from-right-2"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
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
                      activeSubTab === "my-tasks") && (
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
                    <th className="p-4 text-center">Branch/Class</th>
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
                          activeSubTab === "management" ||
                          activeSubTab === "my-tasks"
                            ? 17
                            : 16
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
                              Fetching Calls Data
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                              Please wait while we sync with the server
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          activeSubTab === "management" ||
                          activeSubTab === "my-tasks"
                            ? 17
                            : 16
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
                          activeSubTab === "my-tasks") && (
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
                              <span className="font-medium text-slate-600">
                                {task.mobilePersonal}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-300 w-4">
                                F:
                              </span>
                              <span className="font-medium text-slate-600">
                                {task.mobileFather}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-300 w-4">
                                M:
                              </span>
                              <span className="font-medium text-slate-600">
                                {task.mobileMother}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-700">
                            {task.branch}
                          </div>
                          <div className="text-[10px] font-black text-indigo-500 uppercase mt-0.5">
                            {task.className}
                          </div>
                        </td>
                        <td
                          className="p-4 cursor-pointer"
                          onClick={() => openTaskModal(task)}
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
                          onClick={() => openTaskModal(task)}
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
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
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
                    <span className="font-bold text-slate-800">
                      {modalFormData.mobilePersonal || "N/A"}
                    </span>
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
                        <option value="Pending">Pending</option>
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
                        <option value="Pending">Pending</option>
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
                          ["N/R", "Off", "Busy", "Irregular", "Satisfied", "Class Problem", "Notify Later"].includes(modalFormData.feedbackComment || "")
                            ? modalFormData.feedbackComment
                            : "Others"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "Others") {
                            setModalFormData({
                              ...modalFormData,
                              feedbackComment: ["N/R", "Off", "Busy", "Irregular", "Satisfied", "Class Problem", "Notify Later"].includes(modalFormData.feedbackComment || "") ? "" : modalFormData.feedbackComment,
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
                        <option value="Notify Later">🟡 Notify Later</option>
                        <option value="Others">✏️ Others (Custom Comment)</option>
                      </select>
                    </div>

                    {(!["N/R", "Off", "Busy", "Irregular", "Satisfied", "Class Problem", "Notify Later"].includes(modalFormData.feedbackComment || "")) && (
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
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Personal Mobile
                      </label>
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
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Father's Mobile 
                      </label>
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
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Mother's Mobile
                      </label>
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
                        if (newLiveStatus === "Pending" || newLiveStatus !== "Completed") {
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
                            newFeedbackStatus === "Pending" ||
                            newFeedbackStatus !== "Completed"
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
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  By SL Range
                </h3>
                <button
                  onClick={() => setIsRangeModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                    Select Action
                  </label>
                  <div className="flex gap-2">
                    {["assign", "unassign"].map((action) => (
                      <button
                        key={action}
                        onClick={() => setRangeAction(action as any)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                          rangeAction === action
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                      Start SL
                    </label>
                    <input
                      type="number"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {rangeAction === "assign" && (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                        Assignment Type
                      </label>
                      <div className="w-full px-4 py-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 flex items-center gap-2">
                        <span>Both (Feedback & Live Instruction)</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                        Assign To Member
                      </label>
                      <select
                        value={rangeTargetMember}
                        onChange={(e) => setRangeTargetMember(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">Select Member</option>
                        {renderMemberOptions(getValidMembers(tasksInRange))}
                      </select>
                    </div>
                  </>
                )}

                <button
                  onClick={handleRangeAssign}
                  className={`w-full py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg mt-2 ${
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
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-100"
                >
                  Confirm Unassign
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg hover:shadow-rose-500/30 transition-all"
                  >
                    Confirm Delete Class
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
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg hover:shadow-rose-500/30 transition-all"
                  >
                    Confirm Delete All
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
                            <td className="p-2.5 font-medium text-slate-600">
                              {st.branch || "—"}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">
                              {st.mobilePersonal || "—"}
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
                      setExcelPreviewTasks(null);
                      setExcelPreviewStats(null);
                      setExcelPreviewClassName("");
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmExcelUpload}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Confirm & Add Student Info
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
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg hover:shadow-rose-500/30 transition-all"
                  >
                    Confirm Delete
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

      {/* Merit List Sync & Missing Student Finder Modal */}
      <AnimatePresence>
        {isMeritListModalOpen && (
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
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-emerald-200 ${!meritTargetClass ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Select File (.xlsx, .xls, .csv)</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      disabled={!meritTargetClass}
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

                        <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0">
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
                                <th className="p-2.5">SL / Rank</th>
                                <th className="p-2.5">Reg / Roll</th>
                                <th className="p-2.5">Student Name</th>
                                <th className="p-2.5">Program / Class</th>
                                <th className="p-2.5">Marks</th>
                                <th className="p-2.5">Mobile</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {meritResult.missingStudents.map((st, i) => {
                                const isSelected =
                                  selectedMissingIndexes.includes(i);
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
                                    <td className="p-2.5 font-bold text-slate-700">
                                      {st.sl || st.meritPosition || i + 1}
                                    </td>
                                    <td className="p-2.5 font-mono font-bold text-indigo-600 select-text cursor-text">
                                      {st.pin || st.roll || "—"}
                                    </td>
                                    <td className="p-2.5 font-bold text-slate-800">
                                      {st.studentName}
                                    </td>
                                    <td className="p-2.5 font-medium text-slate-600">
                                      {st.className}
                                    </td>
                                    <td className="p-2.5 font-bold text-slate-700">
                                      {st.marks || "—"}
                                    </td>
                                    <td className="p-2.5 font-mono text-slate-600">
                                      {st.mobilePersonal || "—"}
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
                                Assign Selected Students To (Optional):
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
