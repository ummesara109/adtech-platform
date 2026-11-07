import { NavigationContainer } from '@react-navigation/native'
import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { colors } from '../constants/theme'
import { useAuth } from '../context/AuthContext'
import { AuthNavigator } from './AuthNavigator'
import { MainTabs } from './MainTabs'

export function RootNavigator() {
  const { user, bootstrapping, needsOnboarding } = useAuth()

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator color={colors.yellow} size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator initialRoute="Login" />
      ) : needsOnboarding ? (
        <AuthNavigator initialRoute="KycVerification" />
      ) : (
        <MainTabs />
      )}
    </NavigationContainer>
  )
}
