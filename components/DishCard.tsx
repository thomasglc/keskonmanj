import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import type { Dish } from '@/types'

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

interface Props {
  dish: Dish
  categoryColor: string
  onPress: () => void
  onPressAdd?: () => void
}

export default function DishCard({ dish, categoryColor, onPress, onPressAdd }: Props) {
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <AnimatedTouchable
      style={[styles.card, animStyle]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97) }}
      onPressOut={() => { scale.value = withSpring(1) }}
      activeOpacity={1}
    >
      <View style={[styles.colorBar, { backgroundColor: categoryColor }]} />
      <View style={styles.content}>
        <Text style={styles.name}>{dish.name}</Text>
        {dish.desc ? (
          <Text style={styles.desc} numberOfLines={1}>
            {dish.desc}
          </Text>
        ) : null}
      </View>
      {onPressAdd && (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={onPressAdd}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add-circle-outline" size={22} color={categoryColor} />
        </TouchableOpacity>
      )}
    </AnimatedTouchable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, padding: 14 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  desc: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
})
