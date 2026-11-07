import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import React, { useCallback, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Card } from '../components/Card'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { Screen } from '../components/Screen'
import { colors, radii, spacing } from '../constants/theme'
import { useAuth } from '../context/AuthContext'
import type { HomeStackParamList } from '../navigation/types'
import { ApiError } from '../services/apiClient'
import { driverService, type ActivitySummary } from '../services/driverService'
import type { DriverDashboard } from '../types/api'

type Nav = NativeStackNavigationProp<HomeStackParamList>

export function HomeDashboardScreen() {
  const navigation = useNavigation<Nav>()
  const { user } = useAuth()
  const [dash, setDash] = useState<DriverDashboard | null>(null)
  const [activity, setActivity] = useState<ActivitySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [d, a] = await Promise.all([driverService.dashboard(), driverService.activity()])
      setDash(d)
      setActivity(a)
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  if (loading && !dash) {
    return (
      <Screen scroll={false} style={{ padding: 0 }}>
        <DashboardSkeleton />
      </Screen>
    )
  }

  const online = dash?.deviceConnectivityStatus === 'Online'
  const hours = activity?.runningHours
  const plays = activity?.playback?.totalCompletedToday
  const net = dash?.hasEarningsRecord ? dash.monthlyEarningsInr : null
  const progress = activity?.incentiveProgress

  return (
    <Screen scroll={false} style={{ padding: 0 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hello</Text>
            <Text style={styles.name}>{dash?.driverName || user?.fullName || 'Partner'}</Text>
          </View>
          <Pressable style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <Card title="Device connectivity">
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.danger }]} />
            <Text style={styles.rowText}>
              {!dash?.hasDeviceAssignment
                ? 'No device assigned'
                : online
                  ? `Online · ${dash.deviceSerialNumber}`
                  : `Offline · ${dash.deviceSerialNumber || 'Assigned'}`}
            </Text>
          </View>
          <Pressable onPress={() => navigation.navigate('DeviceStatus')}>
            <Text style={styles.link}>View device details →</Text>
          </Pressable>
        </Card>

        <View style={styles.grid}>
          <Pressable style={styles.tile} onPress={() => navigation.navigate('RunningHours')}>
            <Text style={styles.tileLabel}>Today&apos;s hours</Text>
            <Text style={styles.tileValue}>
              {hours?.hasRecords ? hours.totalLabel : '—'}
            </Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => navigation.getParent()?.navigate('Activity')}>
            <Text style={styles.tileLabel}>Playbacks</Text>
            <Text style={styles.tileValue}>{plays != null ? String(plays) : '—'}</Text>
          </Pressable>
        </View>

        <Card title="Monthly earnings">
          <Text style={styles.big}>
            {net != null ? `₹${net.toLocaleString('en-IN')}` : 'No statement yet'}
          </Text>
          <Pressable onPress={() => navigation.getParent()?.navigate('Earnings')}>
            <Text style={styles.link}>View earnings →</Text>
          </Pressable>
        </Card>

        <Card title="Incentive progress">
          {progress ? (
            <>
              <Text style={styles.rowText}>{progress.label}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(
                        100,
                        progress.targetHours > 0
                          ? (progress.currentHours / progress.targetHours) * 100
                          : 0,
                      )}%`,
                    },
                  ]}
                />
              </View>
            </>
          ) : (
            <Text style={styles.muted}>No incentive progress available</Text>
          )}
        </Card>

        <Card title="Quick access">
          <Pressable style={styles.quick} onPress={() => navigation.navigate('MyVehicle')}>
            <Ionicons name="car-outline" size={20} color={colors.blue} />
            <Text style={styles.quickText}>My Vehicle</Text>
          </Pressable>
          <Pressable style={styles.quick} onPress={() => navigation.navigate('DeviceStatus')}>
            <Ionicons name="wifi-outline" size={20} color={colors.blue} />
            <Text style={styles.quickText}>Device status</Text>
          </Pressable>
          <Pressable style={styles.quick} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="log-out-outline" size={20} color={colors.blue} />
            <Text style={styles.quickText}>Profile / Logout</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.primary,
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  hello: { color: '#C7D7FF', fontSize: 13 },
  name: { color: colors.white, fontSize: 24, fontWeight: '800' },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#FDECEC',
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  retry: { color: colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowText: { color: colors.navy, fontWeight: '600', flex: 1 },
  link: { color: colors.blue, fontWeight: '700', marginTop: spacing.sm },
  grid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tileLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  tileValue: { color: colors.primary, fontSize: 22, fontWeight: '800', marginTop: 4 },
  big: { fontSize: 26, fontWeight: '800', color: colors.primary },
  muted: { color: colors.muted },
  barTrack: { height: 8, backgroundColor: colors.sky, borderRadius: 4, marginTop: spacing.sm },
  barFill: { height: 8, backgroundColor: colors.success, borderRadius: 4 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: spacing.sm },
  quickText: { color: colors.navy, fontWeight: '600', fontSize: 15 },
})
