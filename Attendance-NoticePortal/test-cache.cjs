const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'Attendance_NoticePortal' });
  const CallTaskSchema = new mongoose.Schema({}, { strict: false });
  const CallTask = mongoose.models.CallTask || mongoose.model("CallTask", CallTaskSchema);
  const start = Date.now();
  const res = await CallTask.find({}).select("-liveInstructionImage").sort({ createdAt: -1 }).lean();
  console.log('Took', Date.now() - start, 'ms');
  process.exit(0);
}
run();
