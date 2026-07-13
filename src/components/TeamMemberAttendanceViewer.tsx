import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Clock, MapPin, User, Sparkles, CheckCircle2, AlertCircle, HelpCircle, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { AttendanceReport, TeamMember, Mentor } from '../types';
import { UserAvatar } from './UserAvatar';
import { getEffectiveStatus } from '../utils';

interface Props {
  reports: AttendanceReport[];
  members: TeamMember[];
  mentors: Mentor[];
}

export default function TeamMemberAttendanceViewer({ reports, members, mentors }: Props) {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();

  // Find the selected member or mentor
  const targetUser = members.find(m => m.pin === pin) || mentors.find(m => m.pin === pin);

  // Default date ranges (current month)
  const [attendanceStartDate, setAttendanceStartDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [attendanceEndDate, setAttendanceEndDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const mStr = String(m).padStart(2, '0');
    return `${y}-${mStr}-${lastDay}`;
  });

  const [tempStartDate, setTempStartDate] = useState(attendanceStartDate);
  const [tempEndDate, setTempEndDate] = useState(attendanceEndDate);

  if (!targetUser) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-black text-slate-800">User Not Found</h3>
        <p className="text-xs text-slate-500">The PIN {pin} does not match any registered team member or coordinator.</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Generate date range
  const dateRange = (() => {
    const dates: string[] = [];
    const start = (() => {
      const parts = attendanceStartDate.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(attendanceStartDate);
    })();
    const end = (() => {
      const parts = attendanceEndDate.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(attendanceEndDate);
    })();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    
    let current = new Date(start);
    while (current <= end) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }
    return dates.reverse(); // Newest first
  })();

  // Calculate totals
  let totalLateMinutes = 0;
  let totalWorkingMinutes = 0;
  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let punchMissingDays = 0;
  let daysWithWorkingHours = 0;

  const todayDateStr = (() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  dateRange.forEach((dateStr) => {
    const dayReports = reports.filter(r => r.date === dateStr);
    let memberRecord: any = null;
    for (const report of dayReports) {
      const found = report.records.find(rec => rec.memberPin === pin);
      if (found) {
        memberRecord = found;
        break;
      }
    }

    const parsedDate = (() => {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(dateStr);
    })();
    const isFriday = parsedDate.getDay() === 5;
    const isFuture = dateStr > todayDateStr;

    if (memberRecord) {
      const status = getEffectiveStatus(memberRecord, dateStr);
      if (status === 'Present' || status === 'Late Entry' || status === 'Early Leave' || status === 'Late' || status === 'Half Day') {
        presentDays++;
      } else if (status === 'Absent') {
        absentDays++;
      } else if (status === 'Finger Punch Missing' || status === '< 6hr' || status === '< 10hrs') {
        presentDays++; // Physically present but incomplete punches
        if (status === 'Finger Punch Missing') {
          punchMissingDays++;
        }
      } else if (status.toLowerCase().includes('leave')) {
        leaveDays++;
      }

      // Sum late entry
      if (memberRecord.lateEntry) {
        const clean = memberRecord.lateEntry.trim();
        const matchHHMM = clean.match(/^(\d+):(\d+)$/);
        if (matchHHMM) {
          totalLateMinutes += parseInt(matchHHMM[1], 10) * 60 + parseInt(matchHHMM[2], 10);
        } else {
          const parsed = parseInt(clean, 10);
          if (!isNaN(parsed)) totalLateMinutes += parsed;
        }
      }

      // Sum working hours
      if (memberRecord.workingHour) {
        const clean = memberRecord.workingHour.trim();
        const matchHHMM = clean.match(/^(\d+):(\d+)$/);
        let dayWorkingMins = 0;
        if (matchHHMM) {
          dayWorkingMins = parseInt(matchHHMM[1], 10) * 60 + parseInt(matchHHMM[2], 10);
        } else {
          const parsed = parseInt(clean, 10);
          if (!isNaN(parsed)) dayWorkingMins = parsed;
        }
        if (dayWorkingMins > 0) {
          totalWorkingMinutes += dayWorkingMins;
          daysWithWorkingHours++;
        }
      }
    } else {
      if (!isFriday && !isFuture) {
        absentDays++; // Past weekday with no record acts as Absent
      }
    }
  });

  const avgWorkingMinutes = daysWithWorkingHours > 0 ? Math.round(totalWorkingMinutes / daysWithWorkingHours) : 0;

  const formatMins = (totalMinutes: number): string => {
    if (totalMinutes <= 0) return '-';
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6"
    >
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50/50 hover:bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-100 cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4 animate-pulse" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <UserAvatar user={targetUser} size="md" className="border-2 border-indigo-100" />
          <div>
            <h3 className="text-sm font-black text-slate-800">
              {targetUser.name}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono font-medium">
              PIN: {targetUser.pin} | Designation: {targetUser.designation || 'Team Member'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Attendance Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Title Header Bar */}
        <div className="bg-[#022e54] text-white px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
         
            <h4 className="text-sm font-extrabold tracking-wide uppercase">Team Members Attendance</h4>
          </div>
          <span className="text-xs bg-white/10 px-4 py-1.5 rounded-full font-mono font-semibold border border-white/20">
            {targetUser.name} (PIN: {targetUser.pin})
          </span>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-5 flex flex-col md:flex-row items-center justify-center gap-4 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span>Start Date</span>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>End Date</span>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-mono"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setAttendanceStartDate(tempStartDate);
                setAttendanceEndDate(tempEndDate);
                toast.success("Attendance filtered successfully!");
              }}
              className="px-6 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              Show
            </button>
            <button
              onClick={() => {
                const wb = XLSX.utils.book_new();
                const dataToExport = dateRange.map((dateStr) => {
                  const dayReports = reports.filter(r => r.date === dateStr);
                  let memberRecord: any = null;
                  for (const report of dayReports) {
                    const found = report.records.find(rec => rec.memberPin === pin);
                    if (found) {
                      memberRecord = found;
                      break;
                    }
                  }

                  const isFuture = dateStr > todayDateStr;
                  const parsedDate = (() => {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    }
                    return new Date(dateStr);
                  })();
                  const isFriday = parsedDate.getDay() === 5;

                  const displayDate = (() => {
                    const parts = dateStr.split('-');
                    if (parts.length !== 3) return dateStr;
                    const year = parts[0];
                    const monthIdx = parseInt(parts[1], 10) - 1;
                    const day = parseInt(parts[2], 10);
                    const monthNamesShort = [
                      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                    ];
                    return `${day} ${monthNamesShort[monthIdx]}, ${year}`;
                  })();

                  if (memberRecord) {
                    const effectiveStatus = getEffectiveStatus(memberRecord, dateStr);
                    const absentLeaveText = (memberRecord.absentOrLeave && memberRecord.absentOrLeave !== '-' && memberRecord.absentOrLeave.trim() !== '') ? memberRecord.absentOrLeave : '-';
                    const locationDesc = (memberRecord.remarks || memberRecord.zone || '').trim() || '-';

                    return {
                      'Date': displayDate,
                      'In Time': memberRecord.checkInTime || '-',
                      'Out Time': memberRecord.checkOutTime || '-',
                      'Late Entry': memberRecord.lateEntry || '-',
                      'Early Leave': memberRecord.earlyLeave || '-',
                      'Working Hour': memberRecord.workingHour || '-',
                      'Absent/Leave': absentLeaveText,
                      'Status': effectiveStatus,
                      'In/Out Location': locationDesc
                    };
                  } else {
                    const isAbsent = !isFuture && !isFriday;
                    return {
                      'Date': displayDate,
                      'In Time': '-',
                      'Out Time': '-',
                      'Late Entry': '-',
                      'Early Leave': '-',
                      'Working Hour': '-',
                      'Absent/Leave': isAbsent ? 'Absent' : '-',
                      'Status': isFuture ? '-' : (isFriday ? 'Weekend' : 'Absent'),
                      'In/Out Location': '-'
                    };
                  }
                });

                const ws = XLSX.utils.json_to_sheet(dataToExport);
                XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
                XLSX.writeFile(wb, `attendance_report_${targetUser.name.replace(/\s+/g, '_')}_${pin}.xlsx`);
                toast.success("Excel sheet exported successfully!");
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#107c41] hover:bg-[#0b5930] text-white font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>
        </div>

        {/* Dynamic Summary Cards before table */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-5 bg-slate-50/50 border-b border-slate-100">
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Present Days</span>
            <span className="text-sm font-black text-emerald-600 block">{presentDays} Days</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Absent Days</span>
            <span className="text-sm font-black text-rose-500 block">{absentDays} Days</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Approved Leaves</span>
            <span className="text-sm font-black text-blue-600 block">{leaveDays} Days</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Late Entries</span>
            <span className="text-sm font-black text-amber-500 block">{formatMins(totalLateMinutes)}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Working Hours</span>
            <span className="text-sm font-black text-slate-800 block">{formatMins(totalWorkingMinutes)}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs text-center space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Average Working Hours</span>
            <span className="text-sm font-black text-indigo-600 block">{formatMins(avgWorkingMinutes)}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                <th className="p-4 border-r border-slate-150">Date</th>
                <th className="p-4 border-r border-slate-150">In Time</th>
                <th className="p-4 border-r border-slate-150">Out Time</th>
                <th className="p-4 border-r border-slate-150">Late Entry</th>
                <th className="p-4 border-r border-slate-150">Early Leave</th>
                <th className="p-4 border-r border-slate-150">W. Hour</th>
                <th className="p-4 border-r border-slate-150">Absent/Leave</th>
                <th className="p-4 border-r border-slate-150">Status</th>
                <th className="p-4">In/Out Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-slate-600 bg-white">
              {dateRange.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-semibold">
                    No records found for selected range.
                  </td>
                </tr>
              ) : (
                dateRange.map((dateStr) => {
                  const dayReports = reports.filter(r => r.date === dateStr);
                  let memberRecord: any = null;
                  for (const report of dayReports) {
                    const found = report.records.find(rec => rec.memberPin === pin);
                    if (found) {
                      memberRecord = found;
                      break;
                    }
                  }

                  const parsedDate = (() => {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    }
                    return new Date(dateStr);
                  })();
                  const isFriday = parsedDate.getDay() === 5; // Friday is weekend

                  // Format display date
                  const displayDate = (() => {
                    const parts = dateStr.split('-');
                    if (parts.length !== 3) return dateStr;
                    const year = parts[0];
                    const monthIdx = parseInt(parts[1], 10) - 1;
                    const day = parseInt(parts[2], 10);
                    const monthNamesShort = [
                      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                    ];
                    return `${day} ${monthNamesShort[monthIdx]}, ${year}`;
                  })();

                  if (memberRecord) {
                    const isLateEntry = memberRecord.lateEntry && memberRecord.lateEntry !== '-' && memberRecord.lateEntry !== '0' && memberRecord.lateEntry.trim() !== '';
                    const isEarlyLeave = memberRecord.earlyLeave && memberRecord.earlyLeave !== '-' && memberRecord.earlyLeave !== '0' && memberRecord.earlyLeave.trim() !== '';
                    const effectiveStatus = getEffectiveStatus(memberRecord, dateStr);

                    // Grab Check In/Out Location description
                    const locationDesc = (memberRecord.remarks || memberRecord.zone || '').trim() || '-';

                    return (
                      <tr key={dateStr} className="hover:bg-indigo-50/10 transition-colors">
                        <td className="p-4 font-bold text-slate-700 border-r border-slate-150">{displayDate}</td>
                        <td className="p-4 border-r border-slate-150 font-mono text-slate-600">{memberRecord.checkInTime || "-"}</td>
                        <td className="p-4 border-r border-slate-150 font-mono text-slate-600">{memberRecord.checkOutTime || "-"}</td>
                        <td className={`p-4 border-r border-slate-150 font-mono ${isLateEntry ? 'text-amber-600 font-bold bg-amber-50/20' : ''}`}>{memberRecord.lateEntry || "-"}</td>
                        <td className={`p-4 border-r border-slate-150 font-mono ${isEarlyLeave ? 'text-amber-600 font-bold bg-amber-50/20' : ''}`}>{memberRecord.earlyLeave || "-"}</td>
                        <td className="p-4 border-r border-slate-150 font-mono font-bold text-slate-800">{memberRecord.workingHour || "-"}</td>
                        <td className="p-4 border-r border-slate-150">
                          {memberRecord.absentOrLeave && memberRecord.absentOrLeave !== '-' && memberRecord.absentOrLeave.trim() !== '' ? (
                            <span className={`font-bold uppercase text-[10px] tracking-wider px-2.5 py-1 rounded-full ${
                              memberRecord.absentOrLeave.toLowerCase().includes('leave') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              memberRecord.absentOrLeave.toLowerCase().includes('absent') ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                              'bg-slate-50 text-slate-700 border border-slate-100'
                            }`}>
                              {memberRecord.absentOrLeave}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono font-bold">-</span>
                          )}
                        </td>
                        <td className="p-4 border-r border-slate-150">
                          <span className={`font-black uppercase text-[10px] tracking-wider px-2.5 py-1 rounded-full ${
                            effectiveStatus === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            effectiveStatus.toLowerCase().includes('leave') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            effectiveStatus.toLowerCase().includes('absent') ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            effectiveStatus === 'Finger Punch Missing' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {effectiveStatus}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-700">
                          <div className="flex items-start gap-1.5 whitespace-normal break-words leading-normal">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                            <span>{locationDesc}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    const isFuture = dateStr > todayDateStr;
                    const isAbsent = !isFuture && !isFriday;
                    return (
                      <tr key={dateStr} className="bg-white hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-700 border-r border-slate-150">{displayDate}</td>
                        <td className="p-4 border-r border-slate-150 text-slate-400 font-mono">-</td>
                        <td className="p-4 border-r border-slate-150 text-slate-400 font-mono">-</td>
                        <td className="p-4 border-r border-slate-150 text-slate-400 font-mono">-</td>
                        <td className="p-4 border-r border-slate-150 text-slate-400 font-mono">-</td>
                        <td className="p-4 border-r border-slate-150 text-slate-400 font-mono">-</td>
                        <td className="p-4 border-r border-slate-150">
                          {isAbsent ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-100 font-bold uppercase text-[10px] tracking-wider px-2.5 py-1 rounded-full">
                              Absent
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono font-bold">-</span>
                          )}
                        </td>
                        <td className="p-4 border-r border-slate-150">
                          {isFuture ? (
                            <span className="text-slate-400 font-mono font-bold">
                              -
                            </span>
                          ) : isFriday ? (
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                              Weekend
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-rose-100">
                              Absent
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400">-</td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
            {/* Footer Total Row */}
            <tfoot>
              <tr className="bg-slate-100 font-black border-t border-slate-300 text-slate-900 text-[12px]">
                <td className="p-4 border-r border-slate-150">Total</td>
                <td className="p-4 border-r border-slate-150"></td>
                <td className="p-4 border-r border-slate-150"></td>
                <td className="p-4 border-r border-slate-150 font-mono text-amber-700 bg-amber-50/30">
                  {formatMins(totalLateMinutes)}
                </td>
                <td className="p-4 border-r border-slate-150"></td>
                <td className="p-4 border-r border-slate-150 font-mono text-indigo-900 bg-indigo-50/30">
                  {formatMins(totalWorkingMinutes)}
                </td>
                <td className="p-4 border-r border-slate-150">
                  <div className="flex flex-col text-[10px] font-bold text-slate-500 font-mono leading-tight">
                    <span>Present: {presentDays}d</span>
                    <span>Absent: {absentDays}d</span>
                    <span>Leave: {leaveDays}d</span>
                  </div>
                </td>
                <td className="p-4 border-r border-slate-150"></td>
                <td className="p-4 text-slate-400 font-semibold">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Copyright Footer */}
      <div className="text-center text-[11px] text-slate-400 py-4 border-t border-slate-100">
        © 2026 - Udvash Attendance Management Portal
      </div>
    </motion.div>
  );
}
