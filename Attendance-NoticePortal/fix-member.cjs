const fs = require('fs');
let code = fs.readFileSync('src/components/MemberDashboard.tsx', 'utf8');

const leaveStart = code.indexOf('      {/* Tab 2: LEAVE REQUESTS */}');
const noticesStart = code.indexOf('      {/* Tab 4: RELEVANT BULLETIN BOARD */}');

if (leaveStart !== -1 && noticesStart !== -1) {
  let firstPart = code.substring(0, leaveStart);
  let lastPart = code.substring(noticesStart);
  fs.writeFileSync('src/components/MemberDashboard.tsx', firstPart + lastPart);
  console.log('Removed Leave and Attendance Adjustment tabs');
} else {
  console.log('Not found');
}
