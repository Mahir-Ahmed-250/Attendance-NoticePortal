const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'Attendance_NoticePortal' });
  const CallTaskSchema = new mongoose.Schema({}, { strict: false });
  const CallTask = mongoose.models.CallTask || mongoose.model("CallTask", CallTaskSchema);
  const start = Date.now();
  const tasks = await CallTask.find({}).select("-liveInstructionImage").sort({ createdAt: -1 }).batchSize(20000).lean();
  console.log('BatchSize 20000 took', Date.now() - start, 'ms', 'Tasks:', tasks.length);
  process.exit(0);
}
run();
