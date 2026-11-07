import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAsyncData } from '../hooks/useAsyncData'
import { driverService } from '../services/driverService'

export function MyVehicleScreen() {
  const { data, loading, error } = useAsyncData(() => driverService.vehicle(), [])

  if (loading) return <LoadingState />

  const vehicle = data?.vehicle

  return (
    <Screen scroll>
      <Text style={styles.h1}>My Vehicle</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {vehicle ? (
        <Card>
          <Row label="Registration" value={vehicle.registrationNumber} />
          <Row label="Make / model" value={vehicle.makeModel || '—'} />
          <Row label="Year" value={vehicle.year ? String(vehicle.year) : '—'} />
          <Row label="Color" value={vehicle.color || '—'} />
          <Row label="Status" value={vehicle.status} />
        </Card>
      ) : (
        <EmptyState
          title="No vehicle on file"
          message="Complete vehicle registration from Profile → Vehicle registration."
        />
      )}
    </Screen>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.row}>
      <Text style={styles.label}>{label}: </Text>
      {value}
    </Text>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '800', color: colors.navy, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
  row: { color: colors.navy, marginBottom: spacing.sm, lineHeight: 22 },
  label: { fontWeight: '700' },
})
