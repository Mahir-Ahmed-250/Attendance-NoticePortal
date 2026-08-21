const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    return;
  }
  await mongoose.connect(uri, { dbName: 'Attendance_NoticePortal' });
  console.log("Connected to MongoDB!");
  const hashedPassword = await bcrypt.hash('password', 10);
  const result = await mongoose.connection.db.collection('users').updateOne(
    { pin: '5110' },
    { $set: { password: hashedPassword } }
  );
  console.log("Password reset result:", result);
  await mongoose.disconnect();
}

run().catch(console.error);
