import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAuth } from '../context/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { driverService } from '../services/driverService'
import { config } from '../constants/config'

export function ProfileScreen() {
  const { user, logout } = useAuth()
  const { data, loading } = useAsyncData(() => driverService.profile(), [])
  if (loading && !data) return <LoadingState />

  return (
    <Screen scroll>
      <Text style={styles.h1}>Profile</Text>
      <Card title="Account">
        <Text style={styles.name}>{data?.fullName ?? user?.fullName}</Text>
        <Text style={styles.meta}>{data?.email ?? user?.email}</Text>
        <Text style={styles.meta}>KYC: {data?.kycStatus ?? user?.kycStatus}</Text>
        <Text style={styles.meta}>Phone: {data?.phone || '—'}</Text>
      </Card>
      <Card title="API endpoint">
        <Text style={styles.meta}>{config.apiBaseUrl}</Text>
      </Card>
      <Button label="Sign out" variant="outline" onPress={() => void logout()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  name: { fontSize: 18, fontWeight: '800', color: colors.navy },
  meta: { color: colors.muted, marginTop: 4 },
})
