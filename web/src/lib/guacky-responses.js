// Witty server responses for the case where the AI parser is asked to read a
// receipt but the image is clearly NOT a receipt (a selfie, a cat, a sunset,
// a blank page, etc.). The user gets a playful nudge instead of the dry
// "Missing store or date" error.
//
// {subject} is filled in from Gemini's non_receipt_subject classification —
// e.g. "a person", "a cat", "a sunset". Templates are designed to stay funny
// even when the subject is weird ("a meme", "a whiteboard").

const TEMPLATES = [
  "🥑 GuacWizard squinted real hard, but that looks like {subject}, not a receipt. Try snapping the actual paper!",
  "✨ That's a fine {subject}, but my magic only works on receipts. Aim that camera at some store paper next time!",
  "🪄 Even the GuacWizard's spellbook can't conjure a total out of {subject}. Try a real receipt!",
  "📸 Plot twist: that's {subject}, not a receipt. Point the camera at the paper one — no filters needed.",
  "😎 Looks like {subject} — fun, but receipts have totals, not vibes. Try again with the real thing!",
  "🍿 GuacWizard expected a receipt and got {subject} instead. Quality content, wrong upload slot.",
  "🤔 Hmm, that's clearly {subject}. Receipts usually have a store name at the top and a total at the bottom — point the camera there!",
  "🧙 My crystal ball shows {subject}, not a receipt. Re-cast the spell with an actual receipt.",
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generate a guacky non-receipt response.
 * @param {string|null} subject — what Gemini saw instead. e.g. "a person", "a cat".
 *   Falls back to "something" when null/empty.
 * @returns {{ message: string, tip: string, subject: string }}
 */
export function guackyNonReceiptResponse(subject) {
  const s = (subject && subject.trim()) ? subject.trim() : 'something'
  const message = pick(TEMPLATES).replaceAll('{subject}', s)
  return {
    message,
    tip: 'Receipts usually have a store name at the top and a dollar total at the bottom. Point the camera so both are in frame.',
    subject: s,
  }
}
