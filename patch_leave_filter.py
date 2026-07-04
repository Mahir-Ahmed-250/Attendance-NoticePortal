import re

with open('src/components/ManagerDashboard.tsx', 'r') as f:
    content = f.read()

filter_logic = """
  const filteredAndSortedLeaveRequests = React.useMemo(() => {
    let result = [...leaveRequests];
    
    // 1. Search
    if (leaveSearchPin.trim()) {
      const q = leaveSearchPin.toLowerCase();
      result = result.filter(r => 
        r.memberPin.toLowerCase().includes(q) || 
        r.memberName.toLowerCase().includes(q)
      );
    }
    
    // 2. Status
    if (leaveFilterStatus !== 'All') {
      result = result.filter(r => r.status === leaveFilterStatus);
    }
    
    // 3. Leave Type
    if (leaveFilterType !== 'All') {
      result = result.filter(r => r.leaveType === leaveFilterType);
    }
    
    // 4. Month
    if (leaveFilterMonth !== 'All') {
      result = result.filter(r => r.startDate?.substring(0, 7) === leaveFilterMonth);
    }
    
    // 5. Sort
    result.sort((a, b) => {
      if (leaveSortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (leaveSortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        // duration
        const aStart = new Date(a.startDate).getTime();
        const aEnd = new Date(a.endDate).getTime();
        const aDur = (aEnd - aStart) / (1000 * 60 * 60 * 24);
        
        const bStart = new Date(b.startDate).getTime();
        const bEnd = new Date(b.endDate).getTime();
        const bDur = (bEnd - bStart) / (1000 * 60 * 60 * 24);
        
        if (leaveSortBy === 'duration_desc') return bDur - aDur;
        if (leaveSortBy === 'duration_asc') return aDur - bDur;
        return 0;
      }
    });
    
    return result;
  }, [leaveRequests, leaveSearchPin, leaveFilterStatus, leaveFilterType, leaveFilterMonth, leaveSortBy]);
"""

content = content.replace("  return (\n    <div className=", filter_logic + "\n  return (\n    <div className=")

with open('src/components/ManagerDashboard.tsx', 'w') as f:
    f.write(content)
