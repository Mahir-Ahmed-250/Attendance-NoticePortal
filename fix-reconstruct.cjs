const fs = require('fs');

let mentorCode = fs.readFileSync('src/components/MentorDashboard.tsx', 'utf8');

// The code currently has:
//     {
//      id: 'members' as const,
//      label: 'Campus Members',
//      permission: 'mentor_attendance', // Using same permission as attendance for now
//      icon: <User className="w-4 h-4" />,
//      hasUnread: false
//    },
//     {} as Record<string, any[]>);

// We need to replace the missing chunk. Let's find exactly where it broke.
const splitStr = "    },\n     {} as Record<string, any[]>);";
if (!mentorCode.includes(splitStr)) {
    console.log("Could not find the split string!");
    process.exit(1);
}

const parts = mentorCode.split(splitStr);

const reconstructedMiddle = `    }
  ];

  const visibleTabs = tabsList.filter(t => allowedPerms.includes(t.permission));

  return (
    <div className="space-y-6">
      {/* Mentor Profile Greeting */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        </div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-20 h-20 bg-white/10 p-1.5 rounded-full border border-white/20 shadow-inner">
            <UserAvatar user={currentMentor} size="xl" className="w-full h-full" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="bg-white/10 text-emerald-300 border border-emerald-400/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Coordinator
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">{currentMentor.name}</h1>
            <p className="text-xs text-slate-300 font-mono mt-1.5">{currentMentor.email}</p>
          </div>
        </div>
        
        <div className="flex gap-4 border-t md:border-t-0 border-slate-800 pt-4 md:pt-0 w-full md:w-auto justify-around font-mono relative z-10">
          <div className="text-center px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl min-w-[120px] shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Team</p>
            <p className="text-xl font-extrabold text-indigo-400 mt-1">{myTeam.length} members</p>
          </div>
          <div className="text-center px-5 py-3.5 bg-white/5 border border-white/10 rounded-2xl min-w-[120px] shadow-2xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Feedback</p>
            <p className="text-xl font-extrabold text-amber-400 mt-1">{feedbacks.filter(f => f.mentorPin === currentMentor.pin && f.status === 'Pending').length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 lg:gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-2">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 hide-scrollbar sticky top-6">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={\`flex-1 sm:flex-initial lg:w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 \${
                  activeTab === t.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }\`}
              >
                {t.icon}
                <span className="whitespace-nowrap">{t.label}</span>
              </button>
            ))}
            
            <button
              onClick={() => setActiveTab('profile')}
              className={\`flex-1 sm:flex-initial lg:w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all relative cursor-pointer shrink-0 \${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }\`}
            >
              <User className="w-4 h-4" />
              <span className="whitespace-nowrap">Profile Settings</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8">
          
      {/* Tab 1: ATTENDANCE OVERVIEW */}
      {(activeTab === 'attendance' || activeTab === 'members') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Team Attendance {activeTab === 'members' && '(All Members)'}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Monitor and manage your assigned team members' attendance
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="px-3 py-2 border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:ring-indigo-500"
              >
                <option value="">All Dates</option>
                {Array.from(new Set(reportsWithMyTeam.map(r => r.date))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(d => (
                  <option key={d} value={d}>{new Date(d).toLocaleDateString()}</option>
                ))}
              </select>
              
              <button
                onClick={() => {
                  const groupedByDate = reportsWithMyTeam.reduce((acc, report) => {
                    const date = report.date;
                    if (!acc[date]) acc[date] = [];
                    
                    const reportRecords = report.records
                      .filter(r => myTeamPins.includes(r.memberPin))
                      .map(r => ({
                        Date: report.date,
                        Campus: report.campus,
                        PIN: r.memberPin,
                        Name: r.memberName,
                        Status: getEffectiveStatus(r),
                        'Check In': r.checkInTime || '-',
                        'Check Out': r.checkOutTime || '-',
                        Remarks: r.remarks || '-',
                        Notes: r.notes || '-'
                      }));
                      
                    acc[date].push(...reportRecords);
                    return acc;
                  }, {} as Record<string, any[]>);`;

const newCode = parts[0] + reconstructedMiddle + parts[1];
fs.writeFileSync('src/components/MentorDashboard.tsx', newCode);
console.log("Restored missing code!");
