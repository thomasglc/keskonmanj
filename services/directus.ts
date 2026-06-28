import { DIRECTUS_URL } from '@/constants/config'
import type { Dish, MenuData, IngredientsData } from '@/types'

const HEADERS = {
  'Content-Type': 'application/json',
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function parseKey(key: string): { date: string; meal: string } {
  const idx = key.indexOf('__')
  return { date: key.slice(0, idx), meal: key.slice(idx + 2) }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: HEADERS,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.errors?.[0]?.message ?? `Directus ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  const json = await res.json()
  return (json.data ?? json) as T
}

// ─── FETCH ───────────────────────────────────────────────────────────────────

export async function fetchMenuData(): Promise<MenuData> {
  const [categories, subcategories, dishes, weekPlan] = await Promise.all([
    req<any[]>('GET', '/items/categories?fields=id,name,color,sort&sort=sort&limit=-1'),
    req<any[]>('GET', '/items/subcategories?fields=id,name,sort,category&sort=sort&limit=-1'),
    req<any[]>('GET', '/items/dishes?fields=id,name,desc,recipe,tags,subcategory,ingredients.id&limit=-1'),
    req<any[]>('GET', '/items/week_plan?fields=id,date,meal,dishes.id&limit=-1'),
  ])

  const builtCategories = categories.map(c => ({
    id: c.id,
    name: c.name,
    color: c.color,
    subcategories: subcategories
      .filter(s => s.category === c.id)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      .map(s => ({
        id: s.id,
        name: s.name,
        dishes: dishes
          .filter(d => d.subcategory === s.id)
          .map(d => ({
            id: d.id,
            name: d.name,
            desc: d.desc ?? '',
            recipe: d.recipe ?? '',
            tags: d.tags ?? [],
            ingredients: (d.ingredients ?? []).map((i: any) => i.id).filter(Boolean),
          })),
      })),
  }))

  const plan: Record<string, string[]> = {}
  for (const wp of weekPlan) {
    const ids = (wp.dishes ?? []).map((d: any) => d.id).filter(Boolean)
    if (ids.length) plan[`${wp.date}__${wp.meal}`] = ids
  }

  return { meals: ['Déjeuner', 'Dîner'], customIngredients: [], categories: builtCategories, weekPlan: plan }
}

export async function fetchIngredientsData(): Promise<IngredientsData> {
  const [cats, ings] = await Promise.all([
    req<any[]>('GET', '/items/ingredient_categories?fields=id,name,emoji,sort&sort=sort&limit=-1'),
    req<any[]>('GET', '/items/ingredients?fields=id,name,category&limit=-1&sort=name'),
  ])
  return {
    categories: cats.map(c => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      ingredients: ings.filter(i => i.category === c.id).map(i => ({ id: i.id, name: i.name })),
    })),
  }
}

// ─── SUBCATEGORIES ───────────────────────────────────────────────────────────

export async function createSubcategoryInDb(categoryId: string, name: string): Promise<string> {
  const id = generateId()
  await req('POST', '/items/subcategories', { id, name, category: categoryId })
  return id
}

// ─── DISHES ──────────────────────────────────────────────────────────────────

export async function createDishInDb(subcategoryId: string, dish: Omit<Dish, 'id'>): Promise<Dish> {
  const id = generateId()
  await req('POST', '/items/dishes', {
    id,
    name: dish.name,
    desc: dish.desc || null,
    recipe: dish.recipe || null,
    tags: dish.tags?.length ? dish.tags : null,
    subcategory: subcategoryId,
  })
  if (dish.ingredients?.length) {
    await req('POST', '/items/dish_ingredients',
      dish.ingredients.map(ingId => ({ dish_id: id, ingredient_id: ingId }))
    )
  }
  return { ...dish, id }
}

export async function updateDishInDb(dish: Dish): Promise<void> {
  await req('PATCH', `/items/dishes/${dish.id}`, {
    name: dish.name,
    desc: dish.desc || null,
    recipe: dish.recipe || null,
    tags: dish.tags?.length ? dish.tags : null,
  })
  // Sync ingredients: replace all
  const existing = await req<any[]>('GET', `/items/dish_ingredients?filter[dish_id][_eq]=${dish.id}&fields=id&limit=-1`)
  if (existing.length) await req('DELETE', '/items/dish_ingredients', existing.map(e => e.id))
  if (dish.ingredients?.length) {
    await req('POST', '/items/dish_ingredients',
      dish.ingredients.map(ingId => ({ dish_id: dish.id, ingredient_id: ingId }))
    )
  }
}

export async function deleteDishFromDb(dishId: string): Promise<void> {
  const [dishIngs, wpDishes] = await Promise.all([
    req<any[]>('GET', `/items/dish_ingredients?filter[dish_id][_eq]=${dishId}&fields=id&limit=-1`),
    req<any[]>('GET', `/items/week_plan_dishes?filter[dish_id][_eq]=${dishId}&fields=id,week_plan_id&limit=-1`),
  ])
  const deletes: Promise<unknown>[] = []
  if (dishIngs.length) deletes.push(req('DELETE', '/items/dish_ingredients', dishIngs.map(e => e.id)))
  if (wpDishes.length) deletes.push(req('DELETE', '/items/week_plan_dishes', wpDishes.map(e => e.id)))
  await Promise.all(deletes)

  // Clean up orphaned week_plan rows
  const wpIds = [...new Set(wpDishes.map((e: any) => e.week_plan_id))]
  for (const wpId of wpIds) {
    const remaining = await req<any[]>(`GET`, `/items/week_plan_dishes?filter[week_plan_id][_eq]=${wpId}&fields=id&limit=1`)
    if (!remaining.length) await req('DELETE', `/items/week_plan/${wpId}`)
  }

  await req('DELETE', `/items/dishes/${dishId}`)
}

// ─── WEEK PLAN ───────────────────────────────────────────────────────────────

async function getOrCreateWeekPlanId(date: string, meal: string): Promise<number> {
  const meal_enc = encodeURIComponent(meal)
  const found = await req<any[]>('GET', `/items/week_plan?filter[date][_eq]=${date}&filter[meal][_eq]=${meal_enc}&fields=id&limit=1`)
  if (found.length) return found[0].id
  const created = await req<any>('POST', '/items/week_plan', { date, meal })
  return created.id
}

export async function addDishToCell(key: string, dishId: string): Promise<void> {
  const { date, meal } = parseKey(key)
  const wpId = await getOrCreateWeekPlanId(date, meal)
  await req('POST', '/items/week_plan_dishes', { week_plan_id: wpId, dish_id: dishId })
}

export async function removeDishFromCell(key: string, dishId: string): Promise<void> {
  const { date, meal } = parseKey(key)
  const meal_enc = encodeURIComponent(meal)
  const wps = await req<any[]>('GET', `/items/week_plan?filter[date][_eq]=${date}&filter[meal][_eq]=${meal_enc}&fields=id&limit=1`)
  if (!wps.length) return
  const wpId = wps[0].id
  const dish_enc = encodeURIComponent(dishId)
  const wpDish = await req<any[]>('GET', `/items/week_plan_dishes?filter[week_plan_id][_eq]=${wpId}&filter[dish_id][_eq]=${dish_enc}&fields=id&limit=1`)
  if (wpDish.length) await req('DELETE', `/items/week_plan_dishes/${wpDish[0].id}`)
  const remaining = await req<any[]>('GET', `/items/week_plan_dishes?filter[week_plan_id][_eq]=${wpId}&fields=id&limit=1`)
  if (!remaining.length) await req('DELETE', `/items/week_plan/${wpId}`)
}

export async function clearPlanCell(key: string): Promise<void> {
  const { date, meal } = parseKey(key)
  const meal_enc = encodeURIComponent(meal)
  const wps = await req<any[]>('GET', `/items/week_plan?filter[date][_eq]=${date}&filter[meal][_eq]=${meal_enc}&fields=id&limit=1`)
  if (!wps.length) return
  const wpId = wps[0].id
  const wpDishes = await req<any[]>('GET', `/items/week_plan_dishes?filter[week_plan_id][_eq]=${wpId}&fields=id&limit=-1`)
  if (wpDishes.length) await req('DELETE', '/items/week_plan_dishes', wpDishes.map(e => e.id))
  await req('DELETE', `/items/week_plan/${wpId}`)
}
