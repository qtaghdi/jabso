export const metadata = { title: 'Jabso — error logging spike' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'ui-monospace, monospace', margin: 0, padding: 24 }}>{children}</body>
    </html>
  )
}
