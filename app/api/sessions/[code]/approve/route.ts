import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: { code: string }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()
    const body = await req.json()
    const { playerId, teacherId, action } = body as {
      playerId: string
      teacherId: string
      action: 'approve' | 'reject'
    }

    if (!playerId || !teacherId || !action) {
      return NextResponse.json({ error: 'playerId, teacherId, action are required' }, { status: 400 })
    }

    // Verify teacherId matches session
    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('id, teacher_id')
      .eq('class_code', code)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (action === 'approve') {
      const { error } = await adminClient
        .from('players')
        .update({ is_online: true })
        .eq('id', playerId)
        .eq('session_id', session.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await adminClient.channel(`session:${code}`).send({
        type: 'broadcast',
        event: 'PLAYER_APPROVE',
        payload: { playerId, approved: true },
      })

      return NextResponse.json({ success: true, action: 'approved' })
    } else {
      const { error } = await adminClient
        .from('players')
        .delete()
        .eq('id', playerId)
        .eq('session_id', session.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await adminClient.channel(`session:${code}`).send({
        type: 'broadcast',
        event: 'PLAYER_APPROVE',
        payload: { playerId, approved: false },
      })

      return NextResponse.json({ success: true, action: 'rejected' })
    }
  } catch (err) {
    console.error('POST /api/sessions/[code]/approve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
