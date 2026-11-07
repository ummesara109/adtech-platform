import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../constants/theme'

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFinish, 1200)
    return () => clearTimeout(t)
  }, [onFinish])

  return (
    <View style={styles.root}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>🛺</Text>
      </View>
      <Text style={styles.brand}>Auto Ad Partner</Text>
      <Text style={styles.sub}>Driver / Partner Application</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { fontSize: 40 },
  brand: { color: colors.white, fontSize: 28, fontWeight: '800' },
  sub: { color: '#C7D7FF', marginTop: spacing.sm },
})
