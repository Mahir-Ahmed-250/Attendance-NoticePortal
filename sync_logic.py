import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# the logic is inside `handleResolveLeaveRequest`
# Let's extract it to a function `syncLeaveWithReports`
