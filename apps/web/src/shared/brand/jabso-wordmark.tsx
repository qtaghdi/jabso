type JabsoWordmarkProps = {
  className?: string
}

export const JabsoWordmark = ({ className }: JabsoWordmarkProps) => (
  <span className={['jabso-wordmark', className].filter(Boolean).join(' ')}>
    <svg className="jabso-mark" aria-hidden="true" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" />
      <path d="M19.5 7.5v11.3c0 4-2.1 6.2-6 6.2-2.2 0-4-.7-5.2-2l2.1-2.6c.8.8 1.7 1.2 2.8 1.2 1.7 0 2.6-1 2.6-3.1v-11h3.7Z" />
    </svg>
    <span className="wordmark-text">Jabso</span>
  </span>
)
