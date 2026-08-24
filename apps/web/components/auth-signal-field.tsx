'use client'

import { useEffect, useRef } from 'react'

const EVENT_COUNT = 24

const getPointOnCurve = (
  startX: number,
  startY: number,
  controlX: number,
  controlY: number,
  endX: number,
  endY: number,
  progress: number,
) => {
  const inverse = 1 - progress
  return {
    x: inverse * inverse * startX + 2 * inverse * progress * controlX + progress * progress * endX,
    y: inverse * inverse * startY + 2 * inverse * progress * controlY + progress * progress * endY,
  }
}

export const AuthSignalField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrame = 0
    let width = 0
    let height = 0

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      width = bounds.width
      height = bounds.height
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height)

      const targetX = width * 0.82
      const targetY = height * 0.5

      for (let index = 0; index < EVENT_COUNT; index += 1) {
        const distribution = index / (EVENT_COUNT - 1)
        const offset = ((index * 17) % 7) / 7
        const startX = width * (0.09 + offset * 0.38)
        const startY = height * (0.12 + distribution * 0.76)
        const controlX = width * (0.5 + ((index * 11) % 5) * 0.025)
        const controlY = targetY + (startY - targetY) * 0.22
        const progress = reducedMotion ? 0.58 : (time / 5400 + index * 0.071) % 1
        const point = getPointOnCurve(startX, startY, controlX, controlY, targetX, targetY, progress)

        context.beginPath()
        context.moveTo(startX, startY)
        context.quadraticCurveTo(controlX, controlY, targetX, targetY)
        context.strokeStyle = 'rgba(143, 153, 165, 0.3)'
        context.lineWidth = 0.8
        context.stroke()

        context.beginPath()
        context.arc(point.x, point.y, index % 5 === 0 ? 2.6 : 1.8, 0, Math.PI * 2)
        context.fillStyle = `rgba(184, 193, 202, ${0.42 + progress * 0.5})`
        context.fill()
      }

      const pulse = reducedMotion ? 0.5 : (Math.sin(time / 520) + 1) / 2
      context.beginPath()
      context.arc(targetX, targetY, 8, 0, Math.PI * 2)
      context.fillStyle = '#ff675f'
      context.fill()

      context.beginPath()
      context.arc(targetX, targetY, 17 + pulse * 3, 0, Math.PI * 2)
      context.strokeStyle = 'rgba(255, 103, 95, 0.92)'
      context.lineWidth = 1.5
      context.stroke()

      context.beginPath()
      context.arc(targetX, targetY, 27 + pulse * 6, 0, Math.PI * 2)
      context.strokeStyle = `rgba(255, 103, 95, ${0.3 + pulse * 0.22})`
      context.lineWidth = 1
      context.stroke()

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(() => {
      resize()
      if (reducedMotion) draw(0)
    })

    observer.observe(canvas)
    resize()
    draw(0)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return <canvas className="auth-signal-canvas" ref={canvasRef} aria-hidden="true" />
}
