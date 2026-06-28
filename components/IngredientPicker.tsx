import { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/colors'
import { useMenuContext } from '@/context/MenuDataContext'
import type { IngredientsData } from '@/types'

interface Props {
  selectedIds: string[]
  ingredientsData: IngredientsData
  onChange: (ids: string[]) => void
  readOnly?: boolean
}

export default function IngredientPicker({ selectedIds, ingredientsData, onChange, readOnly }: Props) {
  const { data, addCustomIngredient } = useMenuContext()
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // All predefined ingredients flat
  const predefined = useMemo(
    () =>
      ingredientsData.categories.flatMap((cat) =>
        cat.ingredients.map((ing) => ({ id: ing.id, name: ing.name }))
      ),
    [ingredientsData]
  )

  // Custom ingredients from menu data
  const custom = data?.customIngredients ?? []

  // All ingredients (predefined + custom)
  const allIngredients = useMemo(
    () => [...predefined, ...custom],
    [predefined, custom]
  )

  // Name lookup
  const nameById = useMemo(() => {
    const map: Record<string, string> = {}
    allIngredients.forEach((i) => { map[i.id] = i.name })
    return map
  }, [allIngredients])

  const q = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return allIngredients
    return allIngredients.filter((i) => i.name.toLowerCase().includes(q))
  }, [allIngredients, q])

  // Show "create" button when search has text and no exact match
  const canCreate =
    q.length > 0 &&
    !allIngredients.some((i) => i.name.toLowerCase() === q)

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const handleCreate = async () => {
    if (!canCreate) return
    setCreating(true)
    const newIng = await addCustomIngredient(search.trim())
    setCreating(false)
    if (newIng) {
      onChange([...selectedIds, newIng.id])
      setSearch('')
    }
  }

  // ── Read-only mode ──────────────────────────────────────────────────────────
  if (readOnly) {
    if (selectedIds.length === 0) {
      return <Text style={styles.emptyText}>Aucun ingrédient renseigné</Text>
    }
    return (
      <View style={styles.chips}>
        {selectedIds.map((id) => (
          <View key={id} style={styles.chip}>
            <Text style={styles.chipText}>{nameById[id] ?? id}</Text>
          </View>
        ))}
      </View>
    )
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────
  return (
    <View>
      {selectedIds.length > 0 && (
        <View style={styles.chips}>
          {selectedIds.map((id) => (
            <TouchableOpacity key={id} style={styles.chipSelected} onPress={() => toggle(id)}>
              <Text style={styles.chipSelectedText}>{nameById[id] ?? id}</Text>
              <Ionicons name="close" size={12} color={Colors.accent} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => setPickerOpen((v) => !v)}
      >
        <Ionicons name={pickerOpen ? 'chevron-up' : 'add'} size={16} color={Colors.accent} />
        <Text style={styles.addBtnText}>
          {pickerOpen ? 'Fermer' : 'Ajouter un ingrédient'}
        </Text>
      </TouchableOpacity>

      {pickerOpen && (
        <View style={styles.picker}>
          <TextInput
            style={styles.search}
            placeholder="Rechercher ou créer un ingrédient…"
            placeholderTextColor={Colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {/* Create new ingredient row */}
            {canCreate && (
              <TouchableOpacity
                style={styles.createRow}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={Colors.accent} />
                ) : (
                  <Ionicons name="add-circle" size={18} color={Colors.accent} />
                )}
                <Text style={styles.createText}>
                  Créer <Text style={styles.createName}>« {search.trim()} »</Text>
                </Text>
              </TouchableOpacity>
            )}

            {filtered.length === 0 && !canCreate && (
              <Text style={styles.noResult}>Aucun résultat</Text>
            )}

            {filtered.map((ing) => {
              const selected = selectedIds.includes(ing.id)
              const isCustom = custom.some((c) => c.id === ing.id)
              return (
                <TouchableOpacity
                  key={ing.id}
                  style={[styles.listItem, selected && styles.listItemSelected]}
                  onPress={() => toggle(ing.id)}
                >
                  <Text style={[styles.listItemText, selected && styles.listItemTextSelected]}>
                    {ing.name}
                    {isCustom && (
                      <Text style={styles.customBadge}> ✦</Text>
                    )}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={16} color={Colors.accent} />}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  chipText: { fontSize: 13, color: Colors.accent, fontWeight: '500' },
  chipSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  chipSelectedText: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  addBtnText: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
  picker: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    marginBottom: 16,
  },
  search: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  list: { maxHeight: 240 },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.accentLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent + '30',
  },
  createText: { fontSize: 14, color: Colors.textPrimary },
  createName: { fontWeight: '700', color: Colors.accent },
  noResult: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listItemSelected: { backgroundColor: Colors.accentLight },
  listItemText: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  listItemTextSelected: { color: Colors.accent, fontWeight: '600' },
  customBadge: { fontSize: 11, color: Colors.accent },
})
