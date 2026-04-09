const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb://localhost:27017/school-erp');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const marksCollection = collections.find(c => c.name === 'marks');
    
    if (marksCollection) {
      const indexes = await db.collection('marks').indexes();
      console.log('Indexes for "marks" collection:');
      console.log(JSON.stringify(indexes, null, 2));
    } else {
      console.log('Collection "marks" not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
