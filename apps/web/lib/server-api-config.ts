import 'server-only'

export const getServerApiConfig = () => {
  const config = {
    baseUrl: process.env.JABSO_API_URL?.trim() || 'http://localhost:4000',
    dashboardToken: process.env.JABSO_DASHBOARD_TOKEN?.trim() || 'replace-with-a-long-random-token',
  }
  const missingProductionVariables = process.env.VERCEL === '1'
    ? [
        !process.env.JABSO_API_URL?.trim() && 'JABSO_API_URL',
        !process.env.JABSO_DASHBOARD_TOKEN?.trim() && 'JABSO_DASHBOARD_TOKEN',
      ].filter(Boolean)
    : []
  if (missingProductionVariables.length > 0) {
    throw new Error(`Jabso web configuration is missing: ${missingProductionVariables.join(', ')}`)
  }
  return { ...config, baseUrl: config.baseUrl.replace(/\/$/, '') }
}
