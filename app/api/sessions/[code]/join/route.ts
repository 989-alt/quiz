import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: { code: string }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()
    const body = await req.json()
    const { name, deviceToken } = body as { name: string; deviceToken: string }

    if (!name || !deviceToken) {
      return NextResponse.json({ error: 'name and deviceToken are required' }, { status: 400 })
    }

    // Get session
    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('id, status')
      .eq('class_code', code)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'waiting') {
      return NextResponse.json({ error: 'Session is not accepting players' }, { status: 409 })
    }

    // Check name uniqueness within session
    const { data: existingPlayer } = await adminClient
      .from('players')
      .select('id')
      .eq('session_id', session.id)
      .eq('name', name)
      .single()

    if (existingPlayer) {
      return NextResponse.json({ error: 'Name already taken in this session' }, { status: 409 })
    }

    // Check player count
    const { count } = await adminClient
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id)

    if ((count ?? 0) >= 10) {
      return NextResponse.json({ error: 'Session is full (max 10 players)' }, { status: 409 })
    }

    // Insert player (pending = is_online: false)
    const { data: player, error: insertError } = await adminClient
      .from('players')
      .insert({
        session_id: session.id,
        name,
        device_token: deviceToken,
        party: '',
        district: '',
        specialty: '',
        pledge_code: '',
        pledge_difficulty: 1,
        score: 0,
        rank: 0,
        is_online: false,
      })
      .select('id')
      .single()

    if (insertError || !player) {
      console.error('Player insert error:', insertError)
      return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 })
    }

    // Broadcast new join request to teacher
    await adminClient.channel(`session:${code}`).send({
      type: 'broadcast',
      event: 'PLAYER_JOIN',
      payload: { playerId: player.id, name },
    })

    return NextResponse.json({ status: 'pending', playerId: player.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/sessions/[code]/join error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
