import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'
import { MenuDataProvider } from '@/context/MenuDataContext'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <MenuDataProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </MenuDataProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
