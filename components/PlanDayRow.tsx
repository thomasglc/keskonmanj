import { View, Text, StyleSheet } from 'react-native'
import PlanCell from './PlanCell'
import { Colors } from '@/constants/colors'
import { MEALS, planKey } from '@/constants/config'
import type { PlanCellInfo } from '@/types'

interface Props {
  day: string
  date: Date
  cells: PlanCellInfo[]
  onPressCell: (key: string, meal: string, date: Date) => void
  onRemoveDish: (key: string, dishId: string) => void
  assignMode?: boolean
}

const DAY_SHORT: Record<string, string> = {
  Lundi: 'Lun',
  Mardi: 'Mar',
  Mercredi: 'Mer',
  Jeudi: 'Jeu',
  Vendredi: 'Ven',
  Samedi: 'Sam',
  Dimanche: 'Dim',
}

export default function PlanDayRow({ day, date, cells, onPressCell, onRemoveDish, assignMode }: Props) {
  const isToday = new Date().toDateString() === date.toDateString()

  return (
    <View style={styles.row}>
      <View style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
        <Text style={[styles.dayShort, isToday && styles.dayShortToday]}>
          {DAY_SHORT[day]}
        </Text>
        <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
          {date.getDate()}
        </Text>
      </View>
      <View style={styles.cells}>
        {MEALS.map((meal) => {
          const key = planKey(date, meal)
          const cell = cells.find((c) => c.key === key)
          return (
            <PlanCell
              key={key}
              meal={meal}
              dishes={cell?.dishes ?? []}
              onPress={() => onPressCell(key, meal, date)}
              onRemoveDish={(dishId) => onRemoveDish(key, dishId)}
              assignMode={assignMode}
            />
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 6,
    gap: 10,
  },
  dayLabel: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabelToday: {},
  dayShort: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayShortToday: {
    color: Colors.accent,
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  dayNumToday: {
    color: Colors.accent,
  },
  cells: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
})
