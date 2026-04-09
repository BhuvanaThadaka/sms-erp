const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb://localhost:27017/school-erp');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('marks');
    
    console.log('Migrating "term" to "quarter" for legacy records...');
    const result = await collection.updateMany(
      { quarter: { $exists: false }, term: { $exists: true } },
      [
        { $set: { quarter: "$term" } }
      ]
    );
    console.log(`Migrated ${result.modifiedCount} records.`);
    
    // Drop old indexes
    const indexesToDrop = [
      'studentId_1_subjectId_1_term_1_academicYear_1', 
      'subjectId_1_term_1',
      'studentId_1_subjectId_1_termName_1_examCode_1_academicYear_1' 
    ];
    
    for (const name of indexesToDrop) {
      try {
        await collection.dropIndex(name);
        console.log(`Dropped index: ${name}`);
      } catch (err) {
        // IndexNotFound is fine
      }
    }
    
    console.log('Ensuring new robust index exists...');
    await collection.createIndex(
      { studentId: 1, subjectId: 1, termName: 1, examCode: 1, quarter: 1, academicYear: 1 },
      { unique: true, background: true }
    );
    console.log('Unique index on termName, examCode, and quarter ensured.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();
