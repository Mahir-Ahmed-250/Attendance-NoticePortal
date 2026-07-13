const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  pin: String,
  name: String,
  role: String,
  email: String,
  password: { type: String, default: 'password' },
});

const User = mongoose.model('User', UserSchema);

async function check() {
  await mongoose.connect(uri, { dbName: 'Attendance_NoticePortal' });
  console.log("Connected to database");
  const users = await User.find().lean();
  console.log("Users in database:");
  users.forEach(u => {
    console.log(`PIN: ${u.pin}, Name: ${u.name}, Password field: ${u.password ? (u.password.startsWith('$') ? 'HASHED' : 'PLAIN: ' + u.password) : 'MISSING'}`);
  });
  await mongoose.disconnect();
}

check().catch(console.error);
