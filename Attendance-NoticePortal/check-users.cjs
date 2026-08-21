const mongoose = require('mongoose');
const dotenv = require('dotenv');

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
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log("Total Users in DB:", users.length);
  for (const u of users) {
    console.log(`- PIN: ${u.pin}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Password length: ${u.password ? u.password.length : 'none'}, Is Hash: ${u.password ? (u.password.startsWith('$2') || u.password.startsWith('$2a')) : 'no'}`);
  }
  await mongoose.disconnect();
}

run().catch(console.error);
