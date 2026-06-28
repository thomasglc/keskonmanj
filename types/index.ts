export interface Ingredient {
  id: string
  name: string
}

export interface IngredientCategory {
  id: string
  name: string
  emoji: string
  ingredients: Ingredient[]
}

export interface IngredientsData {
  categories: IngredientCategory[]
}

export interface Dish {
  id: string
  name: string
  desc: string
  ingredients: string[]
  recipe: string
  tags: string[]
  link?: string
}

export interface Subcategory {
  id: string
  name: string
  dishes: Dish[]
}

export interface Category {
  id: string
  name: string
  color: string
  subcategories: Subcategory[]
}

export interface CustomIngredient {
  id: string
  name: string
}

export interface MenuData {
  meals: string[]
  categories: Category[]
  weekPlan: Record<string, string[]>
  customIngredients: CustomIngredient[]
}

export interface PlanCellDish {
  dish: Dish
  categoryColor: string
}

export interface PlanCellInfo {
  key: string
  day: string
  meal: string
  dishes: PlanCellDish[]
}
