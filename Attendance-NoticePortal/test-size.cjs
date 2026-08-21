const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'Attendance_NoticePortal' });
  const tasks = await mongoose.connection.db.collection('calltasks').find({}).project({ liveInstructionImage: 0 }).limit(1000).toArray();
  let max = 0;
  for (const t of tasks) {
    const s = JSON.stringify(t).length;
    if (s > max) max = s;
  }
  console.log('Max size without image:', max);
  process.exit(0);
}
run();
