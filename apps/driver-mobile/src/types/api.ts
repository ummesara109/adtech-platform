export type AuthUser = {
  id: string
  email: string
  fullName: string
  driverId: string
  kycStatus: string
  accountStatus: string
}

export type DeviceConnectivityStatus = 'Unassigned' | 'Online' | 'Offline'

export type DriverHomeAlert = {
  id: string
  type: 'device_disconnected' | 'device_sync_delayed' | 'vehicle_verification' | 'payment_credited'
  title: string
  body: string
  createdAt: string
}

export type DriverDashboard = {
  driverName: string | null
  serverDate: string
  timeZone: string
  reportingDate: string
  reportingMonthLabel: string
  currency: string

  hasVehicle: boolean
  vehicleRegistration: string | null
  vehicleStatus: string | null
  vehicleVerificationStatus: string | null

  hasDeviceAssignment: boolean
  deviceId: string | null
  deviceSerialNumber: string | null
  deviceOnline: string | null
  deviceConnectivityStatus: DeviceConnectivityStatus
  deviceSyncHealthy: boolean
  deviceSyncDelayed: boolean
  devicePairingStatus: string
  deviceConnectivityLabel: string | null
  deviceLastSeenAt: string | null
  deviceLastSuccessfulSyncAt: string | null
  deviceSignalStrength: number | null

  hasPlaybackRecords: boolean
  todayCompletedCount: number | null
  todayInterruptedCount: number | null
  todayValidatedCount: number | null
  todayValidDurationSec: number | null
  todayRunningHours: number | null
  todayValidPlaybackCount: number | null

  hasEarningsRecord: boolean
  monthlyGrossInr: number | null
  monthlyCommissionInr: number | null
  monthlyDeductionsInr: number | null
  deductionsAvailable: boolean
  monthlyIncentiveTotalInr: number | null
  monthlyEarningsInr: number | null
  incentives: { id: string; title: string; amountInr: number; status: string }[]

  alerts: DriverHomeAlert[]
  notificationCount: number
}

export type DriverProfile = {
  id: string
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  licenseNumber: string
  kycStatus: string
  accountStatus: string
  emergencyContact?: string
}

export type VehicleInfo = {
  id: string
  registrationNumber: string
  makeModel: string
  vehicleType?: string
  rcStorageKey?: string
  year: number | null
  color: string
  status: string
}

export type DeviceAssignment = {
  pairingStatus: string
  pairingCode: string
  device: {
    serialNumber: string
    onlineStatus: string
    lastSeenAt: string | null
    connectivity: string
    signalStrength: number | null
    firmwareVersion: string
  }
  vehicleRegistration: string
}

export type PlaybackItem = {
  id: string
  eventType: string
  validDurationSec: number
  startedAt: string | null
  endedAt: string | null
  createdAt: string
}

export type EarningItem = {
  id: string
  periodYear: number
  periodMonth: number
  grossAmountInr: number
  commissionInr: number
  netAmountInr: number
}

export type IncentiveItem = {
  id: string
  title: string
  amountInr: number
  status: string
  earnedAt: string | null
}

export type PayoutItem = {
  id: string
  amountInr: number
  status: string
  reference: string
  paidOn: string | null
  createdAt: string
}

export type KycStatus = {
  kycStatus: string
  documents: { id: string; label: string; status: string; uploaded: boolean }[]
}
