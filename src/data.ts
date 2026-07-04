import { Mentor, TeamMember, AttendanceReport, Notice, AttendanceFeedback, User, Campus, DEFAULT_CAMPUSES } from './types';

export const MOCK_MANAGERS: User[] = [
  {
    pin: 'manager-1',
    name: 'Alice Vance',
    role: 'manager',
    email: 'manager@portal.com',
    password: 'password',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
  }
];

export const MOCK_MENTORS: Mentor[] = [];

export const MOCK_MEMBERS: TeamMember[] = [
  {
    pin: 'member-1',
    name: 'Alex Rivera',
    role: 'member',
    email: 'alex.rivera@portal.com',
    password: 'password',
    mentorPin: '',
    campus: 'Silicon Campus',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
  },
  {
    pin: 'member-2',
    name: 'Bianca Patel',
    role: 'member',
    email: 'bianca.patel@portal.com',
    password: 'password',
    mentorPin: '',
    campus: 'Silicon Campus',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  },
  {
    pin: 'member-3',
    name: 'Connor McDonald',
    role: 'member',
    email: 'connor.mcd@portal.com',
    password: 'password',
    mentorPin: '',
    campus: 'Main Campus',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'
  },
  {
    pin: 'member-4',
    name: 'Diana Prince',
    role: 'member',
    email: 'diana.p@portal.com',
    password: 'password',
    mentorPin: '',
    campus: 'Main Campus',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
  },
  {
    pin: 'member-5',
    name: 'Evan Wright',
    role: 'member',
    email: 'evan.wright@portal.com',
    password: 'password',
    mentorPin: '',
    campus: 'City Hub Campus',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'
  },
  {
    pin: 'member-6',
    name: 'Fiona Gallagher',
    role: 'member',
    email: 'fiona.g@portal.com',
    password: 'password',
    campus: 'Main Campus',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'
  }
];

export const MOCK_REPORTS: AttendanceReport[] = [
  {
    pin: 'report-1',
    date: '2026-06-25',
    campus: 'Silicon Campus',
    postedBy: 'Alice Vance (Manager)',
    createdAt: '2026-06-25T17:30:00Z',
    records: [
      {
        memberPin: 'member-1',
        memberName: 'Alex Rivera',
        status: 'Present',
        checkInTime: '08:55 AM',
        checkOutTime: '05:05 PM',
        notes: 'On time'
      },
      {
        memberPin: 'member-2',
        memberName: 'Bianca Patel',
        status: 'Finger Punch Missing',
        notes: 'Forgot keycard at entry'
      }
    ]
  },
  {
    pin: 'report-2',
    date: '2026-06-26',
    campus: 'Main Campus',
    postedBy: 'Alice Vance (Manager)',
    createdAt: '2026-06-26T17:35:00Z',
    records: [
      {
        memberPin: 'member-3',
        memberName: 'Connor McDonald',
        status: 'Absent',
        notes: 'Medical leave'
      },
      {
        memberPin: 'member-4',
        memberName: 'Diana Prince',
        status: 'Present',
        checkInTime: '08:45 AM',
        checkOutTime: '05:15 PM',
        notes: 'Excellent performance'
      },
      {
        memberPin: 'member-6',
        memberName: 'Fiona Gallagher',
        status: 'Present',
        checkInTime: '09:12 AM',
        checkOutTime: '05:00 PM',
        notes: 'Arrived slightly late'
      }
    ]
  },
  {
    pin: 'report-3',
    date: '2026-06-26',
    campus: 'Silicon Campus',
    postedBy: 'Alice Vance (Manager)',
    createdAt: '2026-06-26T17:40:00Z',
    records: [
      {
        memberPin: 'member-1',
        memberName: 'Alex Rivera',
        status: 'Late',
        checkInTime: '09:45 AM',
        checkOutTime: '05:00 PM',
        notes: 'Traffic delay'
      },
      {
        memberPin: 'member-2',
        memberName: 'Bianca Patel',
        status: 'Present',
        checkInTime: '08:58 AM',
        checkOutTime: '05:02 PM',
        notes: 'On time'
      }
    ]
  }
];

export const MOCK_NOTICES: Notice[] = [
  {
    pin: 'notice-1',
    title: 'Biometric Scanner Firmware Update This Weekend',
    content: 'Please note that the biometric entry system across all campuses will undergo system maintenance this Saturday from 10:00 AM to Sunday 4:00 PM. In case you are working on campus over the weekend, please use the manual physical sign-in sheet at the main reception desks.',
    category: 'Urgent',
    date: '2026-06-26',
    postedBy: {
      name: 'Alice Vance',
      role: 'manager'
    }
  },
  {
    pin: 'notice-3',
    title: 'Reminder: Standard Attendance Remediation Deadline',
    content: 'This is a gentle reminder to all mentors and members that attendance reviews for missing biometric punches must be raised by the mentoring group within 48 hours of the report post. Late feedback cannot be factored into the monthly progress stipend.',
    category: 'Attendance',
    date: '2026-06-24',
    postedBy: {
      name: 'Alice Vance',
      role: 'manager'
    }
  }
];

export const MOCK_FEEDBACKS: AttendanceFeedback[] = [];

export const MOCK_CAMPUSES: Campus[] = DEFAULT_CAMPUSES.map((name, index) => ({
  id: `campus-${index + 1}`,
  name
}));
