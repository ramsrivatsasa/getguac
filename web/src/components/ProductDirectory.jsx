import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileSearch,
  Gift,
  ShoppingBag,
  WalletCards,
  Receipt,
  Target,
  Landmark,
  Car,
  BarChart3,
  Bot,
  Newspaper,
  Gauge,
  WandSparkles,
  Undo2,
  Award,
  RefreshCw,
  Package,
  Store,
  ShieldCheck,
  BadgePercent,
  Tags,
  ListChecks,
  Search,
  TicketCheck,
  Gamepad2,
} from "lucide-react";

const TOOL_ICONS = {
  Budget: WalletCards,
  Bills: CalendarDays,
  "Goals & calculators": Target,
  Wealth: Landmark,
  "Bank statements": Landmark,
  "Car miles": Car,
  Receipts: Receipt,
  Reports: BarChart3,
  "Guac AI": Bot,
  News: Newspaper,
  GuacScore: Gauge,
  GuacWizard: WandSparkles,
  Returns: Undo2,
  Rewards: Award,
  Subscriptions: RefreshCw,
  Stash: Package,
  Stores: Store,
  Security: ShieldCheck,
  Promotions: BadgePercent,
  Steals: Tags,
  "Shopping list": ListChecks,
  Marketplace: Search,
  Coupons: TicketCheck,
  "Guac Arcade": Gamepad2,
};

const GROUPS = [
  {
    name: "Plan",
    kicker: "Know what is next",
    Icon: CalendarDays,
    image: "/home/story-people/family-tablet.webp",
    imageAlt: "A family planning together with GetGuac",
    color: "#A16207",
    soft: "#FFF7E6",
    featured: ["Budget", "A plan built from what you actually bought", "Use real purchase patterns to shape a practical month.", "/resources/guides/budget.html"],
    items: [
      [
        "Budget",
        "Build a practical monthly plan from real spending.",
        "/resources/guides/budget.html",
      ],
      [
        "Bills",
        "See mortgage, car payments, utilities and other due dates.",
        "/goals/bills.html",
      ],
      [
        "Goals & calculators",
        "Plan debt payoff, emergency savings, retirement and more.",
        "/calculators",
      ],
      [
        "Wealth",
        "Keep assets, debts and longer-term progress in view.",
        "/get-started#all-features",
      ],
      [
        "Bank statements",
        "Add broader context without connecting a bank login.",
        "/get-started#all-features",
      ],
      [
        "Car miles",
        "Keep purpose-based mileage records for reporting.",
        "/goals/miles.html",
      ],
    ],
  },
  {
    name: "Understand",
    kicker: "See beyond the total",
    Icon: FileSearch,
    image: "/home/story-people/capture-blonde-produce-v1-768.webp",
    imageAlt: "A shopper capturing a purchase with her phone",
    color: "#2563A8",
    soft: "#EDF5FF",
    featured: ["Receipts", "The items behind every total", "Turn paper, email and PDF receipts into searchable purchase memory.", "/features/capture"],
    items: [
      [
        "Receipts",
        "Capture paper, email, PDF and image receipts.",
        "/features/capture",
      ],
      [
        "Reports",
        "Compare spending by item, store, category and time.",
        "/goals/reports.html",
      ],
      [
        "Guac AI",
        "Ask questions grounded in the records you provided.",
        "/features/understand",
      ],
      [
        "News",
        "See major economic headlines with useful money context.",
        "/articles",
      ],
      [
        "GuacScore",
        "See whether expensive purchases felt worthwhile.",
        "/guacscore",
      ],
      [
        "GuacWizard",
        "Find fees, interest and other quiet money leaks.",
        "/goals/wizard.html",
      ],
    ],
  },
  {
    name: "Protect",
    kicker: "Keep what is still yours",
    Icon: Gift,
    image: "/home/story-people/protect-couple-tablet-768.webp",
    imageAlt: "A couple reviewing purchase protection together",
    color: "#0F766E",
    soft: "#E9F8F5",
    featured: ["Returns", "Keep the refund you are still owed", "Keep the receipt, deadline and refundable value together.", "/features/protect"],
    items: [
      [
        "Returns",
        "Track deadlines, refundable value and refund progress.",
        "/features/protect",
      ],
      [
        "Rewards",
        "Keep retailer rewards and useful benefits organized.",
        "/get-started#all-features",
      ],
      [
        "Subscriptions",
        "Surface recurring charges before another renewal.",
        "/resources/guides/subscriptions.html",
      ],
      [
        "Stash",
        "Remember products, warranties and purchase history.",
        "/goals/stash.html",
      ],
      [
        "Stores",
        "Keep policies, memberships and store details together.",
        "/get-started#all-features",
      ],
      [
        "Security",
        "Stay in control without handing over a bank login.",
        "/security",
      ],
    ],
  },
  {
    name: "Shop smart",
    kicker: "Use offers without inbox noise",
    Icon: ShoppingBag,
    image: "/home/story-people/shop-768.webp",
    imageAlt: "A shopper using GetGuac while shopping",
    color: "#C25D13",
    soft: "#FFF1E7",
    featured: ["Promotions", "Useful offers without inbox noise", "Separate relevant promotions from receipts and planned purchases.", "/deals"],
    items: [
      [
        "Promotions",
        "Separate relevant offers from receipts and inbox noise.",
        "/deals",
      ],
      [
        "Steals",
        "Compare repeat purchases and current prices.",
        "/goals/steals.html",
      ],
      [
        "Shopping list",
        "Prepare and share the next trip.",
        "/features/next-trip",
      ],
      [
        "Marketplace",
        "Search public offers before buying what you planned.",
        "/marketplace",
      ],
      [
        "Coupons",
        "Check available coupon codes without an account.",
        "/coupons",
      ],
      [
        "Guac Arcade",
        "Practice money ideas through short, free games.",
        "/games",
      ],
    ],
  },
];

function ToolRows({ group, compact }) {
  const Icon = group.Icon;
  return (
    <div className="mt-2 grid gap-0">
      {group.items
        .slice(0, compact ? 3 : group.items.length)
        .map(([name, desc, href]) => {
          const ToolIcon = TOOL_ICONS[name] || Icon;
          return (
            <Link
              key={name}
              href={href}
              className="group flex min-h-16 items-center justify-between gap-3 rounded-xl px-3 py-2 no-underline transition-colors hover:bg-slate-50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ToolIcon
                  size={21}
                  className="shrink-0"
                  style={{ color: group.color }}
                />
                <span>
                  <strong className="block text-sm text-slate-950">
                    {name}
                  </strong>
                  {!compact && (
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {desc}
                    </span>
                  )}
                </span>
              </span>
              <ArrowRight
                size={14}
                className="shrink-0 transition-transform group-hover:translate-x-1"
                style={{ color: group.color }}
              />
            </Link>
          );
        })}
    </div>
  );
}

export default function ProductDirectory({ compact = false }) {
  if (compact) return (
    <section className="mx-auto max-w-6xl py-10 sm:py-12" aria-labelledby="product-directory-title">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-700">Made for real shopping life</p><h2 id="product-directory-title" className="mt-2 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">Plan, understand, protect, and shop smarter.</h2></div><p className="max-w-xl text-base leading-7 text-slate-600">Start with the part of your money life that needs attention.</p></div>
      <div className="mt-7 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">{GROUPS.map(group=>{const [label,title,desc,href]=group.featured;return <article key={group.name} className="flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"><div className="aspect-[3/2] w-full shrink-0 overflow-hidden"><img src={group.image} alt={group.imageAlt} width="768" height="512" loading="lazy" className="block h-full w-full object-cover object-center"/></div><div className="flex flex-1 flex-col p-4"><span className="self-start inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[.08em]" style={{background:group.soft,color:group.color}}>{label}</span><h3 className="mt-3 text-xl font-black leading-tight text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p><Link href={href} className="mt-auto inline-flex min-h-11 items-end gap-2 pt-4 font-black no-underline" style={{color:group.color}}>Explore <ArrowRight className="mb-0.5" size={15}/></Link></div></article>})}</div>
      <div className="mt-6 text-center"><Link href="/get-started#all-features" className="btn-secondary">Explore the complete toolkit <ArrowRight size={16}/></Link></div>
    </section>
  )
  return (
    <section
      className="mx-auto max-w-6xl py-10 sm:py-12"
      aria-labelledby="product-directory-title"
    >
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-violet-700">
            Your purchase toolkit
          </p>
          <h2
            id="product-directory-title"
            className="mt-2 text-4xl font-black leading-tight text-slate-950 sm:text-5xl"
          >
            Four moments. The right tools appear when needed.
          </h2>
        </div>
        <p className="max-w-xl text-base leading-7 text-slate-600">
          Start with one receipt. Open bills, rewards, news, promotions and
          planning only when they help your next move.
        </p>
      </div>
      <div className="mt-7 hidden items-start gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
        {GROUPS.map((group) => {
          const Icon = group.Icon;
          return (
            <section
              key={group.name}
              className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
            >
              <div className="relative aspect-[3/2] overflow-hidden">
                <img
                  src={group.image}
                  alt={group.imageAlt}
                  width="768"
                  height="512"
                  loading="lazy"
                  className="block h-full w-full object-cover object-center"
                />
                <span
                  className="absolute bottom-3 left-3 grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-md"
                  style={{ color: group.color }}
                >
                  <Icon size={21} />
                </span>
              </div>
              <div className="p-4">
                <p
                  className="text-xs font-black uppercase tracking-[.12em]"
                  style={{ color: group.color }}
                >
                  {group.kicker}
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {group.name}
                </h3>
                <ToolRows group={group} compact={compact} />
              </div>
            </section>
          );
        })}
      </div>
      <div className="mt-7 grid gap-3 md:hidden">
        {GROUPS.map((group, index) => (
          <details
            key={group.name}
            open={index === 0}
            className="group rounded-2xl border border-slate-200 bg-white px-4"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 font-black text-slate-950">
              <span className="flex items-center gap-3"><group.Icon size={22} style={{color:group.color}} aria-hidden="true"/>{group.name}</span>
              <span
                className="text-xl transition-transform group-open:rotate-45"
                style={{ color: group.color }}
              >
                +
              </span>
            </summary>
            <ToolRows group={group} compact={compact} />
          </details>
        ))}
      </div>
      {compact && (
        <div className="mt-8 text-center">
          <Link href="/get-started#all-features" className="btn-secondary">
            Explore the complete toolkit <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}
