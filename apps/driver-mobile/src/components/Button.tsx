import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, radii, spacing } from '../constants/theme'

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.primary : colors.primary} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.labelPrimary,
            variant === 'secondary' && styles.labelSecondary,
            variant === 'outline' && styles.labelOutline,
            variant === 'ghost' && styles.labelGhost,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 6,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.yellow },
  secondary: { backgroundColor: colors.blue },
  outline: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.blue },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },
  label: { fontSize: 16, fontWeight: '800' },
  labelPrimary: { color: colors.primary },
  labelSecondary: { color: colors.white },
  labelOutline: { color: colors.blue },
  labelGhost: { color: colors.primary },
})
