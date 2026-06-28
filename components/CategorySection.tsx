import { View, Text, StyleSheet } from 'react-native'
import DishCard from './DishCard'
import { Colors } from '@/constants/colors'
import type { Category, Dish, Subcategory } from '@/types'

interface Props {
  category: Category
  onPressDish: (dish: Dish, category: Category, subcategory: Subcategory) => void
  onPressAddDish?: (dish: Dish) => void
}

export default function CategorySection({ category, onPressDish, onPressAddDish }: Props) {
  const allDishes = category.subcategories.flatMap((sub) =>
    sub.dishes.map((dish) => ({ dish, sub }))
  )

  if (allDishes.length === 0) return null

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: category.color }]} />
        <Text style={styles.title}>{category.name}</Text>
        <Text style={styles.count}>{allDishes.length}</Text>
      </View>
      {allDishes.map(({ dish, sub }) => (
        <DishCard
          key={dish.id}
          dish={dish}
          categoryColor={category.color}
          onPress={() => onPressDish(dish, category, sub)}
          onPressAdd={onPressAddDish ? () => onPressAddDish(dish) : undefined}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
})
