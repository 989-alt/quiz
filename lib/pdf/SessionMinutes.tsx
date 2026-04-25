import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { Session, Player, Bill } from '@/lib/types'

// NanumGothic from Google Fonts CDN (TTF, Korean support)
Font.register({
  family: 'NanumGothic',
  src: 'https://fonts.gstatic.com/s/nanumgothic/v21/PN_3Rds_-9mt1EB_-H3Hy_BsBCBv.ttf',
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NanumGothic',
    backgroundColor: '#ffffff',
    padding: 48,
    fontSize: 10,
    color: '#1a1a1a',
  },
  coverPage: {
    fontFamily: 'NanumGothic',
    backgroundColor: '#0a1628',
    padding: 60,
    fontSize: 10,
    color: '#ffffff',
    justifyContent: 'center',
  },
  // Cover
  coverTitle: { fontSize: 28, fontWeight: 'bold', color: '#4ade80', marginBottom: 12 },
  coverSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 48 },
  coverMeta: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.8 },
  coverMetaLabel: { color: '#64748b', fontSize: 9 },
  // Section headers
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 16, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: '#4ade80', borderBottomStyle: 'solid' },
  pageHeader: { fontSize: 9, color: '#94a3b8', marginBottom: 24, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', borderBottomStyle: 'solid' },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: '6 8', borderRadius: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderBottomStyle: 'solid' },
  tableCell: { fontSize: 9 },
  // Result badges
  pass: { color: '#16a34a', fontWeight: 'bold' },
  fail: { color: '#dc2626', fontWeight: 'bold' },
  quorum: { color: '#ca8a04', fontWeight: 'bold' },
  noVote: { color: '#94a3b8' },
  // Rank list
  rankRow: { flexDirection: 'row', alignItems: 'center', padding: '7 8', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderBottomStyle: 'solid' },
  rankNum: { width: 28, fontSize: 13, fontWeight: 'bold', color: '#4ade80' },
  party: { width: 36, fontSize: 8, color: '#64748b' },
  playerName: { flex: 1, fontSize: 10, fontWeight: 'bold' },
  districtText: { width: 60, fontSize: 8, color: '#64748b' },
  scoreText: { width: 44, fontSize: 10, fontWeight: 'bold', color: '#4ade80', textAlign: 'right' },
  // Footer
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, fontSize: 8, color: '#94a3b8', flexDirection: 'row', justifyContent: 'space-between' },
})

const RESULT_LABEL: Record<string, string> = {
  PASS: '\uac00\uacb0',
  FAIL: '\ubd80\uacb0',
  INVALID_QUORUM: '\uc815\uc871\uc218\ubbf8\ub2ec',
}

const PARTY_LABEL: Record<string, string> = {
  '\uc5ec': '\uc5ec\ub2f9',
  '\uc57c': '\uc57c\ub2f9',
  '\ubb34': '\ubb34\uc18c\uc18d',
}

function resultStyle(result: string | null) {
  if (result === 'PASS') return styles.pass
  if (result === 'FAIL') return styles.fail
  if (result === 'INVALID_QUORUM') return styles.quorum
  return styles.noVote
}

interface Props {
  session: Session
  players: Player[]
  bills: Bill[]
  generatedAt: string
}

export function SessionMinutes({ session, players, bills, generatedAt }: Props) {
  const sortedPlayers = [...players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
  const dateStr = new Date(session.started_at ?? generatedAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <Document
      title={`\ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc \ud68c\uc758\ub85d ${session.class_code}`}
      author="\ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc"
    >
      {/* ── Page 1: Cover ─────────────────────── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={styles.coverTitle}>\ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc</Text>
          <Text style={styles.coverSubtitle}>\uc785\ubc95 \uc2dc\ubbac\ub808\uc774\uc158 \ud68c\uc758\ub85d</Text>
          <View style={{ height: 1, backgroundColor: '#1e3a5f', marginBottom: 32 }} />
          <Text style={styles.coverMeta}>
            <Text style={styles.coverMetaLabel}>\uc138\uc158 \ucf54\ub4dc{'\n'}</Text>
            {session.class_code}{'\n\n'}
            <Text style={styles.coverMetaLabel}>\uc9c4\ud589 \uc77c\uc790{'\n'}</Text>
            {dateStr}{'\n\n'}
            <Text style={styles.coverMetaLabel}>\ucc38\uc5ec \uc758\uc6d0{'\n'}</Text>
            {players.filter((p) => p.is_online).length}\uba85{'\n\n'}
            <Text style={styles.coverMetaLabel}>\uc2ec\uc758 \ubc95\uc548 \uc218{'\n'}</Text>
            {bills.length}\uac74
          </Text>
        </View>
        <Text style={{ fontSize: 8, color: '#374151', textAlign: 'center' }}>
          {generatedAt} \uc0dd\uc131
        </Text>
      </Page>

      {/* ── Page 2: Bill results ───────────────── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageHeader}>
          \ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc · {session.class_code} · \ubc95\uc548 \uc2ec\uc758 \uacb0\uacfc
        </Text>
        <Text style={styles.sectionTitle}>\ubc95\uc548 \uc2ec\uc758 \uacb0\uacfc</Text>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { width: 32 }]}>\ucf54\ub4dc</Text>
          <Text style={[styles.tableCell, { width: 36 }]}>\ubd84\uc57c</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>\uc81c\ubaa9</Text>
          <Text style={[styles.tableCell, { width: 52, textAlign: 'center' }]}>1\ucc28\ud45c\uacb0</Text>
          <Text style={[styles.tableCell, { width: 52, textAlign: 'center' }]}>\uc7ac\uc758\uacb0</Text>
          <Text style={[styles.tableCell, { width: 52, textAlign: 'center' }]}>\ucd5c\uc885</Text>
        </View>

        {bills.map((bill) => (
          <View key={bill.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: 32, color: '#64748b' }]}>{bill.bill_code}</Text>
            <Text style={[styles.tableCell, { width: 36, color: '#64748b' }]}>{bill.area}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{bill.title}</Text>
            <Text style={[styles.tableCell, { width: 52, textAlign: 'center' }, resultStyle(bill.stage4_result)]}>
              {bill.stage4_result ? RESULT_LABEL[bill.stage4_result] : '-'}
            </Text>
            <Text style={[styles.tableCell, { width: 52, textAlign: 'center' }, resultStyle(bill.stage5_result)]}>
              {bill.recall_used && bill.stage5_result ? RESULT_LABEL[bill.stage5_result] : '-'}
            </Text>
            <Text style={[styles.tableCell, { width: 52, textAlign: 'center' }, resultStyle(bill.final_result)]}>
              {bill.final_result ? RESULT_LABEL[bill.final_result] : '-'}
            </Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text>{session.class_code}</Text>
          <Text>2 / 3</Text>
        </View>
      </Page>

      {/* ── Page 3: Rankings ──────────────────── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageHeader}>
          \ubbfc\uc8fc\uacf5\ud654\uad6d 24\uc2dc · {session.class_code} · \ucd5c\uc885 \uc21c\uc704
        </Text>
        <Text style={styles.sectionTitle}>\ucd5c\uc885 \uc21c\uc704</Text>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, { width: 28 }]}>\uc21c\uc704</Text>
          <Text style={[styles.tableCell, { width: 36 }]}>\uc815\ub2f9</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>\uc774\ub984</Text>
          <Text style={[styles.tableCell, { width: 60 }]}>\uc9c0\uc5ed\uad6c</Text>
          <Text style={[styles.tableCell, { width: 44, textAlign: 'right' }]}>\uc810\uc218</Text>
        </View>

        {sortedPlayers.map((p, i) => (
          <View key={p.id} style={styles.rankRow}>
            <Text style={styles.rankNum}>{p.rank ?? i + 1}</Text>
            <Text style={styles.party}>{PARTY_LABEL[p.party ?? '\ubb34'] ?? p.party}</Text>
            <Text style={styles.playerName}>{p.name}</Text>
            <Text style={styles.districtText}>{p.district ?? ''}</Text>
            <Text style={styles.scoreText}>{p.score}\uc810</Text>
          </View>
        ))}

        <View style={[styles.footer]}>
          <Text>{session.class_code}</Text>
          <Text>3 / 3</Text>
        </View>
      </Page>
    </Document>
  )
}
