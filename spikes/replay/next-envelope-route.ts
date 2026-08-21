import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'

const DUMPS = path.join(process.cwd(), '.spike-dumps')
const dec = new TextDecoder()

type Item = { header: any; payload: Uint8Array }

/** Sentry envelope: header line, then (item header line + payload) pairs. Byte-level — replay payloads are binary. */
function parseEnvelope(buf: Uint8Array) {
  let off = 0
  const nextLine = () => {
    const nl = buf.indexOf(0x0a, off)
    const end = nl === -1 ? buf.length : nl
    const line = buf.subarray(off, end)
    off = end + 1
    return line
  }
  const header = JSON.parse(dec.decode(nextLine()))
  const items: Item[] = []
  while (off < buf.length) {
    const hLine = nextLine()
    if (hLine.length === 0) continue
    const ih = JSON.parse(dec.decode(hLine))
    let payload: Uint8Array
    if (typeof ih.length === 'number') {
      payload = buf.subarray(off, off + ih.length)
      off += ih.length
      if (buf[off] === 0x0a) off++
    } else {
      const nl = buf.indexOf(0x0a, off)
      const end = nl === -1 ? buf.length : nl
      payload = buf.subarray(off, end)
      off = end + 1
    }
    items.push({ header: ih, payload })
  }
  return { header, items }
}

/** replay_recording payload = {segment headers}\n<compressed rrweb events>. Exact encoding is the thing we're testing, so try everything. */
function decodeRecording(payload: Uint8Array) {
  const nl = payload.indexOf(0x0a)
  let meta: any = null
  let body = payload
  try {
    if (nl !== -1) {
      meta = JSON.parse(dec.decode(payload.subarray(0, nl)))
      body = payload.subarray(nl + 1)
    }
  } catch {
    body = payload
  }
  const b = Buffer.from(body)
  const tries: [string, () => any][] = [
    ['plain', () => JSON.parse(b.toString('utf8'))],
    ['zlib', () => JSON.parse(zlib.inflateSync(b).toString('utf8'))],
    ['gzip', () => JSON.parse(zlib.gunzipSync(b).toString('utf8'))],
    ['deflateRaw', () => JSON.parse(zlib.inflateRawSync(b).toString('utf8'))],
    ['base64+zlib', () => JSON.parse(zlib.inflateSync(Buffer.from(b.toString('utf8'), 'base64')).toString('utf8'))],
  ]
  for (const [how, fn] of tries) {
    try {
      const events = fn()
      if (Array.isArray(events)) return { meta, how, events }
    } catch {}
  }
  return { meta, how: 'FAILED', events: null }
}

export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params
  let buf = Buffer.from(await req.arrayBuffer())
  const enc = req.headers.get('content-encoding')
  if (enc?.includes('gzip')) buf = zlib.gunzipSync(buf)
  else if (enc?.includes('deflate')) buf = zlib.inflateSync(buf)

  fs.mkdirSync(DUMPS, { recursive: true })
  const stamp = Date.now()
  const log: any = { projectId, stamp, encoding: enc, bytes: buf.length, items: [] }

  try {
    const { header, items } = parseEnvelope(buf)
    log.envelopeHeader = header

    for (const [i, item] of items.entries()) {
      const type = item.header.type ?? 'unknown'
      const row: any = { type, bytes: item.payload.length, header: item.header }

      if (type === 'replay_recording') {
        const { meta, how, events } = decodeRecording(item.payload)
        row.segment = meta
        row.decodedWith = how
        row.eventCount = events?.length ?? 0
        row.eventTypes = events ? [...new Set(events.map((e: any) => e.type))] : null
        if (events) {
          const f = `${stamp}-seg${meta?.segment_id ?? i}.events.json`
          fs.writeFileSync(path.join(DUMPS, f), JSON.stringify(events))
          row.file = f
        }
      } else {
        try {
          const json = JSON.parse(dec.decode(item.payload))
          row.json = json
          // relay would record this mapping itself — no dependency on the downstream store keeping it
          if (json.event_id) row.event_id = json.event_id
          if (json.replay_id) row.replay_id = json.replay_id
          if (json.contexts?.replay?.replay_id) row.replay_id = json.contexts.replay.replay_id
        } catch {
          row.raw = Buffer.from(item.payload).toString('base64').slice(0, 200)
        }
      }
      log.items.push(row)
    }
  } catch (e: any) {
    log.parseError = e?.message
    fs.writeFileSync(path.join(DUMPS, `${stamp}-RAW.bin`), buf)
  }

  fs.writeFileSync(path.join(DUMPS, `${stamp}-envelope.json`), JSON.stringify(log, null, 2))
  console.log('[relay]', log.items.map((r: any) => `${r.type}${r.decodedWith ? `(${r.decodedWith}, ${r.eventCount} ev)` : ''}`).join(' + ') || log.parseError)

  return Response.json({ id: String(stamp) })
}
