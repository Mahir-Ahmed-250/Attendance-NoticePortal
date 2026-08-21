const fs = require('fs');
let code = fs.readFileSync('src/components/MentorDashboard.tsx', 'utf-8');

const target = `          "mentor_members",
          "campus_directory",
        ];`;
const replacement = `          "mentor_members",
          "campus_directory",
          "call_management",
        ];`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/MentorDashboard.tsx', code);
console.log("Success");
