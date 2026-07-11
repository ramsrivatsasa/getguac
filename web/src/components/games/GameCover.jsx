// Cover-art tile for the Guac Arcade — MSN-Play-style card: a rich gradient
// "cover" with floating motif emoji, the game's emoji front and center, and
// the name/tag on a dark footer strip. Pure markup (server-safe); all the
// art is CSS + emoji so nothing external loads.
import Link from 'next/link'

export default function GameCover({ game, size = 'md' }) {
  const big = size === 'lg'
  return (
    <Link
      href={game.href}
      className="group relative block overflow-hidden rounded-2xl no-underline transition-transform duration-200 hover:-translate-y-1"
      style={{ boxShadow: '0 6px 18px rgba(21,40,28,0.16)' }}
    >
      {/* cover art */}
      <div
        className="relative flex items-center justify-center"
        style={{
          aspectRatio: big ? '16 / 9' : '4 / 3',
          background: `radial-gradient(120% 120% at 20% 0%, ${game.g1} 0%, ${game.g2} 100%)`,
        }}
      >
        {/* oversized ghost emoji as backdrop art */}
        <span aria-hidden className="absolute -right-4 -bottom-6 opacity-20 select-none" style={{ fontSize: big ? 130 : 92, transform: 'rotate(-14deg)' }}>
          {game.emoji}
        </span>
        {game.motifs?.[0] && (
          <span aria-hidden className="absolute left-2 top-2 opacity-70 select-none" style={{ fontSize: big ? 26 : 18, transform: 'rotate(-10deg)' }}>
            {game.motifs[0]}
          </span>
        )}
        {game.motifs?.[1] && (
          <span aria-hidden className="absolute right-3 top-4 opacity-70 select-none" style={{ fontSize: big ? 22 : 15, transform: 'rotate(12deg)' }}>
            {game.motifs[1]}
          </span>
        )}
        <span className="select-none transition-transform duration-200 group-hover:scale-110" style={{ fontSize: big ? 72 : 46, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' }}>
          {game.emoji}
        </span>
        {game.isNew && (
          <span className="absolute left-2 bottom-2 text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-full" style={{ background: '#FDE047', color: '#713F12' }}>
            NEW
          </span>
        )}
      </div>
      {/* footer strip */}
      <div className="px-3 py-2" style={{ background: '#101a13' }}>
        <div className="font-display font-extrabold leading-tight" style={{ color: '#f2fbf3', fontSize: big ? 17 : 14 }}>
          {game.name}
        </div>
        <div className="text-[11px] font-semibold" style={{ color: '#8fbf9c' }}>{game.tag}</div>
      </div>
    </Link>
  )
}
