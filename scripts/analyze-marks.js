const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb://localhost:27017/school-erp');
    const db = mongoose.connection.db;
    const collection = db.collection('marks');
    
    // Find records with null termName and examCode
    const count = await collection.countDocuments({ termName: null, examCode: null });
    console.log(`Count of records with null termName AND null examCode: ${count}`);
    
    const sample = await collection.find({ termName: null, examCode: null }).limit(5).toArray();
    console.log('Sample of these records:');
    console.log(JSON.stringify(sample, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
