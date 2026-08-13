const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'Attendance_NoticePortal' });
  const CallTaskSchema = new mongoose.Schema({}, { strict: false });
  const CallTask = mongoose.models.CallTask || mongoose.model("CallTask", CallTaskSchema);
  const start = Date.now();
  const tasks = await CallTask.find({}).select("-liveInstructionImage").sort({ createdAt: -1 }).lean();
  console.log('Find select took', Date.now() - start, 'ms', 'Tasks:', tasks.length);
  process.exit(0);
}
run();
