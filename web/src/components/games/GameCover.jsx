// Cover-art tile for the Guac Arcade — game-portal style. Two looks:
//   • Canvas action games have a real gameplay screenshot (/game-shots/<slug>.jpg)
//     → use it as the cover, cropped to fill, with a dark footer strip.
//   • Board/DOM games (solitaire, sudoku, whack…) have no shot → the original
//     rich gradient + floating motif emoji + big game emoji.
// Pure markup (server-safe); the screenshot is a static image, no external load.
import Link from 'next/link'
import { shotFor } from './gamesList'
import { formatLikes } from '../../lib/gameLikes'

const INK = '#15201a'
const MUTED = '#5a6a60'

// size: 'sm' = the dense MSN-Play-style tile wall (square art, tight type),
//       'md' = category rows, 'lg' = search/browse results.
export default function GameCover({ game, size = 'md', likes }) {
  const big = size === 'lg'
  const small = size === 'sm'
  // Partner games ship their own cover art in the feed (512x384 — already the
  // 4:3 this tile wants), so they get real artwork like a Poki/MSN grid instead
  // of the emoji-on-gradient fallback, which would look empty for a game whose
  // emoji we never authored.
  const shot = game.thumb || shotFor(game.href)
  return (
    <Link
      href={game.href}
      // The dense tile keeps its caption OUTSIDE the card (portal convention),
      // so the art rounds and clips on its own and the wrapper must not.
      className={`group relative block no-underline transition-transform duration-200 hover:-translate-y-1 ${small ? '' : 'overflow-hidden rounded-2xl'}`}
      style={small ? undefined : { boxShadow: '0 6px 18px rgba(21,40,28,0.16)' }}
    >
      {/* cover art */}
      <div
        className={`relative flex items-center justify-center overflow-hidden ${small ? 'rounded-2xl' : ''}`}
        style={{
          aspectRatio: big ? '16 / 9' : small ? '1 / 1' : '4 / 3',
          background: `radial-gradient(120% 120% at 20% 0%, ${game.g1} 0%, ${game.g2} 100%)`,
          ...(small ? { boxShadow: '0 4px 12px rgba(21,40,28,0.14)' } : null),
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
      {/* Meta. The dense tile puts it on the page background under the art
          (portal convention) rather than in a dark strip, and clamps the title
          to one line — partner titles run long ("Dream Puppy Spot The
          Differences") and a variable-height caption breaks grid alignment.
          `plays` is only ever rendered when a REAL number is passed in: our own
          games can count rows in game_scores, partner games run cross-origin so
          we never observe a play. A plausible-looking fake count is the one
          thing this tile must not show. */}
      {small ? (
        <div className="pt-1.5 pb-0.5">
          <div className="font-display font-extrabold leading-tight truncate" style={{ color: INK, fontSize: 13 }}>
            {game.name}
          </div>
          <div className="text-[11px] font-semibold truncate" style={{ color: MUTED }}>
            {game.tag}
            {/* `plays` = a real count of finished rounds (our own games only —
                partner games are cross-origin and unobservable). `quality` =
                GamePix's own 0-1 editorial ranking, shown as a "top rated"
                mark, NOT as a rating or a like count, because that is not what
                it measures. Neither is ever synthesised. */}
            {/* Real like count from public.game_likes (migration_082) — every
                number here is somebody actually pressing the button. Hidden at
                zero so a new game reads clean rather than "0". */}
            {likes > 0 && <> · 👍 {formatLikes(likes)}</>}
            {!likes && game.quality != null && (
              <> · <span title={`Quality score ${Math.round(game.quality * 100)}% (rated by GamePix)`} style={{ color: '#b45309' }}>
                ★ {(game.quality * 5).toFixed(1)}
              </span></>
            )}
          </div>
        </div>
      ) : (
        <div className="px-3 py-2" style={{ background: '#101a13' }}>
          <div className="font-display font-extrabold leading-tight" style={{ color: '#f2fbf3', fontSize: big ? 17 : 14 }}>
            {game.name}
          </div>
          <div className="text-[11px] font-semibold" style={{ color: '#8fbf9c' }}>{game.tag}</div>
        </div>
      )}
    </Link>
  )
}
