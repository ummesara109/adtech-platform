import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { colors, radii, spacing } from '../constants/theme'

function Bone({ height, width, style }: { height: number; width?: number | `${number}%`; style?: object }) {
  const opacity = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        styles.bone,
        { height, width: width ?? '100%', opacity },
        style,
      ]}
    />
  )
}

export function DashboardSkeleton() {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Bone height={14} width="40%" />
          <Bone height={22} width="70%" style={{ marginTop: 8 }} />
          <Bone height={12} width="50%" style={{ marginTop: 8 }} />
        </View>
        <Bone height={40} width={40} style={{ borderRadius: 20 }} />
      </View>
      <View style={styles.card}>
        <Bone height={16} width="45%" />
        <Bone height={48} style={{ marginTop: 12 }} />
        <Bone height={48} style={{ marginTop: 10 }} />
      </View>
      <View style={styles.card}>
        <Bone height={16} width="55%" />
        <View style={styles.stats}>
          <Bone height={64} width="30%" />
          <Bone height={64} width="30%" />
          <Bone height={64} width="30%" />
        </View>
      </View>
      <View style={styles.card}>
        <Bone height={16} width="40%" />
        <Bone height={56} style={{ marginTop: 12 }} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.md, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  bone: {
    backgroundColor: '#D7E3F4',
    borderRadius: radii.sm,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
})
