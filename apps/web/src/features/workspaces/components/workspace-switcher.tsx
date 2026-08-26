'use client'

import { useAuth, useOrganization, useOrganizationList } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
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
import { WorkspaceCreateDialog } from 'src/features/workspaces/components/workspace-create-dialog'

type WorkspaceSwitcherProps = {
  personalName: string
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

const workspaceInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.slice(0, 1).toUpperCase())
  .join('') || 'J'

export const WorkspaceSwitcher = ({ personalName }: WorkspaceSwitcherProps) => {
  const router = useRouter()
  const { orgId } = useAuth()
  const { organization } = useOrganization()
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true, pageSize: 20 },
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuStyle, setMenuStyle] = useState<WorkspaceMenuStyle | null>(null)
  const memberships = userMemberships.data ?? []
  const activeName = organization?.name ?? 'Personal'
  const activeDescription = organization ? 'Shared workspace' : personalName

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
      ? { bottom: window.innerHeight - rect.bottom, left, maxHeight, width }
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
    if (!setActive || switchingTo) return
    const target = organizationId ?? 'personal'
    if ((orgId ?? 'personal') === target) {
      closeMenu()
      return
    }
    setError(null)
    setSwitchingTo(target)
    try {
      await setActive({ organization: organizationId })
      setIsOpen(false)
      router.replace('/')
      router.refresh()
    } catch {
      setError('Could not switch workspaces. Try again.')
    } finally {
      setSwitchingTo(null)
    }
  }

  const membershipRows = memberships.map((membership) => ({
    id: membership.organization.id,
    initials: workspaceInitials(membership.organization.name),
    name: membership.organization.name,
    role: membership.role === 'org:admin' ? 'Admin' : 'Member',
  }))

  return (
    <>
      <div className="workspace-switcher" ref={rootRef}>
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className="workspace-switcher-trigger"
          disabled={!isLoaded}
          onClick={() => isOpen ? closeMenu() : openMenu()}
          ref={triggerRef}
          title={activeName}
          type="button"
        >
          <span className="workspace-avatar" aria-hidden="true">{workspaceInitials(activeName)}</span>
          <span className="workspace-trigger-copy"><strong>{activeName}</strong><small>{activeDescription}</small></span>
          <ChevronIcon />
        </button>
      </div>
      {isOpen ? createPortal(
        <div
          aria-label="Switch workspace"
          className="workspace-menu"
          onKeyDown={handleMenuKeyDown}
          popover="manual"
          ref={menuRef}
          role="menu"
          style={{ ...menuStyle, visibility: menuStyle ? 'visible' : 'hidden' }}
        >
          <header className="workspace-menu-header"><strong>Workspaces</strong><span>{membershipRows.length + 1}</span></header>
          <div className="workspace-menu-list">
            <button
              aria-checked={!orgId}
              disabled={Boolean(switchingTo)}
              onClick={() => switchWorkspace(null)}
              role="menuitemradio"
              type="button"
            >
              <span className="workspace-avatar workspace-avatar-personal" aria-hidden="true">{workspaceInitials(personalName)}</span>
              <span><strong>Personal</strong><small>{personalName}</small></span>
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
                <span className="workspace-avatar" aria-hidden="true">{workspace.initials}</span>
                <span><strong>{workspace.name}</strong><small>{workspace.role}</small></span>
                {orgId === workspace.id ? <CheckIcon /> : null}
              </button>
            ))}
            {userMemberships.hasNextPage ? (
              <button
                disabled={userMemberships.isFetching || Boolean(switchingTo)}
                onClick={() => userMemberships.fetchNext()}
                role="menuitem"
                type="button"
              >
                <span className="workspace-menu-load-more">Load more</span>
              </button>
            ) : null}
          </div>
          {error ? <p className="workspace-menu-error" role="alert">{error}</p> : null}
          <footer className="workspace-menu-footer">
            <button
              onClick={() => {
                setIsOpen(false)
                setIsCreateOpen(true)
              }}
              role="menuitem"
              type="button"
            >
              <PlusIcon />
              <span>Create workspace</span>
            </button>
          </footer>
        </div>,
        document.body,
      ) : null}
      {isCreateOpen ? <WorkspaceCreateDialog close={() => setIsCreateOpen(false)} /> : null}
    </>
  )
}
