import re

with open('src/components/ManagerDashboard.tsx', 'r') as f:
    content = f.read()

# We need to remove the instances of filteredAndSortedLeaveRequests inside the modales.
# Let's find exactly where they are.
# I'll use regex to remove `const filteredAndSortedLeaveRequests = React.useMemo(() => { ... });` from the entire file except the first one.

parts = content.split("  const filteredAndSortedLeaveRequests = React.useMemo(() => {")
if len(parts) > 2:
    # the first occurrence is `parts[0]` + `  const filtered...`
    # We want to keep the first occurrence (which is the one inside ManagerDashboard)
    
    # We need to find the end of each useMemo block.
    # It ends with `  }, [leaveRequests, leaveSearchPin, leaveFilterStatus, leaveFilterType, leaveFilterMonth, leaveSortBy]);`
    
    new_content = parts[0] + "  const filteredAndSortedLeaveRequests = React.useMemo(() => {" + parts[1]
    
    for i in range(2, len(parts)):
        # remove the useMemo block
        end_marker = "  }, [leaveRequests, leaveSearchPin, leaveFilterStatus, leaveFilterType, leaveFilterMonth, leaveSortBy]);\n"
        idx = parts[i].find(end_marker)
        if idx != -1:
            new_content += parts[i][idx + len(end_marker):]
        else:
            print("Warning: end marker not found")

    with open('src/components/ManagerDashboard.tsx', 'w') as f:
        f.write(new_content)
    print("Fixed multiple insertions")
else:
    print("Not multiple")
