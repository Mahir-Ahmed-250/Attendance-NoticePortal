import * as dotenv from "dotenv";
import express from "express";
import * as path from "node:path";
import * as fs from "node:fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cors from "cors";
import nodemailer from "nodemailer";
import dns from "dns";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
import { 
  User as UserRaw, 
  Email as EmailRaw, 
  AttendanceReport as AttendanceReportRaw, 
  Notice as NoticeRaw, 
  Feedback as FeedbackRaw, 
  Campus as CampusRaw, 
  ProfileRequest as ProfileRequestRaw, 
  AttendanceEditRequest as AttendanceEditRequestRaw, 
  LeaveRequest as LeaveRequestRaw,
  Branch as BranchRaw,
  CallTask as CallTaskRaw
} from "./src/db/models";
import { INITIAL_BRANCHES } from "./src/db/branches";

// Model aliases
const User = UserRaw as any;
const Email = EmailRaw as any;
const AttendanceReport = AttendanceReportRaw as any;
const Notice = NoticeRaw as any;
const Feedback = FeedbackRaw as any;
const Campus = CampusRaw as any;
const ProfileRequest = ProfileRequestRaw as any;
const AttendanceEditRequest = AttendanceEditRequestRaw as any;
const LeaveRequest = LeaveRequestRaw as any;
const Branch = BranchRaw as any;
const CallTask = CallTaskRaw as any;

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const PORT = 3000;
const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database connection setup
interface MongooseCache {
  conn: any | null;
  promise: Promise<any> | null;
}

let cached: MongooseCache = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn("MONGODB_URI is missing in environment variables");
      throw new Error("MONGODB_URI is required");
    }

    const opts = {
      dbName: process.env.MONGODB_DB_NAME || 'Attendance_NoticePortal_Dev',
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log("MongoDB Connected");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  // Seed initial data if database is empty
  await seedInitialData();

  return cached.conn;
};

const seedInitialData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("[SEED] Database is empty, seeding initial users...");
      
      const initialUsers = [
        {
          pin: 'manager-1',
          name: 'Alice Vance',
          role: 'manager',
          email: 'manager@portal.com',
          password: 'password',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          isActive: true,
          campus: 'Dhaka Main',
          designation: 'General Manager'
        },
        {
          pin: 'mentor-1',
          name: 'Sarah Jenkins',
          role: 'mentor',
          email: 'sarah.j@portal.com',
          password: 'password',
          campus: 'Dhaka Main',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          isActive: true,
          designation: 'Senior Mentor'
        },
        {
          pin: 'member-1',
          name: 'Alex Rivera',
          role: 'member',
          email: 'alex.r@portal.com',
          password: 'password',
          campus: 'Dhaka Main',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          isActive: true,
          designation: 'Team Member'
        }
      ];

      // Insert with plain text passwords as requested by user
      await User.insertMany(initialUsers);
      console.log(`[SEED] Seeded ${initialUsers.length} initial users.`);
    }

    const branchCount = await Branch.countDocuments();
    if (branchCount === 0) {
      console.log("[SEED] Seeding initial branches...");
      const branchesToInsert = INITIAL_BRANCHES.map((name, index) => ({
        id: `branch-${index + 1}`,
        name: name,
        campusId: null
      }));
      await Branch.insertMany(branchesToInsert);
      console.log(`[SEED] Seeded ${branchesToInsert.length} branches.`);
    }

    // Clean up/drop configurations collection as requested
    try {
      if (mongoose.connection && mongoose.connection.db) {
        await mongoose.connection.db.dropCollection('configurations').catch(() => {});
      }
    } catch (e) {
      // ignore
    }

    // Run database optimization & compaction
    await optimizeDatabase();
  } catch (err: any) {
    console.error("[SEED] Error seeding data:", err.message);
  }
};

const optimizeDatabase = async () => {
  try {
    if (!mongoose.connection || !mongoose.connection.db) return;
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    for (const colInfo of collections) {
      const colName = colInfo.name;
      if (colName.startsWith('system.')) continue;
      
      try {
        await db.command({ compact: colName }).catch(() => {});
      } catch (e) {
        // ignore if not supported by current DB tier
      }
    }
    console.log("[DB] Database optimization and compaction completed successfully.");
  } catch (err: any) {
    console.warn("[DB] Optimization notice:", err.message);
  }
};

// Health Check (before DB middleware)
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    database: mongoose.connection.readyState,
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    time: new Date().toISOString()
  });
});

// Middleware for DB connection on all other API routes
app.use("/api", async (req, res, next) => {
  if (req.path === "/health") return next();
  try {
    await connectDB();
    next();
  } catch (err: any) {
    console.error("DB Middleware Error:", err.message);
    res.status(500).json({ 
      error: "Database Connection Error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

// Database Optimization Endpoint
app.post("/api/db/optimize", async (req, res) => {
  try {
    await optimizeDatabase();
    res.json({ success: true, message: "Database optimized and compacted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to optimize database" });
  }
});

// Get Logo
app.get("/api/logo", async (req, res) => {
  try {
    const logoPath = path.join(process.cwd(), 'base64_logo.txt');
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath, 'utf8');
      return res.json({ logo: logoData });
    }
    res.json({ logo: null });
  } catch (err: any) {
    console.error("Logo fetch error:", err.message);
    res.json({ logo: null });
  }
});

// Helper function to send email via nodemailer
async function sendOTPEmail(toEmail: string, otp: string, userName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUser = (process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '');
    const cleanPass = (process.env.SMTP_PASS || '').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
    const customHost = (process.env.SMTP_HOST || '').trim().replace(/^["']|["']$/g, '');
    const customPort = (process.env.SMTP_PORT || '').trim().replace(/^["']|["']$/g, '');

    const defaultSender = cleanUser ? `"Exam Scripts Management" <${cleanUser}>` : '"Exam Scripts Management" <noreply@portal.com>';
    const mailOptions = {
      from: process.env.SMTP_FROM || defaultSender,
      to: toEmail,
      subject: 'Password Reset OTP - Exam Scripts Management',
      text: `Hello ${userName},\n\nYour OTP for password reset is: ${otp}\n\nThis OTP is valid for 10 minutes. If you did not request this, please ignore this email.\n\nBest regards,\nExam Scripts Management Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Password Reset Request</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>We received a request to reset your password. Use the following One-Time Password (OTP) to complete the process:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #1e1b4b; margin: 25px 0;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this password reset, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} Exam Scripts Management Team. All rights reserved.</p>
        </div>
      `
    };

    if (!cleanUser || !cleanPass) {
      console.log(`[EMAIL] SMTP credentials missing in environment variables. Creating Ethereal test account...`);
      try {
        const testAccount = await nodemailer.createTestAccount();
        const testTransporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: { user: testAccount.user, pass: testAccount.pass }
        });
        const info = await testTransporter.sendMail(mailOptions);
        console.log(`[EMAIL] Test Email sent via Ethereal! Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        return { success: true };
      } catch (etherealErr: any) {
        return { success: false, error: "SMTP_USER and SMTP_PASS environment variables are not configured on Render." };
      }
    }

    // Force IPv4 lookup function to prevent IPv6 ENETUNREACH errors on cloud hostings like Render
    const forceIpv4Lookup = (hostname: string, options: any, callback: any) => {
      const cb = typeof options === 'function' ? options : callback;
      if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        return cb(null, hostname, 4);
      }
      dns.resolve4(hostname, (err, addresses) => {
        if (!err && addresses && addresses.length > 0) {
          return cb(null, addresses[0], 4);
        }
        dns.lookup(hostname, { family: 4 }, (lErr, address) => {
          if (lErr) return cb(lErr);
          cb(null, address, 4);
        });
      });
    };

    // List of configurations to try sequentially with strict low timeouts to avoid HTTP 502 on Render
    const configs: Array<{ name: string; transportOptions: any }> = [];

    if (customHost && customHost !== 'smtp.gmail.com') {
      const port = customPort ? parseInt(customPort) : 587;
      configs.push({
        name: `Custom Host (${customHost}:${port})`,
        transportOptions: {
          host: customHost,
          port,
          secure: process.env.SMTP_SECURE === 'true' || port === 465,
          auth: { user: cleanUser, pass: cleanPass },
          tls: { rejectUnauthorized: false },
          family: 4,
          lookup: forceIpv4Lookup,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 7000,
        }
      });
    } else {
      // Gmail strategies for Render cloud environments with enforced IPv4 lookup:
      // 1. Port 465 (SSL)
      configs.push({
        name: 'Gmail SMTP (smtp.gmail.com:465 SSL IPv4)',
        transportOptions: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: cleanUser, pass: cleanPass },
          tls: { rejectUnauthorized: false },
          family: 4,
          lookup: forceIpv4Lookup,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 7000,
        }
      });

      // 2. Port 587 (TLS)
      configs.push({
        name: 'Gmail SMTP (smtp.gmail.com:587 TLS IPv4)',
        transportOptions: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: { user: cleanUser, pass: cleanPass },
          tls: { rejectUnauthorized: false },
          family: 4,
          lookup: forceIpv4Lookup,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 7000,
        }
      });

      // 3. Service 'gmail' transport with forced IPv4 lookup
      configs.push({
        name: 'Gmail Service Transport (IPv4)',
        transportOptions: {
          service: 'gmail',
          auth: { user: cleanUser, pass: cleanPass },
          tls: { rejectUnauthorized: false },
          family: 4,
          lookup: forceIpv4Lookup,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 7000,
        }
      });
    }

    let lastError = '';

    for (const cfg of configs) {
      try {
        console.log(`[EMAIL] Attempting to send OTP email via ${cfg.name}...`);
        const transporter = nodemailer.createTransport(cfg.transportOptions);
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] OTP Email sent successfully via ${cfg.name}! Message ID: ${info.messageId}`);
        return { success: true };
      } catch (err: any) {
        lastError = err.message || String(err);
        console.error(`[EMAIL] ${cfg.name} failed: ${lastError}`);
      }
    }

    // Determine exact user-facing error message
    let detailedError = `Failed to send email. Server output: ${lastError}`;
    if (lastError.includes('535') || lastError.includes('Invalid login') || lastError.includes('Username and Password not accepted') || lastError.includes('BadCredentials')) {
      detailedError = "Gmail Authentication Failed: Google rejected your credentials. You must use a 16-character Gmail 'App Password' (https://myaccount.google.com/apppasswords), NOT your normal Gmail account password.";
    } else if (lastError.includes('ETIMEDOUT') || lastError.includes('ECONNREFUSED') || lastError.includes('ENOTFOUND')) {
      detailedError = "SMTP Connection Timed Out on Render. Ensure port 465 is used or check Render environment variables.";
    }

    return { success: false, error: detailedError };
  } catch (err: any) {
    console.error("[EMAIL] Unexpected error in sendOTPEmail:", err.message || err);
    return { success: false, error: err.message || "Failed to send email." };
  }
}

// Auth
app.post("/api/auth/forgot-password", async (req, res) => {
  const { pin } = req.body;
  try {
    if (!pin) {
      return res.status(400).json({ error: "PIN is required." });
    }

    const trimmedPin = pin.trim();
    // Escape regex characters for safe search
    const escapedPin = trimmedPin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Find the user by exact PIN
    const user = await User.findOne({ 
      pin: { $regex: new RegExp(`^${escapedPin}$`, "i") } 
    });

    if (!user) {
      return res.status(404).json({ error: "No user found with this PIN." });
    }

    if (!user.email) {
      return res.status(400).json({ error: "No email address associated with this PIN. Please contact your mentor or manager." });
    }

    // Generate a secure random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpiry = expiry;
    await user.save();

    console.log(`[OTP] Generated OTP for user PIN ${user.pin} (${user.email}): ${otp}`);

    // Send the email asynchronously
    const emailResult = await sendOTPEmail(user.email, otp, user.name);

    if (emailResult.success) {
      return res.json({ message: "An OTP has been sent to your email address." });
    } else {
      return res.status(500).json({ 
        error: emailResult.error || "Failed to send OTP email. Please check server SMTP configuration." 
      });
    }

  } catch (err: any) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { pin, otp } = req.body;
  try {
    if (!pin || !otp) {
      return res.status(400).json({ error: "PIN and OTP are required." });
    }

    const trimmedPin = pin.trim();
    const trimmedOtp = otp.trim();

    const escapedPin = trimmedPin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ 
      pin: { $regex: new RegExp(`^${escapedPin}$`, "i") } 
    });

    if (!user) {
      return res.status(404).json({ error: "No user found with this PIN." });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ error: "No reset request found or OTP expired." });
    }

    // Check expiry
    const now = new Date();
    if (now > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: "The OTP has expired. Please request a new one." });
    }

    // Check OTP match
    if (user.otp !== trimmedOtp) {
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    res.json({ message: "OTP verified successfully!" });
  } catch (err: any) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { pin, otp, password } = req.body;
  try {
    if (!pin || !otp || !password) {
      return res.status(400).json({ error: "PIN, OTP and new password are required." });
    }

    const trimmedPin = pin.trim();
    const trimmedOtp = otp.trim();
    const trimmedPassword = password.trim();

    const escapedPin = trimmedPin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ 
      pin: { $regex: new RegExp(`^${escapedPin}$`, "i") } 
    });

    if (!user) {
      return res.status(404).json({ error: "No user found with this PIN." });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ error: "No reset request found or OTP expired." });
    }

    // Check expiry
    const now = new Date();
    if (now > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: "The OTP has expired. Please request a new one." });
    }

    // Check OTP match
    if (user.otp !== trimmedOtp) {
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    // Update password (plain text since database uses plain text)
    user.password = trimmedPassword;
    
    // Clear OTP fields
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    console.log(`[RESET] Password reset successfully for user PIN ${user.pin}`);
    res.json({ message: "Password reset successfully! You can now log in with your new password." });

  } catch (err: any) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email/PIN and password are required" });
    }

    const identifier = email.trim();
    // Escape regex characters for safe PIN search
    const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected. Please check your configuration." });
    }

    // Search by email (case-insensitive) or pin (case-insensitive)
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { pin: { $regex: new RegExp(`^${escapedIdentifier}$`, "i") } }
      ]
    });
    
    console.log(`[AUTH] Login attempt for: "${identifier}", User found: ${!!user}${user ? ` (Role: ${user.role}, Active: ${user.isActive})` : ""}`);

    // Check if user exists and verify password
    let isValid = false;
    if (user) {
      try {
        // First try bcrypt comparison
        isValid = await bcrypt.compare(password, user.password);
        
        // If bcrypt fails, check if the password in DB is plain text and matches
        if (!isValid && password === user.password) {
          isValid = true;
          // Do not upgrade to hash as user wants plain text in db
        }
      } catch (e: any) {
        console.warn(`[AUTH] Bcrypt compare failed for ${user.pin}, falling back to plain text. Error: ${e.message}`);
        // If bcrypt.compare throws (e.g. malformed hash), fallback to plain text check
        isValid = password === user.password;
        if (isValid) {
          // Do not upgrade to hash as user wants plain text in db
        }
      }
    }

    if (user && isValid) {
      console.log(`[AUTH] Login successful for user: ${user.pin}`);
      if (user.isActive === false) {
        res.status(401).json({ error: "Your account is disabled. Please contact your administrator." });
      } else {
        // Return a mock token and clean user object
        res.json({
          token: "mock-jwt-token-" + Math.random().toString(36).substring(7),
          user: {
            pin: user.pin,
            name: user.name,
            role: user.role,
            email: user.email,
            campus: user.campus,
            avatarUrl: user.avatarUrl,
            designation: user.designation,
            isActive: user.isActive,
            mentorPin: user.mentorPin,
            phone: user.phone
          },
        });
      }
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// Users (Members & Mentors)
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    res.json(users);
  } catch (err: any) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const userData = { ...req.body };
    if (userData.password) {
      // User requested plain text passwords instead of bcrypt
      // userData.password = await bcrypt.hash(userData.password, 10);
    }
    const user = new User(userData);
    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    res.json(userObj);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:pin", async (req, res) => {
  try {
    const { pin } = req.params;
    const updateData = { ...req.body };
    
    let existingUser = await User.findOne({ 
      pin: { $regex: new RegExp(`^${pin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } 
    });

    if (!existingUser && req.body.pin) {
      // If not found by param pin, try finding by body pin if provided
      const bodyPin = req.body.pin;
      existingUser = await User.findOne({ 
        pin: { $regex: new RegExp(`^${bodyPin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } 
      });
    }

    if (updateData.password) {
      // Trim password just in case
      updateData.password = updateData.password.trim();
      
      let isSamePassword = false;
      if (existingUser && existingUser.password) {
        try {
          // If the existing password is a bcrypt hash, compare with bcrypt
          if (existingUser.password.startsWith('$2b$') || existingUser.password.startsWith('$2a$')) {
            isSamePassword = await bcrypt.compare(updateData.password, existingUser.password);
          } else {
            // Fallback for plain text passwords
            isSamePassword = updateData.password === existingUser.password;
          }
        } catch (err: any) {
          console.warn(`[USER_UPDATE] Password check error for ${pin}:`, err.message);
          isSamePassword = false;
        }
      }

      if (isSamePassword) {
        console.log(`[USER_UPDATE] Password for ${pin} matches existing password/hash, skipping update.`);
        delete updateData.password;
      } else {
        console.log(`[USER_UPDATE] Saving new plain text password for ${pin}`);
        // updateData.password is already the new password
      }
    }

    // Remove _id from updateData to prevent immutable field errors
    delete updateData._id;
    delete updateData.__v;

    let user;
    if (existingUser) {
      // Use the found user's ID for precise update
      user = await User.findByIdAndUpdate(existingUser._id, updateData, { new: true }).lean();
      console.log(`[USER_UPDATE] Updated existing user: ${pin}`);
    } else {
      // Fallback to upsert if not found (shouldn't happen for profile updates)
      user = await User.findOneAndUpdate({ pin: pin }, updateData, { new: true, upsert: true }).lean();
      console.log(`[USER_UPDATE] User ${pin} not found, upserted new document.`);
    }

    if (user) {
      delete user.password;
    }
    res.json(user);
  } catch (err: any) {
    console.error(`[USER_UPDATE] Error updating user ${req.params.pin}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:pin", async (req, res) => {
  try {
    await User.findOneAndDelete({ pin: req.params.pin });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance Reports
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await AttendanceReport.find().sort({ date: -1 });
    res.json(reports);
  } catch (err) {
    console.error("Fetch reports error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/reports", async (req, res) => {
  try {
    const report = new AttendanceReport(req.body);
    await report.save();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/reports/:pin", async (req, res) => {
  try {
    const report = await AttendanceReport.findOneAndUpdate({ pin: req.params.pin }, req.body, { new: true });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/reports/:pin", async (req, res) => {
  try {
    await AttendanceReport.findOneAndDelete({ pin: req.params.pin });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notices
app.get("/api/notices", async (req, res) => {
  try {
    const notices = await Notice.find().sort({ date: -1 });
    res.json(notices);
  } catch (err) {
    console.error("Fetch notices error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/notices", async (req, res) => {
  try {
    const notice = new Notice(req.body);
    await notice.save();
    res.json(notice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notices/:pin", async (req, res) => {
  try {
    await Notice.findOneAndDelete({ pin: req.params.pin });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/notices/:pin", async (req, res) => {
  try {
    const notice = await Notice.findOneAndUpdate({ pin: req.params.pin }, req.body, { new: true });
    res.json(notice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Campuses
app.get("/api/campuses", async (req, res) => {
  try {
    const campuses = await Campus.find();
    res.json(campuses);
  } catch (err) {
    console.error("Fetch campuses error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/campuses", async (req, res) => {
  try {
    const campus = new Campus(req.body);
    await campus.save();
    res.json(campus);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

  app.put("/api/campuses/:id", async (req, res) => {
    try {
      const campus = await Campus.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
      res.json(campus);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/campuses/:id", async (req, res) => {
    try {
      await Campus.findOneAndDelete({ id: req.params.id });
      // Also unassign branches from this campus
      await Branch.updateMany({ campusId: req.params.id }, { campusId: null });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Branches
  app.get("/api/branches", async (req, res) => {
    try {
      const branches = await Branch.find();
      res.json(branches);
    } catch (err) {
      console.error("Fetch branches error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/branches", async (req, res) => {
    try {
      const branch = new Branch(req.body);
      await branch.save();
      res.json(branch);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/branches/:id", async (req, res) => {
    try {
      const branch = await Branch.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
      res.json(branch);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/branches/:id", async (req, res) => {
    try {
      await Branch.findOneAndDelete({ id: req.params.id });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Requests (Profile, Edit, Leave)
  app.get("/api/requests/profile", async (req, res) => {
    try {
      const reqs = await ProfileRequest.find().sort({ createdAt: -1 });
      res.json(reqs);
    } catch (err) {
      console.error("Fetch profile reqs error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/requests/profile", async (req, res) => {
    try {
      const request = new ProfileRequest(req.body);
      await request.save();
      res.json(request);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/requests/profile/:pin", async (req, res) => {
    try {
      const request = await ProfileRequest.findOneAndUpdate({ pin: req.params.pin }, req.body, { new: true });
      res.json(request);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/requests/profile/:pin", async (req, res) => {
    try {
      await ProfileRequest.findOneAndDelete({ pin: req.params.pin });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/requests/edit", async (req, res) => {
    try {
      const reqs = await AttendanceEditRequest.find().sort({ createdAt: -1 });
      res.json(reqs);
    } catch (err) {
      console.error("Fetch edit reqs error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/requests/edit", async (req, res) => {
    try {
      const request = new AttendanceEditRequest(req.body);
      await request.save();
      res.json(request);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/requests/edit/:pin", async (req, res) => {
    try {
      const request = await AttendanceEditRequest.findOneAndUpdate({ pin: req.params.pin }, req.body, { new: true });
      res.json(request);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/requests/edit/:pin", async (req, res) => {
    try {
      await AttendanceEditRequest.findOneAndDelete({ pin: req.params.pin });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/requests/leave", async (req, res) => {
    try {
      const reqs = await LeaveRequest.find().sort({ createdAt: -1 });
      res.json(reqs);
    } catch (err) {
      console.error("Fetch leave reqs error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/requests/leave", async (req, res) => {
    try {
      const request = new LeaveRequest(req.body);
      await request.save();
      res.json(request);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/requests/leave/:pin", async (req, res) => {
    try {
      const request = await LeaveRequest.findOneAndUpdate({ pin: req.params.pin }, req.body, { new: true });
      res.json(request);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/requests/leave/:pin", async (req, res) => {
    try {
      await LeaveRequest.findOneAndDelete({ pin: req.params.pin });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Emails
  app.get("/api/emails", async (req, res) => {
    try {
      const emails = await Email.find().sort({ date: -1 });
      res.json(emails);
    } catch (err) {
      console.error("Fetch emails error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/emails", async (req, res) => {
    try {
      const email = new Email(req.body);
      await email.save();
      res.json(email);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/emails/:pin", async (req, res) => {
    try {
      const email = await Email.findOneAndUpdate({ pin: req.params.pin }, req.body, { new: true });
      res.json(email);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/emails/:pin", async (req, res) => {
    try {
      await Email.findOneAndDelete({ pin: req.params.pin });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Feedbacks
  app.get("/api/feedbacks", async (req, res) => {
    try {
      const fbs = await Feedback.find().sort({ createdAt: -1 });
      res.json(fbs);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/feedbacks", async (req, res) => {
    try {
      const fb = new Feedback(req.body);
      await fb.save();
      res.json(fb);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/feedbacks/:pin", async (req, res) => {
    try {
      const fb = await Feedback.findOneAndUpdate({ pin: req.params.pin }, req.body, { new: true });
      res.json(fb);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/feedbacks/:pin", async (req, res) => {
    try {
      await Feedback.findOneAndDelete({ pin: req.params.pin });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Call Tasks
  app.get("/api/call-tasks", async (req, res) => {
    try {
      const { assignedToPin, liveAssignedToPin, liveInstructionStatus, feedbackStatus, className, campus, branch, userPin } = req.query;
      const andConditions: any[] = [];

      if (assignedToPin && !liveAssignedToPin) {
        andConditions.push({
          $or: [
            { assignedToPin: String(assignedToPin) },
            { liveAssignedToPin: String(assignedToPin) },
            { liveInstructorPin: String(assignedToPin) }
          ]
        });
      } else if (assignedToPin && liveAssignedToPin) {
        andConditions.push({ assignedToPin: String(assignedToPin) });
        andConditions.push({
          $or: [
            { liveAssignedToPin: String(liveAssignedToPin) },
            { liveInstructorPin: String(liveAssignedToPin) }
          ]
        });
      } else if (liveAssignedToPin) {
        andConditions.push({
          $or: [
            { liveAssignedToPin: String(liveAssignedToPin) },
            { liveInstructorPin: String(liveAssignedToPin) }
          ]
        });
      }

      if (liveInstructionStatus) andConditions.push({ liveInstructionStatus: String(liveInstructionStatus) });
      if (feedbackStatus) andConditions.push({ feedbackStatus: String(feedbackStatus) });
      if (className) andConditions.push({ className: String(className) });
      
      if (campus && campus !== 'All') {
        const campusStr = (campus as string).trim();
        // Find all branches that belong to this campus name (case-insensitive and partial match)
        const campuses = await Campus.find({ name: { $regex: new RegExp(campusStr, "i") } });
        const campusIds = campuses.map(c => c.id);
        const campusNames = campuses.map(c => c.name);
        
        const campusBranches = await Branch.find({ campusId: { $in: campusIds } });
        const branchNames = campusBranches.map(b => b.name);

        const campusUsers = await User.find({ campus: { $regex: new RegExp(campusStr, "i") } }, { pin: 1 });
        const campusUserPins = campusUsers.map(u => String(u.pin));
        
        // Automatic campus/branch match applies ONLY to non-online classes
        const autoCampusBranch = {
          $and: [
            { className: { $not: { $regex: /online|অনলাইন/i } } },
            {
              $or: [
                { campus: { $regex: new RegExp(campusStr, "i") } },
                { campus: { $in: campusNames } },
                { branch: { $in: branchNames.map(name => new RegExp(`^${name.trim()}$`, "i")) } }
              ]
            }
          ]
        };

        const campusConditions: any[] = [autoCampusBranch];

        if (campusUserPins.length > 0) {
          campusConditions.push(
            { assignedToPin: { $in: campusUserPins } },
            { liveAssignedToPin: { $in: campusUserPins } },
            { liveInstructorPin: { $in: campusUserPins } },
            { createdByPin: { $in: campusUserPins } }
          );
        }

        const targetPin = userPin || assignedToPin;
        if (targetPin) {
          campusConditions.push(
            { assignedToPin: String(targetPin) },
            { liveAssignedToPin: String(targetPin) },
            { liveInstructorPin: String(targetPin) },
            { createdByPin: String(targetPin) }
          );
        }

        andConditions.push({
          $or: campusConditions
        });
      }
      
      if (branch && branch !== 'all' && branch !== 'All') {
        andConditions.push({ branch: { $regex: new RegExp(`^${(branch as string).trim()}$`, "i") } });
      }
      
      const query = andConditions.length > 0 ? { $and: andConditions } : {};
      const tasks = await CallTask.find(query).sort({ createdAt: -1 }).lean();
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch call tasks" });
    }
  });

  app.post("/api/call-tasks/bulk", async (req, res) => {
    try {
      const incomingTasks = req.body;
      if (!Array.isArray(incomingTasks)) return res.status(400).json({ error: "Invalid data format" });

      const cleanStr = (s: any) => String(s || '').trim().toLowerCase();
      const cleanPhone = (s: any) => {
        let digits = String(s || '').replace(/\D/g, '');
        if (digits.startsWith('88')) digits = digits.slice(2);
        if (digits.length > 10) digits = digits.slice(-10);
        return digits;
      };

      // Fetch existing tasks to check for duplicates
      const existingTasks = await CallTask.find({}, {
        registrationNo: 1, pin: 1, rollNo: 1, roll: 1,
        studentName: 1, nickName: 1, className: 1,
        mobilePersonal: 1, mobileFather: 1, mobileMother: 1
      }).lean();

      const existingRegs = new Set<string>();
      const existingClassRolls = new Set<string>();
      const existingClassNames = new Set<string>();
      const existingPhones = new Set<string>();

      existingTasks.forEach((t: any) => {
        const reg1 = cleanStr(t.registrationNo);
        const reg2 = cleanStr(t.pin);
        const roll = cleanStr(t.rollNo || t.roll);
        const cls = cleanStr(t.className);
        const name = cleanStr(t.studentName || t.nickName);
        const p1 = cleanPhone(t.mobilePersonal);
        const p2 = cleanPhone(t.mobileFather);
        const p3 = cleanPhone(t.mobileMother);

        if (reg1) existingRegs.add(reg1);
        if (reg2) existingRegs.add(reg2);
        if (cls && roll) existingClassRolls.add(`${cls}::${roll}`);
        if (cls && name) existingClassNames.add(`${cls}::${name}`);
        if (p1 && p1.length >= 10) existingPhones.add(p1);
        if (p2 && p2.length >= 10) existingPhones.add(p2);
        if (p3 && p3.length >= 10) existingPhones.add(p3);
      });

      const nonDuplicateTasks: any[] = [];
      let duplicateCount = 0;

      for (const task of incomingTasks) {
        const reg1 = cleanStr(task.registrationNo);
        const reg2 = cleanStr(task.pin);
        const roll = cleanStr(task.rollNo || task.roll);
        const cls = cleanStr(task.className);
        const name = cleanStr(task.studentName || task.nickName);
        const p1 = cleanPhone(task.mobilePersonal);
        const p2 = cleanPhone(task.mobileFather);
        const p3 = cleanPhone(task.mobileMother);

        let isDuplicate = false;

        // Check 1: Reg / PIN match
        if ((reg1 && existingRegs.has(reg1)) || (reg2 && existingRegs.has(reg2))) {
          isDuplicate = true;
        }

        // Check 2: Class + Roll match
        if (!isDuplicate && cls && roll && existingClassRolls.has(`${cls}::${roll}`)) {
          isDuplicate = true;
        }

        // Check 3: Class + Student Name match (when reg/roll absent)
        if (!isDuplicate && cls && name && (!reg1 && !reg2 && !roll) && existingClassNames.has(`${cls}::${name}`)) {
          isDuplicate = true;
        }

        // Check 4: Same Personal Phone AND Name match
        if (!isDuplicate && p1 && p1.length >= 10 && name && existingPhones.has(p1) && existingClassNames.has(`${cls}::${name}`)) {
          isDuplicate = true;
        }

        if (isDuplicate) {
          duplicateCount++;
        } else {
          nonDuplicateTasks.push(task);
          // Register keys so internal duplicates in the same payload are also caught
          if (reg1) existingRegs.add(reg1);
          if (reg2) existingRegs.add(reg2);
          if (cls && roll) existingClassRolls.add(`${cls}::${roll}`);
          if (cls && name) existingClassNames.add(`${cls}::${name}`);
          if (p1 && p1.length >= 10) existingPhones.add(p1);
          if (p2 && p2.length >= 10) existingPhones.add(p2);
          if (p3 && p3.length >= 10) existingPhones.add(p3);
        }
      }

      if (nonDuplicateTasks.length > 0) {
        await CallTask.insertMany(nonDuplicateTasks);

        // Notify assigned team members / mentors for imported tasks
        const assignedCounts: { [pin: string]: number } = {};
        const liveAssignedCounts: { [pin: string]: number } = {};
        nonDuplicateTasks.forEach((t: any) => {
          if (t.assignedToPin) {
            assignedCounts[t.assignedToPin] = (assignedCounts[t.assignedToPin] || 0) + 1;
          }
          if (t.liveAssignedToPin && t.liveAssignedToPin !== t.assignedToPin) {
            liveAssignedCounts[t.liveAssignedToPin] = (liveAssignedCounts[t.liveAssignedToPin] || 0) + 1;
          }
        });
        for (const [pin, count] of Object.entries(assignedCounts)) {
          await notifyTaskAssignment(pin, `${count} call task(s)`);
        }
        for (const [pin, count] of Object.entries(liveAssignedCounts)) {
          await notifyTaskAssignment(pin, `${count} live instruction task(s)`);
        }
      }

      res.json({
        message: nonDuplicateTasks.length > 0
          ? `Successfully imported ${nonDuplicateTasks.length} tasks`
          : `All ${duplicateCount} tasks are duplicates and were skipped`,
        addedCount: nonDuplicateTasks.length,
        duplicateCount: duplicateCount,
        skippedCount: duplicateCount
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to import tasks", details: err.message });
    }
  });

async function notifyTaskAssignment(memberPin: string, detailText: string) {
  if (!memberPin) return;
  try {
    const cleanPin = String(memberPin).trim();
    if (!cleanPin) return;
    const targetUser = await User.findOne({
      pin: { $regex: new RegExp(`^${cleanPin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, "i") }
    });
    const toEmail = targetUser?.email || `${cleanPin}@portal.com`;
    const recipientName = targetUser?.name || cleanPin;
    const emailObj = new Email({
      pin: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      toEmail: toEmail,
      fromEmail: "system@portal.com",
      fromName: "Call Management System",
      subject: `New Call Task Assigned (${detailText})`,
      body: `Hello ${recipientName},\n\nYou have been assigned new call task(s): ${detailText}.\n\nPlease check your Call Management dashboard.\n\nDate: ${new Date().toLocaleString()}`,
      date: new Date().toISOString(),
      isRead: false,
      recipientPin: cleanPin
    });
    await emailObj.save();
  } catch (err) {
    console.error("Error creating assignment notification email:", err);
  }
}

  app.put("/api/call-tasks/assign", async (req, res) => {
    try {
      const {
        taskIds,
        assignedToPin,
        assignedToName,
        liveAssignedToPin,
        liveAssignedToName,
        assignType // 'feedback' | 'live' | 'both'
      } = req.body;
      if (!Array.isArray(taskIds)) return res.status(400).json({ error: "Invalid task IDs" });

      const setObj: any = {};
      
      if (!assignType || assignType === 'feedback' || assignType === 'both') {
        setObj.assignedToPin = assignedToPin !== undefined ? assignedToPin : null;
        setObj.assignedToName = assignedToName !== undefined ? assignedToName : null;
      }
      
      if (assignType === 'live' || assignType === 'both') {
        setObj.liveAssignedToPin = liveAssignedToPin !== undefined ? liveAssignedToPin : null;
        setObj.liveAssignedToName = liveAssignedToName !== undefined ? liveAssignedToName : null;
        if (liveAssignedToPin) {
          setObj.liveInstructorPin = liveAssignedToPin;
          setObj.liveInstructorName = liveAssignedToName;
        } else if (liveAssignedToPin === null) {
          setObj.liveInstructorPin = null;
          setObj.liveInstructorName = null;
        }
      }

      await CallTask.updateMany(
        { id: { $in: taskIds } },
        { $set: setObj }
      );

      if (assignedToPin) {
        await notifyTaskAssignment(assignedToPin, `${taskIds.length} call task(s)`);
      }
      if (liveAssignedToPin && liveAssignedToPin !== assignedToPin) {
        await notifyTaskAssignment(liveAssignedToPin, `${taskIds.length} live instruction task(s)`);
      }

      res.json({ message: "Tasks assigned successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to assign tasks" });
    }
  });

  app.put("/api/call-tasks/:id", async (req, res) => {
    try {
      const task = await CallTask.findOneAndUpdate(
        { id: req.params.id },
        { $set: req.body },
        { new: true }
      );
      if (task) {
        if (req.body.assignedToPin) {
          await notifyTaskAssignment(req.body.assignedToPin, `1 call task (${task.studentName || task.id})`);
        }
        if (req.body.liveAssignedToPin && req.body.liveAssignedToPin !== req.body.assignedToPin) {
          await notifyTaskAssignment(req.body.liveAssignedToPin, `1 live instruction task (${task.studentName || task.id})`);
        }
      }
      res.json(task);
    } catch (err) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/call-tasks/class/:className", async (req, res) => {
    try {
      await CallTask.deleteMany({ className: req.params.className });
      res.json({ success: true, message: `All call tasks for class ${req.params.className} deleted successfully` });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete tasks for class" });
    }
  });

  app.delete("/api/call-tasks", async (req, res) => {
    try {
      await CallTask.deleteMany({});
      res.json({ success: true, message: "All call tasks deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete all tasks" });
    }
  });

  app.delete("/api/call-tasks/:id", async (req, res) => {
    try {
      await CallTask.deleteOne({ id: req.params.id });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Fetch or Parse Merit List and Check Missing Students
  app.post("/api/fetch-merit-list", async (req, res) => {
    try {
      const { url, rawData, studentList } = req.body;
      let parsedStudents: any[] = [];

      // Case 1: Pre-parsed student list passed
      if (Array.isArray(studentList) && studentList.length > 0) {
        parsedStudents = studentList;
      } 
      // Case 2: URL specified
      else if (url) {
        try {
          const fetchRes = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });
          const htmlContent = await fetchRes.text();
          parsedStudents = parseMeritListFromHtml(htmlContent);
        } catch (fetchErr: any) {
          return res.status(400).json({ 
            error: "Could not fetch automatically from URL due to CORS or Portal Security. Please paste the Merit List HTML or text directly into the box below.", 
            details: fetchErr.message 
          });
        }
      }
      // Case 3: Raw pasted HTML or Text
      else if (rawData) {
        parsedStudents = parseMeritListFromHtml(rawData);
      }

      // Helper string & phone cleaners
      const cleanStr = (s: any) => String(s || '').trim().toLowerCase();
      const cleanPhone = (s: any) => {
        let digits = String(s || '').replace(/\D/g, '');
        if (digits.startsWith('88')) digits = digits.slice(2);
        if (digits.length > 10) digits = digits.slice(-10);
        return digits;
      };

      const isHeaderOrSummary = (val: string) => {
        if (!val) return false;
        const norm = val.toLowerCase().replace(/[^a-z0-9]/g, '');
        return [
          'sl', 'slno', 'serial', 'serialno',
          'registration', 'reg', 'regno', 'registrationno', 'pin', 'id',
          'roll', 'rollno', 'examroll',
          'studentname', 'fullname', 'name', 'nickname', 'student',
          'mobile', 'phone', 'contact', 'mobilenumber', 'mobilepersonal',
          'total', 'count', 'page', 'header', 'footer', 'signature', 'summary'
        ].includes(norm);
      };

      // Clean and filter input studentList / parsedStudents to remove invalid empty/footer/header records
      parsedStudents = parsedStudents.filter((st: any) => {
        if (!st) return false;
        const rawReg = st.registrationNo || st.pin;
        const rawRoll = st.rollNo || st.roll;
        const rawName = st.studentName || st.nickName;
        const reg = cleanStr(rawReg);
        const roll = cleanStr(rawRoll);
        const name = cleanStr(rawName);
        const phone1 = cleanPhone(st.mobilePersonal);
        const phone2 = cleanPhone(st.mobileFather);

        // Filter out header or footer summary row
        if (isHeaderOrSummary(rawReg) || isHeaderOrSummary(rawRoll) || isHeaderOrSummary(rawName)) {
          return false;
        }

        if (reg || roll || phone1 || phone2) return true;
        if (name && !/^student\s*\d+$/i.test(name) && !isHeaderOrSummary(rawName)) return true;
        return false;
      });

      if (parsedStudents.length === 0) {
        return res.status(400).json({ error: "No valid student records found in the provided data or URL." });
      }

      // Fetch all existing tasks from DB to compare
      const existingTasks = await CallTask.find().lean();
      
      const existingRegs = new Set<string>();
      const existingRolls = new Set<string>();
      const existingPhones = new Set<string>();
      const existingNames = new Set<string>();

      existingTasks.forEach((t: any) => {
        const reg1 = cleanStr(t.registrationNo);
        const reg2 = cleanStr(t.pin);
        if (reg1) existingRegs.add(reg1);
        if (reg2) existingRegs.add(reg2);

        const roll1 = cleanStr(t.rollNo);
        const roll2 = cleanStr(t.roll);
        if (roll1) existingRolls.add(roll1);
        if (roll2) existingRolls.add(roll2);

        const name = cleanStr(t.studentName);
        if (name) existingNames.add(name);

        [t.mobilePersonal, t.mobileFather, t.mobileMother].forEach(m => {
          const ph = cleanPhone(m);
          if (ph && ph.length >= 8) existingPhones.add(ph);
        });
      });

      const processedList = parsedStudents.map((st: any, idx: number) => {
        const normReg1 = cleanStr(st.registrationNo);
        const normReg2 = cleanStr(st.pin);
        const normRoll1 = cleanStr(st.rollNo);
        const normRoll2 = cleanStr(st.roll);
        const normName = cleanStr(st.studentName || st.nickName);
        
        const normPhones = [
          cleanPhone(st.mobilePersonal),
          cleanPhone(st.mobileFather),
          cleanPhone(st.mobileMother)
        ].filter(p => p && p.length >= 8);

        let exists = false;

        // Unique check by Registration Number (Reg No / PIN)
        if (normReg1 || normReg2) {
          if ((normReg1 && existingRegs.has(normReg1)) || (normReg2 && existingRegs.has(normReg2))) {
            exists = true;
          }
        } else if (normRoll1 || normRoll2) {
          if ((normRoll1 && existingRolls.has(normRoll1)) || (normRoll2 && existingRolls.has(normRoll2))) {
            exists = true;
          }
        } else if (normPhones.length > 0) {
          if (normPhones.some(ph => existingPhones.has(ph))) {
            exists = true;
          }
        }

        return {
          ...st,
          sl: st.sl || String(idx + 1),
          registrationNo: st.registrationNo || st.pin || '',
          rollNo: st.rollNo || st.roll || '',
          pin: st.pin || st.registrationNo || '',
          roll: st.roll || st.rollNo || '',
          existsInCallList: exists
        };
      });

      const missingStudents = processedList.filter(s => !s.existsInCallList);
      const matchedStudents = processedList.filter(s => s.existsInCallList);

      res.json({
        success: true,
        totalInMeritList: processedList.length,
        matchedCount: matchedStudents.length,
        missingCount: missingStudents.length,
        missingStudents,
        matchedStudents,
        allStudents: processedList
      });

    } catch (err: any) {
      console.error("Error processing merit list:", err);
      res.status(500).json({ error: "Failed to process merit list", details: err.message });
    }
  });

  // Helper parser for HTML/Table content from Merit List
  function parseMeritListFromHtml(htmlOrText: string): any[] {
    const rows: any[] = [];
    if (!htmlOrText || !htmlOrText.trim()) return rows;

    const mapHeaderName = (rawHeader: string): string => {
      const h = rawHeader.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!h) return '';
      
      if (h === 'sl' || h === 'slno' || h === 'serial' || h === 'serialno') return 'sl';
      if (h === 'registration' || h === 'reg' || h === 'regno' || h === 'registrationno' || h === 'pin' || h === 'studentid' || h === 'id') return 'registrationNo';
      if (h === 'roll' || h === 'rollno' || h === 'examroll') return 'rollNo';
      if (h === 'nickname' || h === 'nick') return 'nickName';
      if (h === 'fullname' || h === 'studentname' || h === 'name') return 'studentName';
      if (h === 'gender' || h === 'sex') return 'gender';
      if (h === 'institute' || h === 'school' || h === 'college') return 'institute';
      if (h === 'fathername' || h === 'father') return 'fatherName';
      if (h === 'mothername' || h === 'mother') return 'motherName';
      if (h.includes('personal') || h === 'mobile' || h === 'phone' || h === 'contact' || h === 'mobilepersonal' || h === 'personalphonenumberp') return 'mobilePersonal';
      if (h.includes('numbera') || h === 'mobilefather' || h === 'fatherphone' || h === 'guardianphone' || h === 'altphone') return 'mobileFather';
      if (h === 'branch') return 'branch';
      if (h === 'coursebat' || h === 'coursebatch' || h === 'course' || h === 'class' || h === 'classname' || h === 'program' || h === 'batch') return 'className';
      if (h.includes('bds') || h.includes('mbbs')) return 'mbbsBdsStatus';
      if (h.includes('stream') || h.includes('steam')) return 'streamName';
      if (h === 'fullmarks') return 'fullMarks';
      if (h === 'mcqmark' || h === 'mcqmarks') return 'mcqMarks';
      if (h === 'writtenmark' || h === 'writtenmarks') return 'writtenMarks';
      if (h === 'obtainedmarks' || h === 'obtainedmark') return 'totalObtainedMarks';
      if (h === 'totaldeduct' || h === 'marksdeduction' || h === 'deduct') return 'marksDeduction';
      if (h === 'totalmark' || h === 'totalmarks') return 'totalMarks';
      if (h === 'highestmark' || h === 'highestmarks') return 'highestMarks';
      if (h === 'percent' || h === 'percentmarks') return 'percentMarks';
      if (h === 'averagemark' || h === 'averagemarks') return 'averageMarks';
      if (h === 'merit' || h === 'branchmerit') return 'branchMerit';
      if (h === 'centralmerit') return 'centralMerit';
      if (h === 'meritrank' || h === 'meritpos' || h === 'meritposition' || h === 'rank') return 'meritPosition';
      if (h === 'particip' || h === 'participant' || h === 'totalparticipant') return 'totalParticipant';
      if (h === 'exammode') return 'examMode';
      
      return '';
    };

    let matrix: string[][] = [];

    // Check if HTML contains <tr>
    const trMatches = htmlOrText.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (trMatches && trMatches.length > 0) {
      trMatches.forEach(trHtml => {
        const cells = Array.from(trHtml.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)).map(m => {
          return m[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
        });
        if (cells.length > 0 && cells.some(c => c !== '')) {
          matrix.push(cells);
        }
      });
    } else {
      // Plain text parsing (Tab-separated, CSV, or line-by-line)
      const lines = htmlOrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        let parts: string[] = [];
        if (line.includes('\t')) {
          parts = line.split('\t').map(p => p.trim());
        } else if (line.includes(',')) {
          parts = line.split(',').map(p => p.trim());
        } else {
          parts = line.split(/\s{2,}/).map(p => p.trim());
        }
        if (parts.length > 0 && parts.some(p => p !== '')) {
          matrix.push(parts);
        }
      });
    }

    if (matrix.length === 0) return rows;

    // Detect header row index
    let headerRowIdx = -1;
    let fieldMapping: string[] = [];

    for (let r = 0; r < Math.min(matrix.length, 5); r++) {
      const row = matrix[r];
      const mappings = row.map(cell => mapHeaderName(cell));
      const matchedCount = mappings.filter(m => m !== '').length;
      if (matchedCount >= 2 || row.some(c => /sl|registration|roll|full name|gender|district|phone|campus|merit/i.test(c))) {
        headerRowIdx = r;
        fieldMapping = mappings;
        break;
      }
    }

    matrix.forEach((cells, idx) => {
      if (idx === headerRowIdx) return; // Skip header row

      const nonBlank = cells.filter(c => c && c.trim() !== '');
      if (nonBlank.length === 0) return; // Skip completely blank row

      const record: any = {
        sl: String(rows.length + 1),
        liveInstructionStatus: 'Pending',
        feedbackStatus: 'Pending'
      };

      if (fieldMapping.length > 0) {
        cells.forEach((val, colIdx) => {
          const field = fieldMapping[colIdx];
          if (field && val) {
            record[field] = val;
          }
        });
      } else {
        // Fallback positional assignment
        record.sl = cells[0] || String(rows.length + 1);
        record.registrationNo = cells[1] || '';
        record.rollNo = cells[2] || '';
        record.nickName = cells[3] || '';
        record.studentName = cells[4] || cells[3] || '';
        record.mobilePersonal = cells[10] || cells[5] || '';
      }

      // Ensure key fallback aliases exist
      if (!record.pin && record.registrationNo) record.pin = record.registrationNo;
      if (!record.registrationNo && record.pin) record.registrationNo = record.pin;
      
      if (!record.roll && record.rollNo) record.roll = record.rollNo;
      if (!record.rollNo && record.roll) record.rollNo = record.roll;

      if (!record.branch && record.campus) {
        record.branch = record.campus;
      } else if (!record.campus && record.branch) {
        record.campus = record.branch;
      }

      const reg = String(record.registrationNo || record.pin || '').trim();
      const roll = String(record.rollNo || record.roll || '').trim();
      const name = String(record.studentName || record.nickName || '').trim();
      const phone = String(record.mobilePersonal || record.mobileFather || '').trim();

      const isHeaderOrSummary = /^(sl|sl\.?|serial|total|count|page|header|name|student name)$/i.test(name);

      if (reg || roll || phone || (name && !isHeaderOrSummary)) {
        if (!record.studentName) {
          record.studentName = record.nickName || (reg ? `Student ${reg}` : roll ? `Student ${roll}` : `Student ${rows.length + 1}`);
        }
        rows.push(record);
      }
    });

    return rows;
  }

  // Seed data
  app.post("/api/seed", async (req, res) => {
    try {
      const { managers, mentors, members, reports, notices, campuses } = req.body;
      
      console.log("Seeding started...");
      
      // Only delete the mock/standard seeded data, protecting custom user profiles (e.g. PIN 5110)
      const mockUserPins = ['manager-1', 'mentor-1', 'member-1', 'member-2', 'member-3', 'member-4', 'member-5', 'member-6'];
      const mockNoticePins = ['notice-1', 'notice-3'];
      const mockReportPins = ['report-1', 'report-2', 'report-3'];
      const mockCampusIds = ['campus-1', 'campus-2', 'campus-3', 'campus-4'];

      await Promise.all([
        User.deleteMany({ pin: { $in: mockUserPins } }),
        AttendanceReport.deleteMany({ pin: { $in: mockReportPins } }),
        Notice.deleteMany({ pin: { $in: mockNoticePins } }),
        Campus.deleteMany({ id: { $in: mockCampusIds } })
      ]);
      
      let allUsersToInsert: any[] = [];
      if (managers) allUsersToInsert.push(...managers.map((m: any) => ({ ...m, role: 'manager' })));
      if (mentors) allUsersToInsert.push(...mentors.map((m: any) => ({ ...m, role: 'mentor' })));
      if (members) allUsersToInsert.push(...members.map((m: any) => ({ ...m, role: 'member' })));
      
      // Deduplicate by pin
      const uniqueUsers = Array.from(new Map(allUsersToInsert.map(u => [u.pin, u])).values());
      
      const usersToInsert = uniqueUsers.map((u: any) => {
        const password = u.password || 'password';
        return { ...u, password };
      });
      
      if (usersToInsert.length > 0) {
        await User.insertMany(usersToInsert);
      }
      
      if (reports && reports.length > 0) await AttendanceReport.insertMany(reports);
      if (notices && notices.length > 0) await Notice.insertMany(notices);
      if (campuses && campuses.length > 0) await Campus.insertMany(campuses);
      
      console.log("Seeding completed successfully.");
      res.json({ success: true });
    } catch (err) {
      console.error("Seed error:", err);
      res.status(500).json({ error: err.message });
    }
  });

// JSON Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// API 404 handler (must be after all other API routes)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Start Server
async function startServer() {
  // Try to connect to DB in background
  connectDB().catch(err => {
    console.error("Initial MongoDB connection failed. Server will retry on API requests.", err.message);
  });

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware integrated.");
    } catch (err: any) {
      console.error("Failed to integrate Vite middleware:", err.message);
    }
  } else if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static files from dist.");
  }

  // Bind to port 3000 and 0.0.0.0 as required
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
    });
  }
}

startServer();

export default app;
