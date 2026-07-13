import * as dotenv from "dotenv";
import express from "express";
import * as path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cors from "cors";
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
  Configuration as ConfigurationRaw
} from "./src/db/models";

// Load environment variables in local development
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const User = UserRaw as any;
const Email = EmailRaw as any;
const AttendanceReport = AttendanceReportRaw as any;
const Notice = NoticeRaw as any;
const Feedback = FeedbackRaw as any;
const Campus = CampusRaw as any;
const ProfileRequest = ProfileRequestRaw as any;
const AttendanceEditRequest = AttendanceEditRequestRaw as any;
const LeaveRequest = LeaveRequestRaw as any;
const Configuration = ConfigurationRaw as any;

const app = express();
const PORT = 3000;

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
      dbName: 'Attendance_NoticePortal',
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
  } catch (err: any) {
    console.error("[SEED] Error seeding data:", err.message);
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

// Get Logo
app.get("/api/logo", async (req, res) => {
  try {
    const config = await Configuration.findOne({ key: 'logo' });
    if (config) {
      res.json({ logo: config.value });
    } else {
      res.status(404).json({ error: "Logo not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logo" });
  }
});

// Auth
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
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// For Vercel, we export the app as a default handler
if (process.env.NODE_ENV !== "production") {
  const init = async () => {
    try {
      await connectDB();
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      
      app.listen(3000, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error("Server init error:", err);
    }
  };
  init();
} else if (!process.env.VERCEL) {
  // Standard production node environment (not Vercel)
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  app.listen(3000, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
