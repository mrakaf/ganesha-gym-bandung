import { prisma } from '../lib/db'
import * as bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Seeding database...')

  // Hash password untuk admin
  const hashedPassword = await bcrypt.hash('admin123_', 10)

  // Buat atau update admin pertama
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ganeshagym.id' },
    update: {
      password: hashedPassword, // Update password jika admin sudah ada
    },
    create: {
      email: 'admin@ganeshagym.id',
      password: hashedPassword,
      name: 'Admin Ganesha Gym',
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin created:', admin.email)
  console.log('📝 Password: admin123_')
  console.log('✨ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

