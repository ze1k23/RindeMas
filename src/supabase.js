import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://sjznppxupdihcjjvuimb.supabase.co"
const SUPABASE_KEY = "sb_publishable_si5avMtaAOeG2IyuFRsfFw_3Dxw7Opy"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})