const fs = require('fs');

let memberCode = fs.readFileSync('src/components/MemberDashboard.tsx', 'utf8');
memberCode = memberCode.replace(/const unreadEmailsCount = .*\n/g, '');
memberCode = memberCode.replace(/\{t\.hasUnread && unreadEmailsCount > 0 && \([\s\S]*?\)\}/g, '');
fs.writeFileSync('src/components/MemberDashboard.tsx', memberCode);

let mentorCode = fs.readFileSync('src/components/MentorDashboard.tsx', 'utf8');
mentorCode = mentorCode.replace(/const unreadEmailsCount = .*\n/g, '');
mentorCode = mentorCode.replace(/\{t\.hasUnread && unreadEmailsCount > 0 && \([\s\S]*?\)\}/g, '');
fs.writeFileSync('src/components/MentorDashboard.tsx', mentorCode);
