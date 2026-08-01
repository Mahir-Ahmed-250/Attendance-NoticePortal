import mongoose, { Model } from "mongoose";

const UserSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["manager", "mentor", "member"], required: true },
  email: { type: String, required: true, lowercase: true },
  password: { type: String, default: "password" },
  avatarUrl: String,
  designation: String,
  permissions: [String],
  readNotifications: [String],
  campus: String,
  mentorPin: String, // For members and mentors
  isActive: { type: Boolean, default: true },
  otp: String,
  otpExpiry: Date,
});

const EmailSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true },
  toEmail: String,
  fromEmail: String,
  fromName: String,
  subject: String,
  body: String,
  date: String,
  isRead: { type: Boolean, default: false },
  recipientPin: String,
});

const AttendanceReportSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  campus: { type: String, required: true },
  postedBy: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
  records: [
    {
      memberPin: String,
      memberName: String,
      status: String,
      checkInTime: String,
      checkOutTime: String,
      notes: String,
      lateEntry: String,
      earlyLeave: String,
      workingHour: String,
      absentOrLeave: String,
      zone: String,
      remarks: String,
    },
  ],
});

const NoticeSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true },
  title: String,
  content: String,
  category: String,
  date: String,
  postedBy: {
    name: String,
    role: String,
  },
  campus: String,
});

const FeedbackSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true },
  reportPin: String,
  date: String,
  memberPin: String,
  memberName: String,
  mentorPin: String,
  mentorName: String,
  issueType: String,
  mentorComment: String,
  managerComment: String,
  status: { type: String, default: "Pending" },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const CampusSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  headCoordinatorPin: String,
  deputyCoordinatorPins: [String],
  deputyMemberAccess: { type: Map, of: [String] },
  coordinatorPins: [String],
});

const ProfileRequestSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true },
  userPin: String,
  userRole: String,
  currentName: String,
  currentPin: String,
  currentEmail: String,
  requestedName: String,
  requestedPin: String,
  requestedEmail: String,
  status: { type: String, default: "Pending" },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const AttendanceEditRequestSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true },
  reportPin: String,
  date: String,
  memberPin: String,
  memberName: String,
  coordinatorPin: String,
  coordinatorName: String,
  requestedStatus: String,
  requestedCheckIn: String,
  requestedCheckOut: String,
  reason: String,
  status: { type: String, default: "Pending" },
  createdAt: { type: String, default: () => new Date().toISOString() },
  managerComment: String,
});

const LeaveRequestSchema = new mongoose.Schema({
  pin: { type: String, required: true, unique: true },
  memberPin: String,
  memberName: String,
  coordinatorPin: String,
  coordinatorName: String,
  startDate: String,
  endDate: String,
  leaveType: String,
  reason: String,
  status: { type: String, default: "Pending" },
  createdAt: { type: String, default: () => new Date().toISOString() },
  managerComment: String,
  responsiblePersonPin: String,
  responsiblePersonName: String,
});


const BranchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  campusId: { type: String, default: null }, // ID of the campus it belongs to
});

const CallTaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sl: String,
  registrationNo: String,
  studentName: String,
  nickName: String,
  rollNo: String,
  gender: String,
  institute: String,
  fatherName: String,
  motherName: String,
  mobilePersonal: String,
  mobileFather: String,
  mobileMother: String,
  branch: String,
  className: String,
  assignedToPin: String,
  assignedToName: String,
  liveAssignedToPin: String,
  liveAssignedToName: String,
  liveInstructionStatus: { type: String, default: "Pending" },
  feedbackStatus: { type: String, default: "Pending" },
  feedbackComment: String,
  liveInstructionComment: String,
  liveInstructorName: String,
  liveInstructorPin: String,
  liveInstructionImage: String,
  liveInstructionLink: String,
  isLiveInstructorTeacher: Boolean,
  liveInstructionSubmitDate: String,
  feedbackSubmitDate: String,
  createdByPin: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
  completedAt: String,
});

export const User: Model<any> =
  mongoose.models.User || mongoose.model("User", UserSchema);

export const Email: Model<any> =
  mongoose.models.Email || mongoose.model("Email", EmailSchema);
export const AttendanceReport: Model<any> =
  mongoose.models.AttendanceReport ||
  mongoose.model("AttendanceReport", AttendanceReportSchema);
export const Notice: Model<any> =
  mongoose.models.Notice || mongoose.model("Notice", NoticeSchema);
export const Feedback: Model<any> =
  mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);
export const Campus: Model<any> =
  mongoose.models.Campus || mongoose.model("Campus", CampusSchema);
export const Branch: Model<any> =
  mongoose.models.Branch || mongoose.model("Branch", BranchSchema);
export const ProfileRequest: Model<any> =
  mongoose.models.ProfileRequest ||
  mongoose.model("ProfileRequest", ProfileRequestSchema);
export const AttendanceEditRequest: Model<any> =
  mongoose.models.AttendanceEditRequest ||
  mongoose.model("AttendanceEditRequest", AttendanceEditRequestSchema);
export const LeaveRequest: Model<any> =
  mongoose.models.LeaveRequest ||
  mongoose.model("LeaveRequest", LeaveRequestSchema);
export const CallTask: Model<any> =
  mongoose.models.CallTask || mongoose.model("CallTask", CallTaskSchema);
