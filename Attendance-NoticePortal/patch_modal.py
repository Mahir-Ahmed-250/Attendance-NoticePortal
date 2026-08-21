import re

with open('src/components/ManagerDashboard.tsx', 'r') as f:
    content = f.read()

modal_code = """
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
                    <input
                      type="text"
                      value={leaveEditForm.responsiblePersonPin || leaveEditForm.coordinatorPin || ''}
                      onChange={(e) => setLeaveEditForm(prev => ({ ...prev, responsiblePersonPin: e.target.value }))}
                      placeholder="Enter PIN"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none font-semibold text-slate-700"
                    />
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
"""

new_content = content.replace("    </div>\n  );\n}\n\n// Separate Campus Edit Modal Component", modal_code + "\n    </div>\n  );\n}\n\n// Separate Campus Edit Modal Component")

with open('src/components/ManagerDashboard.tsx', 'w') as f:
    f.write(new_content)

print("Modal added")
