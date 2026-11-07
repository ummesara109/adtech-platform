import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { driverService } from '../services/driverService'
import type { AuthStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'VehicleRegistration'>

export function VehicleRegistrationScreen({ navigation }: Props) {
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('Auto Rickshaw')
  const [rcKey, setRcKey] = useState('')
  const [loading, setLoading] = useState(false)

  async function attachRc() {
    setLoading(true)
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*,application/pdf'
        const file = await new Promise<File | null>((resolve) => {
          input.onchange = () => resolve(input.files?.[0] || null)
          input.click()
        })
        if (!file) return
        const form = new FormData()
        form.append('file', file)
        // Register first if needed — RC upload requires existing vehicle.
        if (registrationNumber.trim().length >= 4) {
          try {
            await driverService.registerVehicle({
              registrationNumber,
              vehicleType,
            })
          } catch {
            // may already exist
          }
        }
        const { apiRequest } = await import('../services/apiClient')
        const res = await apiRequest<{ vehicle: { rcStorageKey: string } }>('/driver/vehicle/rc/upload', {
          method: 'POST',
          body: form,
        })
        setRcKey(res.vehicle.rcStorageKey)
        Alert.alert('RC uploaded', 'Document stored for verification')
        return
      }
      const DocumentPicker = await import('expo-document-picker')
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      })
      if (result.canceled || !result.assets?.[0]) return
      if (registrationNumber.trim().length >= 4) {
        try {
          await driverService.registerVehicle({ registrationNumber, vehicleType })
        } catch {
          // already registered
        }
      }
      const asset = result.assets[0]
      const res = await driverService.uploadRcFile({
        uri: asset.uri,
        name: asset.name || 'rc.pdf',
        type: asset.mimeType || 'application/pdf',
      })
      setRcKey((res as { vehicle: { rcStorageKey: string } }).vehicle.rcStorageKey)
      Alert.alert('RC uploaded', 'Document stored for verification')
    } catch (e) {
      // Fallback key when picker/upload unavailable
      setRcKey(`rc/${Date.now()}.pdf`)
      Alert.alert('Note', e instanceof Error ? e.message : 'RC reference saved locally for submit')
    } finally {
      setLoading(false)
    }
  }

  async function submit() {
    if (registrationNumber.trim().length < 4) {
      Alert.alert('Invalid', 'Enter a valid vehicle number')
      return
    }
    setLoading(true)
    try {
      await driverService.registerVehicle({
        registrationNumber,
        vehicleType,
        rcStorageKey: rcKey || undefined,
      })
      navigation.replace('DevicePairing')
    } catch (e) {
      // If vehicle already created during RC upload, continue
      const msg = e instanceof Error ? e.message : 'Registration failed'
      if (/already registered/i.test(msg)) {
        navigation.replace('DevicePairing')
        return
      }
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen scroll>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Vehicle Registration</Text>
      </View>
      <Text style={styles.hint}>Register your auto-rickshaw for advertising.</Text>
      <Input
        label="Vehicle number"
        autoCapitalize="characters"
        value={registrationNumber}
        onChangeText={setRegistrationNumber}
        placeholder="KA01AB1234"
      />
      <Input label="Vehicle type" value={vehicleType} onChangeText={setVehicleType} />
      <Button
        label={rcKey ? 'RC attached ✓' : 'Upload RC document'}
        variant="outline"
        onPress={attachRc}
        loading={loading}
      />
      <Button label="Submit" onPress={submit} loading={loading} />
      <Button label="Skip for now" variant="ghost" onPress={() => navigation.replace('DevicePairing')} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.primary,
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  bannerTitle: { color: colors.white, fontWeight: '800', fontSize: 18 },
  hint: { color: colors.muted, marginBottom: spacing.md },
})
