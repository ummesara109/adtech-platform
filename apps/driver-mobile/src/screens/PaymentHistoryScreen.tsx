import React from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAsyncData } from '../hooks/useAsyncData'
import { driverService } from '../services/driverService'

export function PaymentHistoryScreen() {
  const { data, loading, error, refresh } = useAsyncData(() => driverService.payouts(), [])
  if (loading && !data) return <LoadingState />

  return (
    <Screen scroll={false} style={{ padding: 0 }}>
      <FlatList
        contentContainerStyle={styles.list}
        data={data?.items ?? []}
        keyExtractor={(i) => i.id}
        refreshing={loading}
        onRefresh={refresh}
        ListHeaderComponent={
          <>
            <Text style={styles.h1}>Payments</Text>
            {error ? <Text style={styles.err}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState title="No payouts" message="Payment records appear when finance processes transfers." />
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.amount}>₹{item.amountInr.toLocaleString('en-IN')}</Text>
                <Text style={styles.meta}>
                  {item.status}
                  {item.reference ? ` · ${item.reference}` : ''}
                </Text>
                <Text style={styles.meta}>
                  {item.paidOn
                    ? new Date(item.paidOn).toLocaleDateString()
                    : new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  err: { color: colors.danger },
  row: { flexDirection: 'row', alignItems: 'center' },
  amount: { fontSize: 20, fontWeight: '800', color: colors.primary },
  meta: { color: colors.muted, marginTop: 4 },
})
