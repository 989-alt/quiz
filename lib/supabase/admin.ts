import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — initialized on first access so build-time imports don't throw
let _client: SupabaseClient | null = null

function getInstance(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing Supabase admin credentials')
    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _client
}

export const adminClient = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    return (getInstance() as unknown as Record<string, unknown>)[prop]
  },
})
