import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@portal.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists! You can log in.');
      process.exit(0);
    }

    // Create the admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    await User.create({
      name: "ADMIN",
      email: "admin@portal.com",
      phone: "+911234567890",
      consumerId: "ADMIN001",
      password: hashedPassword,
      role: "admin",
    });

    console.log('✅ Admin user created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

seedAdmin();
