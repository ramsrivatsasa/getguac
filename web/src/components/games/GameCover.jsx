// Cover-art tile for the Guac Arcade — game-portal style. Two looks:
//   • Canvas action games have a real gameplay screenshot (/game-shots/<slug>.jpg)
//     → use it as the cover, cropped to fill, with a dark footer strip.
//   • Board/DOM games (solitaire, sudoku, whack…) have no shot → the original
//     rich gradient + floating motif emoji + big game emoji.
// Pure markup (server-safe); the screenshot is a static image, no external load.
import Link from 'next/link'
import { shotFor } from './gamesList'

export default function GameCover({ game, size = 'md' }) {
  const big = size === 'lg'
  const shot = shotFor(game.href)
  return (
    <Link
      href={game.href}
      className="group relative block overflow-hidden rounded-2xl no-underline transition-transform duration-200 hover:-translate-y-1"
      style={{ boxShadow: '0 6px 18px rgba(21,40,28,0.16)' }}
    >
      {/* cover art */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          aspectRatio: big ? '16 / 9' : '4 / 3',
          background: `radial-gradient(120% 120% at 20% 0%, ${game.g1} 0%, ${game.g2} 100%)`,
        }}
      >
        {shot ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot}
              alt={`${game.name} gameplay`}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            {/* gentle top-left scrim so the NEW badge stays legible */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.22), rgba(0,0,0,0) 45%)' }} />
          </>
        ) : (
          <>
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
          </>
        )}
        {game.isNew && (
          <span className="absolute left-2 top-2 text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-full z-10" style={{ background: '#FDE047', color: '#713F12' }}>
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
