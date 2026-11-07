import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { config } from '../constants/config'

const key = config.tokenStorageKey

/** SecureStore is native-only; web uses localStorage for laptop preview. */
export async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  }
  return SecureStore.getItemAsync(key)
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return
    if (!token) localStorage.removeItem(key)
    else localStorage.setItem(key, token)
    return
  }
  if (!token) {
    await SecureStore.deleteItemAsync(key)
    return
  }
  await SecureStore.setItemAsync(key, token)
}
