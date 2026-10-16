"use client"

import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  "aria-label": ariaLabel,
  onValueCommit,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  // Radix only fires onValueCommit when the value differs from the slide
  // start. Callers use it to end a transient gesture, so guarantee exactly
  // one commit per pointer slide even when the thumb ends where it started.
  const committedRef = React.useRef(true)

  const handleCommit = React.useCallback(
    (values: number[]) => {
      committedRef.current = true
      onValueCommit?.(values)
    },
    [onValueCommit]
  )

  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  const endSlide = React.useCallback(() => {
    // Defer so Radix's own onSlideEnd (which may commit) runs first.
    setTimeout(() => {
      if (committedRef.current) return
      committedRef.current = true
      onValueCommit?.(_values)
    }, 0)
  }, [onValueCommit, _values])

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
      onValueCommit={handleCommit}
      onPointerDown={(event) => {
        committedRef.current = false
        onPointerDown?.(event)
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event)
        endSlide()
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event)
        endSlide()
      }}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-muted data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={ariaLabel}
          className="relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
