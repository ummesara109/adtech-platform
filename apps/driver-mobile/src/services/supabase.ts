import { createClient } from '@supabase/supabase-js'
import { config } from '../constants/config'

/** Supabase client (anon key only). Used for production sign-up / sign-in / password reset. */
export const supabase =
  config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null
