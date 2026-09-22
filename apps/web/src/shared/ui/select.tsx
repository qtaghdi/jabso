'use client'

import {
  type CSSProperties,
  Children,
  isValidElement,
  useCallback,
  type KeyboardEvent,
  type OptionHTMLAttributes,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

type SelectChangeEvent = {
  currentTarget: { name: string | undefined; value: string }
  target: { name: string | undefined; value: string }
}

type SelectProps = {
  children: ReactNode
  className?: string
  controlSize?: 'sm' | 'md'
  defaultValue?: string
  disabled?: boolean
  error?: string
  hideLabel?: boolean
  hint?: string
  label: string
  name?: string
  onChange?: (event: SelectChangeEvent) => void
  value?: string
}

type SelectOption = {
  disabled: boolean
  key: string
  label: ReactNode
  text: string
  value: string
}

type SelectMenuStyle = Pick<CSSProperties, 'bottom' | 'left' | 'maxHeight' | 'top' | 'width'>

const isOptionElement = (child: ReactNode): child is ReactElement<OptionHTMLAttributes<HTMLOptionElement>> =>
  isValidElement(child) && child.type === 'option'

const optionText = (value: ReactNode): string => Children.toArray(value)
  .filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
  .join('')

export const Select = ({
  children,
  className,
  controlSize = 'md',
  defaultValue = '',
  disabled = false,
  error,
  hideLabel = false,
  hint,
  label,
  name,
  onChange,
  value,
}: SelectProps) => {
  const fieldId = useId()
  const listboxId = `${fieldId}-listbox`
  const descriptionId = hint || error ? `${fieldId}-description` : undefined
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])
  const [isOpen, setIsOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<SelectMenuStyle | null>(null)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const selectedValue = value ?? internalValue
  const options = useMemo<SelectOption[]>(() => Children.toArray(children)
    .filter(isOptionElement)
    .map((child, index) => ({
      disabled: Boolean(child.props.disabled),
      key: child.key?.toString() ?? `${String(child.props.value ?? '')}-${index}`,
      label: child.props.children,
      text: optionText(child.props.children),
      value: String(child.props.value ?? ''),
    })), [children])
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0]

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.min(Math.max(rect.width, 190), window.innerWidth - 16)
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
    const availableBelow = window.innerHeight - rect.bottom - 12
    const availableAbove = rect.top - 12
    const openAbove = availableBelow < 160 && availableAbove > availableBelow
    const maxHeight = Math.max(120, Math.min(280, openAbove ? availableAbove : availableBelow))
    setMenuStyle(openAbove
      ? { bottom: window.innerHeight - rect.top + 6, left, maxHeight, width }
      : { left, maxHeight, top: rect.bottom + 6, width })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    positionMenu()
    const menu = menuRef.current
    if (menu && typeof menu.showPopover === 'function' && !menu.matches(':popover-open')) {
      menu.showPopover()
    }
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      if (menu && typeof menu.hidePopover === 'function' && menu.matches(':popover-open')) {
        menu.hidePopover()
      }
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

  const focusOption = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, options.length - 1))
    optionRefs.current[nextIndex]?.focus()
  }

  const openAndFocus = (direction: 'first' | 'last' | 'selected') => {
    if (disabled) return
    setIsOpen(true)
    window.requestAnimationFrame(() => {
      const enabledIndexes = options.flatMap((option, index) => option.disabled ? [] : [index])
      const selectedIndex = options.findIndex((option) => option.value === selectedValue && !option.disabled)
      const targetIndex = direction === 'first'
        ? enabledIndexes[0]
        : direction === 'last'
          ? enabledIndexes.at(-1)
          : selectedIndex >= 0 ? selectedIndex : enabledIndexes[0]
      if (targetIndex !== undefined) focusOption(targetIndex)
    })
  }

  const selectOption = (option: SelectOption) => {
    if (option.disabled) return
    if (value === undefined) setInternalValue(option.value)
    const target = { name, value: option.value }
    onChange?.({ currentTarget: target, target })
    setIsOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const moveOptionFocus = (currentIndex: number, direction: 1 | -1) => {
    if (options.length === 0) return
    let nextIndex = currentIndex
    do {
      nextIndex = (nextIndex + direction + options.length) % options.length
    } while (options[nextIndex]?.disabled && nextIndex !== currentIndex)
    focusOption(nextIndex)
  }

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openAndFocus(event.key === 'ArrowDown' ? 'first' : 'last')
    }
  }

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLDivElement>, option: SelectOption, index: number) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveOptionFocus(index, event.key === 'ArrowDown' ? 1 : -1)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      openAndFocus(event.key === 'Home' ? 'first' : 'last')
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectOption(option)
      return
    }
    if (event.key === 'Escape') {
      setIsOpen(false)
      triggerRef.current?.focus()
    }
    if (event.key === 'Tab') setIsOpen(false)
  }

  return (
    <div ref={rootRef} className={['ui-select grid min-w-0 gap-2', className].filter(Boolean).join(' ')}>
      <span className={hideLabel ? 'sr-only' : 'text-xs font-semibold text-[#3f4650]'} id={`${fieldId}-label`}>{label}</span>
      <span className="ui-select-control relative block min-w-0">
        <button
          aria-controls={listboxId}
          aria-describedby={descriptionId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={error ? true : undefined}
          aria-labelledby={`${fieldId}-label ${fieldId}-value`}
          className={[
            'flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border bg-white px-3.5 text-left text-[13px] text-ink transition-[border-color,box-shadow] duration-150 focus-visible:border-focus focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/15 disabled:cursor-default disabled:bg-subtle disabled:text-muted',
            controlSize === 'sm' ? 'min-h-9' : 'min-h-11',
            error ? 'border-danger' : 'border-line-strong',
          ].join(' ')}
          disabled={disabled}
          onClick={() => isOpen ? setIsOpen(false) : openAndFocus('selected')}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          type="button"
        >
          <span className="min-w-0 truncate" id={`${fieldId}-value`}>{selectedOption?.label ?? label}</span>
          <svg aria-hidden="true" className={['size-4 shrink-0 fill-none stroke-current stroke-[1.5] transition-transform duration-150', isOpen && 'rotate-180'].filter(Boolean).join(' ')} viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
        </button>
        {isOpen ? createPortal(
          <div
            aria-labelledby={`${fieldId}-label`}
            className="fixed z-[1000] m-0 overflow-y-auto overscroll-contain rounded-xl border border-line bg-white p-1.5 shadow-raised [inset:auto]"
            id={listboxId}
            popover="manual"
            ref={menuRef}
            role="listbox"
            style={{ ...menuStyle, visibility: menuStyle ? 'visible' : 'hidden' }}
          >
            {options.map((option, index) => (
              <div
                aria-disabled={option.disabled || undefined}
                aria-selected={option.value === selectedValue}
                className="flex min-h-10 cursor-pointer items-center justify-between gap-4 rounded-lg px-2.5 py-2 text-[13px] text-[#3f4650] outline-none hover:bg-subtle-strong hover:text-ink focus-visible:bg-subtle-strong focus-visible:text-ink aria-disabled:cursor-not-allowed aria-disabled:text-[#a1a8b0] aria-selected:font-semibold aria-selected:text-ink"
                key={option.key}
                onClick={() => selectOption(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, option, index)}
                ref={(element) => { optionRefs.current[index] = element }}
                role="option"
                tabIndex={option.disabled ? undefined : -1}
                title={option.text}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.value === selectedValue ? <svg aria-hidden="true" className="size-4 shrink-0 fill-none stroke-ink stroke-2" viewBox="0 0 16 16"><path d="m3.5 8.5 2.8 2.8 6.2-6.2" /></svg> : null}
              </div>
            ))}
          </div>,
          rootRef.current?.closest('dialog') ?? document.body,
        ) : null}
        {name ? <input name={name} type="hidden" value={selectedValue} /> : null}
      </span>
      {hint || error ? <small className={error ? 'text-[11px] leading-snug text-danger' : 'text-[11px] leading-snug text-muted'} id={descriptionId}>{error ?? hint}</small> : null}
    </div>
  )
}
