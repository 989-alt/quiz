import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: { code: string }
}

// POST: teacher marks a failed bill for stage5 recall vote
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()
    const body = await req.json()
    const { billId, teacherId } = body as { billId: string; teacherId: string }

    if (!billId || !teacherId) {
      return NextResponse.json({ error: 'billId and teacherId are required' }, { status: 400 })
    }

    const { data: session } = await adminClient
      .from('sessions')
      .select('id, teacher_id, status')
      .eq('class_code', code)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (session.status !== 'stage4') {
      return NextResponse.json(
        { error: 'Recall only allowed during stage4' },
        { status: 409 }
      )
    }

    const { data: bill } = await adminClient
      .from('bills')
      .select('id, stage4_result, recall_used')
      .eq('id', billId)
      .eq('session_id', session.id)
      .single()

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    if (bill.stage4_result !== 'FAIL') {
      return NextResponse.json(
        { error: 'Only failed bills can be recalled' },
        { status: 409 }
      )
    }

    // Idempotent — already marked, just return success
    if (bill.recall_used) {
      return NextResponse.json({ success: true, recall_used: true })
    }

    const { error: updateError } = await adminClient
      .from('bills')
      .update({ recall_used: true })
      .eq('id', billId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await adminClient.channel(`session:${code}`).send({
      type: 'broadcast',
      event: 'BILLS_UPDATED',
      payload: { billId, recall_used: true },
    })

    return NextResponse.json({ success: true, recall_used: true })
  } catch (err) {
    console.error('POST /api/sessions/[code]/recall error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
