import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { useMenuData } from '@/hooks/useMenuData'
import { fetchIngredientsData } from '@/services/directus'
import type { CustomIngredient, Dish, MenuData, IngredientsData } from '@/types'

export interface Toast {
  message: string
  id: number
}

type MenuDataContextValue = {
  data: MenuData | null
  loading: boolean
  error: string | null
  ingredients: IngredientsData | null
  pendingDish: Dish | null
  toast: Toast | null
  setPendingDish: (dish: Dish) => void
  clearPendingDish: () => void
  showToast: (message: string) => void
  addSubcategory: (categoryId: string, name: string) => Promise<{ id: string; name: string } | undefined>
  addDish: (categoryId: string, subcategoryId: string, dish: Omit<Dish, 'id'>) => Promise<Dish | undefined>
  updateDish: (categoryId: string, subcategoryId: string, dish: Dish) => Promise<void>
  deleteDish: (categoryId: string, subcategoryId: string, dishId: string) => Promise<void>
  addDishToCell: (key: string, dishId: string) => Promise<void>
  removeDishFromCell: (key: string, dishId: string) => Promise<void>
  clearPlanCell: (key: string) => Promise<void>
  addCustomIngredient: (name: string) => Promise<CustomIngredient | undefined>
}

const MenuDataContext = createContext<MenuDataContextValue | null>(null)

export function MenuDataProvider({ children }: { children: ReactNode }) {
  const menuData = useMenuData()
  const [ingredients, setIngredients] = useState<IngredientsData | null>(null)
  const [pendingDish, setPendingDishState] = useState<Dish | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchIngredientsData().then(setIngredients).catch(() => {})
  }, [])

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const value: MenuDataContextValue = {
    ...menuData,
    ingredients,
    pendingDish,
    toast,
    setPendingDish: (dish: Dish) => setPendingDishState(dish),
    clearPendingDish: () => setPendingDishState(null),
    showToast,
  }
  return <MenuDataContext.Provider value={value}>{children}</MenuDataContext.Provider>
}

export function useMenuContext(): MenuDataContextValue {
  const ctx = useContext(MenuDataContext)
  if (!ctx) throw new Error('useMenuContext must be used within MenuDataProvider')
  return ctx
}
