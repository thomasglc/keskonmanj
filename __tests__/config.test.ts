import { planKey, getCurrentWeekDays, formatWeekRange } from '@/constants/config'

describe('planKey', () => {
  it('joins day and meal with double underscore', () => {
    expect(planKey('Lundi', 'Déjeuner')).toBe('Lundi__Déjeuner')
  })
})

describe('getCurrentWeekDays', () => {
  it('returns 7 days starting on Monday', () => {
    const days = getCurrentWeekDays()
    expect(days).toHaveLength(7)
    expect(days[0].day).toBe('Lundi')
    expect(days[6].day).toBe('Dimanche')
  })

  it('first day is a Monday', () => {
    const days = getCurrentWeekDays()
    expect(days[0].date.getDay()).toBe(1)
  })
})

describe('formatWeekRange', () => {
  it('returns a dash-separated range string', () => {
    const days = getCurrentWeekDays()
    const result = formatWeekRange(days)
    expect(result).toContain('–')
  })
})
