import re

with open('src/components/ManagerDashboard.tsx', 'r') as f:
    content = f.read()

# We need to carefully strip `isEditing ?` inside the leave request table.
# Wait, it's safer to just leave them. The user will never see them because
# I can just remove `isEditing = editingLeavePin === req.pin` and replace it with `isEditing = false;`

content = content.replace("const isEditing = editingLeavePin === req.pin;", "const isEditing = false; // editingLeavePin === req.pin;")

with open('src/components/ManagerDashboard.tsx', 'w') as f:
    f.write(content)
print("Disabled inline editing")
