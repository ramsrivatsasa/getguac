'use client'
// The client half of /share. Everything that needs the browser: the clipboard,
// and the two share targets whose usefulness depends on the device.
//
// WhatsApp uses wa.me, which works on desktop web and hands off to the app on a
// phone. SMS uses the sms: scheme, which does nothing on most desktops — so that
// button is only rendered once we know we are on a touch device, rather than
// showing every visitor a control that silently fails.
//
// navigator.share() is used when the platform offers it (that is the native
// sheet, and on a phone it is strictly better than a row of our own buttons),
// with the explicit buttons as the fallback. Both paths share the same URL and
// text, so there is one message to change.

import { useEffect, useState } from 'react'
import { Check, Copy, Mail, MessageCircle, Share2, Smartphone } from 'lucide-react'

export const SITE = 'https://getguac.app'

// One message, used by every channel. Kept plain: no claim about what GetGuac
// will save anyone, because we do not know that about the reader's friend.
const SUBJECT = 'GetGuac - it reads your receipts for you'
const BODY = `I have been using GetGuac to keep track of receipts and spending. It reads a photo of a receipt and pulls out the store, the total and every line item, and it is free.\n\n${SITE}`

// Props so the same row serves the arcade section further down the page. Both
// callers pass a matching url/body pair, so there is never a message advertising
// one page while the link points at another.
export default function ShareButtons({ url = SITE, subject = SUBJECT, body = BODY }) {
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  // Feature detection in an effect, never during render: navigator does not
  // exist on the server, and branching on it during render is a hydration
  // mismatch. The buttons that depend on it mount after the first paint.
  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
    setIsTouch(typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches)
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is permission-gated and blocked outright in some in-app
      // browsers. Say so instead of showing a success state that did not happen.
      window.prompt('Copy this link:', url)
    }
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ title: subject, text: body, url })
    } catch {
      /* the user dismissed the sheet - not an error */
    }
  }

  return (
    <div className="sh-actions">
      {canNativeShare ? (
        <button type="button" className="sh-btn sh-btn-primary" onClick={nativeShare}>
          <Share2 size={17} aria-hidden="true" />Share
        </button>
      ) : null}

      <a
        className="sh-btn"
        href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
      >
        <Mail size={17} aria-hidden="true" />Email
      </a>

      <a
        className="sh-btn"
        href={`https://wa.me/?text=${encodeURIComponent(body)}`}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle size={17} aria-hidden="true" />WhatsApp
      </a>

      {isTouch ? (
        <a className="sh-btn" href={`sms:?&body=${encodeURIComponent(body)}`}>
          <Smartphone size={17} aria-hidden="true" />Message
        </a>
      ) : null}

      <button type="button" className="sh-btn" onClick={copy}>
        {copied
          ? <><Check size={17} aria-hidden="true" />Link copied</>
          : <><Copy size={17} aria-hidden="true" />Copy link</>}
      </button>
    </div>
  )
}
