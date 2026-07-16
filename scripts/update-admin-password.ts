// Script to update admin password
// Run with: npx tsx scripts/update-admin-password.ts

import { prisma } from '../lib/db'
import * as bcrypt from 'bcryptjs'

async function updateAdminPassword() {
  try {
    console.log('🔐 Updating admin password...')
    
    // Hash password baru
    const hashedPassword = await bcrypt.hash('admin123_', 10)
    console.log('✅ Password hashed:', hashedPassword.substring(0, 30) + '...')
    
    // Update admin password
    const admin = await prisma.user.update({
      where: { email: 'admin@ganeshagym.id' },
      data: {
        password: hashedPassword,
      },
    })

    console.log('✅ Admin password updated successfully!')
    console.log('📧 Email:', admin.email)
    console.log('🔑 Password: admin123_')
    console.log('✨ Done!')
  } catch (error: any) {
    console.error('❌ Error updating admin password:', error)
    if (error.code === 'P2025') {
      console.error('💡 Admin tidak ditemukan. Jalankan seed dulu: npm run db:seed')
    } else if (error.message?.includes('connect')) {
      console.error('💡 Tip: Pastikan DATABASE_URL sudah dikonfigurasi di .env.local')
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateAdminPassword()

