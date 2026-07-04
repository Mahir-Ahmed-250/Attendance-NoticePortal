const fs = require('fs');

let code = fs.readFileSync('src/components/ManagerDashboard.tsx', 'utf8');

const regex = /<label className="flex items-center gap-2\.5 text-xs font-semibold text-slate-700 cursor-pointer">[\s\S]*?Email Inbox \(মেইল ইনবক্স\)[\s\S]*?<\/label>/;
code = code.replace(regex, '');

fs.writeFileSync('src/components/ManagerDashboard.tsx', code);
