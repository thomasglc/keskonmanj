import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
} from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet'
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { Colors } from '@/constants/colors'
import type { Category, Dish } from '@/types'

export interface DishBottomSheetHandle {
  open: () => void
  close: () => void
}

interface FlatDish {
  dish: Dish
  categoryId: string
  subcategoryId: string
  categoryColor: string
  categoryName: string
  subcategoryName: string
}

interface Props {
  categories: Category[]
  onSelect: (dish: Dish, categoryId: string, subcategoryId: string) => void
}

const DishBottomSheet = forwardRef<DishBottomSheetHandle, Props>(
  ({ categories, onSelect }, ref) => {
    const sheetRef = useRef<BottomSheet>(null)
    const [query, setQuery] = useState('')

    const allDishes: FlatDish[] = categories.flatMap((cat) =>
      cat.subcategories.flatMap((sub) =>
        sub.dishes.map((dish) => ({
          dish,
          categoryId: cat.id,
          subcategoryId: sub.id,
          categoryColor: cat.color,
          categoryName: cat.name,
          subcategoryName: sub.name,
        }))
      )
    )

    const filtered = query.trim()
      ? allDishes.filter((d) =>
          d.dish.name.toLowerCase().includes(query.toLowerCase())
        )
      : allDishes

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }))

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
        />
      ),
      []
    )

    const handleSelect = (item: FlatDish) => {
      sheetRef.current?.close()
      setQuery('')
      onSelect(item.dish, item.categoryId, item.subcategoryId)
    }

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['60%', '90%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.card }}
        handleIndicatorStyle={{ backgroundColor: Colors.border }}
      >
        <BottomSheetFlatList
          data={filtered}
          keyExtractor={(item) => item.dish.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Choisir un plat</Text>
              <TextInput
                style={styles.search}
                placeholder="Rechercher…"
                placeholderTextColor={Colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => handleSelect(item)}
            >
              <View
                style={[styles.dot, { backgroundColor: item.categoryColor }]}
              />
              <View style={styles.itemText}>
                <Text style={styles.itemName}>{item.dish.name}</Text>
                <Text style={styles.itemSub}>
                  {item.categoryName} · {item.subcategoryName}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
        />
      </BottomSheet>
    )
  }
)

DishBottomSheet.displayName = 'DishBottomSheet'
export default DishBottomSheet

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { paddingBottom: 4 },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  search: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  itemText: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  itemSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.border },
})
