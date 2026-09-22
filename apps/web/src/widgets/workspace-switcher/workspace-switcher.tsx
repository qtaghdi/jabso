'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { authClient } from 'src/shared/auth/auth-client'
import { useI18n } from 'src/shared/i18n/i18n-provider'
import { WorkspaceCreateDialog } from 'src/widgets/workspace-switcher/workspace-create-dialog'

type WorkspaceSwitcherProps = {
  activeWorkspaceName: string
  collapsed: boolean
  personalName: string
  personalWorkspaceName: string | null
}

type WorkspaceMenuStyle = Pick<CSSProperties, 'bottom' | 'left' | 'maxHeight' | 'top' | 'width'>

const ChevronIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
)

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3.5 8.5 2.8 2.8 6.2-6.2" /></svg>
)

const PlusIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" /></svg>
)

const SettingsIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="2.5" />
    <path d="m13 9 .8.7-1 1.8-1-.4a5.8 5.8 0 0 1-1.5.9l-.2 1.1H8l-.2-1.1a5.8 5.8 0 0 1-1.5-.9l-1 .4-1-1.8L5 9.9a5.7 5.7 0 0 1 0-1.8l-.8-.7 1-1.8 1 .4a5.8 5.8 0 0 1 1.5-.9L8 4h2.1l.2 1.1a5.8 5.8 0 0 1 1.5.9l1-.4 1 1.8-.8.7A5.7 5.7 0 0 1 13 9Z" />
  </svg>
)

const workspaceInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.slice(0, 1).toUpperCase())
  .join('') || 'J'

export const WorkspaceSwitcher = ({
  activeWorkspaceName,
  collapsed,
  personalName,
  personalWorkspaceName,
}: WorkspaceSwitcherProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const { data: organization, isPending: isOrganizationPending } = authClient.useActiveOrganization()
  const { data: organizations, isPending: areOrganizationsPending } = authClient.useListOrganizations()
  const orgId = session?.session.activeOrganizationId ?? null
  const orgRole = organization?.id === orgId
    ? organization.members.find((member) => member.userId === session?.user.id)?.role ?? null
    : null
  const isLoaded = !isSessionPending && !isOrganizationPending && !areOrganizationsPending
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuStyle, setMenuStyle] = useState<WorkspaceMenuStyle | null>(null)
  const memberships = organizations ?? []
  const personalDisplayName = personalWorkspaceName ?? personalName
  const activeName = activeWorkspaceName
  const activeDescription = orgId ? t('workspace.sharedDescription') : t('workspace.personalDescription')

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.min(288, window.innerWidth - 24)
    const preferredLeft = rect.right + 10
    const left = preferredLeft + width <= window.innerWidth - 12
      ? preferredLeft
      : Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
    const availableAbove = rect.top - 12
    const availableBelow = window.innerHeight - rect.bottom - 12
    const openAbove = availableAbove >= 260 || availableAbove > availableBelow
    const maxHeight = Math.max(180, Math.min(420, openAbove ? availableAbove : availableBelow))
    setMenuStyle(openAbove
      ? { bottom: window.innerHeight - rect.top + 8, left, maxHeight, width }
      : { left, maxHeight, top: rect.bottom + 8, width })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    positionMenu()
    const menu = menuRef.current
    if (menu && typeof menu.showPopover === 'function' && !menu.matches(':popover-open')) menu.showPopover()
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      if (menu && typeof menu.hidePopover === 'function' && menu.matches(':popover-open')) menu.hidePopover()
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [isOpen, positionMenu])

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [isOpen])

  const menuButtons = useCallback(() => Array.from(
    menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"], [role="menuitem"]') ?? [],
  ).filter((button) => !button.disabled), [])

  const openMenu = () => {
    setError(null)
    setIsOpen(true)
    window.requestAnimationFrame(() => menuButtons()[0]?.focus())
  }

  const closeMenu = () => {
    setIsOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = menuButtons()
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
      return
    }
    if (event.key === 'Tab') {
      setIsOpen(false)
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || buttons.length === 0) return
    event.preventDefault()
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
    buttons[nextIndex]?.focus()
  }

  const switchWorkspace = async (organizationId: string | null) => {
    if (switchingTo) return
    const target = organizationId ?? 'personal'
    if ((orgId ?? 'personal') === target) {
      closeMenu()
      return
    }
    setError(null)
    setSwitchingTo(target)
    setIsOpen(false)
    try {
      const result = await authClient.organization.setActive({ organizationId })
      if (result.error) throw new Error(result.error.message)
      router.replace('/')
      router.refresh()
    } catch {
      setError(t('workspace.switchError'))
      setIsOpen(true)
    } finally {
      setSwitchingTo(null)
    }
  }

  const membershipRows = memberships.map((membership) => ({
    id: membership.id,
    initials: workspaceInitials(membership.name),
    name: membership.name,
    role: membership.id === orgId && (orgRole === 'owner' || orgRole === 'admin') ? t('common.admin') : t('common.member'),
  }))

  return (
    <>
      <div className="min-w-0" ref={rootRef}>
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={`grid min-h-[50px] w-full cursor-pointer grid-cols-[30px_minmax(0,1fr)_16px] items-center gap-[9px] rounded-xl border border-line bg-white px-[9px] py-[7px] text-left text-ink transition-[background-color,border-color,box-shadow] duration-150 hover:border-line-strong hover:bg-subtle focus-visible:border-focus focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/15 disabled:cursor-default disabled:opacity-55 max-[900px]:min-h-[38px] max-[900px]:w-[38px] max-[900px]:grid-cols-[28px] max-[900px]:p-1 max-[900px]:[&>svg]:hidden ${collapsed ? 'min-h-[38px] w-[38px] grid-cols-[28px] p-1 [&>svg]:hidden' : ''} [&>svg]:size-4 [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[1.5] [&>svg]:transition-transform aria-expanded:[&>svg]:rotate-180`}
          disabled={!isLoaded}
          onClick={() => isOpen ? closeMenu() : openMenu()}
          ref={triggerRef}
          title={activeName}
          type="button"
        >
          <span className={`grid size-[30px] shrink-0 place-items-center rounded-lg bg-[#17191d] text-[10px] font-bold tracking-[-0.02em] text-white max-[900px]:size-7 ${collapsed ? 'size-7' : ''}`} aria-hidden="true">{workspaceInitials(activeName)}</span>
          <span className={`min-w-0 gap-px ${collapsed ? 'hidden' : 'grid'} max-[900px]:hidden`}><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold">{activeName}</strong><small className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted">{activeDescription}</small></span>
          <ChevronIcon />
        </button>
      </div>
      {isOpen ? createPortal(
        <div
          aria-label={t('workspace.switch')}
          className="fixed z-[1100] m-0 flex flex-col overflow-hidden rounded-2xl border border-line bg-white p-0 text-ink shadow-raised"
          onKeyDown={handleMenuKeyDown}
          popover="manual"
          ref={menuRef}
          role="menu"
          style={{ ...menuStyle, visibility: menuStyle ? 'visible' : 'hidden' }}
        >
          <header className="flex min-h-11 items-center justify-between border-b border-line px-3.5"><strong className="text-xs">{t('workspace.title')}</strong><span className="text-[10px] text-muted">{membershipRows.length + 1}</span></header>
          <div className="min-h-0 max-h-[280px] overflow-y-auto overscroll-contain p-1.5 [&>button]:grid [&>button]:min-h-12 [&>button]:w-full [&>button]:cursor-pointer [&>button]:grid-cols-[30px_minmax(0,1fr)_16px] [&>button]:items-center [&>button]:gap-2.5 [&>button]:rounded-lg [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-2 [&>button]:py-[7px] [&>button]:text-left [&>button]:text-[#3f4650] [&>button:hover]:bg-subtle-strong [&>button:hover]:text-ink [&>button:focus-visible]:bg-subtle-strong [&>button:focus-visible]:text-ink [&>button:focus-visible]:outline-none [&>button:disabled]:cursor-default [&>button:disabled]:opacity-50 [&>button>svg]:size-4 [&>button>svg]:fill-none [&>button>svg]:stroke-[#17191d] [&>button>svg]:stroke-[1.8] [&>button>span:nth-child(2)]:grid [&>button>span:nth-child(2)]:min-w-0 [&>button>span:nth-child(2)]:gap-px [&_button_small]:overflow-hidden [&_button_small]:text-ellipsis [&_button_small]:whitespace-nowrap [&_button_small]:text-[10px] [&_button_small]:text-muted [&_button_strong]:overflow-hidden [&_button_strong]:text-ellipsis [&_button_strong]:whitespace-nowrap [&_button_strong]:text-xs [&_button_strong]:font-semibold">
            <button
              aria-checked={!orgId}
              disabled={Boolean(switchingTo)}
              onClick={() => switchWorkspace(null)}
              role="menuitemradio"
              type="button"
            >
              <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-[#edf0f3] text-[10px] font-bold tracking-[-0.02em] text-[#303640]" aria-hidden="true">{workspaceInitials(personalDisplayName)}</span>
              <span><strong>{t('common.personal')}</strong><small>{personalDisplayName}</small></span>
              {!orgId ? <CheckIcon /> : null}
            </button>
            {membershipRows.map((workspace) => (
              <button
                aria-checked={orgId === workspace.id}
                disabled={Boolean(switchingTo)}
                key={workspace.id}
                onClick={() => switchWorkspace(workspace.id)}
                role="menuitemradio"
                type="button"
              >
                <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-[#17191d] text-[10px] font-bold tracking-[-0.02em] text-white" aria-hidden="true">{workspace.initials}</span>
                <span><strong>{workspace.name}</strong><small>{workspace.role}</small></span>
                {orgId === workspace.id ? <CheckIcon /> : null}
              </button>
            ))}
          </div>
          {error ? <p className="m-0 border-t border-line px-3.5 py-2 text-[11px] text-danger" role="alert">{error}</p> : null}
          <footer className="grid gap-0.5 border-t border-line p-1.5 [&_:is(button,a)]:flex [&_:is(button,a)]:min-h-10 [&_:is(button,a)]:w-full [&_:is(button,a)]:cursor-pointer [&_:is(button,a)]:items-center [&_:is(button,a)]:gap-[9px] [&_:is(button,a)]:rounded-lg [&_:is(button,a)]:border-0 [&_:is(button,a)]:bg-transparent [&_:is(button,a)]:px-2.5 [&_:is(button,a)]:text-[11px] [&_:is(button,a)]:font-semibold [&_:is(button,a)]:text-[#3f4650] [&_:is(button,a)]:no-underline [&_:is(button,a):hover]:bg-subtle-strong [&_:is(button,a):hover]:text-ink [&_:is(button,a):focus-visible]:bg-subtle-strong [&_:is(button,a):focus-visible]:text-ink [&_:is(button,a):focus-visible]:outline-none [&_svg]:size-4 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6]">
            <Link href="/settings#workspace-settings" onClick={() => setIsOpen(false)} role="menuitem">
              <SettingsIcon />
              <span>{t('workspace.manage')}</span>
            </Link>
            <button
              onClick={() => {
                setIsOpen(false)
                setIsCreateOpen(true)
              }}
              role="menuitem"
              type="button"
            >
              <PlusIcon />
              <span>{t('workspace.create')}</span>
            </button>
          </footer>
        </div>,
        document.body,
      ) : null}
      {isCreateOpen ? <WorkspaceCreateDialog close={() => setIsCreateOpen(false)} /> : null}
    </>
  )
}
