import { prisma } from '@/lib/db'

export class ExerciseRepository {
  findMemberAccessByEmail(email: string) {
    return prisma.member.findUnique({
      where: { email },
      select: {
        membershipEnd: true,
        accessType: true,
        accessStart: true,
        accessEnd: true,
      },
    })
  }

  findExercises(where: any, take = 30) {
    return prisma.exercise.findMany({
      where,
      select: {
        name: true,
        type: true,
        muscle: true,
        equipment: true,
        difficulty: true,
        instructions: true,
        instructionsId: true,
      },
      take,
    })
  }

  findExerciseTranslationByName(name: string) {
    return prisma.exercise.findUnique({
      where: { name },
      select: { instructionsId: true },
    })
  }

  upsertExerciseFromApi(exercise: {
    name: string
    type?: string | null
    muscle?: string | null
    equipment?: string | null
    difficulty?: string | null
    instructions?: string | null
  }) {
    return prisma.exercise.upsert({
      where: { name: exercise.name },
      create: {
        name: exercise.name,
        type: exercise.type || 'strength',
        muscle: exercise.muscle || '',
        equipment: exercise.equipment || 'body weight',
        difficulty: exercise.difficulty || 'beginner',
        instructions: exercise.instructions || '',
        instructionsId: null,
      },
      update: {
        instructions: exercise.instructions || '',
      },
    })
  }
}

