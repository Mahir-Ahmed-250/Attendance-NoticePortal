import React, { useState, useEffect } from "react";
import {
  Shield,
  Search,
  Key,
  Users,
  X,
  CheckCircle2,
  Lock,
  UserCheck,
  Building2,
  Sparkles,
  Settings2,
  ChevronRight,
  Filter,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TeamMember, Mentor } from "../types";
import { toast } from "react-hot-toast";

interface PermissionManagementViewProps {
  members: TeamMember[];
  mentors: Mentor[];
  onUpdateMember?: (pin: string, updatedMember: TeamMember) => void;
  onUpdateMentor?: (pin: string, updatedMentor: Mentor) => void;
  initialSelectedPin?: string;
  isManager?: boolean;
}

export default function PermissionManagementView({
  members,
  mentors,
  onUpdateMember,
  onUpdateMentor,
  initialSelectedPin = "",
  isManager = true,
}: PermissionManagementViewProps) {
  const [selectedPin, setSelectedPin] = useState<string>(initialSelectedPin);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>("all");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const allUsers = [...members, ...mentors];

  const availableCampuses = Array.from(
    new Set(allUsers.map((u) => u.campus).filter(Boolean))
  ) as string[];

  useEffect(() => {
    if (initialSelectedPin) {
      setSelectedPin(initialSelectedPin);
      const target = allUsers.find((u) => u.pin === initialSelectedPin);
      if (target) {
        setSelectedPermissions(target.permissions || []);
      }
    }
  }, [initialSelectedPin]);

  const filteredUsers = allUsers.filter((u) => {
    const matchesCampus =
      selectedCampusFilter === "all" || u.campus === selectedCampusFilter;
    const matchesRole =
      selectedRoleFilter === "all" || u.role === selectedRoleFilter;
    
    if (!matchesCampus || !matchesRole) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.pin?.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const selectedUser = allUsers.find((u) => u.pin === selectedPin);

  const handleOpenPermissions = (userPin: string) => {
    setSelectedPin(userPin);
    const target = allUsers.find((u) => u.pin === userPin);
    setSelectedPermissions(target?.permissions || []);
    setIsModalOpen(true);
  };

  const togglePermission = (permKey: string) => {
    if (permKey === "configure_menu_permissions" && !isManager) {
      toast.error(
        "Only Managers can grant or revoke the Menu Permissions Privilege.",
      );
      return;
    }
    setSelectedPermissions((prev) =>
      prev.includes(permKey)
        ? prev.filter((p) => p !== permKey)
        : [...prev, permKey],
    );
  };

  const handleSave = () => {
    if (!selectedUser) {
      toast.error("Please select a user first.");
      return;
    }

    if (selectedUser.role === "mentor") {
      if (onUpdateMentor) {
        onUpdateMentor(selectedUser.pin, {
          ...selectedUser,
          permissions: selectedPermissions,
        } as Mentor);
      }
    } else {
      if (onUpdateMember) {
        onUpdateMember(selectedUser.pin, {
          ...selectedUser,
          permissions: selectedPermissions,
        } as TeamMember);
      }
    }

    toast.success(
      `Permissions updated successfully for "${selectedUser.name}"!`,
    );
  };

  const isMentor = selectedUser?.role === "mentor";

  return (
    <div className="space-y-4 text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Permission Management
              </h2>
              <p className="text-[10px] text-amber-100 font-medium">
                Manage system access for team members and coordinators
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 w-full space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 ml-1">
              <Search className="w-2.5 h-2.5" />
              Search Users
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, PIN, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="w-full md:w-40 space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 ml-1">
              <Filter className="w-2.5 h-2.5" />
              Campus
            </label>
            <select
              value={selectedCampusFilter}
              onChange={(e) => setSelectedCampusFilter(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="all">All Campuses</option>
              {availableCampuses.map((campus) => (
                <option key={campus} value={campus}>
                  {campus}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-40 space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 ml-1">
              <Users className="w-2.5 h-2.5" />
              Role 
            </label>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="all">All Roles </option>
              <option value="mentor">Coordinators </option>
              <option value="member">Team Members</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  User 
                </th>
                <th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                  PIN 
                </th>
                <th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                  Role 
                </th>
                <th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                  Campus 
                </th>
                <th className="px-5 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        <Users className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">
                        No users found 
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.pin}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm ${
                            user.role === "mentor"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {user.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-800 truncate leading-none">
                            {user.name}
                          </p>
                          <p className="text-[9px] font-semibold text-slate-400 truncate mt-0.5">
                            {user.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {user.pin}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                          user.role === "mentor"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {user.role === "mentor" ? "Coordinator" : "Member"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-[10px] font-black text-slate-600 flex items-center justify-center gap-1">
                        <Building2 className="w-2.5 h-2.5 text-slate-400" />
                        {user.campus || "Main"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleOpenPermissions(user.pin)}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-all shadow-xs group-hover:shadow-sm cursor-pointer"
                        title="Manage Permissions"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission Modal */}
      <AnimatePresence>
        {isModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-white rounded-[24px] shadow-2xl overflow-hidden border border-slate-200"
            >
              {/* Modal Header */}
              <div className="bg-amber-50 p-5 border-b border-amber-100 relative">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-100 rounded-xl shadow-sm transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-amber-200">
                    {selectedUser.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      Manage Permissions for {selectedUser.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-1.5 py-0.5 bg-white border border-amber-200 rounded-lg text-[9px] font-bold text-amber-700">
                        PIN: {selectedUser.pin}
                      </span>
                      <span className="px-1.5 py-0.5 bg-white border border-amber-200 rounded-lg text-[9px] font-bold text-amber-700 uppercase">
                        {selectedUser.role === "mentor" ? "Coordinator" : "Member"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      Module Access Rights
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedUser.role === "mentor" ? (
                      <>
                        <PermissionToggle
                          id="mentor_attendance"
                          label="View Team Attendance"
                          checked={selectedPermissions.includes("mentor_attendance")}
                          onChange={() => togglePermission("mentor_attendance")}
                        />
                        <PermissionToggle
                          id="mentor_members"
                          label="Member Management"
                          checked={
                            selectedPermissions.includes("mentor_members") ||
                            selectedPermissions.includes("manage_members")
                          }
                          onChange={() => {
                            const val = !selectedPermissions.includes("mentor_members");
                            setSelectedPermissions((prev) => 
                              val 
                                ? [...prev, "mentor_members", "manage_members"]
                                : prev.filter(p => p !== "mentor_members" && p !== "manage_members")
                            );
                          }}
                        />
                        <PermissionToggle
                          id="mentor_leave"
                          label="Manage Leave Requests"
                          checked={selectedPermissions.includes("mentor_leave")}
                          onChange={() => togglePermission("mentor_leave")}
                        />
                        <PermissionToggle
                          id="mentor_history"
                          label="Manage Adjustments"
                          checked={selectedPermissions.includes("mentor_history")}
                          onChange={() => togglePermission("mentor_history")}
                        />
                        <PermissionToggle
                          id="mentor_notices"
                          label="View Notice Board"
                          checked={selectedPermissions.includes("mentor_notices")}
                          onChange={() => togglePermission("mentor_notices")}
                        />
                        <PermissionToggle
                          id="campus_directory"
                          label="Campus Members Directory"
                          checked={selectedPermissions.includes("campus_directory")}
                          onChange={() => togglePermission("campus_directory")}
                        />
                        <PermissionToggle
                          id="mentor_post_notice"
                          label="Post Notices"
                          checked={selectedPermissions.includes("mentor_post_notice")}
                          onChange={() => togglePermission("mentor_post_notice")}
                        />
                      </>
                    ) : (
                      <>
                        <PermissionToggle
                          id="member_attendance"
                          label="Attendance Form"
                          checked={selectedPermissions.includes("member_attendance")}
                          onChange={() => togglePermission("member_attendance")}
                        />
                        <PermissionToggle
                          id="manage_members"
                          label="Member Management"
                          checked={
                            selectedPermissions.includes("manage_members") ||
                            selectedPermissions.includes("mentor_members")
                          }
                          onChange={() => {
                            const val = !selectedPermissions.includes("manage_members");
                            setSelectedPermissions((prev) => 
                              val 
                                ? [...prev, "manage_members", "mentor_members"]
                                : prev.filter(p => p !== "manage_members" && p !== "mentor_members")
                            );
                          }}
                        />
                        <PermissionToggle
                          id="member_notices"
                          label="Notice Board"
                          checked={selectedPermissions.includes("member_notices")}
                          onChange={() => togglePermission("member_notices")}
                        />
                        <PermissionToggle
                          id="member_post_notice"
                          label="Post Notices"
                          checked={selectedPermissions.includes("member_post_notice")}
                          onChange={() => togglePermission("member_post_notice")}
                        />
                      </>
                    )}

                    <PermissionToggle
                      id="manage_campus_settings"
                      label="Manage Campus Settings"
                      checked={selectedPermissions.includes("manage_campus_settings")}
                      onChange={() => togglePermission("manage_campus_settings")}
                    />
                    <PermissionToggle
                      id="can_upload_call_info"
                      label="Allow Student Info Upload"
                      checked={selectedPermissions.includes("can_upload_call_info")}
                      onChange={() => togglePermission("can_upload_call_info")}
                    />
                  </div>

                  {isManager && (
                    <div className="pt-3.5 border-t border-slate-100">
                      <div
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          selectedPermissions.includes("configure_menu_permissions")
                            ? "bg-amber-50 border-amber-300 shadow-sm"
                            : "bg-slate-50 border-slate-200 hover:border-amber-300"
                        }`}
                        onClick={() => togglePermission("configure_menu_permissions")}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes("configure_menu_permissions")}
                            onChange={() => {}}
                            className="rounded-lg border-slate-300 text-amber-600 focus:ring-amber-500 w-4.5 h-4.5 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-black text-slate-800 block">
                           Permission Management
                          </span>
                          <p className="text-[10px] font-semibold text-slate-500 mt-1">
                            
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-500 font-black text-[9px] uppercase tracking-wider hover:text-slate-700 transition-colors"
                >
                  Cancel 
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                    setIsModalOpen(false);
                  }}
                  className="px-7 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-200 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
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

function PermissionToggle({ id, label, checked, onChange }: { id: string, label: string, checked: boolean, onChange: () => void }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
        checked
          ? "bg-amber-50/50 border-amber-300 shadow-xs"
          : "bg-slate-50/50 border-slate-200 hover:border-amber-200 hover:bg-white"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
      />
      <span className={`text-[10px] font-black transition-colors ${checked ? "text-amber-900" : "text-slate-600"}`}>
        {label}
      </span>
    </label>
  );
}
