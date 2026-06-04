'use client'
import { Children, cloneElement, isValidElement, useState } from 'react'

// Wraps an interactive element (button, Link, div with onClick) so it
// scales down on press and releases on up/leave. Pure CSS — relies on
// the `.tap-scale` utility in globals.css. Provides a state-managed
// `is-tapping` class so the visual works on touch (which has no :active
// CSS pseudo on some Safari/Android setups).
//
//   <TapScale><button className="btn-primary">Save</button></TapScale>
//
// Props:
//   scale     amount to scale down to on press (default 0.96)
//   children  exactly one element child that accepts className+events
export default function TapScale({ children, scale = 0.96 }) {
  const [pressed, setPressed] = useState(false)
  if (!isValidElement(children)) return children

  const existingClass = children.props.className || ''
  const existingStyle = children.props.style || {}

  // Compose with caller-provided handlers so we don't clobber them.
  const onMouseDown = (e) => { setPressed(true); children.props.onMouseDown && children.props.onMouseDown(e) }
  const onMouseUp   = (e) => { setPressed(false); children.props.onMouseUp && children.props.onMouseUp(e) }
  const onMouseLeave = (e) => { setPressed(false); children.props.onMouseLeave && children.props.onMouseLeave(e) }
  const onTouchStart = (e) => { setPressed(true); children.props.onTouchStart && children.props.onTouchStart(e) }
  const onTouchEnd   = (e) => { setPressed(false); children.props.onTouchEnd && children.props.onTouchEnd(e) }

  return cloneElement(children, {
    className: `${existingClass} tap-scale`.trim(),
    style: {
      ...existingStyle,
      transform: pressed ? `scale(${scale})` : undefined,
    },
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
  })
}
