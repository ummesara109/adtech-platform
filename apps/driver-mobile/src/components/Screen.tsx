import React from 'react'
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '../constants/theme'

export function Screen({
  children,
  scroll,
  style,
}: {
  children: React.ReactNode
  scroll?: boolean
  style?: ViewStyle
}) {
  const content = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scroll, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      {children}
    </ScrollView>
  ) : (
    // minHeight: 0 + overflow hidden constrains nested ScrollView/FlatList so they can scroll
    <View style={[styles.body, style]}>{children}</View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {content}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  body: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
})
