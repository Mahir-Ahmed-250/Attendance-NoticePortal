const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ConfigurationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
});
const Configuration = mongoose.models.Configuration || mongoose.model('Configuration', ConfigurationSchema);

async function seed() {
    if (!process.env.MONGODB_URI) { console.error("No URI"); process.exit(1); }
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, { 
        dbName: 'Attendance_NoticePortal',
        serverSelectionTimeoutMS: 5000,
        bufferCommands: true,
    });
    
    // Read the file. Need to handle potential issues.
    const logoData = fs.readFileSync(path.join(__dirname, 'base64_logo.txt'), 'utf8');
    
    // Use findOneAndUpdate to seed
    await Configuration.findOneAndUpdate({ key: 'logo' }, { value: logoData }, { upsert: true });
    console.log("Logo seeded successfully");
    
    await mongoose.disconnect();
    process.exit(0);
}
seed();
