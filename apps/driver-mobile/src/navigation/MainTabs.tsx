import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { colors } from '../constants/theme'
import { AdActivityScreen } from '../screens/AdActivityScreen'
import { DeviceStatusScreen } from '../screens/DeviceStatusScreen'
import { EarningsScreen } from '../screens/EarningsScreen'
import { HomeDashboardScreen } from '../screens/HomeDashboardScreen'
import { IncentivesScreen } from '../screens/IncentivesScreen'
import { MyVehicleScreen } from '../screens/MyVehicleScreen'
import { PaymentHistoryScreen } from '../screens/PaymentHistoryScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { RunningHoursScreen } from '../screens/RunningHoursScreen'
import { SupportScreen } from '../screens/SupportScreen'
import type {
  ActivityStackParamList,
  EarningsStackParamList,
  HomeStackParamList,
  MainTabParamList,
} from './types'

const Tab = createBottomTabNavigator<MainTabParamList>()
const HomeStack = createNativeStackNavigator<HomeStackParamList>()
const ActivityStack = createNativeStackNavigator<ActivityStackParamList>()
const EarningsStack = createNativeStackNavigator<EarningsStackParamList>()

function HomeNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <HomeStack.Screen name="HomeDashboard" component={HomeDashboardScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="MyVehicle" component={MyVehicleScreen} options={{ title: 'My Vehicle' }} />
      <HomeStack.Screen name="DeviceStatus" component={DeviceStatusScreen} options={{ title: 'Device' }} />
      <HomeStack.Screen name="RunningHours" component={RunningHoursScreen} options={{ title: 'Running hours' }} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </HomeStack.Navigator>
  )
}

function ActivityNavigator() {
  return (
    <ActivityStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
      }}
    >
      <ActivityStack.Screen name="ActivityHome" component={AdActivityScreen} options={{ title: 'Activity' }} />
    </ActivityStack.Navigator>
  )
}

function EarningsNavigator() {
  return (
    <EarningsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
      }}
    >
      <EarningsStack.Screen name="EarningsHome" component={EarningsScreen} options={{ title: 'Earnings' }} />
      <EarningsStack.Screen name="Incentives" component={IncentivesScreen} options={{ title: 'Incentives' }} />
    </EarningsStack.Navigator>
  )
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name === 'Payments' || route.name === 'Support',
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityNavigator}
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <Ionicons name="play-circle" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsNavigator}
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Payments"
        component={PaymentHistoryScreen}
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          title: 'Support',
          tabBarIcon: ({ color, size }) => <Ionicons name="headset" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}
