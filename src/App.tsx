import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Mentor, TeamMember, AttendanceReport, AttendanceFeedback, Notice, Role, AttendanceStatus, EmailMessage, ProfileRequest, MemberAttendance, AttendanceEditRequest, LeaveRequest, Campus, DEFAULT_CAMPUSES, User } from './types';
import ManagerDashboard from './components/ManagerDashboard';
import MentorDashboard from './components/MentorDashboard';
import MemberDashboard from './components/MemberDashboard';
import LoginPage from './components/LoginPage';
import TeamMemberAttendanceViewer from './components/TeamMemberAttendanceViewer';
import { UserAvatar } from './components/UserAvatar';
import { ShieldAlert, Users, Landmark, FileText, ClipboardList, RefreshCw, LogIn, LogOut, Lock, KeyRound, Shield, ShieldCheck, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';

import { api } from './lib/api';
import { calculateWorkingHours } from './utils';

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
  const [fetchedLogo, setFetchedLogo] = useState<string | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    fetch('/api/logo')
      .then(res => res.json())
      .then(data => setFetchedLogo(data.logo))
      .catch(err => console.error("Logo fetch error", err));
  }, []);

  const isSeeding = React.useRef(false);

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      const interval = setInterval(() => {
        setLoadingProgress(p => (p < 90 ? p + Math.floor(Math.random() * 15) : p));
      }, 150);

      try {
        const [
          usersData,
          reportsData,
          noticesData,
          campusesData,
          profileReqs,
          editReqs,
          leaveReqs,
          emailsData,
          feedbacksData
        ] = await Promise.all([
          api.users.getAll(),
          api.reports.getAll(),
          api.notices.getAll(),
          api.campuses.getAll(),
          api.requests.profile.getAll(),
          api.requests.edit.getAll(),
          api.requests.leave.getAll(),
          api.emails.getAll(),
          api.feedbacks.getAll()
        ]);

        // Removed automatic seeding based on missing users or campuses.
        // The app will now show exactly what is in the database.

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
        setFeedbacks(feedbacksData);

        // Check logged in user from local storage (just for session, data is in DB)
        const savedUser = localStorage.getItem('portal_logged_in_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          // Refresh user data from DB
          const currentUser = usersData.find((u: any) => u.pin === parsed.pin);
          if (currentUser) {
            setLoggedInUser({ ...currentUser, role: parsed.role });
          }
        }

        clearInterval(interval);
        setLoadingProgress(100);
        setTimeout(() => setIsInitializing(false), 300);

      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        const errorMessage = err.message || "Failed to connect to database!";
        if (errorMessage !== "Unknown error") {
          toast.error(errorMessage, { duration: 6000 });
        }
        clearInterval(interval);
        setLoadingProgress(100);
        setTimeout(() => setIsInitializing(false), 300);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('portal_logged_in_user');
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
      toast.success('Profile update request submitted.');
    } catch (err) {
      toast.error('Failed to submit request.');
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
        toast.error('Requested PIN already exists.');
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
      
      toast.success('Request approved and profile updated.');
    } catch (err) {
      toast.error('Failed to approve request.');
    }
  };

  const handleRejectProfileRequest = async (requestPin: string) => {
    const req = profileRequests.find(r => r.pin === requestPin);
    if (!req) return;
    try {
      const updated = await api.requests.profile.update(requestPin, { ...req, status: 'Rejected' });
      setProfileRequests(prev => (prev || []).map(r => r.pin === requestPin ? updated : r));
      toast.success('Request rejected.');
    } catch (err) {
      toast.error('Operation failed.');
    }
  };

  const handleDeleteProfileRequest = async (requestPin: string) => {
    try {
      await api.requests.profile.delete(requestPin);
      setProfileRequests(prev => (prev || []).filter(r => r.pin !== requestPin));
      toast.success('Request deleted.');
    } catch (err) {
      toast.error('Failed to delete.');
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
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error('Failed to update profile.');
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
              const checkInTime = req.requestedCheckIn !== undefined ? req.requestedCheckIn : rec.checkInTime;
              const checkOutTime = req.requestedCheckOut !== undefined ? req.requestedCheckOut : rec.checkOutTime;
              const hours = calculateWorkingHours(checkInTime, checkOutTime);
              const workingHour = hours !== null ? `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m` : (rec.workingHour === '12h 0 m' ? '-' : rec.workingHour);
              
              return { 
                ...rec, 
                status: req.requestedStatus,
                checkInTime,
                checkOutTime,
                workingHour
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
        role: activeRole,
        pin: loggedInUser.pin
      }
    };
    
    try {
      const saved = await api.notices.create(newNotice);
      setNotices(prev => [saved, ...(prev || [])]);

      // Notification for all users EXCEPT the poster
      const allUsers = [...managers, ...mentors, ...members];
      const recipients = allUsers.filter(u => u.pin !== loggedInUser.pin);
      
      const emailPromises = recipients.map(r => {
        // Ensure recipient has an email, fallback to a constructed one if missing
        const recipientEmail = r.email || `${r.pin}@portal.com`;
        
        return api.emails.create({
          pin: `email-${r.pin}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          toEmail: recipientEmail,
          fromEmail: 'system@portal.com',
          fromName: `Portal Bulletin`,
          subject: `🔔 New Notice: ${noticeDetails.title}`,
          body: `Dear ${r.name},\n\nA new notice has been posted by ${authorName} (${activeRole.toUpperCase()}):\n\n--- ${noticeDetails.title} ---\n\n${noticeDetails.content}\n\nPlease check the Notice Board for details.`,
          date: new Date().toISOString(),
          isRead: false
        });
      });
      
      await Promise.all(emailPromises);
      const freshEmails = await api.emails.getAll();
      setEmails(freshEmails);
      
      toast.success('Success');
    } catch (err) {
      toast.error('Failed to post notice.');
    }
  };

  const handleDeleteNotice = async (noticePin: string) => {
    try {
      await api.notices.delete(noticePin);
      setNotices(prev => (prev || []).filter(n => n.pin !== noticePin));
      toast.success("Notice deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete notice.");
    }
  };

  const handleUpdateNotice = async (updatedNotice: Notice) => {
    try {
      const saved = await api.notices.update(updatedNotice.pin, updatedNotice);
      setNotices(prev => (prev || []).map(n => n.pin === updatedNotice.pin ? saved : n));
      toast.success("Notice updated successfully!");
    } catch (err) {
      toast.error("Failed to update notice.");
    }
  };

  const handleMarkEmailAsRead = async (emailPin: string) => {
    try {
      const email = emails.find(e => e.pin === emailPin);
      if (email && !email.isRead) {
        const updated = { ...email, isRead: true };
        await api.emails.update(emailPin, updated);
        setEmails(prev => prev.map(e => e.pin === emailPin ? updated : e));
      }
    } catch (err) {
      console.error("Failed to mark email as read", err);
    }
  };

  // --- ROSTER CRUD MUTATORS ---
  const handleAddMember = async (newMember: TeamMember) => {
    if (!newMember.campus) {
      toast.error('Campus selection is mandatory for adding a team member!');
      return;
    }
    try {
      const saved = await api.users.create({ ...newMember, role: 'member' });
      setMembers(prev => [...(prev || []), saved]);
      toast.success('Team member added successfully!');
    } catch (err) {
      toast.error('Failed to add member.');
    }
  };

  const handleUpdateMember = async (oldPin: string, updatedMember: TeamMember) => {
    if (!updatedMember.campus) {
      toast.error('Campus selection is mandatory for updating a team member!');
      return;
    }
    try {
      const saved = await api.users.update(oldPin, updatedMember);
      setMembers(prev => (prev || []).map(m => m.pin === oldPin ? saved : m));
      toast.success('Team member updated successfully!');
    } catch (err) {
      toast.error('Failed to update member.');
    }
  };

  const handleDeleteMember = async (memberPin: string) => {
    try {
      await api.users.delete(memberPin);
      setMembers(prev => (prev || []).filter(m => m.pin !== memberPin));
      toast.success('Team member deleted successfully!');
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
      toast.success('Campus Coordinator added successfully!');
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
      toast.success('Coordinator updated successfully!');
    } catch (err) {
      toast.error('Failed to update mentor.');
    }
  };

  const handleDeleteMentor = async (mentorPin: string) => {
    try {
      await api.users.delete(mentorPin);
      setMentors(prev => (prev || []).filter(m => m.pin !== mentorPin));
      toast.success('Campus Coordinator deleted successfully!');
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
        toast.success('Member successfully promoted to Campus Coordinator!');
      } else if (oldRole === 'mentor' && newRole === 'member') {
        const assignedCampus = campuses.find(c => c.coordinatorPins?.includes(oldPin));
        if (assignedCampus) {
          toast.error(`This coordinator is assigned to '${assignedCampus.name}' campus. Remove them from campus settings before demoting to member.`);
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
        toast.success('Campus Coordinator successfully changed to Member!');
      }
    } catch (err) {
      toast.error('Failed to change role.');
    }
  };

  const handleAddCampus = async (campusName: string, headCoordinatorPin?: string, deputyCoordinatorPins?: string[], deputyMemberAccess?: Record<string, string[]>) => {
    const trimmed = campusName.trim();
    if (!trimmed) return;
    if (campuses.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('A campus with this name already exists.');
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
      toast.success('Campus created successfully!');
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
        const usersInCampus = [...managers, ...mentors, ...members].filter(u => (u as any).campus === oldName);
        for (const user of usersInCampus) {
          await api.users.update(user.pin, { ...user, campus: trimmed } as any);
        }
        setNotices(prev => (prev || []).map(n => n.campus === oldName ? { ...n, campus: trimmed } : n));
      }

      // Refresh users lists to reflect ALL backend changes
      const updatedUsers = await api.users.getAll();
      const freshMentors = updatedUsers.filter((u: any) => u.role === "mentor");
      const freshMembers = updatedUsers.filter((u: any) => u.role === "member");
      setMentors(freshMentors);
      setMembers(freshMembers);
      
      toast.success("Campus updated successfully!");
    } catch (err) {
      toast.error("Failed to update campus.");
    }
  };

  const handleDeleteCampus = async (campusName: string) => {
    const campus = campuses.find(c => c.name === campusName);
    if (!campus) return;

    const hasMembers = members.some(m => m.campus === campusName);
    if (hasMembers) {
      toast.error("This campus has team members. It cannot be deleted.");
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

  const currentMentor = mentors.find(m => m.pin === activeMentorPin) || mentors[0] || null;
  const currentMember = members.find(m => m.pin === activeMemberPin) || members[0] || null;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-[240px] space-y-4">
          <div className="flex justify-center mb-6">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Loading Data</p>
            <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-indigo-600 h-1 rounded-full transition-all duration-150 ease-out" 
                style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-400 font-mono text-right">{Math.round(loadingProgress)}%</p>
          </div>
        </div>
      </div>
    );
  }

  if (loggedInUser && ((loggedInUser.role === 'mentor' && !currentMentor) || (loggedInUser.role === 'member' && !currentMember))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50/70 text-slate-800 font-sans flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
        
        {/* Dynamic Header based on login status */}
        <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs z-30 sticky top-0 transition-all duration-300">
          <div className="max-w-[1600px] mx-auto px-4 py-2.5 sm:py-3.5 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-3">
                {fetchedLogo && (
                  <motion.img 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={fetchedLogo} 
                    alt="Logo" 
                    className="w-14 sm:w-20 h-auto" 
                  />
                )}
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 uppercase truncate max-w-[180px] sm:max-w-none">
                    Exam Scripts Management
                  </h1>
                   <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold font-mono tracking-wider uppercase">Attendance & Notice Management</p>
                  
                </div>
              </div>

              {/* Mobile Logout (Hidden on Desktop) */}
              {loggedInUser && (
                <div className="sm:hidden flex items-center gap-2">
                  <UserAvatar user={loggedInUser} size="md" className="border-2 border-indigo-100" />
                  <button
                    onClick={handleLogout}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {loggedInUser && (
              <div className="hidden sm:flex items-center gap-3 justify-end">
                <div className="text-right">
                  <p className="text-xs font-black text-slate-800">{loggedInUser.name}</p>
                  <div className="flex flex-col items-end gap-1 mt-0.5">
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-md font-mono">
                      PIN: {loggedInUser.pin}
                    </span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono ${
                      activeRole === 'manager' ? 'bg-slate-900 text-white' :
                      activeRole === 'mentor' ? 'bg-indigo-150 text-indigo-800' :
                      'bg-rose-150 text-rose-800'
                    }`}>
                      {loggedInUser.designation ? ` ${loggedInUser.designation}` : (activeRole === 'manager' ? ' Manager' : activeRole === 'mentor' ? ' Campus Coordinator' : ' Member')}
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
              <LoginPage 
                logo={fetchedLogo}
                onLoginSuccess={(user) => {
                  setLoggedInUser(user);
                  localStorage.setItem('portal_logged_in_user', JSON.stringify(user));
                }} 
              />
            ) : (
              <Navigate to="/" replace />
            )
          } />
          <Route path="/attendance/:pin" element={
            !loggedInUser ? (
              <Navigate to="/login" replace />
            ) : (
              <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 py-4 sm:px-6 lg:px-8 sm:py-8">
                <TeamMemberAttendanceViewer
                  reports={reports}
                  members={members}
                  mentors={mentors}
                />
              </main>
            )
          } />
          <Route path="/*" element={
            !loggedInUser ? (
              <Navigate to="/login" replace />
            ) : (
              <>


                <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 py-4 sm:px-6 lg:px-8 sm:py-8 space-y-4 sm:space-y-6">
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
                          emails={emails}
                          onMarkEmailAsRead={handleMarkEmailAsRead}
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
                          emails={emails}
                          onMarkEmailAsRead={handleMarkEmailAsRead}
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
                          onAddNotice={handleAddNotice}
                          onUpdateNotice={handleUpdateNotice}
                          onDeleteNoticeRequest={handleDeleteNotice}
                          profileRequests={profileRequests}
                          onSubmitProfileRequest={handleSubmitProfileRequest}
                          onInstantUpdate={handleInstantUpdate}
                          leaveRequests={leaveRequests}
                          onSubmitLeaveRequest={handleSubmitLeaveRequest}
                          attendanceEditRequests={attendanceEditRequests}
                          onSubmitAttendanceEditRequest={handleSubmitAttendanceEditRequest}
                          emails={emails}
                          onMarkEmailAsRead={handleMarkEmailAsRead}
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
     
        {/* Global SMTP Toast System */}
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}
