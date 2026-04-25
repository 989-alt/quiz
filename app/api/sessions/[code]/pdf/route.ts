export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { renderToStream, type DocumentProps } from '@react-pdf/renderer'
import { createElement, type JSXElementConstructor, type ReactElement } from 'react'
import { adminClient } from '@/lib/supabase/admin'
import { SessionMinutes } from '@/lib/pdf/SessionMinutes'
import type { Session, Player, Bill } from '@/lib/types'

interface RouteParams {
  params: { code: string }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()

    const { data: session } = await adminClient
      .from('sessions')
      .select('*')
      .eq('class_code', code)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const [{ data: players }, { data: bills }] = await Promise.all([
      adminClient
        .from('players')
        .select('id, session_id, name, party, district, specialty, pledge_code, pledge_difficulty, score, rank, is_online, joined_at')
        .eq('session_id', session.id)
        .order('rank', { ascending: true }),
      adminClient
        .from('bills')
        .select('id, session_id, bill_code, area, title, body, important, proposer_id, co_proposer_ids, proposer_party, stage4_result, stage5_result, final_result, recall_used, display_order, created_at')
        .eq('session_id', session.id)
        .order('display_order', { ascending: true }),
    ])

    const generatedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })

    const element = createElement(SessionMinutes, {
      session: session as Session,
      players: (players ?? []) as Player[],
      bills: (bills ?? []) as Bill[],
      generatedAt,
    }) as unknown as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>

    const stream = await renderToStream(element)

    const chunks: Buffer[] = []
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="minutes-${code}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error('GET /api/sessions/[code]/pdf error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
