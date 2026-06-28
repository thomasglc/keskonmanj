import { useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMenuContext } from '@/context/MenuDataContext'
import { getCurrentWeekDays, formatWeekRange, planKey, MEALS } from '@/constants/config'
import { Colors } from '@/constants/colors'
import type { IngredientCategory } from '@/types'

// ─── Clipboard helper (web) ───────────────────────────────────────────────────

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CoursesScreen() {
  const { data, loading, ingredients, showToast } = useMenuContext()
  const [weekOffset, setWeekOffset] = useState(0)
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set())
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const weekDays = useMemo(() => getCurrentWeekDays(weekOffset), [weekOffset])
  const weekLabel = useMemo(() => formatWeekRange(weekDays), [weekDays])
  const isCurrentWeek = weekOffset === 0

  // Collect all ingredient IDs from planned meals this week, deduplicated
  const ingredientIds = useMemo(() => {
    if (!data) return []
    const ids = new Set<string>()
    for (const { date } of weekDays) {
      for (const meal of MEALS) {
        const dishIds = data.weekPlan[planKey(date, meal)] ?? []
        for (const dishId of dishIds) {
          for (const cat of data.categories) {
            for (const sub of cat.subcategories) {
              const dish = sub.dishes.find((d) => d.id === dishId)
              if (dish) dish.ingredients.forEach((id) => ids.add(id))
            }
          }
        }
      }
    }
    return [...ids]
  }, [data, weekDays])

  // Group visible ingredients by category
  const grouped = useMemo((): { category: IngredientCategory; ids: string[] }[] => {
    if (!ingredients) return []
    const visibleIds = ingredientIds.filter((id) => !removed.has(id))
    return ingredients.categories
      .map((cat) => ({
        category: cat,
        ids: cat.ingredients.map((i) => i.id).filter((id) => visibleIds.includes(id)),
      }))
      .filter((g) => g.ids.length > 0)
  }, [ingredients, ingredientIds, removed])

  const getName = useCallback(
    (id: string) => {
      if (!ingredients) return id
      for (const cat of ingredients.categories) {
        const found = cat.ingredients.find((i) => i.id === id)
        if (found) return found.name
      }
      return id
    },
    [ingredients]
  )

  const handleCheck = (id: string) => {
    setAnimatingOut((prev) => new Set([...prev, id]))
    setTimeout(() => {
      setRemoved((prev) => new Set([...prev, id]))
      setAnimatingOut((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 350)
  }

  const handleReset = () => {
    setRemoved(new Set())
    setAnimatingOut(new Set())
  }

  const handleExport = async () => {
    if (grouped.length === 0) {
      showToast('Aucun ingrédient à exporter')
      return
    }
    const dateLabel = weekDays[0].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const lines: string[] = [`🛒 Courses – semaine du ${dateLabel}`, '']
    for (const { category, ids } of grouped) {
      lines.push(`${category.emoji} ${category.name}`)
      for (const id of ids) lines.push(`□ ${getName(id)}`)
      lines.push('')
    }
    const ok = await copyToClipboard(lines.join('\n'))
    showToast(ok ? 'Liste copiée dans le presse-papier !' : 'Impossible de copier')
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    )
  }

  const totalVisible = ingredientIds.filter((id) => !removed.has(id)).length
  const removedCount = ingredientIds.filter((id) => removed.has(id)).length

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Courses</Text>
          <View style={styles.headerActions}>
            {removedCount > 0 && (
              <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                <Ionicons name="refresh" size={15} color={Colors.accent} />
                <Text style={styles.resetBtnText}>Réinitialiser</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
              <Ionicons name="copy-outline" size={18} color={Colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => setWeekOffset((o) => o - 1)} style={styles.navArrow}>
            <Ionicons name="chevron-back" size={20} color={Colors.accent} />
          </TouchableOpacity>
          <View style={styles.weekLabelWrap}>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
            {!isCurrentWeek && (
              <TouchableOpacity onPress={() => setWeekOffset(0)}>
                <Text style={styles.todayLink}>Cette semaine</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => setWeekOffset((o) => o + 1)} style={styles.navArrow}>
            <Ionicons name="chevron-forward" size={20} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Counter */}
      {ingredientIds.length > 0 && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {totalVisible === 0
              ? '🎉 Tous les ingrédients cochés !'
              : `${totalVisible} ingrédient${totalVisible > 1 ? 's' : ''} restant${totalVisible > 1 ? 's' : ''}`}
          </Text>
        </View>
      )}

      {/* List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, Platform.OS === 'web' && { paddingBottom: 40 + 64 }]}
        showsVerticalScrollIndicator={false}
      >
        {ingredientIds.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>Aucun repas planifié</Text>
            <Text style={styles.emptySubtitle}>
              Ajoutez des plats avec des ingrédients dans le Planning pour générer votre liste de courses.
            </Text>
          </View>
        ) : grouped.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.accent} />
            <Text style={styles.emptyTitle}>Liste complète !</Text>
            <TouchableOpacity onPress={handleReset} style={styles.resetLargeBtn}>
              <Text style={styles.resetLargeBtnText}>Recommencer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          grouped.map(({ category, ids }) => (
            <View key={category.id} style={styles.group}>
              <Text style={styles.groupTitle}>
                {category.emoji} {category.name}
              </Text>
              {ids.map((id) => {
                const fading = animatingOut.has(id)
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.item, fading && styles.itemFading]}
                    onPress={() => handleCheck(id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, fading && styles.checkboxChecked]}>
                      {fading && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                    </View>
                    <Text style={[styles.itemText, fading && styles.itemTextChecked]}>
                      {getName(id)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
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
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  resetBtnText: { fontSize: 12, fontWeight: '600', color: Colors.accent },
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
  weekLabelWrap: { flex: 1, alignItems: 'center' },
  weekLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  todayLink: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },

  counter: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  counterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  group: { marginBottom: 24 },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemFading: { opacity: 0.4 },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },

  itemText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  resetLargeBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  resetLargeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.accent },
})
