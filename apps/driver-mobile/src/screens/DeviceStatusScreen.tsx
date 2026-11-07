import React, { useCallback, useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAuth } from '../context/AuthContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { driverService } from '../services/driverService'

export function DeviceStatusScreen() {
  const { setNeedsOnboarding, needsOnboarding } = useAuth()
  const { data, loading, error, refresh } = useAsyncData(() => driverService.device(), [])
  const [busy, setBusy] = useState(false)

  const disconnect = useCallback(async () => {
    setBusy(true)
    try {
      await driverService.disconnectDevice()
      Alert.alert('Disconnected', 'Device assignment cleared')
      refresh()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }, [refresh])

  if (loading && !data) return <LoadingState />

  const assignment = data?.assignment
  const online = assignment?.device?.onlineStatus === 'Online'

  return (
    <Screen scroll={false} style={{ padding: 0 }}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <Text style={styles.h1}>Device connectivity</Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {!assignment ? (
          <EmptyState title="No device assigned" message="Pair a device from onboarding." />
        ) : (
          <Card>
            <View style={[styles.badge, online ? styles.online : styles.offline]}>
              <Text style={styles.badgeText}>{online ? 'Device Connected!' : 'Device Offline'}</Text>
            </View>
            <Text style={styles.meta}>
              {online
                ? 'Your device is online and ready to play ads.'
                : 'Assigned device has not reported a fresh online heartbeat.'}
            </Text>
            <Text style={styles.label}>Device ID</Text>
            <Text style={styles.value}>{assignment.device.serialNumber}</Text>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{assignment.device.onlineStatus}</Text>
            <Button label="Disconnect" variant="outline" onPress={disconnect} loading={busy} />
          </Card>
        )}
        {needsOnboarding ? (
          <Button label="Continue to Home" onPress={() => setNeedsOnboarding(false)} />
        ) : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: spacing.md, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  err: { color: colors.danger, marginBottom: spacing.sm },
  badge: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  online: { backgroundColor: '#E7F6EE' },
  offline: { backgroundColor: '#FDECEC' },
  badgeText: { fontWeight: '800', fontSize: 16, color: colors.navy, textAlign: 'center' },
  meta: { color: colors.muted, marginBottom: spacing.md, textAlign: 'center' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: spacing.sm },
  value: { color: colors.navy, fontWeight: '700', fontSize: 16 },
})
