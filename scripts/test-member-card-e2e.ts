/**
 * Uji alur: pembayaran MEMBERSHIP_NEW (tunai) lunas → memberCardId terisi N/04
 * Meniru AdminService.confirmCashPayment + applyBenefitsForPaidPayment
 *
 * Jalankan: npx tsx scripts/test-member-card-e2e.ts
 */

import { prisma } from '../lib/db'
import { applyBenefitsForPaidPayment } from '../lib/payment-activation'

async function main() {
  const tag = `e2e-card-${Date.now()}`
  const email = `${tag}@test.local`
  const orderId = `GANESHA-E2E-${tag}`

  console.log('1) Buat member uji (tanpa kartu)...')
  const member = await prisma.member.create({
    data: {
      name: 'E2E Kartu Test',
      email,
      isActive: false,
      mustPayRegistrationFee: true,
    },
  })
  console.log('   memberId:', member.id)

  console.log('2) Buat pembayaran tunai PENDING (MEMBERSHIP_NEW)...')
  const payment = await prisma.payment.create({
    data: {
      memberId: member.id,
      type: 'MEMBERSHIP_NEW',
      amount: 200000,
      status: 'PENDING',
      paymentMethod: 'cash',
      orderId,
      description: 'E2E — member baru tunai',
    },
  })
  console.log('   paymentId:', payment.id)

  console.log('3) Simulasi konfirmasi kasir (PAID + benefit)...')
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: new Date() },
    })
    await applyBenefitsForPaidPayment(tx, {
      memberId: member.id,
      type: 'MEMBERSHIP_NEW',
      orderId,
    })
  })

  const after = await prisma.member.findUnique({
    where: { id: member.id },
    select: {
      memberCardId: true,
      isActive: true,
      membershipStart: true,
      membershipEnd: true,
    },
  })
  const issue = await prisma.memberCardIssue.findUnique({
    where: { memberId: member.id },
  })

  console.log('\n--- Hasil ---')
  console.log('memberCardId:', after?.memberCardId ?? '(null)')
  console.log('memberCardIssue.id (N):', issue?.id ?? '(tidak ada)')
  console.log('isActive:', after?.isActive)
  console.log('membershipEnd:', after?.membershipEnd?.toISOString())

  const ok =
    !!after?.memberCardId &&
    /^\d+\/04$/.test(after.memberCardId) &&
    after.memberCardId === `${issue?.id}/04`

  if (!ok) {
    console.error('\nGAGAL: Format kartu harus N/04 dan sama dengan member_card_issues.id')
    process.exitCode = 1
  } else {
    console.log('\nOK: Kartu sesuai pola N/04 dan sinkron dengan penerbitan.')
  }

  console.log('\n4) Bersihkan data uji...')
  await prisma.payment.deleteMany({ where: { memberId: member.id } })
  await prisma.memberCardIssue.deleteMany({ where: { memberId: member.id } })
  await prisma.member.delete({ where: { id: member.id } })
  console.log('   Selesai (member + payment + issue dihapus).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
