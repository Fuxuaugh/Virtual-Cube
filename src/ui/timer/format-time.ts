/**
 * Format waktu timer (MILESTONES 8A).
 * Dipisah dari komponen supaya `react-refresh` tetap ramah dan mudah dites.
 */

/** Format waktu (ms) menjadi `s.cc` atau `m:ss.cc`. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms))
  const centis = Math.floor((total % 1000) / 10)
  const seconds = Math.floor(total / 1000)
  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60
  const centisText = String(centis).padStart(2, '0')

  return minutes > 0
    ? `${minutes}:${String(restSeconds).padStart(2, '0')}.${centisText}`
    : `${restSeconds}.${centisText}`
}

/** Format hitungan mundur inspection (ms) dengan satu desimal, mis. `14.3`. */
export function formatInspection(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(1)
}
