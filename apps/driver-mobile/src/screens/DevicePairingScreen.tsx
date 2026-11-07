import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAuth } from '../context/AuthContext'
import { driverService } from '../services/driverService'
import type { AuthStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'DevicePairing'>

export function DevicePairingScreen({ navigation }: Props) {
  const { setNeedsOnboarding } = useAuth()
  const [code, setCode] = useState('')
  const [assignedCode, setAssignedCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void driverService.device().then((r) => {
      const pairingCode = (r.assignment as { pairingCode?: string } | null)?.pairingCode
      if (pairingCode) {
        setAssignedCode(pairingCode)
        setCode(pairingCode)
      }
    })
  }, [])

  async function pair() {
    if (code.trim().length < 4) {
      Alert.alert('Invalid', 'Enter the pairing code from operations')
      return
    }
    setLoading(true)
    try {
      await driverService.pairDevice(code.trim())
      navigation.replace('DeviceStatus')
    } catch (e) {
      Alert.alert('Pairing failed', e instanceof Error ? e.message : 'Try again')
    } finally {
      setLoading(false)
    }
  }

  function finish() {
    setNeedsOnboarding(false)
  }

  return (
    <Screen scroll>
      <Text style={styles.h1}>Device pairing</Text>
      <Card>
        <Text style={styles.step}>1. Turn on your advertising device</Text>
        <Text style={styles.step}>2. Enter the pairing code</Text>
        {assignedCode ? (
          <Text style={styles.code}>{assignedCode}</Text>
        ) : (
          <Input label="Pairing code" autoCapitalize="characters" value={code} onChangeText={setCode} />
        )}
      </Card>
      <Button label="Connect Device" variant="secondary" onPress={pair} loading={loading} />
      <Button label="Continue to app" variant="ghost" onPress={finish} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  step: { color: colors.navy, marginBottom: spacing.sm, fontSize: 14 },
  code: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    color: colors.primary,
  },
})
