import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Trim any hidden spaces or line breaks
const supabaseUrl = rawUrl ? rawUrl.trim() : ''
const supabaseAnonKey = rawKey ? rawKey.trim() : ''

// DEBUG: This will print the exact URL Vite is seeing in your browser console
console.log('DEBUG: Supabase URL loaded ->', supabaseUrl)

if (!supabaseUrl.startsWith('http')) {
  console.error('FATAL: The URL is invalid or empty. Check your .env file!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
