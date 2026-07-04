import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Mentor, TeamMember, AttendanceReport, AttendanceFeedback, Notice, Role, AttendanceStatus, EmailMessage, ProfileRequest, MemberAttendance, AttendanceEditRequest, LeaveRequest, Campus, DEFAULT_CAMPUSES, User } from './types';
import { MOCK_MANAGERS, MOCK_MENTORS, MOCK_MEMBERS, MOCK_REPORTS, MOCK_NOTICES, MOCK_FEEDBACKS, MOCK_CAMPUSES } from './data';
import ManagerDashboard from './components/ManagerDashboard';
import MentorDashboard from './components/MentorDashboard';
import MemberDashboard from './components/MemberDashboard';
import { UserAvatar } from './components/UserAvatar';
import { ShieldAlert, Users, Landmark, FileText, ClipboardList, RefreshCw, LogIn, LogOut, Lock, KeyRound, Shield, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';

import { api } from './lib/api';

export default function App() {
  // --- STATE WITH API PERSISTENCE ---
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [feedbacks, setFeedbacks] = useState<AttendanceFeedback[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [profileRequests, setProfileRequests] = useState<ProfileRequest[]>([]);
  const [attendanceEditRequests, setAttendanceEditRequests] = useState<AttendanceEditRequest[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSeeding = React.useRef(false);

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          usersData,
          reportsData,
          noticesData,
          campusesData,
          profileReqs,
          editReqs,
          leaveReqs,
          emailsData
        ] = await Promise.all([
          api.users.getAll(),
          api.reports.getAll(),
          api.notices.getAll(),
          api.campuses.getAll(),
          api.requests.profile.getAll(),
          api.requests.edit.getAll(),
          api.requests.leave.getAll(),
          api.emails.getAll()
        ]);

        // If database is empty, seed from mock data
        if (usersData.length === 0 && campusesData.length === 0 && !isSeeding.current) {
          isSeeding.current = true;
          console.log("Database empty, seeding...");
          await api.seed({
            managers: MOCK_MANAGERS,
            mentors: MOCK_MENTORS,
            members: MOCK_MEMBERS,
            reports: MOCK_REPORTS,
            notices: MOCK_NOTICES,
            campuses: MOCK_CAMPUSES
          });
          // Re-fetch after seed
          window.location.reload();
          return;
        }

        setMembers(usersData.filter((u: any) => u.role === 'member'));
        setMentors(usersData.filter((u: any) => u.role === 'mentor'));
        setManagers(usersData.filter((u: any) => u.role === 'manager'));
        setReports(reportsData);
        setNotices(noticesData);
        setCampuses(campusesData);
        setProfileRequests(profileReqs);
        setAttendanceEditRequests(editReqs);
        setLeaveRequests(leaveReqs);
        setEmails(emailsData);

        // Check logged in user from local storage (just for session, data is in DB)
        const savedUser = localStorage.getItem('portal_logged_in_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          // Refresh user data from DB
          const currentUser = usersData.find((u: any) => u.pin === parsed.pin) || MOCK_MANAGERS.find(m => m.pin === parsed.pin);
          if (currentUser) {
            setLoggedInUser({ ...currentUser, role: parsed.role });
          }
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        toast.error("Failed to connect to database!");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const user = await api.auth.login({ email: loginEmail, password: loginPassword });
      setLoggedInUser(user);
      localStorage.setItem('portal_logged_in_user', JSON.stringify(user));
      toast.success('লগইন সফল হয়েছে!');
    } catch (err: any) {
      if (err.message.includes('Database not connected')) {
        setLoginError('ডাটাবেস কানেক্ট করা নেই! অনুগ্রহ করে Settings থেকে MONGODB_URI সেট করুন। (Database not connected! Please set MONGODB_URI in Settings.)');
      } else if (err.message.includes('Invalid credentials')) {
        setLoginError('অবৈধ ইমেইল বা পাসওয়ার্ড! (Invalid Email or Password!)');
      } else if (err.message.includes('permission')) {
        setLoginError('আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। লগইন করার অনুমতি নেই, আপনার মেন্টরের সাথে যোগাযোগ করুন। (Your account is disabled. You do not have permission to log in, please contact your mentor.)');
      } else {
        setLoginError('সার্ভার ত্রুটি! কিছুক্ষণ পর আবার চেষ্টা করুন। (Server error! Please try again later.)');
      }
      console.error("Login Error Details:", err);
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('portal_logged_in_user');
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
  };


  // --- PROFILE LOGIC HANDLERS ---
  const handleSubmitProfileRequest = async (requestedName: string, requestedPin: string) => {
    if (!loggedInUser) return;
    const newRequest: ProfileRequest = {
      pin: `req-${Date.now()}`,
      userPin: loggedInUser.pin,
      userRole: loggedInUser.role === 'member' ? 'member' : 'mentor',
      currentName: loggedInUser.name,
      currentPin: loggedInUser.pin, 
      requestedName: requestedName.trim(),
      requestedPin: requestedPin.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    try {
      const saved = await api.requests.profile.create(newRequest);
      setProfileRequests(prev => [saved, ...(prev || [])]);
      toast.success('প্রোফাইল আপডেটের অনুরোধ পাঠানো হয়েছে।');
    } catch (err) {
      toast.error('অনুরোধ পাঠাতে ব্যর্থ হয়েছে।');
    }
  };

  const handleApproveProfileRequest = async (requestPin: string) => {
    const req = profileRequests.find(r => r.pin === requestPin);
    if (!req) return;

    try {
      // Check if requested PIN is already taken
      const allUsers = [...members, ...mentors, ...managers];
      const isTaken = allUsers.some(m => m.pin.toLowerCase() === req.requestedPin.toLowerCase() && m.pin.toLowerCase() !== req.userPin.toLowerCase());
      
      if (isTaken) {
        toast.error('অনুরোধকৃত পিন ইতিমধ্যে বিদ্যমান। (Requested PIN already exists.)');
        return;
      }

      // 1. Find the user to update
      const userToUpdate = allUsers.find(u => u.pin === req.userPin);
      if (userToUpdate) {
        const updatedFields = { name: req.requestedName, pin: req.requestedPin };
        await api.users.update(req.userPin, { ...userToUpdate, ...updatedFields });
        
        // 2. Update local lists
        if (req.userRole === 'member') {
          setMembers(prev => (prev || []).map(m => m.pin === req.userPin ? { ...m, ...updatedFields } : m));
        } else if (req.userRole === 'mentor') {
          setMentors(prev => (prev || []).map(m => m.pin === req.userPin ? { ...m, ...updatedFields } : m));
        }
      }

      // 3. Update request status to Approved
      const updatedReq = await api.requests.profile.update(requestPin, { ...req, status: 'Approved' });
      setProfileRequests(prev => (prev || []).map(r => r.pin === requestPin ? updatedReq : r));
      
      toast.success('অনুরোধ অনুমোদন করা হয়েছে এবং প্রোফাইল আপডেট করা হয়েছে।');
    } catch (err) {
      toast.error('অনুরোধ অনুমোদন করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleRejectProfileRequest = async (requestPin: string) => {
    const req = profileRequests.find(r => r.pin === requestPin);
    if (!req) return;
    try {
      const updated = await api.requests.profile.update(requestPin, { ...req, status: 'Rejected' });
      setProfileRequests(prev => (prev || []).map(r => r.pin === requestPin ? updated : r));
      toast.success('অনুরোধ প্রত্যাখ্যান করা হয়েছে।');
    } catch (err) {
      toast.error('ব্যর্থ হয়েছে।');
    }
  };

  const handleDeleteProfileRequest = async (requestPin: string) => {
    try {
      await api.requests.profile.delete(requestPin);
      setProfileRequests(prev => (prev || []).filter(r => r.pin !== requestPin));
      toast.success('অনুরোধ মুছে ফেলা হয়েছে।');
    } catch (err) {
      toast.error('মুছে ফেলতে ব্যর্থ হয়েছে।');
    }
  };

  const handleInstantUpdate = async (updatedFields: Partial<any>) => {
    if (!loggedInUser) return;
    
    try {
      const updatedUser = await api.users.update(loggedInUser.pin, { ...loggedInUser, ...updatedFields });
      setLoggedInUser(updatedUser);
      localStorage.setItem('portal_logged_in_user', JSON.stringify(updatedUser));

      if (loggedInUser.role === 'mentor') {
        setMentors(prev => (prev || []).map(m => m.pin === loggedInUser.pin ? updatedUser : m));
      } else if (loggedInUser.role === 'member') {
        setMembers(prev => (prev || []).map(m => m.pin === loggedInUser.pin ? updatedUser : m));
      } else if (loggedInUser.role === 'manager') {
        setManagers(prev => (prev || []).map(m => m.pin === loggedInUser.pin ? updatedUser : m));
      }
      toast.success('প্রোফাইল আপডেট করা হয়েছে!');
    } catch (err) {
      toast.error('প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে।');
    }
  };

  // Derive active roles and objects
  const activeRole: Role | null = loggedInUser ? loggedInUser.role : null;
  const activeMentorPin = loggedInUser && loggedInUser.role === 'mentor' ? loggedInUser.pin : '';
  const activeMemberPin = loggedInUser && loggedInUser.role === 'member' ? loggedInUser.pin : '';

  // Synchronize state with DB (localStorage sync removed as requested)


  // --- STATE MUTATORS ---

  // Submit attendance edit request (Campus Coordinators)
  const handleSubmitAttendanceEditRequest = async (newRequest: AttendanceEditRequest) => {
    try {
      const saved = await api.requests.edit.create(newRequest);
      setAttendanceEditRequests(prev => [saved, ...(prev || [])]);
      toast.success('Attendance edit request submitted to Manager.');
    } catch (err) {
      toast.error('Failed to submit request.');
    }
  };

  // Resolve attendance edit request (Manager)
  const handleResolveAttendanceEditRequest = async (requestPin: string, status: 'Pending' | 'Approved' | 'Rejected', managerComment?: string) => {
    try {
      const req = attendanceEditRequests.find(r => r.pin === requestPin);
      if (!req) return;

      const updated = await api.requests.edit.update(requestPin, { ...req, status, managerComment });
      setAttendanceEditRequests(prev => (prev || []).map(r => r.pin === requestPin ? updated : r));

      if (status === 'Approved') {
        const report = reports.find(r => r.pin === req.reportPin);
        if (report) {
          const updatedRecords = report.records.map(rec => {
            if (rec.memberPin === req.memberPin) {
              return { 
                ...rec, 
                status: req.requestedStatus,
                checkInTime: req.requestedCheckIn !== undefined ? req.requestedCheckIn : rec.checkInTime,
                checkOutTime: req.requestedCheckOut !== undefined ? req.requestedCheckOut : rec.checkOutTime
              };
            }
            return rec;
          });
          const updatedReport = await api.reports.update(report.pin, { ...report, records: updatedRecords });
          setReports(prev => (prev || []).map(r => r.pin === report.pin ? updatedReport : r));
        }
        toast.success('Attendance updated based on approved request!');
      } else if (status === 'Rejected') {
        toast.error('Edit request has been rejected.');
      }
    } catch (err) {
      toast.error('Failed to resolve request.');
    }
  };

  const handleDeleteAttendanceEditRequest = async (requestPin: string) => {
    try {
      await api.requests.edit.delete(requestPin);
      setAttendanceEditRequests(prev => (prev || []).filter(req => req.pin !== requestPin));
      toast.success('Attendance edit request deleted successfully.');
    } catch (err) {
      toast.error('Failed to delete attendance edit request.');
    }
  };

  const handleUpdateAttendanceEditRequest = async (updatedRequest: AttendanceEditRequest) => {
    try {
      const saved = await api.requests.edit.update(updatedRequest.pin, updatedRequest);
      setAttendanceEditRequests(prev => (prev || []).map(req => req.pin === updatedRequest.pin ? saved : req));
      toast.success('Attendance edit request updated successfully.');
    } catch (err) {
      toast.error('Failed to update request.');
    }
  };

  // Submit leave request (Campus Coordinators)
  const handleSubmitLeaveRequest = async (newRequest: LeaveRequest) => {
    try {
      const saved = await api.requests.leave.create(newRequest);
      setLeaveRequests(prev => [saved, ...(prev || [])]);
      toast.success('Leave request submitted to Manager.');
    } catch (err) {
      toast.error('Failed to submit leave request.');
    }
  };

  // Resolve leave request (Manager)
  const handleResolveLeaveRequest = async (requestPin: string, status: 'Pending' | 'Approved' | 'Rejected', managerComment?: string) => {
    try {
      const req = leaveRequests.find(r => r.pin === requestPin);
      if (!req) return;
      const updated = await api.requests.leave.update(requestPin, { ...req, status, managerComment });
      setLeaveRequests(prev => (prev || []).map(r => r.pin === requestPin ? updated : r));
      
      const requester = members.find(m => m.pin === req.memberPin) || mentors.find(m => m.pin === req.memberPin);
      if (requester && requester.campus) {
        const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
          const dates: string[] = [];
          const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
          const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);

          const start = new Date(sYear, sMonth - 1, sDay, 12, 0, 0);
          const end = new Date(eYear, eMonth - 1, eDay, 12, 0, 0);

          const current = new Date(start);
          while (current <= end) {
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${d}`);
            current.setDate(current.getDate() + 1);
          }
          return dates;
        };

        const dates = getDatesInRange(req.startDate, req.endDate);
        const updatedReports = [...reports];
        let updatedAny = false;

        for (const d of dates) {
          const reportIdx = updatedReports.findIndex(r => r.date === d && r.campus === requester.campus);
          if (reportIdx !== -1) {
            const report = updatedReports[reportIdx];
            const updatedRecords = report.records.map(rec => {
              if (rec.memberPin === req.memberPin) {
                if (status === 'Approved') {
                  return {
                    ...rec,
                    status: 'Leave',
                    absentOrLeave: req.leaveType,
                  };
                } else {
                  return {
                    ...rec,
                    status: '',
                    absentOrLeave: '',
                  };
                }
              }
              return rec;
            });

            const updatedReport = await api.reports.update(report.pin, { ...report, records: updatedRecords });
            updatedReports[reportIdx] = updatedReport;
            updatedAny = true;
          }
        }

        if (updatedAny) {
          setReports(updatedReports);
        }
      }

      if (status === 'Approved') {
        toast.success('Leave request has been approved.');
      } else if (status === 'Rejected') {
        toast.error('Leave request has been rejected.');
      } else {
        toast('Leave request set back to pending.');
      }
    } catch (err) {
      toast.error('Failed to resolve leave request.');
    }
  };

  const handleDeleteLeaveRequest = async (requestPin: string) => {
    try {
      await api.requests.leave.delete(requestPin);
      setLeaveRequests(prev => (prev || []).filter(req => req.pin !== requestPin));
      toast.success('Leave request deleted successfully.');
    } catch (err) {
      toast.error('Failed to delete leave request.');
    }
  };

  const handleUpdateLeaveRequest = async (updatedRequest: LeaveRequest) => {
    try {
      const saved = await api.requests.leave.update(updatedRequest.pin, updatedRequest);
      setLeaveRequests(prev => (prev || []).map(req => req.pin === updatedRequest.pin ? saved : req));
      
      if (saved.status === 'Approved') {
        const requester = members.find(m => m.pin === saved.memberPin) || mentors.find(m => m.pin === saved.memberPin);
        if (requester && requester.campus) {
          const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
            const dates: string[] = [];
            const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
            const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);
            const start = new Date(sYear, sMonth - 1, sDay, 12, 0, 0);
            const end = new Date(eYear, eMonth - 1, eDay, 12, 0, 0);
            const current = new Date(start);
            while (current <= end) {
              const y = current.getFullYear();
              const m = String(current.getMonth() + 1).padStart(2, '0');
              const d = String(current.getDate()).padStart(2, '0');
              dates.push(`${y}-${m}-${d}`);
              current.setDate(current.getDate() + 1);
            }
            return dates;
          };
          const dates = getDatesInRange(saved.startDate, saved.endDate);
          const updatedReports = [...reports];
          let updatedAny = false;
          for (const d of dates) {
            const reportIdx = updatedReports.findIndex(r => r.date === d && r.campus === requester.campus);
            if (reportIdx !== -1) {
              const report = updatedReports[reportIdx];
              const updatedRecords = report.records.map(rec => {
                if (rec.memberPin === saved.memberPin) {
                  return {
                    ...rec,
                    status: 'Leave',
                    absentOrLeave: saved.leaveType,
                    checkInTime: '-',
                    checkOutTime: '-',
                    workingHour: '-',
                    lateEntry: '-',
                    earlyLeave: '-'
                  };
                }
                return rec;
              });
              const updatedReport = await api.reports.update(report.pin, { ...report, records: updatedRecords });
              updatedReports[reportIdx] = updatedReport;
              updatedAny = true;
            }
          }
          if (updatedAny) {
            setReports(updatedReports);
          }
        }
      }
      
      toast.success('Leave request updated successfully.');
    } catch (err) {
      toast.error('Failed to update leave request.');
    }
  };

  // 1. Post a new attendance report (Manager)
  const handleAddReport = async (newReport: AttendanceReport) => {
    try {
      const existing = reports.find(r => r.date === newReport.date && r.campus === newReport.campus);
      if (existing) {
        const mergedRecords = [...existing.records];
        newReport.records.forEach(newRec => {
          const idx = mergedRecords.findIndex(r => r.memberPin === newRec.memberPin);
          if (idx !== -1) mergedRecords[idx] = newRec;
          else mergedRecords.push(newRec);
        });
        const updated = await api.reports.update(existing.pin, { ...existing, records: mergedRecords });
        setReports(prev => (prev || []).map(r => r.pin === existing.pin ? updated : r));
      } else {
        const saved = await api.reports.create(newReport);
        setReports(prev => [saved, ...(prev || [])]);
      }
    } catch (err) {
      toast.error('Failed to save report.');
    }
  };

  const handleAddAttendanceRecord = async (date: string, campus: string, record: MemberAttendance) => {
    try {
      const existingReport = reports.find(r => r.date === date && r.campus === campus);
      if (existingReport) {
        const recIndex = existingReport.records.findIndex(r => r.memberPin === record.memberPin);
        let newRecords = [...existingReport.records];
        if (recIndex !== -1) newRecords[recIndex] = record;
        else newRecords.push(record);
        const updated = await api.reports.update(existingReport.pin, { ...existingReport, records: newRecords });
        setReports(prev => (prev || []).map(r => r.pin === existingReport.pin ? updated : r));
      } else {
        const newReport: AttendanceReport = {
          pin: `report-${Date.now()}`,
          date,
          campus,
          records: [record],
          postedBy: loggedInUser?.name || 'Manager',
          createdAt: new Date().toISOString()
        };
        const saved = await api.reports.create(newReport);
        setReports(prev => [saved, ...(prev || [])]);
      }
      toast.success('Attendance record added/updated.');
    } catch (err) {
      toast.error('Failed to save attendance record.');
    }
  };

  // 2. Direct modification of attendance record status in response to resolved feedback (Manager)
  const handleUpdateReportStatus = async (reportPin: string, memberPin: string, newStatus: AttendanceStatus) => {
    try {
      const report = reports.find(r => r.pin === reportPin);
      if (!report) return;
      const updatedRecords = report.records.map(rec => {
        if (rec.memberPin === memberPin) {
          return {
            ...rec,
            status: newStatus,
            notes: rec.notes ? `${rec.notes} (Corrected to ${newStatus} by Manager)` : `Corrected to ${newStatus} by Manager`
          };
        }
        return rec;
      });
      const updated = await api.reports.update(reportPin, { ...report, records: updatedRecords });
      setReports(prev => (prev || []).map(r => r.pin === reportPin ? updated : r));
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const handleDeleteAttendanceRecord = async (reportPin: string, memberPin: string) => {
    try {
      const report = reports.find(r => r.pin === reportPin);
      if (!report) return;
      const updatedRecords = report.records.filter(rec => rec.memberPin !== memberPin);
      if (updatedRecords.length === 0) {
        await api.reports.delete(reportPin);
        setReports(prev => (prev || []).filter(r => r.pin !== reportPin));
      } else {
        const updated = await api.reports.update(reportPin, { ...report, records: updatedRecords });
        setReports(prev => (prev || []).map(r => r.pin === reportPin ? updated : r));
      }
      toast.success('Attendance record deleted.');
    } catch (err) {
      toast.error('Failed to delete record.');
    }
  };

  const handleDeleteReport = async (date: string, campus: string) => {
    try {
      const toDelete = reports.filter(r => r.date === date && (campus === 'All' || r.campus === campus));
      await Promise.all(toDelete.map(r => api.reports.delete(r.pin)));
      setReports(prev => (prev || []).filter(r => !(r.date === date && (campus === 'All' || r.campus === campus))));
      toast.success(`Attendance report(s) for ${date} deleted.`);
    } catch (err) {
      toast.error('Failed to delete reports.');
    }
  };

  const handleUpdateAttendanceRecord = async (reportPin: string, memberPin: string, updatedRecord: MemberAttendance) => {
    try {
      const report = reports.find(r => r.pin === reportPin);
      if (!report) return;
      const updatedRecords = report.records.map(rec => rec.memberPin === memberPin ? updatedRecord : rec);
      const updated = await api.reports.update(reportPin, { ...report, records: updatedRecords });
      setReports(prev => (prev || []).map(r => r.pin === reportPin ? updated : r));
      toast.success('Attendance record updated.');
    } catch (err) {
      toast.error('Failed to update record.');
    }
  };

  // 3. Assign a team member to a mentor and campus (Manager)
  const handleUpdateAssignment = async (memberPin: string, mentorPin: string, campus: string) => {
    try {
      const member = members.find(m => m.pin === memberPin);
      if (!member) return;
      const updated = await api.users.update(memberPin, { ...member, mentorPin, campus });
      setMembers(prev => (prev || []).map(m => m.pin === memberPin ? updated : m));
      toast.success('Assignment updated.');
    } catch (err) {
      toast.error('Failed to update assignment.');
    }
  };

  // 4. Resolve feedback tickets raised by mentors (Manager)
  const handleResolveFeedback = async (feedbackPin: string, managerComment: string, status: 'Resolved' | 'Reviewed') => {
    try {
      const fb = feedbacks.find(f => f.pin === feedbackPin);
      if (!fb) return;
      const updated = await api.feedbacks.update(feedbackPin, { ...fb, managerComment, status });
      setFeedbacks(prev => (prev || []).map(f => f.pin === feedbackPin ? updated : f));
    } catch (err) {
      toast.error('Failed to resolve feedback.');
    }
  };

  // 5. Submit feedback tickets (Mentors)
  const handleSubmitFeedback = async (newFeedback: AttendanceFeedback) => {
    try {
      const saved = await api.feedbacks.create(newFeedback);
      setFeedbacks(prev => [saved, ...(prev || [])]);
    } catch (err) {
      toast.error('Failed to submit feedback.');
    }
  };

  // 6. Post bulletin board notices (Managers & Mentors)
  const handleAddNotice = async (noticeDetails: Omit<Notice, 'pin' | 'date' | 'postedBy'>) => {
    if (!loggedInUser || !activeRole) return;
    const authorName = loggedInUser.name;

    const newNotice: Notice = {
      ...noticeDetails,
      pin: `notice-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      postedBy: {
        name: authorName,
        role: activeRole
      }
    };
    
    try {
      const saved = await api.notices.create(newNotice);
      setNotices(prev => [saved, ...(prev || [])]);

      // Email notifications
      if (activeRole === 'manager') {
        const recipients = [...mentors, ...members];
        const emailPromises = recipients.map(r => api.emails.create({
          pin: `email-${r.pin}-${Date.now()}`,
          toEmail: r.email,
          fromEmail: 'manager@portal.com',
          fromName: `${authorName} (Manager)`,
          subject: `🔔 PORTAL NOTIFICATION: ${noticeDetails.title}`,
          body: `Dear ${r.name},\n\nA new notice has been posted: ${noticeDetails.title}\n\n${noticeDetails.content}`,
          date: new Date().toISOString(),
          isRead: false
        }));
        
        await Promise.all(emailPromises);
        const freshEmails = await api.emails.getAll();
        setEmails(freshEmails);
      }
      toast.success('Notice posted.');
    } catch (err) {
      toast.error('Failed to post notice.');
    }
  };

  const handleDeleteNotice = async (noticePin: string) => {
    try {
      await api.notices.delete(noticePin);
      setNotices(prev => (prev || []).filter(n => n.pin !== noticePin));
      toast.success("নোটিশ সফলভাবে ডিলিট করা হয়েছে!");
    } catch (err) {
      toast.error("Failed to delete notice.");
    }
  };

  const handleUpdateNotice = async (updatedNotice: Notice) => {
    try {
      const saved = await api.notices.update(updatedNotice.pin, updatedNotice);
      setNotices(prev => (prev || []).map(n => n.pin === updatedNotice.pin ? saved : n));
      toast.success("নোটিশ আপডেট করা হয়েছে!");
    } catch (err) {
      toast.error("Failed to update notice.");
    }
  };

  // --- ROSTER CRUD MUTATORS ---
  const handleAddMember = async (newMember: TeamMember) => {
    if (!newMember.campus) {
      toast.error('টিম মেম্বার যোগ করার জন্য ক্যাম্পাস সিলেক্ট করা বাধ্যতামূলক! (Campus is required)');
      return;
    }
    try {
      const saved = await api.users.create({ ...newMember, role: 'member' });
      setMembers(prev => [...(prev || []), saved]);
      toast.success('টিম মেম্বার সফলভাবে যোগ করা হয়েছে!');
    } catch (err) {
      toast.error('Failed to add member.');
    }
  };

  const handleUpdateMember = async (oldPin: string, updatedMember: TeamMember) => {
    if (!updatedMember.campus) {
      toast.error('টিম মেম্বার আপডেট করার জন্য ক্যাম্পাস সিলেক্ট করা বাধ্যতামূলক! (Campus is required)');
      return;
    }
    try {
      const saved = await api.users.update(oldPin, updatedMember);
      setMembers(prev => (prev || []).map(m => m.pin === oldPin ? saved : m));
      toast.success('টিম মেম্বার আপডেট করা হয়েছে!');
    } catch (err) {
      toast.error('Failed to update member.');
    }
  };

  const handleDeleteMember = async (memberPin: string) => {
    try {
      await api.users.delete(memberPin);
      setMembers(prev => (prev || []).filter(m => m.pin !== memberPin));
      toast.success('টিম মেম্বার সফলভাবে ডিলিট করা হয়েছে! (Team member deleted successfully!)');
    } catch (err) {
      toast.error('Failed to delete member.');
    }
  };

  const handleAddMentor = async (newMentor: Mentor) => {
    try {
      const campusName = newMentor.campus;
      const existingCoord = campusName 
        ? (mentors || []).find(m => m.campus === campusName && m.pin !== newMentor.pin)
        : null;
      
      const managerPin = managers[0]?.pin || 'manager-1';
      const finalMentor: Mentor = {
        ...newMentor,
        role: 'mentor',
        mentorPin: newMentor.mentorPin || (existingCoord ? existingCoord.pin : managerPin)
      };
      const saved = await api.users.create(finalMentor);
      setMentors(prev => [...(prev || []), saved]);
      toast.success('ক্যাম্পাস কোঅর্ডিনেটর যোগ করা হয়েছে!');
    } catch (err) {
      toast.error('Failed to add mentor.');
    }
  };

  const handleUpdateMentor = async (oldPin: string, updatedMentor: Mentor) => {
    try {
      const campusName = updatedMentor.campus;
      const existingCoord = campusName 
        ? (mentors || []).find(m => m.campus === campusName && m.pin !== updatedMentor.pin && m.pin !== oldPin)
        : null;
      
      const managerPin = managers[0]?.pin || 'manager-1';
      const finalMentor: Mentor = {
        ...updatedMentor,
        mentorPin: updatedMentor.mentorPin || (existingCoord ? existingCoord.pin : managerPin)
      };

      const saved = await api.users.update(oldPin, finalMentor);
      setMentors(prev => (prev || []).map(m => m.pin === oldPin ? saved : m));
      toast.success('কোঅর্ডিনেটর আপডেট করা হয়েছে!');
    } catch (err) {
      toast.error('Failed to update mentor.');
    }
  };

  const handleDeleteMentor = async (mentorPin: string) => {
    try {
      await api.users.delete(mentorPin);
      setMentors(prev => (prev || []).filter(m => m.pin !== mentorPin));
      toast.success('ক্যাম্পাস কোঅর্ডিনেটর সফলভাবে ডিলিট করা হয়েছে! (Campus Coordinator deleted successfully!)');
    } catch (err) {
      toast.error('Failed to delete mentor.');
    }
  };

  const handleChangeUserRole = async (oldPin: string, oldRole: Role, newRole: Role, userData: any) => {
    if (oldRole === newRole) return;
    
    try {
      if (oldRole === 'member' && newRole === 'mentor') {
        const campusName = userData.campus;
        const existingCoord = campusName 
          ? (mentors || []).find(m => m.campus === campusName && m.pin !== oldPin)
          : null;

        const managerPin = managers[0]?.pin || 'manager-1';

        const updatedMentor: Mentor = {
          ...userData,
          role: 'mentor',
          mentorPin: existingCoord ? existingCoord.pin : managerPin,
          permissions: ['mentor_attendance', 'mentor_notices', 'mentor_history', 'mentor_emails']
        };
        const saved = await api.users.update(oldPin, updatedMentor);
        setMembers(prev => (prev || []).filter(m => m.pin !== oldPin));
        setMentors(prev => [...(prev || []), saved]);
        toast.success('মেম্বারকে সফলভাবে ক্যাম্পাস কো-অর্ডিনেটরে পরিবর্তন করা হয়েছে!');
      } else if (oldRole === 'mentor' && newRole === 'member') {
        const assignedCampus = campuses.find(c => c.coordinatorPins?.includes(oldPin));
        if (assignedCampus) {
          toast.error(`এই কো-অর্ডিনেটর '${assignedCampus.name}' ক্যাম্পাসে এসাইন করা আছে। মেম্বার করার আগে ক্যাম্পাস সেটিং থেকে তাকে সরিয়ে দিন।`);
          return;
        }
        
        const updatedMember: TeamMember = {
          ...userData,
          role: 'member',
          permissions: ['member_attendance', 'member_notices', 'member_emails']
        };
        const saved = await api.users.update(oldPin, updatedMember);
        setMentors(prev => (prev || []).filter(m => m.pin !== oldPin));
        setMembers(prev => [...(prev || []).filter(m => m.pin !== oldPin), saved]);
        toast.success('ক্যাম্পাস কো-অর্ডিনেটরকে সফলভাবে মেম্বারে পরিবর্তন করা হয়েছে!');
      }
    } catch (err) {
      toast.error('Failed to change role.');
    }
  };

  const handleAddCampus = async (campusName: string, headCoordinatorPin?: string, deputyCoordinatorPins?: string[], deputyMemberAccess?: Record<string, string[]>) => {
    const trimmed = campusName.trim();
    if (!trimmed) return;
    if (campuses.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('এই নামের ক্যাম্পাস ইতিমধ্যে আছে।');
      return;
    }
    const newCampus: Campus = { 
      id: `campus-${Date.now()}`, 
      name: trimmed, 
      headCoordinatorPin,
      deputyCoordinatorPins,
      deputyMemberAccess,
      coordinatorPins: headCoordinatorPin ? [headCoordinatorPin, ...(deputyCoordinatorPins || [])] : (deputyCoordinatorPins || [])
    };
    try {
      const saved = await api.campuses.create(newCampus);
      setCampuses(prev => [...(prev || []), saved]);
      toast.success('ক্যাম্পাস সফলভাবে তৈরি করা হয়েছে!');
    } catch (err) {
      toast.error('Failed to add campus.');
    }
  };

  const handleUpdateCampus = async (oldName: string, newName: string, headCoordinatorPin?: string, deputyCoordinatorPins?: string[], deputyMemberAccess?: Record<string, string[]>) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    
    const campus = campuses.find(c => c.name === oldName);
    if (!campus) return;

    const allCoordinatorPins = headCoordinatorPin ? [headCoordinatorPin, ...(deputyCoordinatorPins || [])] : (deputyCoordinatorPins || []);
    
    const updatedCampus: Campus = {
      ...campus,
      name: trimmed, 
      headCoordinatorPin, 
      deputyCoordinatorPins,
      deputyMemberAccess,
      coordinatorPins: allCoordinatorPins
    };

    try {
      const saved = await api.campuses.update(campus.id, updatedCampus);
      
      // Update local campuses state
      setCampuses(prev => (prev || []).map(c => c.id === campus.id ? saved : c));
      
      // Sync roles: If someone is now a coordinator, they should be a mentor.
      // If someone was a coordinator but isn't anymore, they should be a member.
      const allCampusesAfterUpdate = (campuses || []).map(c => c.id === campus.id ? saved : c);
      
      // 1. Collect all current coordinators across all campuses
      const allCoordinatorsSet = new Set<string>();
      allCampusesAfterUpdate.forEach(c => {
        if (c.headCoordinatorPin) allCoordinatorsSet.add(c.headCoordinatorPin);
        if (c.deputyCoordinatorPins) c.deputyCoordinatorPins.forEach(p => allCoordinatorsSet.add(p));
        if (c.coordinatorPins) c.coordinatorPins.forEach(p => allCoordinatorsSet.add(p));
      });

      // 2. Update users who should be mentors
      const usersToPromote = [...members, ...mentors].filter(u => allCoordinatorsSet.has(u.pin) && u.role === 'member');
      for (const user of usersToPromote) {
        await api.users.update(user.pin, { ...user, role: 'mentor' });
      }

      // 3. Update users who should be members (were mentors but no longer coordinators)
      // Note: We avoid downgrading managers
      const usersToDemote = mentors.filter(u => !allCoordinatorsSet.has(u.pin) && u.role === 'mentor');
      for (const user of usersToDemote) {
        await api.users.update(user.pin, { ...user, role: 'member' });
      }

      // 4. Update mentorPin for all members in this campus
      const managerPin = managers[0]?.pin || 'manager-1';

      const allUsers = await api.users.getAll();
      const membersInCampus = allUsers.filter((m: any) =>
        m.campus === oldName &&
        (m.role === 'member' || m.role === 'mentor')
      );

      for (const member of membersInCampus) {
        let newMentorPin = managerPin;
        if (headCoordinatorPin) {
          if (member.pin === headCoordinatorPin) {
            newMentorPin = managerPin;
          } else {
            newMentorPin = headCoordinatorPin;
          }
        } else {
          newMentorPin = managerPin;
        }

        if (member.mentorPin !== newMentorPin) {
          await api.users.update(member.pin, { ...member, mentorPin: newMentorPin });
        }
      }

      // 5. If renamed, update campus field for all users in this campus
      if (trimmed !== oldName) {
        const usersInCampus = [...managers, ...mentors, ...members].filter(u => u.campus === oldName);
        for (const user of usersInCampus) {
          await api.users.update(user.pin, { ...user, campus: trimmed });
        }
        setNotices(prev => (prev || []).map(n => n.campus === oldName ? { ...n, campus: trimmed } : n));
      }

      // Refresh users lists to reflect ALL backend changes
      const updatedUsers = await api.users.getAll();
      const freshMentors = updatedUsers.filter((u: any) => u.role === "mentor");
      const freshMembers = updatedUsers.filter((u: any) => u.role === "member");
      setMentors(freshMentors);
      setMembers(freshMembers);
      
      toast.success("ক্যাম্পাস সফলভাবে আপডেট করা হয়েছে!");
    } catch (err) {
      toast.error("Failed to update campus.");
    }
  };

  const handleDeleteCampus = async (campusName: string) => {
    const campus = campuses.find(c => c.name === campusName);
    if (!campus) return;

    const hasMembers = members.some(m => m.campus === campusName);
    if (hasMembers) {
      toast.error("এই ক্যাম্পাসে টিম মেম্বার আছে। তাই ক্যাম্পাস ডিলিট করা যাবে না।");
      return;
    }
    
    try {
      await api.campuses.delete(campus.id);
      setCampuses(prev => (prev || []).filter(c => c.id !== campus.id));
      toast.success("Campus deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete campus.");
    }
  };

  // 7. Reset to default seed data (Backend)
  const handleResetData = async () => {
    if (window.confirm('Reset all databases to initial seed values? This will overwrite everything in MongoDB.')) {
      try {
        await api.seed({
          managers: MOCK_MANAGERS,
          mentors: MOCK_MENTORS,
          members: MOCK_MEMBERS,
          reports: MOCK_REPORTS,
          notices: MOCK_NOTICES,
          campuses: MOCK_CAMPUSES
        });
        
        // Refresh local state
        const [allUsers, rpts, ntcs, cmps, fbs, reqs_prof, reqs_edit, reqs_leave, emls] = await Promise.all([
          api.users.getAll(),
          api.reports.getAll(),
          api.notices.getAll(),
          api.campuses.getAll(),
          api.feedbacks.getAll(),
          api.requests.profile.getAll(),
          api.requests.edit.getAll(),
          api.requests.leave.getAll(),
          api.emails.getAll()
        ]);
        
        setManagers(allUsers.filter((u: any) => u.role === 'manager'));
        setMentors(allUsers.filter((u: any) => u.role === 'mentor'));
        setMembers(allUsers.filter((u: any) => u.role === 'member'));
        setReports(rpts);
        setNotices(ntcs);
        setCampuses(cmps);
        setFeedbacks(fbs);
        setProfileRequests(reqs_prof);
        setAttendanceEditRequests(reqs_edit);
        setLeaveRequests(reqs_leave);
        setEmails(emls);
        
        toast.success('Data reset to default seeds successfully!');
      } catch (err) {
        toast.error('Failed to reset data.');
      }
    }
  };

  const currentMentor = mentors.find(m => m.pin === activeMentorPin) || mentors[0];
  const currentMember = members.find(m => m.pin === activeMemberPin) || members[0];

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50/70 text-slate-800 font-sans flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
        
        {/* Dynamic Header based on login status */}
        <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs z-30 sticky top-0">
          <div className="max-w-[1600px] mx-auto px-4 py-3.5 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
             
                <img src="../assets/logo.jpg" alt="Logo" width="80" height="50" />
              
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-slate-900 uppercase">Attendance & Notice Portal</h1>
                <p className="text-[10px] text-slate-400 font-bold font-mono tracking-wider uppercase">Udvash ESM</p>
              </div>
            </div>

            {loggedInUser && (
              <div className="flex items-center gap-3 justify-end">
                <div className="text-right">
                  <p className="text-xs font-black text-slate-800">{loggedInUser.name}</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono ${
                      activeRole === 'manager' ? 'bg-slate-900 text-white' :
                      activeRole === 'mentor' ? 'bg-indigo-150 text-indigo-800' :
                      'bg-rose-150 text-rose-800'
                    }`}>
                      {loggedInUser.designation ? `✨ ${loggedInUser.designation}` : (activeRole === 'manager' ? '💼 Manager' : activeRole === 'mentor' ? '🎓 Campus Coordinator' : '👤 Member')}
                    </span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-md font-mono">
                      PIN: {loggedInUser.pin}
                    </span>
                  </div>
                </div>
                <UserAvatar user={loggedInUser} size="xl" className="border-2 border-indigo-100" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                  title="Log out of session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <Routes>
          <Route path="/login" element={
            !loggedInUser ? (
              /* --- SECURE BENTO LOGIN SYSTEM --- */
              <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-12 flex flex-col justify-center items-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden relative"
                >
                  {/* Subtle premium background glow */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Left Column: Security Announcement Card */}
                  <div className="md:col-span-5 bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl group-hover:bg-indigo-600/20 transition-all duration-700" />
                    
                    <div className="space-y-6 relative z-10 text-left">
                      <div className="bg-indigo-500/15 border border-indigo-500/30 p-2.5 rounded-xl inline-block">
                        <Shield className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight">Security Gateway</h3>
                        <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                          Welcome to the secure attendance log, notice publishing, and SMTP bulletin simulation center.
                        </p>
                      </div>

                      <div className="space-y-3.5 pt-2">
                        <div className="flex gap-2.5 items-start text-xs">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <p className="text-slate-300 leading-relaxed">
                            <strong>PIN, Email, and Password Match</strong> are cryptographically verified to authenticate role status.
                          </p>
                        </div>
                        <div className="flex gap-2.5 items-start text-xs">
                          <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <p className="text-slate-300 leading-relaxed">
                            <strong>Manager Permission Customization</strong> dynamically enables or disables tabs in mentors' and members' client terminals.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-850 pt-5 mt-6 text-[10px] text-slate-400 text-left relative z-10">
                      <p className="font-bold text-slate-300">বাংলা নির্দেশিকা:</p>
                      <p className="mt-1 leading-relaxed">
                        আপনার ইমেইল এবং পাসওয়ার্ড দিয়ে লগ ইন করুন। ম্যানেজার আপনার আইডি অনুযায়ী যে পারমিশন বা মেন্যু এক্সেস নির্ধারণ করে দিয়েছেন, আপনি পোর্টালটিতে ঠিক সেই মেন্যুগুলোই দেখতে পাবেন।
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Interactive Login Inputs Form */}
                  <div className="md:col-span-7 flex flex-col justify-center text-left">
                    <div className="mb-6">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Sign In to Dashboard</h2>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Provide your official credentials below to synchronize access.
                      </p>
                    </div>

                    {loginError && (
                      <div className="mb-5 bg-rose-50 border border-rose-150 p-4 rounded-xl text-xs font-bold text-rose-800 leading-relaxed">
                        {loginError}
                      </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email Address (ইমেইল)</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Mail className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="email"
                            required
                            placeholder="e.g., manager@portal.com, sarah.j@portal.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Secret Password (পাসওয়ার্ড)</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <KeyRound className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        Access Client Dashboard
                      </button>
                    </form>
                  </div>
                </motion.div>

                {/* Interactive Demo Directory Directory Card */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="w-full mt-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md text-left"
                >
                  <div className="flex items-center justify-between border-b border-slate-150 pb-4 mb-4">
                    <div>
                      <h3 className="text-md font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <Users className="w-4.5 h-4.5 text-indigo-600" />
                        Demo Accounts Registry (সহজ লগ ইন করার মাধ্যম)
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Click any card to auto-fill the form with those exact credentials for quick portal simulation.
                      </p>
                    </div>
                    <button
                      onClick={handleResetData}
                      title="Reset database to seed defaults"
                      className="p-2 bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Managers list */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Managers (সব পারমিশন এভেইলেবল)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {MOCK_MANAGERS.map(m => (
                          <div
                            key={m.pin}
                            onClick={() => {
                              setLoginEmail(m.email);
                              setLoginPassword(m.password);
                            }}
                            className="p-3 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
                          >
                            <div className="text-left">
                              <p className="text-xs font-black text-slate-800">{m.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">PIN: {m.pin} | Pass: {m.password}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{m.email}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mentors list */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        Campus Coordinators (ম্যানেজারের দেওয়া কাস্টম পারমিশন অনুযায়ী মেন্যু এক্সেস)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                        {mentors.map(m => {
                          const mPerms = m.permissions || ['mentor_attendance', 'mentor_notices', 'mentor_history', 'mentor_emails'];
                          return (
                            <div
                              key={m.pin}
                              onClick={() => {
                                setLoginEmail(m.email);
                                setLoginPassword(m.password);
                              }}
                              className="p-3 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl cursor-pointer transition-all flex flex-col justify-between gap-2 group"
                            >
                              <div className="text-left">
                                <p className="text-xs font-black text-slate-800">{m.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">PIN: {m.pin} | Pass: {m.password}</p>
                                <p className="text-[10px] text-slate-500 font-mono truncate">{m.email}</p>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1 pt-1.5 border-t border-slate-100">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${mPerms.includes('mentor_attendance') ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400 line-through'}`}>✓ Attendance</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${mPerms.includes('mentor_notices') ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400 line-through'}`}>✓ Notice</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${mPerms.includes('mentor_history') ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-400 line-through'}`}>✓ Query</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${mPerms.includes('mentor_emails') ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-400 line-through'}`}>✓ Email</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Members list */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                        Team Members (ম্যানেজারের দেওয়া কাস্টম পারমিশন অনুযায়ী মেন্যু এক্সেস)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                        {members.map(m => {
                          const mPerms = m.permissions || ['member_attendance', 'member_notices', 'member_emails'];
                          return (
                            <div
                              key={m.pin}
                              onClick={() => {
                                setLoginEmail(m.email);
                                setLoginPassword(m.password);
                              }}
                              className="p-3 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl cursor-pointer transition-all flex flex-col justify-between gap-2 group"
                            >
                              <div className="text-left">
                                <p className="text-xs font-black text-slate-800">{m.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">PIN: {m.pin} | Pass: {m.password}</p>
                                <p className="text-[10px] text-slate-500 font-mono truncate">{m.email}</p>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1 pt-1.5 border-t border-slate-100">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${mPerms.includes('member_attendance') ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400 line-through'}`}>✓ Attendance</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${mPerms.includes('member_notices') ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400 line-through'}`}>✓ Bulletin</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${mPerms.includes('member_emails') ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-400 line-through'}`}>✓ Email</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </main>
            ) : (
              <Navigate to="/" replace />
            )
          } />

          <Route path="/*" element={
            !loggedInUser ? (
              <Navigate to="/login" replace />
            ) : (
              <>
                {activeRole === 'member' && (
                  <div className="bg-slate-900 text-white/95 text-xs px-4 py-3 border-b border-slate-950 shadow-sm font-medium">
                    <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-left">
                        <ShieldAlert className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                        <span className="leading-relaxed">
                          <span><strong>Security Clearance: Team Member ({currentMember.name})</strong> — Private isolated visibility. Access *only* your own biometric logs and bulletins relevant to your campus according to permissions.</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
                  <AnimatePresence mode="wait">
                    {activeRole === 'manager' && (
                      <motion.div
                        key="manager"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <ManagerDashboard
                          currentUser={loggedInUser}
                          managers={managers}
                          mentors={mentors}
                          members={members}
                          reports={reports}
                          feedbacks={feedbacks}
                          profileRequests={profileRequests}
                          attendanceEditRequests={attendanceEditRequests}
                          onResolveAttendanceEditRequest={handleResolveAttendanceEditRequest}
                          onDeleteAttendanceEditRequest={handleDeleteAttendanceEditRequest}
                          onUpdateAttendanceEditRequest={handleUpdateAttendanceEditRequest}
                          leaveRequests={leaveRequests}
                          onResolveLeaveRequest={handleResolveLeaveRequest}
                          onDeleteLeaveRequest={handleDeleteLeaveRequest}
                          onUpdateLeaveRequest={handleUpdateLeaveRequest}
                          notices={notices}
                          onAddNotice={handleAddNotice}
                          onDeleteNotice={handleDeleteNotice}
                          onUpdateNotice={handleUpdateNotice}
                          onAddReport={handleAddReport}
                          onAddAttendanceRecord={handleAddAttendanceRecord}
                          onUpdateReportStatus={handleUpdateReportStatus}
                          onDeleteAttendanceRecord={handleDeleteAttendanceRecord}
                          onDeleteReport={handleDeleteReport}
                          onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
                          onUpdateAssignment={handleUpdateAssignment}
                          onResolveFeedback={handleResolveFeedback}
                          onApproveProfileRequest={handleApproveProfileRequest}
                          onRejectProfileRequest={handleRejectProfileRequest}
                          onDeleteProfileRequest={handleDeleteProfileRequest}
                          onInstantUpdate={handleInstantUpdate}
                          onAddMember={handleAddMember}
                          onUpdateMember={handleUpdateMember}
                          onDeleteMember={handleDeleteMember}
                          onChangeUserRole={handleChangeUserRole}
                          onAddMentor={handleAddMentor}
                          onUpdateMentor={handleUpdateMentor}
                          onDeleteMentor={handleDeleteMentor}
                          campuses={campuses}
                          onAddCampus={handleAddCampus}
                          onUpdateCampus={handleUpdateCampus}
                          onDeleteCampus={handleDeleteCampus}
                        />
                      </motion.div>
                    )}

                    {activeRole === 'mentor' && (
                      <motion.div
                        key="mentor"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <MentorDashboard
                          currentMentor={currentMentor}
                          managers={managers}
                          mentors={mentors}
                          members={members}
                          reports={reports}
                          feedbacks={feedbacks}
                          attendanceEditRequests={attendanceEditRequests}
                          onSubmitAttendanceEditRequest={handleSubmitAttendanceEditRequest}
                          onDeleteAttendanceEditRequest={handleDeleteAttendanceEditRequest}
                          onUpdateAttendanceEditRequest={handleUpdateAttendanceEditRequest}
                          leaveRequests={leaveRequests}
                          onSubmitLeaveRequest={handleSubmitLeaveRequest}
                          onDeleteLeaveRequest={handleDeleteLeaveRequest}
                          onUpdateLeaveRequest={handleUpdateLeaveRequest}
                          notices={notices}
                          
                          onSubmitFeedback={handleSubmitFeedback}
                          onAddNotice={handleAddNotice}
                          onUpdateNotice={handleUpdateNotice}
                          onDeleteNotice={handleDeleteNotice}
                          campuses={campuses}
                          profileRequests={profileRequests}
                          onSubmitProfileRequest={handleSubmitProfileRequest}
                          onInstantUpdate={handleInstantUpdate}
                        />
                      </motion.div>
                    )}

                    {activeRole === 'member' && (
                      <motion.div
                        key="member"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <MemberDashboard
                          currentMember={currentMember}
                          mentors={mentors}
                          reports={reports}
                          feedbacks={feedbacks}
                          notices={notices}
                          
                          profileRequests={profileRequests}
                          onSubmitProfileRequest={handleSubmitProfileRequest}
                          onInstantUpdate={handleInstantUpdate}
                          leaveRequests={leaveRequests}
                          onSubmitLeaveRequest={handleSubmitLeaveRequest}
                          attendanceEditRequests={attendanceEditRequests}
                          onSubmitAttendanceEditRequest={handleSubmitAttendanceEditRequest}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </main>
              </>
            )
          } />
        </Routes>

        {/* FOOTER */}
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400 mt-auto">
          <div className="max-w-[1600px] mx-auto px-4">
            <p>© 2026 Attendance & Notice Portal. All rights reserved.</p>
            <p className="mt-1 text-[10px] text-slate-300">Roster Data and Security logs are cryptographically assigned & synchronized locally to your active browser context.</p>
          </div>
        </footer>

        {/* Global SMTP Toast System */}
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}
