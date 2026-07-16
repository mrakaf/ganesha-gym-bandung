
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Mencari member yang hanya punya VISIT payment...\n')

  // Find all members who only have VISIT payments and no MEMBERSHIP payments
  const membersToCleanup = await prisma.member.findMany({
    include: {
      payments: {
        select: {
          id: true,
          type: true,
        }
      },
      visits: true
    }
  })

  const visitOnlyMembers = membersToCleanup.filter(member => {
    const hasMembershipPayment = member.payments.some(
      p => p.type === 'MEMBERSHIP_NEW' || p.type === 'MEMBERSHIP_RENEWAL'
    )
    const hasOnlyVisitPayments = member.payments.every(p => p.type === 'VISIT')
    return !hasMembershipPayment && member.payments.length > 0
  })

  if (visitOnlyMembers.length === 0) {
    console.log('✅ Tidak ada member yang hanya punya VISIT payment.\n')
    return
  }

  console.log(`⚠️ Menemukan ${visitOnlyMembers.length} member yang hanya punya VISIT payment:\n`)
  visitOnlyMembers.forEach(m => {
    console.log(`  - ${m.name} (${m.email || 'no email'})`)
    console.log(`    Payments: ${m.payments.length} VISIT, Visits: ${m.visits.length}`)
  })

  console.log('\n🗑️ Membersihkan...\n')

  // We need to:
  // 1. Disconnect visits from these members (set memberId to null and set visitorName)
  // 2. Disconnect payments from these members (set memberId to null)
  // 3. Delete the members

  for (const member of visitOnlyMembers) {
    console.log(`Memproses: ${member.name}...`)
    
    await prisma.$transaction(async (tx) => {
      // Update visits: set memberId to null, set visitorName to member name
      await tx.visit.updateMany({
        where: { memberId: member.id },
        data: { 
          memberId: null,
          visitorName: member.name 
        }
      })

      // Update payments: set memberId to null
      await tx.payment.updateMany({
        where: { memberId: member.id },
        data: { memberId: null }
      })

      // Delete member
      await tx.member.delete({
        where: { id: member.id }
      })
    })

    console.log(`  ✓ Selesai: ${member.name}`)
  }

  console.log('\n✅ Selesai!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
