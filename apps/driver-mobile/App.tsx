import { StatusBar } from 'expo-status-bar'
import React, { useState } from 'react'
import { AuthProvider } from './src/context/AuthContext'
import { RootNavigator } from './src/navigation/RootNavigator'
import { SplashScreen } from './src/screens/SplashScreen'

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  )
}
