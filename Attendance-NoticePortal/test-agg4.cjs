const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'Attendance_NoticePortal' });
  const start = Date.now();
  const tasks = await mongoose.connection.db.collection('calltasks').find({}, { projection: { liveInstructionImage: 0 } }).sort({ createdAt: -1 }).toArray();
  console.log('Projected tasks:', tasks.length);
  console.log('Took', Date.now() - start, 'ms');
  process.exit(0);
}
run();
