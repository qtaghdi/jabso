'use client'

import {
  Children,
  isValidElement,
  type KeyboardEvent,
  type OptionHTMLAttributes,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

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
  const optionRefs = useRef<Array<HTMLDivElement | null>>([])
  const [isOpen, setIsOpen] = useState(false)
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

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
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
    <div ref={rootRef} className={['ui-select', `ui-select-${controlSize}`, error && 'ui-select-error', className].filter(Boolean).join(' ')}>
      <span className={hideLabel ? 'sr-only' : 'ui-field-label'} id={`${fieldId}-label`}>{label}</span>
      <span className="ui-select-control">
        <button
          aria-controls={listboxId}
          aria-describedby={descriptionId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={error ? true : undefined}
          aria-labelledby={`${fieldId}-label ${fieldId}-value`}
          className="ui-select-trigger"
          disabled={disabled}
          onClick={() => isOpen ? setIsOpen(false) : openAndFocus('selected')}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          type="button"
        >
          <span id={`${fieldId}-value`}>{selectedOption?.label ?? 'Select an option'}</span>
          <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
        </button>
        {isOpen ? (
          <div aria-labelledby={`${fieldId}-label`} className="ui-select-options" id={listboxId} role="listbox">
            {options.map((option, index) => (
              <div
                aria-disabled={option.disabled || undefined}
                aria-selected={option.value === selectedValue}
                className="ui-select-option"
                key={option.key}
                onClick={() => selectOption(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, option, index)}
                ref={(element) => { optionRefs.current[index] = element }}
                role="option"
                tabIndex={option.disabled ? undefined : -1}
                title={option.text}
              >
                <span>{option.label}</span>
                {option.value === selectedValue ? <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3.5 8.5 2.8 2.8 6.2-6.2" /></svg> : null}
              </div>
            ))}
          </div>
        ) : null}
        {name ? <input name={name} type="hidden" value={selectedValue} /> : null}
      </span>
      {hint || error ? <small className="ui-field-message" id={descriptionId}>{error ?? hint}</small> : null}
    </div>
  )
}
