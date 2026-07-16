// Simple script to create admin user
// Run with: node scripts/create-admin.js

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🌱 Creating admin user...');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('GaneshaGymSaparua2022', 10);
    
    // Create or update admin
    const admin = await prisma.user.upsert({
      where: { email: 'ganeshagymbandung@gmail.com' },
      update: {
        password: hashedPassword, // Update password if exists
      },
      create: {
        email: 'ganeshagymbandung@gmail.com',
        password: hashedPassword,
        name: 'Admin Ganesha Gym',
        role: 'ADMIN',
      },
    });

    console.log('✅ Admin created/updated successfully!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: GaneshaGymSaparua2022');
    console.log('👤 Name:', admin.name);
    console.log('✨ Done!');
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    if (error.message?.includes('connect')) {
      console.error('💡 Tip: Pastikan DATABASE_URL sudah dikonfigurasi di .env.local');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

