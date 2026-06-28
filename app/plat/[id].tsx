import { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Linking,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useMenuContext } from '@/context/MenuDataContext'
import { Colors } from '@/constants/colors'
import IngredientPicker from '@/components/IngredientPicker'
import type { Dish } from '@/types'

export default function DishDetailScreen() {
  const { id, categoryId, subcategoryId } = useLocalSearchParams<{
    id: string
    categoryId: string
    subcategoryId: string
  }>()
  const router = useRouter()
  const { data, loading, ingredients, updateDish, deleteDish } = useMenuContext()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const category = useMemo(
    () => data?.categories.find((c) => c.id === categoryId),
    [data, categoryId]
  )
  const subcategory = useMemo(
    () => category?.subcategories.find((s) => s.id === subcategoryId),
    [category, subcategoryId]
  )
  const dish = useMemo(
    () => subcategory?.dishes.find((d) => d.id === id),
    [subcategory, id]
  )

  const [form, setForm] = useState<Dish | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const isBoissons = category?.name === 'Boissons'

  const addTag = () => {
    const t = tagInput.trim()
    if (!t) return
    setForm((f) => f && !f.tags?.includes(t) ? { ...f, tags: [...(f.tags ?? []), t] } : f)
    setTagInput('')
  }

  const removeTag = (t: string) =>
    setForm((f) => f ? { ...f, tags: (f.tags ?? []).filter((x) => x !== t) } : f)

  const startEdit = () => {
    if (dish) setForm({ ...dish })
    setEditing(true)
  }

  const cancelEdit = () => {
    setForm(null)
    setEditing(false)
  }

  const handleSave = async () => {
    if (!form || !categoryId || !subcategoryId) return
    setSaving(true)
    await updateDish(categoryId, subcategoryId, form)
    setSaving(false)
    setEditing(false)
    setForm(null)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryId || !subcategoryId || !id) return
    await deleteDish(categoryId, subcategoryId, id)
    router.back()
  }

  if (loading || !dish) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    )
  }


  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.accent} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        {!editing ? (
          <TouchableOpacity onPress={startEdit} style={styles.editBtn}>
            <Text style={styles.editText}>Modifier</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={cancelEdit} style={styles.editBtn}>
            <Text style={styles.editText}>Annuler</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.categoryBadge, { backgroundColor: category?.color + '22' }]}>
          <Text style={[styles.categoryText, { color: category?.color }]}>
            {category?.name} · {subcategory?.name}
          </Text>
        </View>

        {editing ? (
          <TextInput
            style={styles.titleInput}
            value={form?.name ?? ''}
            onChangeText={(t) => setForm((f) => f ? { ...f, name: t } : f)}
            autoFocus
            placeholder="Nom du plat"
            placeholderTextColor={Colors.textSecondary}
          />
        ) : (
          <Text style={styles.title}>{dish.name}</Text>
        )}

        <Text style={styles.sectionLabel}>Description</Text>
        {editing ? (
          <TextInput
            style={styles.descInput}
            value={form?.desc ?? ''}
            onChangeText={(t) => setForm((f) => f ? { ...f, desc: t } : f)}
            placeholder="Courte description"
            placeholderTextColor={Colors.textSecondary}
            multiline
          />
        ) : (
          <Text style={styles.desc}>{dish.desc || 'Aucune description'}</Text>
        )}

        {/* Tags (alcool de base) — Boissons only */}
        {isBoissons && (
          <>
            <Text style={styles.sectionLabel}>Alcool de base</Text>
            {editing ? (
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[styles.descInput, { flex: 1, minHeight: 0, marginBottom: 0 }]}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="Ex: Rhum, Vodka…"
                    placeholderTextColor={Colors.textSecondary}
                    onSubmitEditing={addTag}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    onPress={addTag}
                    style={{ backgroundColor: Colors.accent, borderRadius: 10, padding: 12, justifyContent: 'center' }}
                  >
                    <Ionicons name="add" size={18} color={Colors.white} />
                  </TouchableOpacity>
                </View>
                {(form?.tags ?? []).length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(form?.tags ?? []).map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => removeTag(t)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.accentLight, borderWidth: 1.5, borderColor: Colors.accent }}
                      >
                        <Text style={{ fontSize: 13, color: Colors.accent, fontWeight: '600' }}>{t}</Text>
                        <Ionicons name="close" size={12} color={Colors.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {(dish.tags ?? []).length === 0 ? (
                  <Text style={styles.desc}>Aucun alcool renseigné</Text>
                ) : (
                  (dish.tags ?? []).map((t) => (
                    <View key={t} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.accentLight, borderWidth: 1, borderColor: Colors.accent + '40' }}>
                      <Text style={{ fontSize: 13, color: Colors.accent, fontWeight: '500' }}>{t}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}

        <Text style={styles.sectionLabel}>Ingrédients</Text>
        {ingredients ? (
          <IngredientPicker
            selectedIds={editing ? (form?.ingredients ?? []) : dish.ingredients}
            ingredientsData={ingredients}
            onChange={(ids) => setForm((f) => f ? { ...f, ingredients: ids } : f)}
            readOnly={!editing}
          />
        ) : (
          <Text style={styles.desc}>{dish.ingredients.length > 0 ? dish.ingredients.join(', ') : 'Aucun ingrédient'}</Text>
        )}

        <Text style={styles.sectionLabel}>Recette</Text>
        {editing ? (
          <TextInput
            style={styles.recipeInput}
            value={form?.recipe ?? ''}
            onChangeText={(t) => setForm((f) => f ? { ...f, recipe: t } : f)}
            placeholder="Étapes de la recette…"
            placeholderTextColor={Colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        ) : (
          <Text style={styles.recipe}>{dish.recipe || 'Aucune recette renseignée'}</Text>
        )}

        <Text style={styles.sectionLabel}>Lien recette</Text>
        {editing ? (
          <TextInput
            style={styles.descInput}
            value={form?.link ?? ''}
            onChangeText={(t) => setForm((f) => f ? { ...f, link: t } : f)}
            placeholder="https://youtube.com/… ou https://instagram.com/…"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        ) : dish.link ? (
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => Linking.openURL(dish.link!)}
          >
            <Ionicons
              name={dish.link.includes('youtube') ? 'logo-youtube' : dish.link.includes('instagram') ? 'logo-instagram' : 'link'}
              size={18}
              color={Colors.accent}
            />
            <Text style={styles.linkText} numberOfLines={1}>{dish.link}</Text>
            <Ionicons name="open-outline" size={14} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.desc}>Aucun lien renseigné</Text>
        )}

        {editing && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        )}

        {!editing && !confirmDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setConfirmDelete(true)}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Supprimer ce plat</Text>
          </TouchableOpacity>
        )}

        {!editing && confirmDelete && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>Supprimer « {dish.name} » ?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setConfirmDelete(false)}
              >
                <Text style={styles.confirmCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={handleDeleteConfirm}
              >
                <Text style={styles.confirmDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 16, color: Colors.accent, fontWeight: '500' },
  editBtn: { paddingHorizontal: 4 },
  editText: { fontSize: 16, color: Colors.accent, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  categoryText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 24 },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    paddingBottom: 6,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  desc: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22, marginBottom: 24 },
  descInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    backgroundColor: Colors.card,
    minHeight: 60,
  },
  recipe: { fontSize: 15, color: Colors.textPrimary, lineHeight: 24, marginBottom: 32 },
  recipeInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    backgroundColor: Colors.card,
    minHeight: 120,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.dangerLight,
    borderRadius: 14,
    backgroundColor: Colors.dangerLight,
    marginTop: 8,
  },
  deleteBtnText: { fontSize: 15, color: Colors.danger, fontWeight: '600' },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    marginBottom: 24,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
  confirmBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.danger + '33',
  },
  confirmText: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  confirmDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.danger,
    alignItems: 'center',
  },
  confirmDeleteText: { fontSize: 14, fontWeight: '700', color: Colors.white },
})
