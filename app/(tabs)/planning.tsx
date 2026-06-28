import { useRef, useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMenuContext } from '@/context/MenuDataContext'
import PlanDayRow from '@/components/PlanDayRow'
import DishBottomSheet, {
  type DishBottomSheetHandle,
} from '@/components/DishBottomSheet'
import { getCurrentWeekDays, formatWeekRange, planKey, MEALS } from '@/constants/config'
import { Colors } from '@/constants/colors'
import type { PlanCellInfo, Dish } from '@/types'

// ─── iCal helpers ────────────────────────────────────────────────────────────

function icsDate(date: Date, hour: number, minute: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(hour)}${pad(minute)}00`
  )
}

function generateICS(events: { date: Date; summary: string; description: string; startH: number; startM: number; endH: number; endM: number }[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Menu App//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.date.getTime()}-${e.startH}@menuapp`,
      `DTSTART:${icsDate(e.date, e.startH, e.startM)}`,
      `DTEND:${icsDate(e.date, e.endH, e.endM)}`,
      `SUMMARY:${e.summary}`,
      `DESCRIPTION:${e.description}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────

const MEAL_TIMES: Record<string, { startH: number; startM: number; endH: number; endM: number }> = {
  Déjeuner: { startH: 12, startM: 0, endH: 13, endM: 30 },
  Dîner:    { startH: 19, startM: 30, endH: 21, endM: 0 },
}

export default function PlanningScreen() {
  const { data, loading, addDishToCell, removeDishFromCell, pendingDish, clearPendingDish, showToast } = useMenuContext()
  const router = useRouter()
  const sheetRef = useRef<DishBottomSheetHandle>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const weekDays = useMemo(() => getCurrentWeekDays(weekOffset), [weekOffset])
  const weekLabel = useMemo(() => formatWeekRange(weekDays), [weekDays])
  const isCurrentWeek = weekOffset === 0

  const findDish = useCallback((dishId: string): { dish: Dish; color: string } | null => {
    if (!data) return null
    for (const cat of data.categories) {
      for (const sub of cat.subcategories) {
        const found = sub.dishes.find((d) => d.id === dishId)
        if (found) return { dish: found, color: cat.color }
      }
    }
    return null
  }, [data])

  const getCellInfo = (day: string, date: Date): PlanCellInfo[] => {
    if (!data) return []
    return MEALS.map((meal) => {
      const key = planKey(date, meal)
      const dishIds = data.weekPlan[key] ?? []
      const dishes = dishIds
        .map((id) => findDish(id))
        .filter((f): f is { dish: Dish; color: string } => f !== null)
        .map(({ dish, color }) => ({ dish, categoryColor: color }))
      return { key, day, meal, dishes }
    })
  }

  const handleExport = () => {
    if (!data) return
    const events: Parameters<typeof generateICS>[0] = []

    for (const { day, date } of weekDays) {
      for (const meal of MEALS) {
        const dishIds = data.weekPlan[planKey(date, meal)] ?? []
        if (dishIds.length === 0) continue
        const names = dishIds.map((id) => findDish(id)?.dish.name).filter(Boolean).join(', ')
        const times = MEAL_TIMES[meal]
        events.push({
          date,
          summary: `${meal} : ${names}`,
          description: dishIds.map((id) => findDish(id)?.dish.desc || '').filter(Boolean).join(' | '),
          ...times,
        })
      }
    }

    if (events.length === 0) {
      showToast('Aucun repas planifié cette semaine')
      return
    }

    const filename = `menu-${weekDays[0].date.toISOString().slice(0, 10)}.ics`
    downloadICS(generateICS(events), filename)
    showToast(`${events.length} repas exportés vers le calendrier`)
  }

  const handlePressCell = async (key: string, meal: string, date: Date) => {
    if (pendingDish) {
      await addDishToCell(key, pendingDish.id)
      clearPendingDish()
      const dateLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      showToast(`« ${pendingDish.name} » ajouté ${meal === 'Déjeuner' ? 'au déjeuner' : 'au dîner'} du ${dateLabel}`)
      router.navigate('/(tabs)/plats')
      return
    }
    setPendingKey(key)
    sheetRef.current?.open()
  }

  const handleSelectDish = async (dish: Dish, _catId: string, _subId: string) => {
    if (!pendingKey) return
    await addDishToCell(pendingKey, dish.id)
    setPendingKey(null)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Planning</Text>
          <View style={styles.headerActions}>
            {!isCurrentWeek && (
              <TouchableOpacity onPress={() => setWeekOffset(0)} style={styles.todayBtn}>
                <Text style={styles.todayBtnText}>Aujourd'hui</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
              <Ionicons name="share-outline" size={18} color={Colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => setWeekOffset((o) => o - 1)} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={20} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={styles.headerSubtitle}>{weekLabel}</Text>
          <TouchableOpacity onPress={() => setWeekOffset((o) => o + 1)} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={20} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {pendingDish && (
        <View style={styles.assignBanner}>
          <Ionicons name="calendar-outline" size={16} color={Colors.accent} />
          <Text style={styles.assignText} numberOfLines={1}>
            Ajouter <Text style={styles.assignDishName}>« {pendingDish.name} »</Text> — choisissez un créneau
          </Text>
          <TouchableOpacity onPress={clearPendingDish} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.grid}>
        {weekDays.map(({ day, date }) => (
          <PlanDayRow
            key={day}
            day={day}
            date={date}
            cells={getCellInfo(day, date)}
            onPressCell={handlePressCell}
            onRemoveDish={pendingDish ? () => {} : (key, dishId) => removeDishFromCell(key, dishId)}
            assignMode={!!pendingDish}
          />
        ))}
      </View>

      <DishBottomSheet
        ref={sheetRef}
        categories={data?.categories ?? []}
        onSelect={handleSelectDish}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
  exportBtn: {
    padding: 7,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navArrow: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  assignBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent + '30',
  },
  assignText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  assignDishName: {
    fontWeight: '700',
    color: Colors.accent,
  },
  grid: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
})
