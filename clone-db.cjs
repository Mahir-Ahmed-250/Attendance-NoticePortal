const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

async function cloneDatabase() {
  try {
    console.log("Connecting to MongoDB...");
    const conn = await mongoose.connect(uri);
    const admin = conn.connection.db.admin();
    
    const sourceDbName = 'Attendance_NoticePortal';
    const targetDbName = 'Attendance_NoticePortal_Dev';

    const sourceDb = conn.connection.useDb(sourceDbName, { useCache: false });
    const targetDb = conn.connection.useDb(targetDbName, { useCache: false });

    // Get collections of source database
    const collections = await sourceDb.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in '${sourceDbName}' to clone into '${targetDbName}'.`);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      console.log(`Cloning collection: ${colName}...`);
      
      const sourceCol = sourceDb.collection(colName);
      const targetCol = targetDb.collection(colName);

      // Clear target collection first
      await targetCol.deleteMany({});

      const documents = await sourceCol.find({}).toArray();
      if (documents.length > 0) {
        await targetCol.insertMany(documents);
        console.log(` -> Copied ${documents.length} documents to ${targetDbName}.${colName}`);
      } else {
        console.log(` -> Collection ${colName} is empty.`);
      }
    }

    console.log(`\nSuccessfully cloned database '${sourceDbName}' to '${targetDbName}'!`);
    console.log(`You can now connect to the new development database by setting dbName to '${targetDbName}' or updating your connection string.`);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error cloning database:", err);
    process.exit(1);
  }
}

cloneDatabase();
