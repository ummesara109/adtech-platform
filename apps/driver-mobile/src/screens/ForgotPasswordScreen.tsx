import React, { useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { config } from '../constants/config'
import type { AuthStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('')

  function onReset() {
    if (!email.includes('@')) {
      Alert.alert('Invalid email', 'Enter the email linked to your driver account.')
      return
    }
    if (config.supabaseUrl && config.supabaseAnonKey) {
      Alert.alert(
        'Reset link',
        'Use Supabase password reset from your configured project for this email.',
      )
    } else {
      Alert.alert(
        'Dev mode',
        'Password reset is handled by Supabase Auth in production. Contact platform support locally.',
      )
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.h1}>Forgot password</Text>
      <Text style={styles.sub}>We will send a secure reset link via Supabase Auth.</Text>
      <Input label="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Button label="Send reset link" onPress={onReset} />
      <Button label="Back to login" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '800', color: colors.navy, marginBottom: spacing.xs },
  sub: { color: colors.muted, marginBottom: spacing.lg, lineHeight: 22 },
})
