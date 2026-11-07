import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { driverService } from '../services/driverService'
import type { AuthStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'KycVerification'>

async function pickDocument(): Promise<{ uri: string; name: string; type: string } | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*,application/pdf'
      input.onchange = () => {
        const file = input.files?.[0]
        if (!file) {
          resolve(null)
          return
        }
        resolve({ uri: URL.createObjectURL(file), name: file.name, type: file.type || 'application/octet-stream' })
      }
      input.click()
    })
  }
  try {
    // Optional native picker when installed; falls back to storage-key upload.
    const DocumentPicker = await import('expo-document-picker')
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets?.[0]) return null
    const asset = result.assets[0]
    return {
      uri: asset.uri,
      name: asset.name || 'document.jpg',
      type: asset.mimeType || 'application/octet-stream',
    }
  } catch {
    return null
  }
}

export function KycVerificationScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true)
  const [docs, setDocs] = useState<{ id: string; label: string; status: string; uploaded: boolean }[]>([])
  const [status, setStatus] = useState('')
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void driverService
      .kyc()
      .then((r) => {
        setDocs(r.documents)
        setStatus(r.kycStatus)
      })
      .finally(() => setLoading(false))
  }, [])

  async function uploadCurrent() {
    const doc = docs[step]
    if (!doc) return
    setBusy(true)
    try {
      const picked = await pickDocument()
      if (picked && Platform.OS === 'web') {
        // Web: convert blob URL to File via fetch for FormData
        const blob = await fetch(picked.uri).then((r) => r.blob())
        const form = new FormData()
        form.append('documentId', doc.id)
        form.append('file', new File([blob], picked.name, { type: picked.type }))
        const { apiRequest } = await import('../services/apiClient')
        await apiRequest('/driver/kyc/documents/upload', { method: 'POST', body: form })
      } else if (picked) {
        await driverService.uploadKycFile(doc.id, picked)
      } else {
        const key = `kyc/${doc.id}/${Date.now()}.jpg`
        await driverService.uploadKyc(doc.id, key)
      }
      const refreshed = await driverService.kyc()
      setDocs(refreshed.documents)
      setStatus(refreshed.kycStatus)
      Alert.alert('Uploaded', `${doc.label} saved for review.`)
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again')
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    if (step < Math.min(2, docs.length - 1)) {
      setStep((s) => s + 1)
      return
    }
    setBusy(true)
    try {
      await driverService.submitKyc()
      navigation.replace('VehicleRegistration')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Submit failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <Screen scroll>
      <Text style={styles.h1}>KYC verification</Text>
      <Text style={styles.meta}>Status: {status || 'Pending'}</Text>
      <View style={styles.steps}>
        {['ID', 'Photo', 'Address'].map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.dot, i <= step || docs[i]?.uploaded ? styles.dotOn : null]}>
              <Text style={styles.dotText}>{docs[i]?.uploaded || i < step ? '✓' : String(i + 1)}</Text>
            </View>
            <Text style={styles.stepLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <Card title={`Upload ${docs[step]?.label || 'document'}`}>
        <Text style={styles.help}>JPG / PNG / PDF · Stored securely for admin review</Text>
        <Button label="Select & upload" variant="outline" onPress={uploadCurrent} loading={busy} />
        {docs[step]?.uploaded ? <Text style={styles.ok}>On file · {docs[step].status}</Text> : null}
      </Card>
      <Button label="Next" onPress={next} loading={busy} />
      <Button label="Skip for now" variant="ghost" onPress={() => navigation.replace('VehicleRegistration')} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.xs },
  meta: { color: colors.muted, marginBottom: spacing.md },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  stepItem: { alignItems: 'center', flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.success },
  dotText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  stepLabel: { marginTop: 4, fontSize: 11, color: colors.muted },
  help: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
  ok: { color: colors.success, marginTop: spacing.sm, fontWeight: '600' },
})
