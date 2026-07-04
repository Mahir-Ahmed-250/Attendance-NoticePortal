const fs = require('fs');

// 1. ManagerDashboard.tsx
let managerCode = fs.readFileSync('src/components/ManagerDashboard.tsx', 'utf8');
managerCode = managerCode.replace(/"mentor_emails",/g, '');
managerCode = managerCode.replace(/"member_emails",/g, '');
managerCode = managerCode.replace(/"mentor_emails"/g, '');
managerCode = managerCode.replace(/"member_emails"/g, '');

const mentorEmailCheckboxStart = managerCode.indexOf('<label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">\n                                  <input\n                                    type="checkbox"\n                                    checked={memberForm.permissions.includes("mentor_emails")}');
if (mentorEmailCheckboxStart !== -1) {
    const endTag = '</label>';
    const mentorEmailCheckboxEnd = managerCode.indexOf(endTag, mentorEmailCheckboxStart) + endTag.length;
    managerCode = managerCode.substring(0, mentorEmailCheckboxStart) + managerCode.substring(mentorEmailCheckboxEnd);
}

fs.writeFileSync('src/components/ManagerDashboard.tsx', managerCode);

// 2. MemberDashboard.tsx
let memberCode = fs.readFileSync('src/components/MemberDashboard.tsx', 'utf8');
memberCode = memberCode.replace(/emails: EmailMessage\[\];\n/, '');
memberCode = memberCode.replace(/emails,\n/g, '');
memberCode = memberCode.replace(/, 'member_emails'/g, '');
memberCode = memberCode.replace(/ \| 'emails'/g, '');
memberCode = memberCode.replace(/if \(allowedPerms\.includes\('member_emails'\)\) return 'emails';\n/g, '');

// Also remove myEmails
const myEmailsRegex = /const myEmails = emails\.filter[^;]+;\n/g;
memberCode = memberCode.replace(myEmailsRegex, '');

fs.writeFileSync('src/components/MemberDashboard.tsx', memberCode);

// 3. MentorDashboard.tsx
let mentorCode = fs.readFileSync('src/components/MentorDashboard.tsx', 'utf8');
mentorCode = mentorCode.replace(/emails: EmailMessage\[\];\n/, '');
mentorCode = mentorCode.replace(/emails,\n/g, '');
mentorCode = mentorCode.replace(/, 'mentor_emails'/g, '');
mentorCode = mentorCode.replace(/ \| 'emails'/g, '');
mentorCode = mentorCode.replace(/if \(allowedPerms\.includes\('mentor_emails'\)\) return 'emails';\n/g, '');

const myMentorEmailsRegex = /const myEmails = emails\.filter[^;]+;\n/g;
mentorCode = mentorCode.replace(myMentorEmailsRegex, '');

// Remove Email tab from tabsList in MentorDashboard
const emailTabStart = mentorCode.indexOf('id: \'emails\' as const');
if (emailTabStart !== -1) {
    const startObj = mentorCode.lastIndexOf('{', emailTabStart);
    const endObj = mentorCode.indexOf('},', emailTabStart) + 2;
    mentorCode = mentorCode.substring(0, startObj) + mentorCode.substring(endObj);
}

// Remove Email tab UI from MentorDashboard
const emailUiStart = mentorCode.indexOf('{/* Tab 4: SIMULATED SECURE EMAIL INBOX */}');
if (emailUiStart !== -1) {
    const nextTab = mentorCode.indexOf('{/* Tab 5: PROFILE SETTINGS */}');
    if (nextTab !== -1) {
        mentorCode = mentorCode.substring(0, emailUiStart) + mentorCode.substring(nextTab);
    }
}

fs.writeFileSync('src/components/MentorDashboard.tsx', mentorCode);

console.log('Fixed emails in all dashboards');
