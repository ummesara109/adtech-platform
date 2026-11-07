import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../constants/theme'

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
})
