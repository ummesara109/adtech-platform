import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { colors } from '../constants/theme'
import { DevicePairingScreen } from '../screens/DevicePairingScreen'
import { DeviceStatusScreen } from '../screens/DeviceStatusScreen'
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen'
import { KycVerificationScreen } from '../screens/KycVerificationScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { VehicleRegistrationScreen } from '../screens/VehicleRegistrationScreen'
import type { AuthStackParamList } from './types'

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthNavigator({ initialRoute = 'Login' as keyof AuthStackParamList }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset password' }} />
      <Stack.Screen name="KycVerification" component={KycVerificationScreen} options={{ title: 'KYC' }} />
      <Stack.Screen name="VehicleRegistration" component={VehicleRegistrationScreen} options={{ title: 'Vehicle' }} />
      <Stack.Screen name="DevicePairing" component={DevicePairingScreen} options={{ title: 'Pair device' }} />
      <Stack.Screen name="DeviceStatus" component={DeviceStatusScreen} options={{ title: 'Device status' }} />
    </Stack.Navigator>
  )
}
