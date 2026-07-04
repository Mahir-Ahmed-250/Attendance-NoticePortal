import express from "express";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { 
  User, Email, AttendanceReport, Notice, Feedback, Campus, 
  ProfileRequest, AttendanceEditRequest, LeaveRequest 
} from "./src/db/models";

dotenv.config();

const app = express();
const PORT = 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json({ limit: '50mb' }));

async function startServer() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined in .env file");
    // We don't exit here to allow Vite to serve the frontend with a warning if needed
  } else {
    try {
      await mongoose.connect(MONGODB_URI, { dbName: 'Attendance_NoticePortal' });
      console.log("Connected to MongoDB");

      // Auto-seed default manager if none exists in the database
      const managerExists = await User.findOne({ role: 'manager' });
      if (!managerExists) {
        console.log("Seeding default manager...");
        await User.create({
          pin: 'manager-1',
          name: 'Alice Vance',
          role: 'manager',
          email: 'manager@portal.com',
          password: 'password',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          designation: 'Chief Executive Officer'
        });
      }
    } catch (err) {
      console.error("MongoDB connection error:", err);
    }
  }

  // --- API ROUTES ---

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error("Database not connected");
      }
      const user = await User.findOne({ email: email.toLowerCase(), password });
      if (user) {
        if (user.isActive === false) {
          res.status(401).json({ error: "You do not have permission to login, please contact your mentor." });
        } else {
          res.json(user);
        }
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // Users (Members & Mentors)
  app.get("/api/users", async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.json([]); // Return empty array if not connected to avoid crashing frontend
      }
      const users = await User.find();
      res.json(users);
    } catch (err) {
      console.error("Fetch users error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const user = new User(req.body);
      await user.save();
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/users/:pin", async (req, res) => {
    try {
      const user = await User.findOneAndUpdate({ pin: req.params.pin }, req.body, { new: true, upsert: true });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/users/:pin", async (req, res) => {
    try {
      await User.findOneAndDelete({ pin: req.params.pin });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Attendance Reports
  app.get("/api/reports", async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) return res.json([]);
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
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/reports/:pin", async (req, res) => {
    try {
      const report = await AttendanceReport.findOneAndUpdate({ pin: req.params.pin }, req.body, { new: true });
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/reports/:pin", async (req, res) => {
    try {
      await AttendanceReport.findOneAndDelete({ pin: req.params.pin });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Notices
  app.get("/api/notices", async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) return res.json([]);
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
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/notices/:pin", async (req, res) => {
    try {
      await Notice.findOneAndDelete({ pin: req.params.pin });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/notices/:pin", async (req, res) => {
    try {
      const notice = await Notice.findOneAndUpdate({ pin: req.params.pin }, req.body, { new: true });
      res.json(notice);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Campuses
  app.get("/api/campuses", async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) return res.json([]);
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
    } catch (err) {
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
      if (mongoose.connection.readyState !== 1) return res.json([]);
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
      if (mongoose.connection.readyState !== 1) return res.json([]);
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
      if (mongoose.connection.readyState !== 1) return res.json([]);
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
      if (mongoose.connection.readyState !== 1) return res.json([]);
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
      if (mongoose.connection.readyState !== 1) return res.json([]);
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
      if (mongoose.connection.readyState !== 1) {
        throw new Error("Database not connected. Please set MONGODB_URI in settings.");
      }
      const { managers, mentors, members, reports, notices, campuses } = req.body;
      
      console.log("Seeding started...");
      
      // Clean all collections
      await Promise.all([
        User.deleteMany({}),
        AttendanceReport.deleteMany({}),
        Notice.deleteMany({}),
        Campus.deleteMany({}),
        Email.deleteMany({}),
        Feedback.deleteMany({}),
        ProfileRequest.deleteMany({}),
        AttendanceEditRequest.deleteMany({}),
        LeaveRequest.deleteMany({})
      ]);
      
      let allUsersToInsert: any[] = [];
      if (managers) allUsersToInsert.push(...managers.map((m: any) => ({ ...m, role: 'manager' })));
      if (mentors) allUsersToInsert.push(...mentors.map((m: any) => ({ ...m, role: 'mentor' })));
      if (members) allUsersToInsert.push(...members.map((m: any) => ({ ...m, role: 'member' })));
      
      // Deduplicate by pin
      const uniqueUsers = Array.from(new Map(allUsersToInsert.map(u => [u.pin, u])).values());
      
      if (uniqueUsers.length > 0) {
        await User.insertMany(uniqueUsers);
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
