import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: { code: string }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()

    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('*')
      .eq('class_code', code)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: players, error: playersError } = await adminClient
      .from('players')
      .select('id, session_id, name, party, district, specialty, pledge_code, pledge_difficulty, score, rank, is_online, created_at')
      .eq('session_id', session.id)

    if (playersError) {
      console.error('Players fetch error:', playersError)
      return NextResponse.json({ error: playersError.message }, { status: 500 })
    }

    return NextResponse.json({ session, players: players ?? [] })
  } catch (err) {
    console.error('GET /api/sessions/[code] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
