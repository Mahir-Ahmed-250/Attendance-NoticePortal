const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

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

async function testEndpoint() {
  await mongoose.connect(uri, { dbName: 'Attendance_NoticePortal' });
  console.log("Connected to database");

  const testPin = "5110";
  const user = await User.findOne({ pin: testPin }).lean();
  if (!user) {
    console.error("Test user not found");
    await mongoose.disconnect();
    return;
  }
  const oldPassword = user.password;
  console.log("Current password in database:", oldPassword);

  // Now, let's simulate sending a PUT request to /api/users/5110 via node-fetch/http
  const http = require('http');
  const payload = JSON.stringify({
    ...user,
    password: "testnewpassword123"
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/users/${testPin}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', async () => {
      console.log("Response status:", res.statusCode);
      console.log("Response data:", data);

      // Fetch user again to see if password changed
      const updatedUser = await User.findOne({ pin: testPin }).lean();
      console.log("New password in database:", updatedUser.password);

      const isUpdated = await bcrypt.compare("testnewpassword123", updatedUser.password);
      console.log("Is password successfully updated and matched?", isUpdated);

      // Restore old password
      await User.updateOne({ pin: testPin }, { password: oldPassword });
      console.log("Restored original password in database");

      await mongoose.disconnect();
    });
  });

  req.on('error', async (e) => {
    console.error("HTTP request error:", e);
    await mongoose.disconnect();
  });

  req.write(payload);
  req.end();
}

testEndpoint().catch(console.error);
