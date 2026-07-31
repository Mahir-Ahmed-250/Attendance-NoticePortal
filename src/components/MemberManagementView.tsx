import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Search,
  Users,
  Plus,
  Edit,
  Trash2,
  FileSpreadsheet,
  Info,
  ShieldCheck,
  UserPlus,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { TeamMember, Mentor, User, Campus } from "../types";
import { UserAvatar } from "./UserAvatar";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";

interface MemberManagementViewProps {
  members: TeamMember[];
  mentors: Mentor[];
  managers: User[];
  campuses: Campus[];
  currentUser: { pin: string; role: string; permissions?: string[] };
  onAddMember: (member: TeamMember) => Promise<void> | void;
  onUpdateMember: (pin: string, member: TeamMember) => Promise<void> | void;
  onDeleteMember: (pin: string) => Promise<void> | void;
  onAddMentor?: (mentor: Mentor) => Promise<void> | void;
  onUpdateMentor?: (pin: string, mentor: Mentor) => Promise<void> | void;
  onDeleteMentor?: (pin: string) => Promise<void> | void;
  onConfigurePermissions?: (pin: string) => void;
}

export default function MemberManagementView({
  members,
  mentors,
  managers,
  campuses,
  currentUser,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddMentor,
  onUpdateMentor,
  onDeleteMentor,
  onConfigurePermissions,
}: MemberManagementViewProps) {
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterCampusFilter, setRosterCampusFilter] = useState("all");
  const [rosterUnassignedOnly, setRosterUnassignedOnly] = useState(false);
  const [bulkPinInput, setBulkPinInput] = useState("");
  const [isExcelGuideOpen, setIsExcelGuideOpen] = useState(false);

  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [crudMode, setCrudMode] = useState<"create" | "edit">("create");
  const [selectedCrudPin, setSelectedCrudPin] = useState("");
  const [selectedCrudRole, setSelectedCrudRole] = useState<string>("member");
  const [deletingMember, setDeletingMember] = useState<{pin: string, name: string, role: string} | null>(null);

  const [memberForm, setMemberForm] = useState({
    pin: "",
    name: "",
    email: "",
    designation: "",
    password: "password",
    campus: campuses[0]?.name || "",
    mentorPin: "",
    permissions: ["member_attendance", "member_notices", "member_post_notice"],
    role: "member" as "member" | "mentor",
  });

  const handleSaveMemberRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.pin || !memberForm.name || !memberForm.email || !memberForm.campus) {
      toast.error("Please fill in all  fields (PIN, Name, Email, Campus).");
      return;
    }

    if (crudMode === "edit" && selectedCrudPin === currentUser.pin) {
      toast.error("Members with Member Management permission cannot edit their own info!");
      return;
    }

    const existingUser = [...members, ...mentors].find((u) => u.pin === selectedCrudPin);
    const finalPassword = memberForm.password.trim() ? memberForm.password.trim() : (crudMode === "create" ? "password" : (existingUser?.password || "password"));

    const campusObj = campuses.find((c) => c.name === memberForm.campus);
    const headCoordinatorPin = campusObj?.coordinatorPins?.[0];

    const payload = {
      ...memberForm,
      pin: memberForm.pin.trim(),
      name: memberForm.name.trim(),
      email: memberForm.email.trim(),
      designation: memberForm.designation.trim(),
      campus: memberForm.campus,
      password: finalPassword,
    };

    try {
      if (crudMode === "create") {
        const exists = [...members, ...mentors].some((u) => u.pin === memberForm.pin);
        if (exists) {
          toast.error(`User with PIN ${memberForm.pin} already exists!`);
          return;
        }
        if (payload.role === "mentor") {
          if (onAddMentor) {
            await onAddMentor({
              ...payload,
              role: "mentor",
              permissions: payload.permissions.length > 0 ? payload.permissions : [
                "mentor_attendance",
                "mentor_history",
                "mentor_leave",
                "mentor_notices",
                "mentor_post_notice",
                "mentor_members",
                "manage_members",
              ],
            } as Mentor);
          }
        } else {
          await onAddMember({
            ...payload,
            role: "member",
            permissions: payload.permissions.length > 0 ? payload.permissions : [
              "member_attendance",
              "member_notices",
              "member_post_notice",
            ],
          } as TeamMember);
        }
      } else {
        const updatedData = {
          ...existingUser,
          ...payload,
        };
        if (existingUser?.role === "mentor" || payload.role === "mentor") {
          if (onUpdateMentor) {
            await onUpdateMentor(selectedCrudPin, updatedData as Mentor);
          }
        } else {
          await onUpdateMember(selectedCrudPin, updatedData as TeamMember);
        }
      }
      setIsRosterModalOpen(false);
    } catch (err: any) {
      // The error is already toasted inside the callbacks
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-md">
        {/* Header */}
        <div className="border-b border-slate-150 pb-5 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5">
                <Users className="w-5.5 h-5.5 text-indigo-600" />
                Member Management
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Manage team members, coordinators, roster assignments, and permissions.
              </p>
            </div>

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
                      const wb = XLSX.read(dataBuffer, { type: "array" });
                      const wsname = wb.SheetNames[0];
                      const ws = wb.Sheets[wsname];
                      const data = XLSX.utils.sheet_to_json(ws) as any[];

                      if (data.length === 0) {
                        toast.error("No data found in Excel file!");
                        return;
                      }

                      let successCount = 0;
                      data.forEach((row: any) => {
                        const pin = String(row.pin || row.id || "").trim();
                        const name = String(row.name || "").trim();
                        const email = String(row.email || "").trim();
                        const campusName = String(row.campus || "").trim();

                        if (pin && name && email && campusName) {
                          onAddMember({
                            pin,
                            name,
                            role: "member",
                            email,
                            designation: String(row.designation || "").trim(),
                            password: "password",
                            campus: campusName,
                            mentorPin: "",
                            permissions: ["member_attendance", "member_notices", "member_post_notice"],
                            avatarUrl: "",
                          });
                          successCount++;
                        }
                      });
                      toast.success(`${successCount} members imported successfully!`);
                    } catch (err) {
                      toast.error("Error processing Excel file!");
                    }
                  };
                  reader.readAsArrayBuffer(file);
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("excel-upload")?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-xs whitespace-nowrap"
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
                    campus: campuses[0]?.name || "",
                    mentorPin: "",
                    designation: "",
                    permissions: ["member_attendance", "member_notices", "member_post_notice"],
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

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
              Total Users: {Array.from(new Set([...members.map((m) => m.pin), ...mentors.map((m) => m.pin)])).length}
            </span>

            {members.filter((m) => !m.mentorPin).length > 0 && (
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Unassigned: {members.filter((m) => !m.mentorPin).length}
              </span>
            )}
          </div>
        </div>

        {/* Search & Filters */}
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
            <option value="all">All Campuses</option>
            {campuses.map((c) => (
              <option key={`campus-filter-${c.id}`} value={c.name}>
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
                const pins = bulkPinInput.split(",").map((p) => p.trim());
                let selfDeactivateAttempt = false;
                pins.forEach((pin) => {
                  if (pin === currentUser.pin) {
                    selfDeactivateAttempt = true;
                    return; // Skip self
                  }
                  const user = members.find((m) => m.pin === pin) || mentors.find((m) => m.pin === pin);
                  if (user) {
                    const updatedUser = { ...user, isActive: !user.isActive };
                    if (user.role === "mentor") {
                      if (onUpdateMentor) onUpdateMentor(pin, updatedUser as Mentor);
                    } else {
                      onUpdateMember(pin, updatedUser as TeamMember);
                    }
                  }
                });
                setBulkPinInput("");
                if (selfDeactivateAttempt) {
                  toast.error("For security reasons, you cannot deactivate your own account!");
                }
                toast.success("Bulk update executed!");
              }}
              className="text-xs font-black text-white bg-indigo-600 px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer hover:bg-indigo-700"
            >
              Multiple Deactivate
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Profile</th>
                <th className="p-4">PIN</th>
                <th className="p-4">Campus</th>
                <th className="p-4">Coordinator</th>
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
                    mergedMap.set(m.pin, { ...existing, ...m, role: "mentor", isBoth: true });
                  } else {
                    mergedMap.set(m.pin, { ...m });
                  }
                });
                return Array.from(mergedMap.values());
              })()
                .filter((m) => m.isActive !== false)
                .filter((m) => {
                  const matchesSearch =
                    (m.name?.toLowerCase() || "").includes(rosterSearch.toLowerCase()) ||
                    (m.pin?.toLowerCase() || "").includes(rosterSearch.toLowerCase()) ||
                    (m.email?.toLowerCase() || "").includes(rosterSearch.toLowerCase());
                  const matchesCampus =
                    rosterCampusFilter === "all" || m.campus === rosterCampusFilter;
                  const matchesUnassigned =
                    !rosterUnassignedOnly || (m.role === "member" && !m.mentorPin);
                  return matchesSearch && matchesCampus && matchesUnassigned;
                })
                .sort((a, b) =>
                  a.pin.localeCompare(b.pin, undefined, { numeric: true, sensitivity: "base" }),
                )
                .map((member, index) => {
                  const coordinator = [...managers, ...mentors].find(
                    (m) => m.pin === member.mentorPin,
                  );
                  const isOwnAccount = member.pin === currentUser.pin;
                  return (
                    <tr key={member.pin} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-xs font-mono text-slate-400 text-center">
                        {index + 1}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={{...member, avatarUrl: undefined}} size="sm" />
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                              {member.name}
                              {member.role === "mentor" && (
                                <span className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1 py-0.5 rounded uppercase font-black">
                                  Coordinator
                                </span>
                              )}
                              {isOwnAccount && (
                                <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 py-0.5 rounded uppercase font-black">
                                  You
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
                        {member.pin}
                      </td>
                      <td className="p-4 text-xs">
                        <span className="text-[10px] bg-indigo-50 border border-indigo-100/50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md">
                          {member.campus || "Unassigned"}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-600 font-medium">
                        {coordinator ? `${coordinator.name} (${coordinator.pin})` : "Unassigned"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isOwnAccount}
                            onClick={() => {
                              if (isOwnAccount) {
                                toast.error("You cannot modify your own account!");
                                return;
                              }
                              setCrudMode("edit");
                              setSelectedCrudPin(member.pin);
                              setSelectedCrudRole(member.role || "member");
                              setMemberForm({
                                pin: member.pin,
                                name: member.name,
                                email: member.email,
                                designation: member.designation || "",
                                password: "",
                                campus: member.campus || campuses[0]?.name || "",
                                mentorPin: member.mentorPin || "",
                                permissions: member.permissions || [],
                                role: member.role || "member",
                              });
                              setIsRosterModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isOwnAccount
                                ? "text-slate-300 cursor-not-allowed opacity-50"
                                : "text-indigo-600 hover:bg-indigo-50"
                            }`}
                            title={isOwnAccount ? "Cannot modify own account" : "Edit"}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {onConfigurePermissions && (
                            <button
                              type="button"
                              disabled={isOwnAccount}
                              onClick={() => {
                                if (isOwnAccount) {
                                  toast.error("You cannot change your own permissions!");
                                  return;
                                }
                                onConfigurePermissions(member.pin);
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isOwnAccount
                                  ? "text-slate-300 cursor-not-allowed opacity-50"
                                  : "text-amber-600 hover:bg-amber-50"
                              }`}
                              title={isOwnAccount ? "Cannot change own permissions" : "Configure Permissions"}
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isOwnAccount}
                            onClick={() => {
                              if (isOwnAccount) {
                                toast.error("You cannot delete your own account!");
                                return;
                              }
                              setDeletingMember({ pin: member.pin, name: member.name, role: member.role || "member" });
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isOwnAccount
                                ? "text-slate-300 cursor-not-allowed opacity-50"
                                : "text-rose-600 hover:bg-rose-50"
                            }`}
                            title={isOwnAccount ? "Cannot delete own account" : "Delete"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal */}
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
                  {crudMode === "create" ? "Add New" : "Edit Details:"} Team Member
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
              <form onSubmit={handleSaveMemberRoster} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* PIN */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      User PIN
                    </label>
                    <input
                      type="number"
                      disabled={crudMode === "edit"}
                      placeholder="Team Member PIN"
                      value={memberForm.pin}
                      onChange={(e) =>
                        setMemberForm((prev) => ({
                          ...prev,
                          pin: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold bg-slate-50"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Team Member Full Name"
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
                      type="text"
                      placeholder="name.pin@udvash.net"
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
                      placeholder="Scrutineer"
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
                  {crudMode === "create" && (
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                        Portal Password
                      </label>
                      <input
                        type="text"
                        placeholder="Set Initial Password"
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
                  )}

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
                      <option value="">Select Campus</option>
                      {campuses.map((c) => (
                        <option key={`member-form-campus-${c.id}`} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campus Coordinator */}
                  {crudMode !== "create" && (
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
                        <option value="">Select Coordinator</option>
                        {/* Managers */}
                        {managers.map((m) => (
                          <option key={`mgr-option-${m.pin}`} value={m.pin}>
                            {m.name}
                          </option>
                        ))}
                        {/* Coordinators assigned to this campus */}
                        {mentors
                          .filter((m) => m.campus === memberForm.campus)
                          .map((m) => (
                            <option key={`coord-option-${m.pin}`} value={m.pin}>
                              {m.name} (Coordinator)
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 pt-6 border-t border-slate-150 bg-white sticky bottom-0 z-10">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors shadow-2xs"
                  >
                    {crudMode === "create" ? "Create Team Member" : "Save Changes"}
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

      {/* Excel Guide Modal */}
      {isExcelGuideOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full text-left space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              Excel Import Format
            </h3>
            <p className="text-xs text-slate-600">
              Your Excel sheet (.xlsx/.xls) must include the following column headers in the first row:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-700 font-mono space-y-1">
              <li>pin</li>
              <li>name</li>
              <li>email</li>
              <li>campus</li>
              <li>designation (optional)</li>
            </ul>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsExcelGuideOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-rose-100"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-rose-50 rounded-full">
                  <Trash2 className="w-8 h-8 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">
                    Delete Member?
                  </h3>
                  <p className="text-sm text-slate-500 font-bold mt-2">
                    Are you sure you want to delete{" "}
                    <span className="text-rose-600">
                      "{deletingMember.name}"
                    </span>
                    ? This action cannot be undone.
                  </p>
                </div>
                <div className="flex flex-col w-full gap-2 pt-4">
                  <button
                    onClick={async () => {
                      if (deletingMember.pin === currentUser.pin) {
                        toast.error("Members with Member Management permission cannot delete their own info!");
                        return;
                      }
                      // Instead of full deletion, mark as inactive to preserve in records
                      const userToUpdate = [...members, ...mentors].find(m => m.pin === deletingMember.pin);
                      if (userToUpdate) {
                        const updatedUser = { ...userToUpdate, isActive: false };
                        if (deletingMember.role === "mentor" && onUpdateMentor) {
                          await onUpdateMentor(deletingMember.pin, updatedUser as Mentor);
                        } else {
                          await onUpdateMember(deletingMember.pin, updatedUser as TeamMember);
                        }
                        toast.success("User deactivated successfully!");
                      }
                      setDeletingMember(null);
                    }}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-rose-500/30 transition-all"
                  >
                    Yes, Delete Member
                  </button>
                  <button
                    onClick={() => setDeletingMember(null)}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    No, Keep it
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
