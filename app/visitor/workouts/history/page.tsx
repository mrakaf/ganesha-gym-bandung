import { redirect } from 'next/navigation'

/** Riwayat digabung di halaman rekomendasi; URL lama tetap valid. */
export default function WorkoutHistoryRedirectPage() {
  redirect('/visitor/workouts?tab=riwayat')
}
