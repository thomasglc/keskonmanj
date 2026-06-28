import { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMenuContext } from '@/context/MenuDataContext'
import DishCard from '@/components/DishCard'
import { Colors } from '@/constants/colors'
import type { Category, Dish, Subcategory } from '@/types'

// ─── Pill row ─────────────────────────────────────────────────────────────────

interface PillProps {
  label: string
  active: boolean
  color?: string
  onPress: () => void
}

function Pill({ label, active, color, onPress }: PillProps) {
  const bg = active ? (color ?? Colors.accent) : Colors.card
  const textColor = active ? Colors.white : Colors.textSecondary
  const border = active ? (color ?? Colors.accent) : Colors.border
  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Subcategory section ──────────────────────────────────────────────────────

interface SubSectionProps {
  sub: Subcategory
  categoryColor: string
  onPressDish: (dish: Dish) => void
  onPressAdd: (dish: Dish) => void
}

function SubSection({ sub, categoryColor, onPressDish, onPressAdd }: SubSectionProps) {
  if (sub.dishes.length === 0) return null
  return (
    <View style={styles.subSection}>
      <Text style={styles.subHeader}>{sub.name}</Text>
      {sub.dishes.map((dish) => (
        <DishCard
          key={dish.id}
          dish={dish}
          categoryColor={categoryColor}
          onPress={() => onPressDish(dish)}
          onPressAdd={() => onPressAdd(dish)}
        />
      ))}
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlatsScreen() {
  const { data, loading, setPendingDish } = useMenuContext()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const selectedCategory = useMemo(
    () => data?.categories.find((c) => c.id === selectedCatId) ?? null,
    [data, selectedCatId]
  )

  const selectCategory = (id: string) => {
    if (selectedCatId === id) {
      setSelectedCatId(null)
      setSelectedSubId(null)
      setSelectedTag(null)
    } else {
      setSelectedCatId(id)
      setSelectedSubId(null)
      setSelectedTag(null)
    }
  }

  const selectSub = (id: string) => {
    if (selectedSubId === id) {
      setSelectedSubId(null)
      setSelectedTag(null)
    } else {
      setSelectedSubId(id)
      setSelectedTag(null)
    }
  }

  // Tags available in the selected subcategory (for cocktails)
  const availableTags = useMemo(() => {
    if (!selectedSubId || !data) return []
    const tags = new Set<string>()
    for (const cat of data.categories) {
      for (const sub of cat.subcategories) {
        if (sub.id === selectedSubId) {
          for (const dish of sub.dishes) {
            dish.tags?.forEach((t) => tags.add(t))
          }
        }
      }
    }
    return [...tags].sort()
  }, [data, selectedSubId])

  // Filtered data
  const filteredCategories = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()

    return data.categories
      .filter((cat) => !selectedCatId || cat.id === selectedCatId)
      .map((cat) => ({
        ...cat,
        subcategories: cat.subcategories
          .filter((sub) => !selectedSubId || sub.id === selectedSubId)
          .map((sub) => ({
            ...sub,
            dishes: sub.dishes
              .filter((d) => {
                const matchQuery =
                  !q ||
                  d.name.toLowerCase().includes(q) ||
                  d.desc.toLowerCase().includes(q)
                const matchTag =
                  !selectedTag || d.tags?.includes(selectedTag)
                return matchQuery && matchTag
              })
              .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
          }))
          .filter((sub) => sub.dishes.length > 0),
      }))
      .filter((cat) => cat.subcategories.length > 0)
  }, [data, query, selectedCatId, selectedSubId, selectedTag])

  const totalDishes = useMemo(
    () =>
      filteredCategories.reduce(
        (acc, cat) =>
          acc + cat.subcategories.reduce((a, s) => a + s.dishes.length, 0),
        0
      ),
    [filteredCategories]
  )

  const handlePressDish = (dish: Dish, category: Category, subcategory: Subcategory) => {
    router.push({
      pathname: '/plat/[id]',
      params: { id: dish.id, categoryId: category.id, subcategoryId: subcategory.id },
    })
  }

  const handleAddToPlanning = (dish: Dish) => {
    setPendingDish(dish)
    router.navigate('/(tabs)/planning')
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plats</Text>
        <TextInput
          style={styles.search}
          placeholder="Rechercher…"
          placeholderTextColor={Colors.textSecondary}
          value={query}
          onChangeText={(t) => {
            setQuery(t)
            if (t) {
              setSelectedCatId(null)
              setSelectedSubId(null)
              setSelectedTag(null)
            }
          }}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category pills */}
      {!query && (
        <View style={styles.filterBlock}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {(data?.categories ?? []).map((cat) => (
              <Pill
                key={cat.id}
                label={cat.name}
                active={selectedCatId === cat.id}
                color={cat.color}
                onPress={() => selectCategory(cat.id)}
              />
            ))}
          </ScrollView>

          {/* Subcategory pills */}
          {selectedCategory && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {selectedCategory.subcategories.map((sub) => (
                <Pill
                  key={sub.id}
                  label={sub.name}
                  active={selectedSubId === sub.id}
                  color={selectedCategory.color + 'bb'}
                  onPress={() => selectSub(sub.id)}
                />
              ))}
            </ScrollView>
          )}

          {/* Tag chips (alcohol filter) */}
          {availableTags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {availableTags.map((tag) => (
                <Pill
                  key={tag}
                  label={tag}
                  active={selectedTag === tag}
                  color={Colors.textSecondary}
                  onPress={() =>
                    setSelectedTag((t) => (t === tag ? null : tag))
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Count */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {totalDishes} plat{totalDishes > 1 ? 's' : ''}
          {selectedCatId || query ? '' : ' au total'}
        </Text>
        {(selectedCatId || selectedSubId || selectedTag) && (
          <TouchableOpacity
            onPress={() => {
              setSelectedCatId(null)
              setSelectedSubId(null)
              setSelectedTag(null)
            }}
          >
            <Text style={styles.clearFilters}>Tout afficher</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, Platform.OS === 'web' && { paddingBottom: 32 + 64 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredCategories.length === 0 ? (
          <Text style={styles.empty}>Aucun plat trouvé</Text>
        ) : (
          filteredCategories.map((cat) => (
            <View key={cat.id} style={styles.catBlock}>
              {/* Category header only shown when multiple cats visible */}
              {!selectedCatId && (
                <TouchableOpacity
                  style={styles.catHeader}
                  onPress={() => selectCategory(cat.id)}
                >
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catName, { color: cat.color }]}>{cat.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color={cat.color} />
                </TouchableOpacity>
              )}
              {cat.subcategories.map((sub) => (
                <SubSection
                  key={sub.id}
                  sub={sub}
                  categoryColor={cat.color}
                  onPressDish={(dish) => handlePressDish(dish, cat, sub)}
                  onPressAdd={handleAddToPlanning}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
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
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  search: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  filterBlock: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 2,
    paddingBottom: 6,
  },
  pillRow: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  pillText: { fontSize: 13, fontWeight: '600' },

  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  countText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  clearFilters: { fontSize: 12, color: Colors.accent, fontWeight: '600' },

  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 32 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40, fontSize: 15 },

  catBlock: { marginBottom: 8 },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontSize: 17, fontWeight: '800', flex: 1 },

  subSection: { marginBottom: 16 },
  subHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
})
