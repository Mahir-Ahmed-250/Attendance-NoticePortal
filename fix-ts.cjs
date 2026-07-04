const fs = require('fs');
let code = fs.readFileSync('src/components/MemberDashboard.tsx', 'utf8');

code = code.replace("icon: <Calendar className=\"w-4 h-4\" />\n    },", "icon: <Calendar className=\"w-4 h-4\" />,\n      hasUnread: false\n    },");
code = code.replace("icon: <FileText className=\"w-4 h-4\" />\n    },", "icon: <FileText className=\"w-4 h-4\" />,\n      hasUnread: false\n    },");

fs.writeFileSync('src/components/MemberDashboard.tsx', code);
