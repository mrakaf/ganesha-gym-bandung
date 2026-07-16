/**
 * Smoke test: WorkoutSessionService (premium) → log + list.
 * Jalankan: npx tsx scripts/smoke-workout-session.ts
 */
import 'dotenv/config'
import { prisma } from '../lib/db'
import { WorkoutSessionService } from '../src/services/workout-session-service'

async function main() {
  const service = new WorkoutSessionService()
  const tag = `smoke-ws-${Date.now()}`
  const email = `${tag}@test.local`
  const future = new Date()
  future.setDate(future.getDate() + 30)

  console.log('1) Buat member premium sementara...')
  const member = await prisma.member.create({
    data: {
      name: 'Smoke Workout Session',
      email,
      membershipEnd: future,
    },
  })

  try {
    console.log('2) POST logSession...')
    const logged = await service.logSession(email, undefined, {
      exerciseNames: ['Bench Press', 'Squat'],
      notes: 'smoke test',
      durationMinutes: 42,
    })
    console.log('   session id:', logged.id, 'exercises:', JSON.stringify(logged.exercises))

    console.log('3) GET listHistory...')
    const list = await service.listHistory(email, undefined, 10)
    if (!list.some((s) => s.id === logged.id)) {
      throw new Error('Sesi baru tidak muncul di riwayat')
    }
    console.log('   count:', list.length, 'latest:', list[0]?.id)

    console.log('\nOK — riwayat latihan (DB + service) berfungsi.')
  } finally {
    console.log('4) Hapus member uji (cascade workout_sessions)...')
    await prisma.member.delete({ where: { id: member.id } })
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
