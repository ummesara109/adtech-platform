import React from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAsyncData } from '../hooks/useAsyncData'
import { driverService } from '../services/driverService'

export function RunningHoursScreen() {
  const { data, loading, error, refresh } = useAsyncData(() => driverService.activity(), [])
  if (loading && !data) return <LoadingState />
  const rh = data?.runningHours

  return (
    <Screen scroll={false} style={{ padding: 0 }}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <Text style={styles.h1}>Daily advertising hours</Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {!rh?.hasRecords ? (
          <EmptyState
            title="No validated hours today"
            message="Hours appear when your device reports validated Proof of Play."
          />
        ) : (
          <Card>
            <Text style={styles.label}>Today&apos;s running time</Text>
            <Text style={styles.big}>{rh.totalLabel}</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(
                      100,
                      ((rh.totalValidSec || 0) / (rh.targetHoursPerDay * 3600)) * 100,
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.meta}>Target: {rh.targetHoursPerDay}h / day</Text>
            <Text style={styles.row}>Morning · {rh.buckets?.morning}</Text>
            <Text style={styles.row}>Afternoon · {rh.buckets?.afternoon}</Text>
            <Text style={styles.row}>Evening · {rh.buckets?.evening}</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: spacing.md },
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  err: { color: colors.danger },
  label: { color: colors.muted, fontWeight: '600' },
  big: { fontSize: 32, fontWeight: '900', color: colors.primary, marginVertical: spacing.sm },
  track: { height: 10, backgroundColor: colors.sky, borderRadius: 5 },
  fill: { height: 10, backgroundColor: colors.success, borderRadius: 5 },
  meta: { color: colors.muted, marginTop: 6, marginBottom: spacing.md },
  row: { color: colors.navy, marginBottom: 6, fontWeight: '600' },
})
