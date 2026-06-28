import { renderHook, act, waitFor } from '@testing-library/react-native'
import { useMenuData } from '@/hooks/useMenuData'
import * as api from '@/services/api'

const mockData = {
  meals: ['Déjeuner', 'Dîner'],
  categories: [
    {
      id: 'cat1',
      name: 'Plats',
      color: '#e67e22',
      subcategories: [
        {
          id: 'sub1',
          name: 'Pâtes',
          dishes: [
            { id: 'dish1', name: 'Carbonara', desc: '', ingredients: [], recipe: '' },
          ],
        },
      ],
    },
  ],
  weekPlan: { 'Lundi__Déjeuner': 'dish1' },
}

beforeEach(() => {
  jest.spyOn(api, 'fetchData').mockResolvedValue(JSON.parse(JSON.stringify(mockData)))
  jest.spyOn(api, 'saveData').mockResolvedValue(undefined)
})

afterEach(() => jest.restoreAllMocks())

describe('useMenuData', () => {
  it('loads data on mount', async () => {
    const { result } = renderHook(() => useMenuData())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.categories[0].name).toBe('Plats')
  })

  it('setPlanCell adds entry to weekPlan', async () => {
    const { result } = renderHook(() => useMenuData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.setPlanCell('Mardi__Dîner', 'dish1')
    })
    expect(result.current.data?.weekPlan['Mardi__Dîner']).toBe('dish1')
    expect(api.saveData).toHaveBeenCalled()
  })

  it('clearPlanCell removes entry from weekPlan', async () => {
    const { result } = renderHook(() => useMenuData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.clearPlanCell('Lundi__Déjeuner')
    })
    expect(result.current.data?.weekPlan['Lundi__Déjeuner']).toBeUndefined()
  })

  it('addDish appends to correct subcategory', async () => {
    const { result } = renderHook(() => useMenuData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.addDish('cat1', 'sub1', {
        name: 'Gnocchi',
        desc: '',
        ingredients: [],
        recipe: '',
      })
    })
    const dishes = result.current.data?.categories[0].subcategories[0].dishes
    expect(dishes).toHaveLength(2)
    expect(dishes?.[1].name).toBe('Gnocchi')
  })

  it('deleteDish also removes dish from weekPlan', async () => {
    const { result } = renderHook(() => useMenuData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.deleteDish('cat1', 'sub1', 'dish1')
    })
    expect(result.current.data?.weekPlan['Lundi__Déjeuner']).toBeUndefined()
  })
})
