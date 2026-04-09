const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017/school-erp');
  try {
    await client.connect();
    const db = client.db();
    
    const teacher = await db.collection('users').findOne({ email: 'pranavbobade03@gmail.com' });
    if (!teacher) {
      console.log('Teacher not found');
      return;
    }
    
    const subjects = await db.collection('subjects').find({ subjectTeacher: teacher._id }).toArray();
    const classIds = [...new Set(subjects.map(s => s.classId.toString()))].map(id => new ObjectId(id));
    
    console.log('Teacher ID:', teacher._id);
    console.log('Class IDs to update:', classIds);
    
    if (classIds.length > 0) {
      const result = await db.collection('classes').updateMany(
        { _id: { $in: classIds } },
        { $addToSet: { teachers: teacher._id } }
      );
      console.log('Updated', result.modifiedCount, 'classes');
    } else {
      console.log('No classes found for teacher subjects');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
