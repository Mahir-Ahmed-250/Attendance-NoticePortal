export type Role = 'manager' | 'mentor' | 'member';

export interface User {
  pin: string;
  name: string;
  role: Role;
  email: string;
  designation?: string;
  password?: string; // Credentials for authentication
  avatarUrl?: string;
  permissions?: string[]; // Custom permission codes
  isActive?: boolean;
}

export interface Mentor extends User {
  role: 'mentor';
  campus?: string;
  mentorPin?: string; // Assigned coordinator (usually a manager)
}

export interface TeamMember extends User {
  role: 'member';
  mentorPin?: string; // Assigned mentor
  campus?: string;   // Assigned campus
}

export interface EmailMessage {
  pin: string;
  toEmail: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Finger Punch Missing' | 'Late' | 'Late Entry' | 'Early Leave' | 'Half Day' | '< 6hr' | '< 10hrs' | 'Leave' | string;

export interface MemberAttendance {
  memberPin: string;
  memberName: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  lateEntry?: string;
  earlyLeave?: string;
  workingHour?: string;
  absentOrLeave?: string;
  zone?: string;
  remarks?: string;
}

export interface AttendanceReport {
  pin: string;
  date: string;
  campus: string;
  records: MemberAttendance[];
  postedBy: string; // manager name
  createdAt: string;
}

export type NoticeCategory = 'General' | 'Urgent' | 'Holiday' | 'Attendance' | 'System';

export interface Notice {
  pin: string;
  title: string;
  content: string;
  category: NoticeCategory;
  date: string;
  postedBy: {
    name: string;
    role: Role;
    pin: string;
  };
  campus?: string; // Optional filter
}

export type FeedbackStatus = 'Pending' | 'Reviewed' | 'Resolved';

export interface AttendanceFeedback {
  pin: string;
  reportPin: string;
  date: string;
  memberPin: string;
  memberName: string;
  mentorPin: string;
  mentorName: string;
  issueType: 'Finger Punch Missing' | 'Absent' | 'Other';
  mentorComment: string;
  managerComment?: string;
  status: FeedbackStatus;
  createdAt: string;
}

export interface Campus {
  id: string;
  name: string;
  headCoordinatorPin?: string;
  deputyCoordinatorPins?: string[];
  deputyMemberAccess?: Record<string, string[]>; // Mapping of deputy PIN to list of member PINs they can access
  coordinatorPins?: string[]; // Legacy field for compatibility
}

export const DEFAULT_CAMPUSES = [
  'Main Campus',
  'Silicon Campus',
  'City Hub Campus',
  'East Side Campus'
];

export interface ProfileRequest {
  pin: string;
  userPin: string; // The user PIN requesting change
  userRole: Role;
  currentName: string;
  currentPin: string; // current pin
  requestedName: string;
  requestedPin: string; // requested pin
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface AttendanceEditRequest {
  pin: string;
  reportPin: string;
  date: string;
  memberPin: string;
  memberName: string;
  coordinatorPin: string;
  coordinatorName: string;
  requestedStatus: AttendanceStatus;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  managerComment?: string;
  campus?: string;
  remarks?: string;
}

export interface LeaveRequest {
  pin: string;
  memberPin: string;
  memberName: string;
  coordinatorPin: string;
  coordinatorName: string;
  startDate: string;
  endDate: string;
  leaveType: 'Casual' | 'Medical' | 'Special' | 'Paternity' | 'Maternity' | 'Earn' | 'Weekend Adjustment' | 'Holiday Adjustment' | 'Sick' | 'Emergency' | 'Maternity/Paternity' | 'Other' | string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  managerComment?: string;
  responsiblePersonPin?: string;
  responsiblePersonName?: string;
}


