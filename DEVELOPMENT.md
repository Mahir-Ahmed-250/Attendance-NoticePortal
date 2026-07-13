# Development Guidelines and Feature Extension Framework (Gradual Feature Development Guide)

This document will help you develop new features for this portal project gradually and safely. The current architecture of the project is excellently modularized, allowing for expansion according to the rules described below:

---

## 1. Folder Structure and Modularity

The main files of your project are located in the `/src` folder:
- `/src/types.ts`: All types and interfaces are declared here. If you want to add a new data model or field, first define the type in this file.
- `/src/data.ts`: Initial mock data of the app (e.g., Initial Members, Mentors, Reports, Notices) is stored here.
- `/src/components/`: Each visual interface or dashboard is divided into separate files.
  - `LoginPage.tsx`: Login and role selection screen.
  - `ManagerDashboard.tsx`: All admin controls for the manager.
  - `MentorDashboard.tsx`: Dashboard for mentors (attendance verification, feedback).
  - `MemberDashboard.tsx`: Personal biometric and notice view for regular members.
  - `NoticeBoard.tsx`: Shared notice board system (manageable by both manager and mentor).
  - `ConfirmModal.tsx`: Pop-up confirmation for delete or sensitive actions.

---

## 2. Steps for Gradually Adding New Features

If you want to add a new feature in the future (e.g., "Leave Request", "Performance Score", or "Task Tracker"), follow these 3 steps:

### Step A: Define Types (Update `types.ts`)
Determine the necessary data structure for any feature first. For example, if you want to add a Leave Request:
```typescript
export interface LeaveRequest {
  pin: string;
  memberPin: string;
  memberName: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}
```

### Step B: Add Global State and Handlers (Update `App.tsx`)
Declare `useState` for new data and create action/handler functions to change it:
```typescript
const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

const handleApproveLeave = (requestPin: string) => {
  setLeaveRequests(prev => prev.map(req => 
    req.pin === requestPin ? { ...req, status: 'Approved' } : req
  ));
  toast.success('Leave request approved!');
};
```

### Step C: Pass Props to Sub-components or Dashboards
Now design the UI by passing data and handlers as props to the relevant dashboard (e.g., `ManagerDashboard` or `MemberDashboard`).

---

## 3. Important Coding Principles (Best Practices for Clean Code)

1. **Avoid Direct State Mutation**: Always follow React's immutable state pattern (e.g., `setNotices(prev => [...prev, newNotice])`).
2. **Lint and Type Safety**: After any code change, run `npm run lint` in the terminal to ensure the code is type-safe.
3. **Local Storage Backup**: If you want to persist any important data even after a browser reload, sync it with `localStorage` using `useEffect` in `App.tsx` (as done for campuses).

---

As a result, your system will always remain stable, and it will be possible to add any complex feature safely and gradually without crashing the app!
