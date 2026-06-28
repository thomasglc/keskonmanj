import { useState, useEffect, useCallback } from 'react'
import {
  fetchMenuData,
  createSubcategoryInDb,
  createDishInDb,
  updateDishInDb,
  deleteDishFromDb,
  addDishToCell as addDishToCellDb,
  removeDishFromCell as removeDishFromCellDb,
  clearPlanCell as clearPlanCellDb,
} from '@/services/directus'
import type { CustomIngredient, Dish, MenuData } from '@/types'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function useMenuData() {
  const [data, setData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMenuData()
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const addSubcategory = useCallback(
    async (categoryId: string, name: string) => {
      if (!data) return
      const cat = data.categories.find(c => c.id === categoryId)
      if (!cat) return
      const existing = cat.subcategories.find(s => s.name.toLowerCase() === name.trim().toLowerCase())
      if (existing) return existing
      const id = await createSubcategoryInDb(categoryId, name.trim())
      const newSub = { id, name: name.trim(), dishes: [] }
      setData(prev => prev ? {
        ...prev,
        categories: prev.categories.map(c =>
          c.id !== categoryId ? c : { ...c, subcategories: [...c.subcategories, newSub] }
        ),
      } : prev)
      return newSub
    },
    [data]
  )

  const addDish = useCallback(
    async (categoryId: string, subcategoryId: string, dish: Omit<Dish, 'id'>) => {
      if (!data) return
      const newDish = await createDishInDb(subcategoryId, dish)
      setData(prev => prev ? {
        ...prev,
        categories: prev.categories.map(cat =>
          cat.id !== categoryId ? cat : {
            ...cat,
            subcategories: cat.subcategories.map(sub =>
              sub.id !== subcategoryId ? sub : { ...sub, dishes: [...sub.dishes, newDish] }
            ),
          }
        ),
      } : prev)
      return newDish
    },
    [data]
  )

  const updateDish = useCallback(
    async (categoryId: string, subcategoryId: string, dish: Dish) => {
      if (!data) return
      await updateDishInDb(dish)
      setData(prev => prev ? {
        ...prev,
        categories: prev.categories.map(cat =>
          cat.id !== categoryId ? cat : {
            ...cat,
            subcategories: cat.subcategories.map(sub =>
              sub.id !== subcategoryId ? sub : {
                ...sub,
                dishes: sub.dishes.map(d => d.id === dish.id ? dish : d),
              }
            ),
          }
        ),
      } : prev)
    },
    [data]
  )

  const deleteDish = useCallback(
    async (categoryId: string, subcategoryId: string, dishId: string) => {
      if (!data) return
      await deleteDishFromDb(dishId)
      setData(prev => {
        if (!prev) return prev
        const categories = prev.categories.map(cat =>
          cat.id !== categoryId ? cat : {
            ...cat,
            subcategories: cat.subcategories.map(sub =>
              sub.id !== subcategoryId ? sub : {
                ...sub,
                dishes: sub.dishes.filter(d => d.id !== dishId),
              }
            ),
          }
        )
        const weekPlan: Record<string, string[]> = {}
        for (const [k, ids] of Object.entries(prev.weekPlan)) {
          const filtered = ids.filter(id => id !== dishId)
          if (filtered.length) weekPlan[k] = filtered
        }
        return { ...prev, categories, weekPlan }
      })
    },
    [data]
  )

  const addDishToCell = useCallback(
    async (key: string, dishId: string) => {
      if (!data) return
      const current = data.weekPlan[key] ?? []
      if (current.includes(dishId)) return
      await addDishToCellDb(key, dishId)
      setData(prev => prev ? {
        ...prev,
        weekPlan: { ...prev.weekPlan, [key]: [...(prev.weekPlan[key] ?? []), dishId] },
      } : prev)
    },
    [data]
  )

  const removeDishFromCell = useCallback(
    async (key: string, dishId: string) => {
      if (!data) return
      await removeDishFromCellDb(key, dishId)
      setData(prev => {
        if (!prev) return prev
        const filtered = (prev.weekPlan[key] ?? []).filter(id => id !== dishId)
        const weekPlan = { ...prev.weekPlan }
        if (filtered.length) weekPlan[key] = filtered
        else delete weekPlan[key]
        return { ...prev, weekPlan }
      })
    },
    [data]
  )

  const clearPlanCell = useCallback(
    async (key: string) => {
      if (!data) return
      await clearPlanCellDb(key)
      setData(prev => {
        if (!prev) return prev
        const { [key]: _removed, ...rest } = prev.weekPlan
        return { ...prev, weekPlan: rest }
      })
    },
    [data]
  )

  const addCustomIngredient = useCallback(
    async (name: string): Promise<CustomIngredient | undefined> => {
      if (!data) return
      const existing = data.customIngredients.find(i => i.name.toLowerCase() === name.toLowerCase())
      if (existing) return existing
      const ingredient: CustomIngredient = { id: `custom_${generateId()}`, name: name.trim() }
      setData(prev => prev ? { ...prev, customIngredients: [...prev.customIngredients, ingredient] } : prev)
      return ingredient
    },
    [data]
  )

  return {
    data,
    loading,
    error,
    addSubcategory,
    addDish,
    updateDish,
    deleteDish,
    addDishToCell,
    removeDishFromCell,
    clearPlanCell,
    addCustomIngredient,
  }
}
