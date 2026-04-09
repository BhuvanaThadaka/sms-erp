const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb://localhost:27017/school-erp');
    const db = mongoose.connection.db;
    const collection = db.collection('marks');
    
    const target = {
      studentId: new mongoose.Types.ObjectId('69d0fcad42946c7094425766'),
      subjectId: new mongoose.Types.ObjectId('69d0fd1d42946c70944257fe'),
      termName: null,
      examCode: null,
      quarter: null,
      academicYear: '2024-2025'
    };
    
    const records = await collection.find(target).toArray();
    console.log(`Found ${records.length} records matching the criteria.`);
    console.log(JSON.stringify(records, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
