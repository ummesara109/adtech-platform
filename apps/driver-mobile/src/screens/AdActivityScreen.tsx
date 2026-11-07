import React from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAsyncData } from '../hooks/useAsyncData'
import { driverService } from '../services/driverService'

export function AdActivityScreen() {
  const activity = useAsyncData(() => driverService.activity(), [])
  const playback = useAsyncData(() => driverService.playback(), [])

  if ((activity.loading || playback.loading) && !playback.data) return <LoadingState />

  const pb = activity.data?.playback
  const max = Math.max(1, ...(pb?.weekly.map((d) => d.count) || [1]))
  const items = playback.data?.items ?? []

  return (
    <Screen scroll={false} style={{ padding: 0 }}>
      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(i) => i.id}
        refreshing={playback.loading}
        onRefresh={() => {
          activity.refresh()
          playback.refresh()
        }}
        ListHeaderComponent={
          <>
            <Text style={styles.h1}>Ad activity</Text>
            <Card>
              <Text style={styles.label}>Total playbacks today</Text>
              <Text style={styles.big}>
                {pb?.totalCompletedToday != null ? pb.totalCompletedToday : '—'}
              </Text>
              {pb?.vsYesterdayPct != null ? (
                <Text style={styles.pct}>
                  {pb.vsYesterdayPct >= 0 ? '+' : ''}
                  {pb.vsYesterdayPct}% vs yesterday
                </Text>
              ) : null}
              <View style={styles.chart}>
                {(pb?.weekly || []).map((d) => (
                  <View key={d.day} style={styles.barCol}>
                    <View style={[styles.bar, { height: Math.max(8, (d.count / max) * 72) }]} />
                    <Text style={styles.day}>{d.day.slice(0, 2)}</Text>
                  </View>
                ))}
              </View>
            </Card>
            <Text style={styles.section}>Playback history</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title="No playback yet"
            message="History appears when your device reports Proof of Play events."
          />
        }
        renderItem={({ item }) => {
          const completed = item.eventType === 'Completed' || item.eventType === 'completed'
          return (
            <Card>
              <Text style={[styles.event, { color: completed ? colors.success : colors.danger }]}>
                {completed ? 'Completed' : item.eventType}
              </Text>
              <Text style={styles.meta}>Valid duration: {item.validDurationSec}s</Text>
              <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
            </Card>
          )
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  label: { color: colors.muted, fontWeight: '600' },
  big: { fontSize: 28, fontWeight: '900', color: colors.primary },
  pct: { color: colors.success, fontWeight: '700', marginTop: 4 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 90, marginTop: spacing.md, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', backgroundColor: colors.blue, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  day: { fontSize: 9, color: colors.muted, marginTop: 4 },
  section: { fontSize: 16, fontWeight: '700', color: colors.navy, marginBottom: spacing.sm },
  event: { fontWeight: '800', color: colors.navy, fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4 },
})
