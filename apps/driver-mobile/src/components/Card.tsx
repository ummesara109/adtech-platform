import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { colors, radii, spacing } from '../constants/theme'

export function Card({
  title,
  children,
  style,
}: {
  title?: string
  children: React.ReactNode
  style?: ViewStyle
}) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
})
