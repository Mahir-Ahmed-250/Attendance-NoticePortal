const fs = require('fs');
let code = fs.readFileSync('src/components/ManagerDashboard.tsx', 'utf8');

const oldPermsStart = code.indexOf('                          {/* Permissions */}');
const oldPermsEnd = code.indexOf('                        <div className="flex gap-2.5 pt-6 border-t border-slate-150 bg-white sticky bottom-0 z-10">');

if (oldPermsStart !== -1 && oldPermsEnd !== -1) {
  let firstPart = code.substring(0, oldPermsStart);
  let lastPart = code.substring(oldPermsEnd);

  let newPerms = `                          {/* Permissions */}
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                              Configure Menu Permissions
                            </label>
                            
                            {memberForm.role === 'mentor' ? (
                              <div className="space-y-3">
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={memberForm.permissions.includes("mentor_attendance")}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setMemberForm(prev => ({
                                        ...prev,
                                        permissions: checked
                                          ? [...prev.permissions, "mentor_attendance"]
                                          : prev.permissions.filter(p => p !== "mentor_attendance")
                                      }));
                                    }}
                                    className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-550 cursor-pointer w-4 h-4"
                                  />
                                  My Team's Attendance (উপস্থিতি ফর্ম)
                                </label>
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={memberForm.permissions.includes("mentor_notices")}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setMemberForm(prev => ({
                                        ...prev,
                                        permissions: checked
                                          ? [...prev.permissions, "mentor_notices"]
                                          : prev.permissions.filter(p => p !== "mentor_notices")
                                      }));
                                    }}
                                    className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-550 cursor-pointer w-4 h-4"
                                  />
                                  Coordinator Bulletins (নোটিশ বোর্ড)
                                </label>
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={memberForm.permissions.includes("mentor_history")}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setMemberForm(prev => ({
                                        ...prev,
                                        permissions: checked
                                          ? [...prev.permissions, "mentor_history"]
                                          : prev.permissions.filter(p => p !== "mentor_history")
                                      }));
                                    }}
                                    className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-550 cursor-pointer w-4 h-4"
                                  />
                                  Attendance History (অ্যাটেনডেন্স হিস্ট্রি)
                                </label>
                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={memberForm.permissions.includes("mentor_emails")}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setMemberForm(prev => ({
                                        ...prev,
                                        permissions: checked
                                          ? [...prev.permissions, "mentor_emails"]
                                          : prev.permissions.filter(p => p !== "mentor_emails")
                                      }));
                                    }}
                                    className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-550 cursor-pointer w-4 h-4"
                                  />
                                  Email Inbox (মেইল ইনবক্স)
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
                                  Attendance (উপস্থিতি ফর্ম)
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
                                  Bulletins / Notice Board (নোটিশ বোর্ড)
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
`;
  fs.writeFileSync('src/components/ManagerDashboard.tsx', firstPart + newPerms + lastPart);
  console.log('Fixed permissions');
} else {
  console.log('Not found');
}
