function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const SUPABASE_URL = required('NEXT_PUBLIC_SUPABASE_URL')
export const SUPABASE_ANON_KEY = required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
