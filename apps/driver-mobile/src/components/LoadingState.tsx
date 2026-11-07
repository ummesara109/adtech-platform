import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { colors } from '../constants/theme'

export function LoadingState() {
  return (
    <View style={styles.box}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
})
