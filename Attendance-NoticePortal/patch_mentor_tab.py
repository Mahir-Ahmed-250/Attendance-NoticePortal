import re

with open('src/components/MentorDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace("toLocaleString('default',", "toLocaleString('en-US',")

effect_code = """
  // Reset filters when tab changes
  useEffect(() => {
    setLeaveSearch('');
    setLeaveFilterType('All');
    setLeaveFilterStatus('All');
    setLeaveFilterMonth(localToday.substring(0, 7));
    setLeaveSortBy('newest');
    setReportMonth(localToday.substring(0, 7));
    setEditRequestFilterStatus('All');
  }, [activeTab]);
"""

# Insert effect after localToday definition
if "const localToday = new Date()" in content:
    content = content.replace("const localToday = new Date().toISOString().split('T')[0];", "const localToday = new Date().toISOString().split('T')[0];\n" + effect_code)

with open('src/components/MentorDashboard.tsx', 'w') as f:
    f.write(content)
