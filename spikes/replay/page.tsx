'use client'

import { useEffect, useRef, useState } from 'react'
import * as Sentry from '@sentry/browser'
import 'rrweb-player/dist/style.css'

// ponytail: masking off so the spike can see real DOM. Production MUST flip these on — replay records the whole DOM.
const REPLAY_OPTS = { maskAllText: false, maskAllInputs: false, blockAllMedia: false }

export default function Page() {
  const [log, setLog] = useState<string[]>([])
  const [files, setFiles] = useState<string[]>([])
  const playerRef = useRef<HTMLDivElement>(null)
  const say = (s: string) => setLog((l) => [`${new Date().toISOString().slice(11, 19)} ${s}`, ...l])

  useEffect(() => {
    Sentry.init({
      dsn: 'http://spike@localhost:3999/1',
      integrations: [Sentry.replayIntegration(REPLAY_OPTS)],
      replaysSessionSampleRate: 1.0,
      replaysOnErrorSampleRate: 1.0,
    })
    say('sentry init, DSN -> localhost:3999/api/1/envelope/')
  }, [])

  const refresh = async () => {
    const r = await (await fetch('/api/dumps')).json()
    setFiles(r.events)
    say(`dumps: ${r.events.length} recording segment(s), ${r.envelopes.length} envelope(s)`)
  }

  const flush = async () => {
    const replay = Sentry.getClient()?.getIntegrationByName?.('Replay') as any
    if (!replay) return say('no Replay integration found')
    await replay.flush()
    say('flushed')
    setTimeout(refresh, 500)
  }

  const boom = () => {
    Sentry.captureException(new Error('spike: deliberate error ' + Math.floor(performance.now())))
    say('captureException sent')
    setTimeout(flush, 300)
  }

  const play = async () => {
    if (!playerRef.current) return
    const list = [...files].sort()
    if (!list.length) return say('no segments yet — click around, then Flush')
    const chunks = await Promise.all(
      list.map(async (f) => (await fetch(`/api/dumps?file=${encodeURIComponent(f)}`)).json()),
    )
    const events = chunks.flat().sort((a: any, b: any) => a.timestamp - b.timestamp)
    say(`loaded ${events.length} rrweb events from ${list.length} segment(s); types=${[...new Set(events.map((e: any) => e.type))].join(',')}`)
    if (events.length < 2) return say('need >= 2 events to replay')

    playerRef.current.innerHTML = ''
    try {
      const mod: any = await import('rrweb-player')
      const Player = mod.default ?? mod
      new Player({ target: playerRef.current, props: { events, width: 900, height: 500, autoPlay: true } })
      say('PLAYER OK — rrweb-player accepted Sentry SDK recording')
    } catch (e: any) {
      say(`PLAYER FAILED: ${e?.message}`)
    }
  }

  return (
    <div>
      <h2>Jabso replay spike</h2>
      <p style={{ color: '#666' }}>
        1) 아래 입력창/버튼 만지기 → 2) Boom → 3) Refresh → 4) Play
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={boom}>Boom (captureException)</button>
        <button onClick={flush}>Flush replay</button>
        <button onClick={refresh}>Refresh dumps</button>
        <button onClick={play}>Play</button>
      </div>
      <div style={{ marginBottom: 12, padding: 12, border: '1px solid #ccc' }}>
        <input placeholder="여기 타이핑해서 DOM 변화 만들기" style={{ width: 320, padding: 6 }} />
        <button onClick={(e) => ((e.target as HTMLButtonElement).textContent = 'clicked!')} style={{ marginLeft: 8 }}>
          click me
        </button>
      </div>
      <div ref={playerRef} style={{ minHeight: 40, marginBottom: 12 }} />
      <pre style={{ background: '#f4f4f4', padding: 12, maxHeight: 240, overflow: 'auto' }}>{log.join('\n')}</pre>
    </div>
  )
}
