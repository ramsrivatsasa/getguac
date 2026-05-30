'use client'
// Quest tile — used on the Discover dashboard hero strip.
//
// Each tile is a single onboarding-style nudge: "Connect a store",
// "Save 5 Steals", "Hit 3 Smash days in a row". Tap takes the user to
// the target screen.
//
// Visual: pastel-tinted square illustration area on top, two-line copy
// below ("✨ 25 GuacMoney" + action), tap-the-whole-tile interaction.
// Optional progress bar at the bottom for multi-step quests.

export default function QuestTile({
  emoji = '✨',
  tint = '#ddd6fe',  // violet-100 default
  title,
  subtitle,
  rewardLabel,       // e.g. "🥑 $25" — rendered as a chip above the title
  progress,          // 0..1 (optional) — drives the bottom progress bar
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-violet-200 hover:-translate-y-0.5 transition-all w-full"
    >
      <div
        className="flex items-center justify-center text-5xl"
        style={{ backgroundColor: tint, aspectRatio: '1.6 / 1' }}
      >
        <span style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.08))' }}>{emoji}</span>
      </div>
      <div className="p-3 space-y-1">
        {rewardLabel && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold tabular-nums">
            {rewardLabel}
          </span>
        )}
        <p className="font-bold text-gray-900 text-sm leading-tight">{title}</p>
        {subtitle && <p className="text-[11px] text-gray-500 leading-tight">{subtitle}</p>}
        {typeof progress === 'number' && progress >= 0 && progress <= 1 && (
          <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-lime-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>
    </button>
  )
}
