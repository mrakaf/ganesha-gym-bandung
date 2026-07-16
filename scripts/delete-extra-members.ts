
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️ Deleting extra members...\n')
  
  // Keep only "Demo Skripsi Ganesha"
  const result = await prisma.member.deleteMany({
    where: {
      NOT: {
        name: 'Demo Skripsi Ganesha'
      }
    }
  })
  
  console.log(`✅ Deleted ${result.count} member(s)!\n`)
  
  // Show remaining members
  const remaining = await prisma.member.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      _count: {
        select: {
          payments: true,
          visits: true
        }
      }
    }
  })
  
  console.log('📋 Remaining member(s):')
  remaining.forEach((m, i) => {
    console.log(`${i + 1}. ${m.name}`)
    console.log(`   ID: ${m.id}`)
    console.log(`   Detail URL: /admin/members/${m.id}`)
    console.log('')
  })
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

