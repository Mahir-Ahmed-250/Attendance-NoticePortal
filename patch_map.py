import re

with open('src/components/ManagerDashboard.tsx', 'r') as f:
    content = f.read()

old_map = """                          {leaveRequests
                            .filter((req) =>
                              req.memberPin.includes(leaveSearchPin),
                            )
                            .map((req, index) => {"""

new_map = """                          {filteredAndSortedLeaveRequests
                            .map((req, index) => {"""

content = content.replace(old_map, new_map)

with open('src/components/ManagerDashboard.tsx', 'w') as f:
    f.write(content)
