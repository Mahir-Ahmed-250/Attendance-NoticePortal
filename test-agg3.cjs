const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'Attendance_NoticePortal' });
  const start = Date.now();
  const tasks = await mongoose.connection.db.collection('calltasks').aggregate([
    { $sort: { createdAt: -1 } },
    {
      $set: {
        hasLiveInstructionImage: {
          $cond: [
            { $and: [
              { $ne: ["$liveInstructionImage", null] },
              { $ne: ["$liveInstructionImage", ""] },
              { $ne: ["$liveInstructionImage", "[]"] },
              { $ifNull: ["$liveInstructionImage", false] }
            ]},
            true,
            false
          ]
        }
      }
    },
    { $unset: "liveInstructionImage" }
  ]).toArray();
  console.log('Agg took', Date.now() - start, 'ms', 'Tasks:', tasks.length);
  process.exit(0);
}
run();
