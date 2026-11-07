import type { NavigatorScreenParams } from '@react-navigation/native'

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
  KycVerification: undefined
  VehicleRegistration: undefined
  DevicePairing: undefined
  DeviceStatus: undefined
}

export type HomeStackParamList = {
  HomeDashboard: undefined
  MyVehicle: undefined
  DeviceStatus: undefined
  RunningHours: undefined
  Profile: undefined
}

export type ActivityStackParamList = {
  ActivityHome: undefined
  PlaybackDetail: undefined
}

export type EarningsStackParamList = {
  EarningsHome: undefined
  Incentives: undefined
}

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined
  Activity: NavigatorScreenParams<ActivityStackParamList> | undefined
  Earnings: NavigatorScreenParams<EarningsStackParamList> | undefined
  Payments: undefined
  Support: undefined
}
