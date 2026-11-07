import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAuth } from '../context/AuthContext'
import type { AuthStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  async function onSubmit() {
    setError(undefined)
    if (fullName.trim().length < 2 || !email.includes('@')) {
      setError('Enter your full name and a valid email')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters (used locally; production uses Supabase Auth)')
      return
    }
    setLoading(true)
    try {
      // AuthProvider sets needsOnboarding; RootNavigator mounts KYC stack.
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone,
        password,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen scroll={false} style={{ padding: 0 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.brand}>Auto Ad Partner</Text>
          <Text style={styles.sub}>Driver registration</Text>
        </View>
        <View style={styles.body}>
          <Input label="Full name" value={fullName} onChangeText={setFullName} />
          <Input label="Mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Input label="Email address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <Input
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={error}
          />
          <Button label="Register" onPress={onSubmit} loading={loading} />
          <Button label="Already have an account? Login" variant="ghost" onPress={() => navigation.navigate('Login')} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  brand: { color: colors.white, fontSize: 24, fontWeight: '800' },
  sub: { color: '#C7D7FF', marginTop: 4 },
  body: {
    flex: 1,
    backgroundColor: colors.white,
    marginTop: -12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
  },
})
