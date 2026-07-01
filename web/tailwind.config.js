/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // ── GetGuac avocado design system ──────────────────────────────
      // Single source of truth for the redesign palette (mirrors the
      // Receipts mockup). Use these everywhere instead of raw emerald-*
      // so every page stays on-brand. CSS-var twins live in globals.css
      // (:root) for inline-style / non-Tailwind consumers.
      colors: {
        brand: { DEFAULT: '#1e3a8a', light: '#2563eb', dark: '#1e3a8a' },
        guac: {
          bg:      '#EEF1EC', // app body base
          panel:   '#FFFFFF', // cards / floating shell
          sidebar: '#FBFCF9', // sidebar surface
          logo:    '#176B33', // logo tile / deepest green
          700:     '#14532D', // primary green — buttons, active text
          600:     '#1F8A3D', // accent green — chips, links
          100:     '#E9F5DD', // light green — active pill / soft chip bg
          50:      '#F1F6EA', // hover tint
          row:     '#F7FBF1', // table row hover
          ink:     '#14241A', // headings / amounts
          body:    '#4A5A4E', // body + nav text
          muted:   '#6B7A6E', // secondary text
          faint:   '#9AA89E', // tertiary / placeholder
          mist:    '#A6B3A9', // icons / faint
          label:   '#B3BEB2', // section labels (most muted)
          line:    'rgba(20,83,45,0.08)',  // hairline border
          line2:   'rgba(20,83,45,0.14)',  // stronger border
        },
      },
      fontFamily: {
        // Display = Bricolage Grotesque (headings, amounts, wordmark).
        // Sans    = Plus Jakarta Sans (body, nav, labels).
        display: ['var(--font-bricolage)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        guac: '20px', // standard card radius from the mockup
      },
      boxShadow: {
        guac: '0 40px 90px -50px rgba(16,40,26,0.5)',  // floating shell
        'guac-cta': '0 6px 16px -8px rgba(232,135,14,0.6)', // Worth It? CTA
      },
      backgroundImage: {
        'guac-backdrop': 'radial-gradient(120% 70% at 50% 0%, #F2F5EE 0%, #E6EAE1 80%)',
        'guac-cta': 'linear-gradient(135deg, #FBB040, #E8870E)',
      },
    },
  },
  plugins: [],
}
