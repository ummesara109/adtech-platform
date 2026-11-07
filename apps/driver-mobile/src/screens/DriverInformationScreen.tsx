import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { LoadingState } from '../components/LoadingState'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { driverService } from '../services/driverService'

export function DriverInformationScreen() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Bengaluru')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')

  useEffect(() => {
    void driverService.profile().then((p) => {
      setFullName(p.fullName)
      setPhone(p.phone)
      setAddress(p.address)
      setCity(p.city)
      setLicenseNumber(p.licenseNumber)
      setEmergencyContact(p.emergencyContact || '')
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true)
    try {
      await driverService.updateProfile({ fullName, phone, address, city, licenseNumber, emergencyContact })
      Alert.alert('Saved', 'Driver information updated.')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <Screen scroll>
      <Text style={styles.h1}>Driver information</Text>
      <Input label="Full name" value={fullName} onChangeText={setFullName} />
      <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input label="Address" value={address} onChangeText={setAddress} />
      <Input label="City" value={city} onChangeText={setCity} />
      <Input label="License number" value={licenseNumber} onChangeText={setLicenseNumber} />
      <Input label="Emergency contact" value={emergencyContact} onChangeText={setEmergencyContact} />
      <Button label="Save" onPress={save} loading={saving} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800', color: colors.navy, marginBottom: spacing.md },
})
