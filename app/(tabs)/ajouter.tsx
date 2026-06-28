import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMenuContext } from '@/context/MenuDataContext'
import { Colors } from '@/constants/colors'
import IngredientPicker from '@/components/IngredientPicker'
import type { Category, Subcategory } from '@/types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

type Step = 1 | 2

export default function AjouterScreen() {
  const { data, ingredients, addDish, addSubcategory } = useMenuContext()
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [selectedSub, setSelectedSub] = useState<Subcategory | null>(null)
  const [desc, setDesc] = useState('')
  const [ingredientIds, setIngredientIds] = useState<string[]>([])
  const [recipe, setRecipe] = useState('')
  const [link, setLink] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [newSubName, setNewSubName] = useState('')
  const [addingSubcat, setAddingSubcat] = useState(false)
  const [creatingSubcat, setCreatingSubcat] = useState(false)

  const isBoissons = selectedCat?.name === 'Boissons'

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t))
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const slideAnim = useRef(new Animated.Value(0)).current
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const canSave = name.trim().length > 0 && selectedCat !== null && selectedSub !== null

  const goToStep2 = () => {
    Animated.spring(slideAnim, {
      toValue: -SCREEN_WIDTH,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start()
    setStep(2)
  }

  const goToStep1 = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start()
    setStep(1)
  }

  const handleSave = async () => {
    if (!canSave || !selectedCat || !selectedSub) return
    setSaving(true)
    await addDish(selectedCat.id, selectedSub.id, {
      name: name.trim(),
      desc: desc.trim(),
      recipe: recipe.trim(),
      ingredients: ingredientIds,
      tags,
      link: link.trim() || undefined,
    })
    setSaving(false)
    setSuccess(true)
    // Reset after 1.5s
    resetTimerRef.current = setTimeout(() => {
      setName('')
      setDesc('')
      setIngredientIds([])
      setRecipe('')
      setTags([])
      setTagInput('')
      setLink('')
      setNewSubName('')
      setAddingSubcat(false)
      setSelectedCat(null)
      setSelectedSub(null)
      setStep(1)
      slideAnim.setValue(0)
      setSuccess(false)
    }, 1500)
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.accent} />
        <Text style={styles.successText}>Plat ajouté !</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nouveau plat</Text>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step === 1 && styles.stepDotActive]} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
        </View>
      </View>

      <View style={styles.slider}>
        <Animated.View
          style={[
            styles.slidingContent,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Step 1 */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={styles.stepContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Nom du plat *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Quiche Lorraine"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />

            <Text style={styles.label}>Catégorie *</Text>
            <View style={styles.chips}>
              {(data?.categories ?? []).map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    selectedCat?.id === cat.id && {
                      backgroundColor: cat.color + '22',
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() => {
                    setSelectedCat(cat)
                    setSelectedSub(null)
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedCat?.id === cat.id && { color: cat.color },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedCat && (
              <>
                <Text style={styles.label}>Sous-catégorie *</Text>
                <View style={styles.chips}>
                  {selectedCat.subcategories.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.chip,
                        selectedSub?.id === sub.id && {
                          backgroundColor: selectedCat.color + '22',
                          borderColor: selectedCat.color,
                        },
                      ]}
                      onPress={() => setSelectedSub(sub)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedSub?.id === sub.id && {
                            color: selectedCat.color,
                          },
                        ]}
                      >
                        {sub.name}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {/* Add subcategory button */}
                  {!addingSubcat && (
                    <TouchableOpacity
                      style={styles.newSubBtn}
                      onPress={() => setAddingSubcat(true)}
                    >
                      <Ionicons name="add" size={14} color={Colors.textSecondary} />
                      <Text style={styles.newSubBtnText}>Nouvelle</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Inline create subcategory */}
                {addingSubcat && (
                  <View style={styles.newSubRow}>
                    <TextInput
                      style={[styles.input, styles.newSubInput]}
                      value={newSubName}
                      onChangeText={setNewSubName}
                      placeholder="Nom de la sous-catégorie…"
                      placeholderTextColor={Colors.textSecondary}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={async () => {
                        if (!newSubName.trim() || !selectedCat) return
                        setCreatingSubcat(true)
                        const created = await addSubcategory(selectedCat.id, newSubName.trim())
                        setCreatingSubcat(false)
                        if (created) {
                          setSelectedSub({ ...created, dishes: [] })
                        }
                        setNewSubName('')
                        setAddingSubcat(false)
                      }}
                    />
                    {creatingSubcat ? (
                      <ActivityIndicator color={Colors.accent} style={{ padding: 12 }} />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.newSubConfirm}
                          onPress={async () => {
                            if (!newSubName.trim() || !selectedCat) return
                            setCreatingSubcat(true)
                            const created = await addSubcategory(selectedCat.id, newSubName.trim())
                            setCreatingSubcat(false)
                            if (created) setSelectedSub({ ...created, dishes: [] })
                            setNewSubName('')
                            setAddingSubcat(false)
                          }}
                        >
                          <Ionicons name="checkmark" size={18} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.newSubCancel}
                          onPress={() => { setAddingSubcat(false); setNewSubName('') }}
                        >
                          <Ionicons name="close" size={18} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </>
            )}

            <View style={styles.step1Buttons}>
              <TouchableOpacity
                style={[styles.saveBtn, (!canSave || saving) && styles.btnDisabled]}
                onPress={handleSave}
                disabled={!canSave || saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, !canSave && styles.btnDisabled]}
                onPress={goToStep2}
                disabled={!canSave}
              >
                <Text style={styles.nextBtnText}>Ajouter détails</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Step 2 */}
          <ScrollView
            style={{ width: SCREEN_WIDTH }}
            contentContainerStyle={styles.stepContent}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity onPress={goToStep1} style={styles.backRow}>
              <Ionicons name="chevron-back" size={18} color={Colors.accent} />
              <Text style={styles.backText}>Retour</Text>
            </TouchableOpacity>

            {isBoissons && (
              <>
                <Text style={styles.label}>Alcool de base</Text>
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="Ex: Rhum, Vodka, Gin…"
                    placeholderTextColor={Colors.textSecondary}
                    onSubmitEditing={addTag}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.tagAddBtn} onPress={addTag}>
                    <Ionicons name="add" size={20} color={Colors.white} />
                  </TouchableOpacity>
                </View>
                {tags.length > 0 && (
                  <View style={styles.tagChips}>
                    {tags.map((t) => (
                      <TouchableOpacity key={t} style={styles.tagChip} onPress={() => removeTag(t)}>
                        <Text style={styles.tagChipText}>{t}</Text>
                        <Ionicons name="close" size={12} color={Colors.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={desc}
              onChangeText={setDesc}
              placeholder="Courte description du plat"
              placeholderTextColor={Colors.textSecondary}
              multiline
            />

            <Text style={styles.label}>Ingrédients</Text>
            {ingredients ? (
              <IngredientPicker
                selectedIds={ingredientIds}
                ingredientsData={ingredients}
                onChange={setIngredientIds}
              />
            ) : null}

            <Text style={styles.label}>Recette</Text>
            <TextInput
              style={[styles.input, styles.recipeInput]}
              value={recipe}
              onChangeText={setRecipe}
              placeholder="Étapes de préparation…"
              placeholderTextColor={Colors.textSecondary}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>Lien recette</Text>
            <TextInput
              style={styles.input}
              value={link}
              onChangeText={setLink}
              placeholder="https://youtube.com/… ou https://instagram.com/…"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <TouchableOpacity
              style={[styles.saveBtn, (!canSave || saving) && styles.btnDisabled]}
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  stepDotActive: { backgroundColor: Colors.accent, width: 18 },
  slider: { flex: 1, overflow: 'hidden' },
  slidingContent: {
    flex: 1,
    flexDirection: 'row',
    width: SCREEN_WIDTH * 2,
  },
  stepContent: { padding: 20, paddingBottom: 48 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  recipeInput: { minHeight: 140 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  step1Buttons: { marginTop: 28, gap: 12 },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  nextBtnText: { fontSize: 15, fontWeight: '600', color: Colors.accent },
  btnDisabled: { opacity: 0.4 },
  tagInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tagAddBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  tagChipText: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  newSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.card,
  },
  newSubBtnText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  newSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  newSubInput: { flex: 1, marginBottom: 0 },
  newSubConfirm: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    padding: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSubCancel: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  backText: { fontSize: 15, color: Colors.accent, fontWeight: '500' },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: 16,
  },
  successText: { fontSize: 22, fontWeight: '700', color: Colors.accent },
})
