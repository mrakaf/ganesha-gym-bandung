import { ExerciseImageQuery } from '@/src/models/exercise-image'

const muscleImageMap: Record<string, string> = {
  biceps: 'biceps',
  triceps: 'triceps',
  chest: 'chest',
  shoulders: 'shoulder',
  lats: 'back',
  quadriceps: 'leg',
  abdominals: 'abs',
  hamstrings: 'leg',
  calves: 'leg',
  glutes: 'glutes',
  forearms: 'forearm',
  traps: 'shoulder',
  middle_back: 'back',
  lower_back: 'back',
}

const muscleColors: Record<string, { from: string; to: string }> = {
  biceps: { from: '#FF6B6B', to: '#FF8E8E' },
  triceps: { from: '#4ECDC4', to: '#6EDDD6' },
  chest: { from: '#45B7D1', to: '#6BC5D9' },
  shoulders: { from: '#FFA07A', to: '#FFB89A' },
  lats: { from: '#98D8C8', to: '#B8E8D8' },
  quadriceps: { from: '#F7DC6F', to: '#F9E68F' },
  abdominals: { from: '#BB8FCE', to: '#D5A9E6' },
  hamstrings: { from: '#85C1E2', to: '#A5D1F2' },
  calves: { from: '#F8B739', to: '#FAC759' },
  glutes: { from: '#52BE80', to: '#72DEA0' },
  forearms: { from: '#EC7063', to: '#FC9083' },
  traps: { from: '#5DADE2', to: '#7DCDF2' },
  middle_back: { from: '#58D68D', to: '#78F6AD' },
  lower_back: { from: '#F39C12', to: '#F3BC42' },
}

export class ExerciseImageService {
  generateSvg(query: ExerciseImageQuery): string {
    const exerciseName = query.exercise || 'gym workout'
    const muscle = (query.muscle || '').toLowerCase()
    const keyword = muscleImageMap[muscle] || 'gym'
    const colors = muscleColors[muscle] || { from: '#D97706', to: '#F59E0B' }
    const _hash = exerciseName.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)
    return `
      <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.from};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.to};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="600" height="400" fill="url(#grad)"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" opacity="0.3">
          ${keyword.toUpperCase()}
        </text>
      </svg>
    `.trim()
  }
}

