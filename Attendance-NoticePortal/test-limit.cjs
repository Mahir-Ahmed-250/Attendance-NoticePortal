const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'Attendance_NoticePortal' });
  const start = Date.now();
  const tasks = await mongoose.connection.db.collection('calltasks').find({}).limit(100).toArray();
  console.log('100 tasks took', Date.now() - start, 'ms');
  
  const start2 = Date.now();
  const tasks2 = await mongoose.connection.db.collection('calltasks').find({}, { projection: { liveInstructionImage: 0 } }).toArray();
  console.log('All tasks projected took', Date.now() - start2, 'ms', tasks2.length);
  process.exit(0);
}
run();
