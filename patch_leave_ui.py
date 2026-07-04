import re

with open('src/components/ManagerDashboard.tsx', 'r') as f:
    content = f.read()

filters_ui = """
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
"""

old_ui = """                  <input
                    type="text"
                    placeholder="Search by PIN"
                    value={leaveSearchPin}
                    onChange={(e) => setLeaveSearchPin(e.target.value)}
                    className="mt-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />"""

content = content.replace(old_ui, filters_ui)

with open('src/components/ManagerDashboard.tsx', 'w') as f:
    f.write(content)
