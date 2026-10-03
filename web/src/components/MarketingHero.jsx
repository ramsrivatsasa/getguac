import Link from './SiteLink'

export default function MarketingHero({ eyebrow, title, accent, description, primaryHref = '/register', primaryLabel = 'Start free', secondaryHref, secondaryLabel, imageSrc = '/home/story-people/capture-blonde-produce-v1-768.webp', imageAlt = 'A shopper keeping her receipt on her phone', trustText = 'Free forever · No card or bank login required', children }) {
  return (
    <section className="max-w-6xl mx-auto py-8 sm:py-12">
      <div className="grid gap-8 items-center lg:grid-cols-[.9fr_1.1fr]">
        <div>
          {eyebrow && <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700 mb-4">{eyebrow}</p>}
          <h1 className="text-4xl sm:text-5xl font-black leading-[1.06] text-slate-950">{title}{accent && <span className="block text-violet-700">{accent}</span>}</h1>
          {description && <p className="text-lg text-slate-600 leading-8 mt-5 max-w-2xl">{description}</p>}
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href={primaryHref} className="btn-primary">{primaryLabel}</Link>
            {secondaryHref && <Link href={secondaryHref} className="btn-secondary">{secondaryLabel}</Link>}
          </div>
          <p className="text-xs text-slate-500 mt-3">{trustText}</p>
        </div>
        <div>{children || <img src={imageSrc} alt={imageAlt} width={768} height={512} className="h-auto w-full rounded-3xl" fetchPriority="high"/>}</div>
      </div>
    </section>
  )
}
