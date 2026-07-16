
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📋 Checking members in database...\n')
  
  const members = await prisma.member.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          payments: true,
          visits: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  if (members.length === 0) {
    console.log('❌ No members found in database!')
    return
  }
  
  console.log(`✅ Found ${members.length} member(s):\n`)
  members.forEach((m, i) => {
    console.log(`${i + 1}. ${m.name}`)
    console.log(`   ID: ${m.id}`)
    console.log(`   Email: ${m.email || 'N/A'}`)
    console.log(`   Username: ${m.username || 'N/A'}`)
    console.log(`   Status: ${m.isActive ? 'Active' : 'Inactive'}`)
    console.log(`   Payments: ${m._count.payments}`)
    console.log(`   Visits: ${m._count.visits}`)
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

