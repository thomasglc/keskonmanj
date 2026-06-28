import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import type { PlanCellDish } from '@/types'

interface Props {
  meal: string
  dishes: PlanCellDish[]
  onPress: () => void
  onRemoveDish: (dishId: string) => void
  assignMode?: boolean
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

export default function PlanCell({ meal, dishes, onPress, onRemoveDish, assignMode }: Props) {
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => { scale.value = withSpring(0.97) }
  const handlePressOut = () => { scale.value = withSpring(1) }

  const hasDishes = dishes.length > 0
  const borderColor = hasDishes && !assignMode ? dishes[0].categoryColor : Colors.border

  return (
    <AnimatedTouchable
      style={[
        styles.cell,
        animStyle,
        hasDishes && !assignMode && { borderColor, borderWidth: 1.5 },
        assignMode && styles.cellAssign,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Text style={[styles.mealLabel, assignMode && styles.mealLabelAssign]}>{meal}</Text>

      {hasDishes && (
        <View style={styles.dishList}>
          {dishes.map(({ dish, categoryColor }) => (
            <View key={dish.id} style={styles.dishRow}>
              <View style={[styles.dot, { backgroundColor: categoryColor }]} />
              <Text style={[styles.dishName, { color: categoryColor }]} numberOfLines={1}>
                {dish.name}
              </Text>
              {!assignMode && (
                <TouchableOpacity
                  onPress={() => onRemoveDish(dish.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close-circle" size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.addRow}>
        <Ionicons
          name="add"
          size={14}
          color={assignMode ? Colors.accent : hasDishes ? Colors.textSecondary : Colors.border}
        />
        {!hasDishes && !assignMode && (
          <Text style={styles.addLabel}>Ajouter</Text>
        )}
      </View>
    </AnimatedTouchable>
  )
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 10,
    borderColor: Colors.border,
    borderWidth: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    minHeight: 80,
  },
  cellAssign: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
    backgroundColor: Colors.accentLight,
  },
  mealLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  mealLabelAssign: { color: Colors.accent },
  dishList: { gap: 4, marginBottom: 6 },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  dishName: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 16 },
  removeBtn: { flexShrink: 0 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  addLabel: { fontSize: 11, color: Colors.border, fontWeight: '500' },
})
