import { PrismaClient } from '@prisma/client'
import { fallbackExercises } from '../lib/fallback-exercises'

const prisma = new PrismaClient()

async function main() {
  let inserted = 0
  let updated = 0

  for (const exercise of fallbackExercises) {
    const existing = await prisma.exercise.findUnique({
      where: { name: exercise.name },
      select: { id: true },
    })

    await prisma.exercise.upsert({
      where: { name: exercise.name },
      create: {
        name: exercise.name,
        type: exercise.type,
        muscle: exercise.muscle,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions,
        instructionsId: exercise.instructions,
      },
      update: {
        type: exercise.type,
        muscle: exercise.muscle,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions,
        instructionsId: exercise.instructions,
      },
    })

    if (existing) updated += 1
    else inserted += 1
  }

  console.log(
    `[seed-fallback-exercises] selesai. total=${fallbackExercises.length}, inserted=${inserted}, updated=${updated}`
  )
}

main()
  .catch((error) => {
    console.error('[seed-fallback-exercises] gagal:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
