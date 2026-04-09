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
    console.log('Teacher ID:', teacher._id);
    
    const classes = await db.collection('classes').find({ 
      $or: [
        { classTeacher: teacher._id },
        { teachers: { $in: [teacher._id] } }
      ] 
    }).toArray();
    
    console.log('Classes found for teacher:', JSON.stringify(classes.map(c => ({ 
      _id: c._id,
      name: c.name, 
      classTeacher: c.classTeacher, 
      isClassTeacher: c.classTeacher.toString() === teacher._id.toString(),
      teachers: c.teachers 
    })), null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
