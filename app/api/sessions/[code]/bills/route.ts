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
      .select('id')
      .eq('class_code', code)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: bills, error } = await adminClient
      .from('bills')
      .select(
        'id, session_id, bill_code, area, title, body, important, proposer_id, co_proposer_ids, proposer_party, stage4_result, stage5_result, final_result, recall_used, display_order, created_at'
      )
      .eq('session_id', session.id)
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bills: bills ?? [] })
  } catch (err) {
    console.error('GET /api/sessions/[code]/bills error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
