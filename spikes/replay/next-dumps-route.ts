import fs from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'

const DUMPS = path.join(process.cwd(), '.spike-dumps')

export async function GET(req: Request) {
  const file = new URL(req.url).searchParams.get('file')
  if (!file) {
    if (!fs.existsSync(DUMPS)) return Response.json({ events: [], envelopes: [] })
    const all = fs.readdirSync(DUMPS)
    return Response.json({
      events: all.filter((f) => f.endsWith('.events.json')).sort().reverse(),
      envelopes: all.filter((f) => f.endsWith('-envelope.json')).sort().reverse(),
    })
  }
  // basename only — no traversal out of the dump dir
  const p = path.join(DUMPS, path.basename(file))
  if (!fs.existsSync(p)) return new Response('not found', { status: 404 })
  return new Response(fs.readFileSync(p), { headers: { 'content-type': 'application/json' } })
}
