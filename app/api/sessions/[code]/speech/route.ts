import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: { code: string }
}

// GET: return active speech queue (pending/approved/speaking) with player names
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()

    const { data: session } = await adminClient
      .from('sessions')
      .select('id')
      .eq('class_code', code)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: queue, error } = await adminClient
      .from('speech_requests')
      .select('id, player_id, bill_id, status, created_at, players(name)')
      .eq('session_id', session.id)
      .in('status', ['pending', 'approved', 'speaking'])
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      queue: (queue ?? []).map((r) => ({
        id: r.id,
        player_id: r.player_id,
        bill_id: r.bill_id,
        status: r.status,
        created_at: r.created_at,
        playerName: (r.players as unknown as { name: string } | null)?.name ?? '',
      })),
    })
  } catch (err) {
    console.error('GET /api/sessions/[code]/speech error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: student requests to speak
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()
    const body = await req.json()
    const { deviceToken, billId } = body as { deviceToken: string; billId?: string }

    if (!deviceToken) {
      return NextResponse.json({ error: 'deviceToken required' }, { status: 400 })
    }

    const { data: player, error: playerError } = await adminClient
      .from('players')
      .select('id, session_id, name, is_online')
      .eq('device_token', deviceToken)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    if (!player.is_online) {
      return NextResponse.json({ error: 'Player not approved' }, { status: 403 })
    }

    const { data: session } = await adminClient
      .from('sessions')
      .select('id, status')
      .eq('class_code', code)
      .eq('id', player.session_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'stage3') {
      return NextResponse.json({ error: 'Not in debate stage' }, { status: 409 })
    }

    // Return existing active request if any
    const { data: existing } = await adminClient
      .from('speech_requests')
      .select('id, status')
      .eq('session_id', session.id)
      .eq('player_id', player.id)
      .in('status', ['pending', 'approved', 'speaking'])
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ speechRequestId: existing.id, status: existing.status })
    }

    const { data: speechReq, error: speechError } = await adminClient
      .from('speech_requests')
      .insert({
        session_id: session.id,
        player_id: player.id,
        bill_id: billId ?? null,
        status: 'pending',
      })
      .select('id, status')
      .single()

    if (speechError) {
      return NextResponse.json({ error: speechError.message }, { status: 500 })
    }

    await adminClient.channel(`session:${code}`).send({
      type: 'broadcast',
      event: 'SPEECH_REQUEST',
      payload: { playerId: player.id, playerName: player.name, speechRequestId: speechReq.id },
    })

    return NextResponse.json({ speechRequestId: speechReq.id, status: speechReq.status })
  } catch (err) {
    console.error('POST /api/sessions/[code]/speech error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: teacher updates speech request status
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()
    const body = await req.json()
    const { teacherId, speechRequestId, action } = body as {
      teacherId: string
      speechRequestId: string
      action: 'approve' | 'reject' | 'done'
    }

    if (!teacherId || !speechRequestId || !action) {
      return NextResponse.json(
        { error: 'teacherId, speechRequestId, action required' },
        { status: 400 }
      )
    }

    const { data: session } = await adminClient
      .from('sessions')
      .select('id, teacher_id')
      .eq('class_code', code)
      .single()

    if (!session || session.teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const STATUS_MAP: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      done: 'done',
    }
    const newStatus = STATUS_MAP[action]

    const { error: updateError } = await adminClient
      .from('speech_requests')
      .update({ status: newStatus })
      .eq('id', speechRequestId)
      .eq('session_id', session.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fetch updated queue and broadcast
    const { data: queue } = await adminClient
      .from('speech_requests')
      .select('id, player_id, bill_id, status, created_at, players(name)')
      .eq('session_id', session.id)
      .in('status', ['pending', 'approved', 'speaking'])
      .order('created_at', { ascending: true })

    const mapped = (queue ?? []).map((r) => ({
      id: r.id,
      player_id: r.player_id,
      bill_id: r.bill_id,
      status: r.status,
      created_at: r.created_at,
      playerName: (r.players as unknown as { name: string } | null)?.name ?? '',
    }))

    await adminClient.channel(`session:${code}`).send({
      type: 'broadcast',
      event: 'SPEECH_QUEUE_UPDATED',
      payload: { queue: mapped },
    })

    return NextResponse.json({ success: true, queue: mapped })
  } catch (err) {
    console.error('PATCH /api/sessions/[code]/speech error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
