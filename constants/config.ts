export const DIRECTUS_URL = process.env.EXPO_PUBLIC_DIRECTUS_URL ?? ''

export const DAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]

export const MEALS = ['Déjeuner', 'Dîner']

export function planKey(date: Date, meal: string): string {
  const iso = date.toISOString().slice(0, 10) // "YYYY-MM-DD"
  return `${iso}__${meal}`
}

export function getCurrentWeekDays(weekOffset = 0): Array<{ day: string; date: Date }> {
  const today = new Date()
  const dow = today.getDay() // 0=Sunday
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  return DAYS.map((day, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return { day, date }
  })
}

export function formatWeekRange(days: Array<{ day: string; date: Date }>): string {
  const start = days[0].date
  const end = days[6].date
  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return `${fmt(start)} – ${fmt(end)}`
}
