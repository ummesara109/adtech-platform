import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Screen } from '../components/Screen'
import { colors, spacing } from '../constants/theme'
import { useAuth } from '../context/AuthContext'
import type { AuthStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>

export function LoginScreen({ navigation }: Props) {
  const { login, loginDev } = useAuth()
  const [email, setEmail] = useState('driver@autoads.test')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  async function onLogin() {
    setError(undefined)
    if (!email.includes('@') || password.length < 6) {
      setError('Enter a valid email and password (6+ characters)')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
    } catch (e) {
      // Fallback for seeded accounts before password migration / when using email-only demo.
      try {
        await loginDev(email)
      } catch {
        setError(e instanceof Error ? e.message : 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen scroll={false} style={{ padding: 0 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>Auto Ad Partner</Text>
          <Text style={styles.sub}>Sign in to manage ads, earnings & device</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.h1}>Welcome back</Text>
          <Input
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={error}
          />
          <Button label="Login" onPress={onLogin} loading={loading} />
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>New driver? Register</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.linkMuted}>Forgot password</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  brand: { color: colors.white, fontSize: 26, fontWeight: '800' },
  sub: { color: '#C7D7FF', marginTop: spacing.xs, fontSize: 13 },
  body: {
    flex: 1,
    backgroundColor: colors.white,
    marginTop: -16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
  },
  h1: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.md, fontWeight: '700' },
  linkMuted: { color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
})
