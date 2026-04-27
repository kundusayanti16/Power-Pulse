import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function reset() {
  await mongoose.connect(process.env.MONGO_URI);
  const hashedPassword = await bcrypt.hash('ad@123', 12);
  const res = await mongoose.connection.db.collection('users').updateOne(
    { email: 'admin@portal.com' },
    { $set: { password: hashedPassword } }
  );
  console.log('Update result:', res);
  process.exit();
}

reset();
