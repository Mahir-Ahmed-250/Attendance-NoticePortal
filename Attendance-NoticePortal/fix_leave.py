import re

with open('src/components/ManagerDashboard.tsx', 'r') as f:
    content = f.read()

# I will find the block of the leave table. 
# It starts around: const isEditing = editingLeavePin === req.pin;
# inside the map for leave requests.

# Instead of complex regex, let's just replace `isEditing ? ( ... ) : ( ... )` with `...` but only inside leave table.
# Actually, I can just leave `isEditing` there and it will never be true because I will rename the state variable for modal!
