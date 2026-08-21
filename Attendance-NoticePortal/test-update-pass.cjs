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

  const UserSchema = new mongoose.Schema({
    pin: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, default: 'password' },
    avatarUrl: String,
    designation: String,
    isActive: { type: Boolean, default: true },
  });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  // Find user '5110'
  const user = await User.findOne({ pin: '5110' });
  console.log("Existing user password hash:", user.password);

  // Set new password
  const newPasswordPlain = 'secret123';
  const hashed = await bcrypt.hash(newPasswordPlain, 10);

  // Update in DB using findByIdAndUpdate
  const updateData = { password: hashed };
  const updatedUser = await User.findByIdAndUpdate(user._id, updateData, { new: true });
  console.log("Updated user in DB password hash:", updatedUser.password);

  // Verify compare
  const match = await bcrypt.compare(newPasswordPlain, updatedUser.password);
  console.log("Password verify match:", match);

  // Restore password back to 'password' for production / normal usage
  const originalHashed = await bcrypt.hash('password', 10);
  await User.findByIdAndUpdate(user._id, { password: originalHashed });
  console.log("Restored original password.");

  await mongoose.disconnect();
}

run().catch(console.error);
