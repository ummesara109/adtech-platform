import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAsyncData } from '../hooks/useAsyncData'
import { driverService } from '../services/driverService'

export function IncentivesScreen() {
  const { data, loading, error } = useAsyncData(() => driverService.activity(), [])
  if (loading) return <LoadingState />
  const items = data?.incentives || []
  const progress = data?.incentiveProgress

  return (
    <Screen scroll>
      <Text style={styles.h1}>Incentives</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {progress ? (
        <Card title="Playback progress">
          <Text style={styles.row}>{progress.label}</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.min(100, (progress.currentHours / progress.targetHours) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.meta}>Based on validated monthly playback hours</Text>
        </Card>
      ) : null}
      {items.length ? (
        items.map((i) => (
          <Card key={i.id}>
            <Text style={styles.title}>{i.title}</Text>
            <Text style={styles.meta}>
              ₹{i.amountInr.toLocaleString('en-IN')} · {i.status}
            </Text>
          </Card>
        ))
      ) : (
        <EmptyState title="No incentives" message="Configured incentive campaigns will appear here." />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  err: { color: colors.danger },
  row: { color: colors.navy, fontWeight: '700' },
  track: { height: 8, backgroundColor: colors.sky, borderRadius: 4, marginTop: spacing.sm },
  fill: { height: 8, backgroundColor: colors.yellow, borderRadius: 4 },
  meta: { color: colors.muted, marginTop: 6 },
  title: { fontWeight: '800', color: colors.navy, fontSize: 16 },
})
