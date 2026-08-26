const escapeAttribute = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

const toDashboardUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

type ServerStatusPageOptions = {
  dashboardOrigin: string
  databaseReady: boolean
}

export const renderServerStatusPage = ({ dashboardOrigin, databaseReady }: ServerStatusPageOptions) => {
  const dashboardUrl = toDashboardUrl(dashboardOrigin)
  const statusLabel = databaseReady ? 'Operational' : 'Degraded'
  const statusClassName = databaseReady ? 'status' : 'status status-degraded'
  const dashboardLink = dashboardUrl
    ? `<a class="primary-link" href="${escapeAttribute(dashboardUrl)}">Open dashboard <span aria-hidden="true">↗</span></a>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>Jabso Collector</title>
    <style>
      :root { color: #17191c; background: #f5f6f7; font-family: Arial, Helvetica, sans-serif; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; }
      main { width: min(100%, 520px); }
      .brand { display: flex; align-items: center; gap: 10px; margin: 0 0 18px; font-size: 17px; font-weight: 750; letter-spacing: -0.03em; }
      .mark { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; color: white; background: #17191c; font-size: 15px; }
      .card { padding: 36px; border: 1px solid #dfe2e6; border-radius: 18px; background: white; box-shadow: 0 18px 50px rgba(21, 25, 30, 0.07); }
      .status { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 22px; color: #237447; font-size: 13px; font-weight: 700; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #2da866; box-shadow: 0 0 0 4px #e7f5ed; }
      .status-degraded { color: #a04b18; }
      .status-degraded .dot { background: #d66a2c; box-shadow: 0 0 0 4px #faecdf; }
      h1 { margin: 0; font-size: clamp(30px, 7vw, 42px); line-height: 1; letter-spacing: -0.055em; }
      p { margin: 16px 0 24px; color: #66707c; font-size: 15px; line-height: 1.6; }
      .checks { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 28px; }
      .check { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 10px; background: #f6f7f8; color: #555e68; font-size: 13px; }
      .check strong { color: #23272c; font-size: 12px; }
      .check .unavailable { color: #a04b18; }
      .actions { display: flex; flex-wrap: wrap; gap: 10px; }
      a { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; padding: 0 16px; border-radius: 10px; color: #343a42; border: 1px solid #d7dbe0; font-size: 14px; font-weight: 700; text-decoration: none; }
      a:hover { border-color: #9ea5ae; background: #f7f8f9; }
      a:focus-visible { outline: 3px solid #9ec5fe; outline-offset: 2px; }
      .primary-link { gap: 6px; color: white; border-color: #17191c; background: #17191c; }
      .primary-link:hover { border-color: #292d32; background: #292d32; }
      footer { margin-top: 18px; color: #9198a1; font-size: 12px; text-align: center; }
      @media (max-width: 480px) { .card { padding: 28px 24px; } .checks { grid-template-columns: 1fr; } .actions a { width: 100%; } }
    </style>
  </head>
  <body>
    <main>
      <div class="brand"><span class="mark" aria-hidden="true">J</span> Jabso</div>
      <section class="card" aria-labelledby="collector-title">
        <div class="${statusClassName}"><span class="dot" aria-hidden="true"></span> ${statusLabel}</div>
        <h1 id="collector-title">Collector is running.</h1>
        <p>${databaseReady
          ? 'Jabso is ready to receive and store Sentry-compatible error events.'
          : 'The collector is online, but its database is currently unavailable.'}</p>
        <div class="checks" aria-label="Service checks">
          <div class="check"><span>Collector</span><strong>Online</strong></div>
          <div class="check"><span>Database</span><strong class="${databaseReady ? '' : 'unavailable'}">${databaseReady ? 'Ready' : 'Unavailable'}</strong></div>
        </div>
        <nav class="actions" aria-label="Server links">
          ${dashboardLink}
          <a href="/health">Health</a>
          <a href="/ready">Readiness</a>
        </nav>
      </section>
      <footer>Jabso error collector</footer>
    </main>
  </body>
</html>`
}
