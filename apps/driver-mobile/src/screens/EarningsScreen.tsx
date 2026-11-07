import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAsyncData } from '../hooks/useAsyncData'
import type { EarningsStackParamList } from '../navigation/types'
import { driverService } from '../services/driverService'

export function EarningsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<EarningsStackParamList>>()
  const earnings = useAsyncData(() => driverService.earnings(), [])
  const activity = useAsyncData(() => driverService.activity(), [])

  if (earnings.loading && !earnings.data) return <LoadingState />

  const trend = activity.data?.earningsTrend || []
  const current = trend[trend.length - 1]

  return (
    <Screen scroll={false} style={{ padding: 0 }}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={
          <RefreshControl
            refreshing={earnings.loading}
            onRefresh={() => {
              earnings.refresh()
              activity.refresh()
            }}
          />
        }
      >
        <Text style={styles.h1}>Monthly earnings</Text>
        <Card>
          <Text style={styles.label}>This month (net)</Text>
          <Text style={styles.big}>
            {current ? `₹${current.netAmountInr.toLocaleString('en-IN')}` : 'No statement'}
          </Text>
          {current ? (
            <Text style={styles.meta}>Gross ₹{current.grossAmountInr.toLocaleString('en-IN')}</Text>
          ) : null}
        </Card>
        {earnings.data?.items.length ? (
          earnings.data.items.map((row) => (
            <Card key={row.id} title={`${row.periodMonth}/${row.periodYear}`}>
              <Text style={styles.row}>Gross: ₹{row.grossAmountInr.toLocaleString('en-IN')}</Text>
              <Text style={styles.row}>Commission: ₹{row.commissionInr.toLocaleString('en-IN')}</Text>
              <Text style={styles.strong}>Net: ₹{row.netAmountInr.toLocaleString('en-IN')}</Text>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No earnings records"
            message="Amounts appear when finance posts your partner statement."
          />
        )}
        <Pressable onPress={() => navigation.navigate('Incentives')}>
          <Text style={styles.link}>View incentives →</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: spacing.md, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  label: { color: colors.muted, fontWeight: '600' },
  big: { fontSize: 28, fontWeight: '900', color: colors.primary, marginTop: 4 },
  meta: { color: colors.muted, marginTop: 4 },
  row: { color: colors.navy, marginBottom: 4 },
  strong: { color: colors.primary, fontWeight: '800' },
  link: { color: colors.blue, fontWeight: '700', marginTop: spacing.md },
})
