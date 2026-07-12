// Public /how-it-works page — auto-scrolling infographic presentation of
// the GetGuac flow. Each step is a self-contained slide with an inline
// SVG illustration, AI-mascot avatars, and a narrated voiceover via the
// browser SpeechSynthesis API (no audio file needed). Press Play and the
// presentation scrolls itself; pause/skip/mute controls live in the
// bottom-right. Prints as a clean PDF if you Ctrl/Cmd-P.

'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import GuacMascot from '../../components/GuacMascot'
import {
  Sparkles, Copy, BarChart3, ThumbsUp, ShieldCheck, ArrowRight,
  Smartphone, Globe, Receipt, Tag, Play, Pause, Volume2, VolumeX,
  ChevronLeft, ChevronRight, ShoppingCart, BadgePercent, Coins,
  MessageCircle, CalendarDays, Store, Gamepad2, Package,
} from 'lucide-react'

// ─── Slide content ────────────────────────────────────────────────────────
// Adding/removing a slide = edit this array. Narration is the voiceover
// SpeechSynthesis reads aloud when that slide enters view.
const SLIDES = [
  {
    n: 'hero',
    accent: 'emerald',
    type: 'hero',
    title: 'From receipt to insight, in seconds.',
    narration: "Welcome to GetGuac — your money's wingman. Every receipt you've ever lost, every fee you didn't notice, every subscription that keeps quietly draining your account... GetGuac catches it all. Snap a quick photo, forward an emailed receipt, or drop in a credit-card statement, and watch Guac-AI turn raw paper into searchable, scored, beautifully categorized spending data. No spreadsheets. No manual typing. No more shoeboxes of crumpled receipts. Ready? Here's the whole flow, end to end. Take your time — each slide is yours to read.",
    durationMs: 30000,
  },
  {
    n: 1,
    accent: 'emerald',
    icon: <Receipt size={26} className="text-emerald-700" />,
    title: 'Get a receipt',
    subtitle: 'Three ways in',
    bullets: [
      ['Camera', 'Snap a paper receipt from the mobile app — single shot or batch of up to three at a time.'],
      ['Email', 'Forward an e-receipt to your free you+g@getguac.app inbox. It auto-files in 10 minutes.'],
      ['Statement (optional)', "Want a complete picture? Drop a credit-card or bank statement PDF and every line becomes a receipt row. Totally optional — skip it if you'd rather just snap and forward."],
    ],
    art: 'capture',
    narration: "Step one. Getting receipts into GetGuac is honestly the easiest part. Three different ways, all designed to fit your real life. Way number one — your phone's camera. Just snap that paper receipt at the restaurant, the gas station, the grocery store. Crumpled, faded, even folded — GetGuac handles it. Got a stack of receipts? Batch mode lets you fire off up to three in a row. Way number two — email. Every GetGuac account comes with its own free at-getguac-dot-app inbox. Forward your Amazon order confirmations, your Uber receipts, your subscription renewals... and within ten minutes they file themselves. And way number three is completely optional — credit card or bank statements. If you want a complete picture of your spending, drop a statement PDF onto the Statements page and every single line becomes a fully-tracked receipt row. But you don't have to. Many people are happy just snapping and forwarding — the choice is always yours.",
    aiPeople: ['camera', 'email', 'statement'],
    durationMs: 32000,
  },
  {
    n: '1b',
    accent: 'lime',
    icon: <Receipt size={26} className="text-lime-700" />,
    title: 'Your @getguac.app inbox',
    subtitle: 'Built for online shopping',
    bullets: [
      ['Your own address', 'Pick any handle: you@getguac.app. Yours forever, free with every account.'],
      ['Forward receipts', 'Send any receipt to you+g@getguac.app — the +g tag tells our mail server to auto-file and parse it within ten minutes.'],
      ['Real two-way mail', 'It is a full mailbox: open, read, reply, send. Not just a parsing trick.'],
      ['Shopping shield', 'Hand it out to merchants instead of your real email. Promos, spam, breaches stay outside your personal inbox.'],
    ],
    art: 'inbox',
    narration: "Let's talk about that email inbox a little more — because it's a real superpower, not a footnote. When you sign up for GetGuac, you pick any handle you want — your name, a nickname, whatever — and you get a permanent, free at-getguac-dot-app address. Now here's the trick. To capture a receipt, just forward it to you-plus-g at getguac dot app — that plus-g tag tells our mail server to auto-file it, and GetGuac polls that folder every ten minutes looking for receipts to parse. The inbox is a real mailbox — you can open it, read messages, reply, send new email, even attach files. It is not a parsing-only trick. And the best part? Stop handing your personal email to every random store and newsletter. If someone gets breached, if a merchant goes spam-crazy, if a loyalty program won't stop emailing you — it never touches your real inbox. Your shopping life lives in GetGuac. Your personal life stays clean.",
    aiPeople: ['email'],
    durationMs: 36000,
  },
  {
    n: 2,
    accent: 'lime',
    icon: <Sparkles size={26} className="text-lime-700" />,
    title: 'Guac-AI reads it',
    subtitle: '5–15 seconds',
    bullets: [
      ['Store + date + total', 'Tax, payment method, last-4 of the card. Even handwritten totals on faded paper.'],
      ['Itemized line items', 'Every SKU, qty, price. Items become history you can search by name.'],
      ['Refund policies', 'Printed on the receipt? Captured. Not printed? Curated store defaults fill the gap.'],
    ],
    art: 'parse',
    narration: "Step two — and this is where the magic really kicks in. Guac-AI reads your receipt. We're talking five to fifteen seconds — faster than you can finish your coffee. Behind the scenes, Google's Gemini vision model scans the image, with Groq's lightning-fast inference as backup, and OCR cleanup to catch anything the first pass missed. What does it pull out? Everything. The store name. The date. The total. The tax. Your payment method. The last four digits of your card. Every single line item — every SKU, every quantity, every price — becomes searchable history. Want to know how much you've spent on coffee beans this year? Search the item name. Want to find that warranty info from that blender you bought last month? It's there. Refund policies printed on the receipt? Captured. Not printed? Don't worry — we maintain curated defaults for twenty-five major merchants like Amazon, Costco, and Home Depot, so the policy is always one tap away.",
    aiPeople: ['gemini', 'groq', 'ocr'],
    durationMs: 34000,
  },
  {
    n: 3,
    accent: 'amber',
    icon: <Copy size={26} className="text-amber-700" />,
    title: 'Duplicates get caught',
    subtitle: 'Capture-time + sweep',
    bullets: [
      ['Same receipt, twice', "Two camera shots of the same restaurant bill won't both land in the table."],
      ['Email + camera', 'Forward an Amazon receipt and snap the box — Guac-AI notices the match.'],
      ['Smart matching', 'Normalized store names + ±1 cent tolerance — GLORY DAYS GRILL still equals Glory Days Grill.'],
    ],
    art: 'dedup',
    narration: "Step three. Here's a real problem that nobody else solves cleanly. You snap your dinner receipt at the restaurant. Then the restaurant emails you a copy. Then a week later your credit card statement lands. That's the same dinner — three different times — and most apps would happily clutter your books with three duplicate rows. Not GetGuac. Our duplicate detection is smart. It catches photos taken twice. It catches the email-plus-camera double-up. It catches GLORY DAYS GRILL in all caps versus Glory Days Grill in mixed case versus Glory Days Grill Restaurant Incorporated with a period — they all collapse into one row, because we normalize the names before comparing. And it allows a one-cent wobble on the total, so AI rounding never blocks a match. Three duplicates? Become one keeper. Automatically. Every time.",
    aiPeople: ['sleuth'],
    durationMs: 30000,
  },
  {
    n: 4,
    accent: 'sky',
    icon: <Tag size={26} className="text-sky-700" />,
    title: 'Auto-categorize',
    subtitle: 'Rules + AI',
    bullets: [
      ['12 built-in categories', 'Groceries, dining, gas, electronics, home, charity, and more — out of the box.'],
      ['Your own categories', 'Add custom ones — Pet, Yoga, Side Hustle — with their own emoji and color.'],
      ['Bulk auto-categorize', 'One button on Receipts assigns the obvious ones; you confirm or override the rest.'],
    ],
    art: 'categorize',
    narration: "Step four. Now your receipts are clean, parsed, and de-duplicated — but they still need to make sense. That's categorization. Out of the box, GetGuac ships with twelve thoughtful categories: groceries, dining, gas, electronics, home, clothing, health, entertainment, travel, charity, business, and other. But here's where it gets personal. You can add your own custom categories — Pet supplies, Yoga, Side hustle, Wedding fund, whatever you need — each with its own emoji and color, so your dashboard reflects how YOU actually think about money. And the categorization itself? Hit one button — 'Auto-categorize' — and rules-plus-AI work together to assign the obvious ones in seconds. Groceries from Whole Foods? Auto-tagged. Gas from Shell? Done. Charity donations from your church? Caught. You just review and confirm the edge cases.",
    aiPeople: ['tagger'],
    durationMs: 32000,
  },
  {
    n: 5,
    accent: 'indigo',
    icon: <BarChart3 size={26} className="text-indigo-700" />,
    title: 'See where it all went',
    subtitle: 'Dashboard + Reports',
    bullets: [
      ['Spending by Store', "Top merchants by dollar, grouped across name variants so Amazon doesn't split into five bars."],
      ['Category breakdown', '1M / 3M / 1Y / all-time slices, with tax separated out for business filing.'],
      ['Repeat purchases', 'Items you bought again — track price drift on the things you actually use.'],
    ],
    art: 'dashboard',
    narration: "Step five. Here's where everything comes together and you finally see your money clearly. The dashboard shows your top stores by dollar — and crucially, it groups across name variants. So Amazon, Amazon Marketplace, Amazon dot com Inc., and Amzn Mktp don't split into five different bars — they're ONE bar, the way they should be. The Reports page slices your spending by category, over the last month, three months, a year, or your entire history. Tax gets broken out separately, which is huge for business filing or charitable deductions. And here's the favorite feature of every power user: repeat purchases. Items you've bought more than once. The same shampoo you reorder every six weeks. The price has gone up forty percent over the past year. You didn't know. Now you do.",
    aiPeople: ['analyst'],
    durationMs: 32000,
  },
  {
    n: '5b',
    accent: 'lime',
    icon: <ShoppingCart size={26} className="text-lime-700" />,
    title: 'Smashlist — your list writes itself',
    subtitle: 'Predictive shopping list',
    bullets: [
      ['Predicted from your receipts', "GetGuac learns what you rebuy and how often — milk every week, detergent every six weeks — and queues it up before you run out."],
      ['Grouped by store', 'Items sort under the store you usually buy them from, with brand logos and an estimated price per item, so each trip plans itself.'],
      ['Share it in one tap', 'Send the list to family over WhatsApp, text, or email — everyone shops from the same list.'],
      ['Smash as you shop', 'Tap an item in the aisle to smash it off the list. Cart full, list clear, nothing forgotten.'],
    ],
    art: 'smashlist',
    narration: "Now for the feature families end up fighting over — the Smashlist. Here's the problem with every shopping-list app ever made: you still have to write the list. GetGuac doesn't ask you to. Because it has already read your receipts, it knows what you buy and how often you buy it. Milk every week. Dog food every three weeks. Laundry detergent every six. So the Smashlist quietly fills itself with the things you're about to run out of — before you run out. Open it, and everything is grouped by the store you usually buy it from, with the brand logo and an estimated price next to each item, and a count of what's waiting at each store. Your Costco run and your grocery run basically plan themselves. Heading out? Share the list with your family in one tap — WhatsApp, text message, whatever you use — so everyone works from the same list. And in the aisle, when something lands in your cart, you smash it off the list. That part's more satisfying than it has any right to be.",
    aiPeople: ['predictor'],
    durationMs: 34000,
  },
  {
    n: '5c',
    accent: 'amber',
    icon: <BadgePercent size={26} className="text-amber-700" />,
    title: 'Steals — pay less for what you rebuy',
    subtitle: 'Live price hunting',
    bullets: [
      ['Live shopping search', 'Steals runs a real, current shopping search across stores for the things you buy — today’s prices, not last month’s.'],
      ['Starts from your receipts', 'Tap Find deals on any item you’ve bought — GetGuac already knows the exact brand and size from your receipt.'],
      ['Dial in the specifics', 'Size, count, flavor — quick dropdowns make sure a 12-pack is compared against 12-packs, not a single can.'],
      ['Instant when it matters', 'Popular searches are cached, so results often come back in a blink.'],
    ],
    art: 'steals',
    narration: "And once the Smashlist tells you what you need, Steals makes sure you don't overpay for it. Steals is GetGuac's deal hunter. Pick anything you rebuy — your coffee, your protein powder, your dog's food — and Steals runs a live shopping search across the internet, lining up real prices from real stores, right now. Not last month's prices. Today's. It starts from your own receipts, so it already knows the exact brand and the exact size you buy. And you can dial in the specifics with quick dropdowns — size, count, flavor — so a twelve-pack gets compared against twelve-packs, not against a single can. Found a better price? That's a Steal. The savings go straight back into your pocket — and into your GuacMoney tally, which we'll get to in a moment. Stop hoping you got a good price. Know it.",
    aiPeople: ['deals'],
    durationMs: 32000,
  },
  {
    n: '5d',
    accent: 'sky',
    icon: <Package size={26} className="text-sky-700" />,
    title: 'Your Stash — every product you own',
    subtitle: 'A living product library',
    bullets: [
      ['Built automatically', 'Every item from every receipt files itself into your Stash — one card per product, across every store you bought it from.'],
      ['Rebuy smarter', 'See how often you repurchase something and what you paid each time, so price creep never sneaks past you.'],
      ['Rate what you own', 'Star the products themselves — the keepers and the regrets — and your future shopping gets sharper.'],
      ['One tap to act', 'From any Stash card, send the item to your Smashlist for the next trip or fire off a Steals search for a better price.'],
    ],
    art: 'stash',
    narration: "Here's a question you've probably never had a good answer to: what do you actually own? The Stash answers it. Every item from every receipt files itself into your Stash automatically — one card per product, no matter which store you bought it from or how the receipt spelled it. Open a card and you see your whole history with that product. How often you rebuy it. What you paid each time. Whether the price has been creeping up while you weren't looking. You can rate the products themselves — mark the keepers, flag the regrets — and every rating makes your future shopping a little sharper. And each card is a launchpad: one tap sends the item to your Smashlist for the next trip, another fires off a Steals search to see if someone's selling it cheaper right now. Your Stash isn't a list you maintain. It's a library that builds itself.",
    aiPeople: ['librarian'],
    durationMs: 32000,
  },
  {
    n: 6,
    accent: 'rose',
    icon: <ThumbsUp size={26} className="text-rose-700" />,
    title: 'Worth it?',
    subtitle: 'Decision feedback loop',
    bullets: [
      ['Rate every purchase', 'Five-star Worth-It rating per receipt — takes 2 seconds.'],
      ['GuacScore', 'A single number for how well you are spending that tightens as low-rated purchases drop off.'],
      ['Bank Bite', 'Interest, fees, penalties from your statements — the wizard nudges you when they are avoidable.'],
    ],
    art: 'worthIt',
    narration: "Step six. The hardest question in personal finance isn't 'how much did I spend' — it's 'was it worth it?' GetGuac's Worth-It rating turns every purchase into a two-second decision. Tap stars from one to five. That's it. Five stars means you'd buy it again in a heartbeat. One star means you regret it. Over time, those ratings roll into your GuacScore — a single number that captures how well you're actually spending. Watch it climb as you cut the low-rated stuff. And then there's the Bank Bite watcher — the GuacWizard. It scans your statements for interest charges, late fees, penalty fees, foreign transaction fees... and it tells you exactly which ones were avoidable, so you can stop bleeding money to your bank next month. This is the part nobody else does. This is the part that pays for itself.",
    aiPeople: ['judge'],
    durationMs: 34000,
  },
  {
    n: '6b',
    accent: 'amber',
    icon: <Receipt size={26} className="text-amber-700" />,
    title: 'Returns & refunds, finally tracked',
    subtitle: "Don't lose money you're owed",
    bullets: [
      ['Per-item refund window', "Every receipt parses the store's refund policy: 30 days, 90 days, lifetime — even item categories with their own rules (electronics 15 days vs general 90 days)."],
      ['Countdown timer per item', "Open any receipt and see exactly how many days you have left to return each line — color-codes red as the window closes."],
      ['Mark items returned', "Tap a checkbox on the item. We track partial returns (returned 2 of 3) and the refund value so the receipt totals stay accurate."],
      ['Returns report', "A dedicated /returns page lists everything you've sent back, with running totals so you know how much money has come back this year."],
      ['Curated store defaults', "Even when the receipt doesn't print the policy, GetGuac knows Amazon is 30 days, Costco is essentially lifetime, Lowe's is 90, Apple is 14, and so on — 25+ major merchants pre-loaded."],
    ],
    art: 'returns',
    narration: "Here is something most people lose money on every year. Refund windows. You buy that thing, you mean to return it, you forget, and a month later you discover the window closed. That money is now gone forever. GetGuac fixes this. Every time we parse a receipt, we also extract the store's refund policy — if it's printed. Thirty days. Ninety days. Lifetime. Even category-specific rules, like Best Buy's fifteen days for electronics versus ninety for everything else. Open any receipt and you see, per line item, a countdown timer of exactly how many days you have left to return it. As the deadline approaches, the timer turns yellow, then red. Decide to actually send something back? Tap the checkbox. GetGuac handles partial returns — like returned two of three items — and updates the receipt's effective total so your dashboard stays accurate. And there's a dedicated Returns page that lists every refund you've claimed, with running totals showing exactly how much money has come back into your pocket this year. For receipts that don't print a policy at all — Amazon emails, for example — we ship curated defaults for over twenty-five major merchants. Amazon is thirty days. Costco is essentially lifetime. Lowe's is ninety. Apple is fourteen. So even when the receipt is silent, GetGuac isn't.",
    aiPeople: ['refund'],
    durationMs: 42000,
  },
  {
    n: '6c',
    accent: 'indigo',
    icon: <Sparkles size={26} className="text-indigo-700" />,
    title: "GuacWizard — magically protects your money",
    subtitle: 'Your money wizard · honest, never preachy',
    bullets: [
      ['Bank Bite watcher', "Surfaces every dollar of interest, fees, and penalties from your statements — and exactly which card charged them."],
      ['Avoidable vs. unavoidable', "Knows the difference between an APR charge you couldn't escape and a $35 NSF you absolutely could. Polite nudges only on the avoidable ones."],
      ['Top regrets list', "Receipts you rated 1 or 2 stars, sorted by dollars wasted. Read it once a quarter to spot the pattern."],
      ['Insights, not lectures', "'You paid $187 in interest this month — paying the balance in full would save it every month.' Calm, specific, actionable. No shame, no buzzwords."],
      ['Periodic patterns', "Spots subscriptions you forgot, restaurant overspends, gas-station impulse buys — and points them out kindly, on your time."],
    ],
    art: 'wizard',
    narration: "Step seven. Meet the GuacWizard — your money wizard, who magically protects your money. Calm, wise, and never preachy. Not the kind that shames you into a budget app you delete in two weeks. The Wizard's specialty is the Bank Bite. It scans your credit-card statements and surfaces every dollar you paid in interest, fees, and penalties — broken down by which card charged what. But here's the key. The Wizard knows the difference between an APR charge you couldn't really escape, and a thirty-five dollar overdraft fee you absolutely could have. It only nudges you about the avoidable stuff. No nagging about things you can't change. Then there's the Top Regrets list — your receipts rated one or two stars, sorted by dollars spent. Reading that list once a quarter is the single highest-leverage habit-builder we've shipped. People look at it, they spot the pattern — the late-night Amazon impulses, the takeout when they're tired, the subscription they forgot about — and they fix it. Quietly. On their own time. The Wizard speaks in plain English. 'You paid one hundred eighty-seven dollars in interest this month. Paying the balance in full would save that every month going forward.' That's it. Calm. Specific. Actionable. No shame, no preachy tone, no buzzwords. Just honest information, delivered like a friend who happens to be really good with money would.",
    aiPeople: ['wizard'],
    durationMs: 42000,
  },
  {
    n: '6d',
    accent: 'sky',
    icon: <Tag size={26} className="text-sky-700" />,
    title: 'Car Miles — track every drive',
    subtitle: 'For taxes, reimbursements, business runs',
    bullets: [
      ['Share-to-track', "Share any Google Maps destination to GetGuac — the trip records itself with from / to / distance / date."],
      ['Auto-distance', "Reverse-geocodes your current location as 'From' so you don't have to type anything. Distance computed from the maps link."],
      ['Tax-ready logs', "Tag each trip Business, Medical, Charity, or Personal. End-of-year export gives you the audit-ready mileage log the IRS wants."],
      ['Open in Maps', "Every saved trip has a one-tap button to open Google Maps for directions if you do it again."],
      ['No background tracking', "We never wake up in the background, never ping your location while you're not driving. Location is read once, when you share."],
    ],
    art: 'miles',
    narration: "One more thing worth knowing about — Car Miles. If you ever drive for work, for clients, for medical appointments, or for charity, you can deduct those miles from your taxes — but only if you have a log. Most people don't, because writing down every trip is exhausting. GetGuac makes it a one-tap habit. When you're heading somewhere, share the destination from Google Maps directly to GetGuac. We reverse-geocode your current location as the From address, pull the destination and distance straight from the maps link, and save the trip with a single tap. Tag it Business, Medical, Charity, or Personal. At year-end, export the full mileage log — audit-ready for the IRS, formatted the way they want it. And privacy-wise — we don't track you in the background. We don't ping your location while you sleep. Location is read once, when you share. That's it.",
    aiPeople: ['car'],
    durationMs: 32000,
  },
  {
    n: '6e',
    accent: 'emerald',
    icon: <Coins size={26} className="text-emerald-700" />,
    title: 'GuacMoney — watch your wins add up',
    subtitle: '1,000 GM = $1 of value',
    bullets: [
      ['Every receipt counts', 'Each receipt you capture adds 100 GuacMoney to your tally.'],
      ['Savings become GuacMoney', 'Every dollar that stays in your pocket — refunds you claim in time, not-worth-it purchases you flag and cut — counts as 1,000 GM.'],
      ['Referrals too', 'Invite a friend who joins and 1,000 GM lands on your tally.'],
      ['A scoreboard, not a gimmick', 'GuacMoney measures real value: 1,000 GM represents $1 you kept. The money was always yours — GuacMoney just makes the wins visible.'],
    ],
    art: 'guacmoney',
    narration: "Let's talk about GuacMoney — the scoreboard for every win GetGuac helps you land. Here's how it adds up. Every receipt you capture? One hundred GuacMoney. Every dollar that comes back to you or stays with you — a refund you claimed before the window closed, a not-worth-it purchase you flagged and cut from your life — one thousand GuacMoney per dollar. Invite a friend who joins? One thousand more. And here's the honest part — the part we're genuinely proud of. One thousand GuacMoney represents one dollar of real value. Not a coupon. Not a gift card you have to unlock. The money was yours all along — GetGuac just helped you keep it, and GuacMoney makes that visible. So when you watch the tally climb, you're literally watching your own good decisions pay off. It turns saving money — which usually feels like deprivation — into something that feels like winning. Because it is.",
    aiPeople: ['tally'],
    durationMs: 34000,
  },
  {
    n: '6f',
    accent: 'emerald',
    icon: <MessageCircle size={26} className="text-emerald-700" />,
    title: 'Guac AI — ask your receipts anything',
    subtitle: 'Your money, conversational',
    bullets: [
      ['A chat that knows your data', 'A pinned Guac AI thread lives right in your chat — ask about your own spending in plain English.'],
      ['Grounded in your receipts', 'Answers come from a snapshot of your actual receipts, stores, and totals — not generic money advice.'],
      ['Instant recall', '“How much have I spent at Costco?” “When did I buy the blender?” Ask the question; get the answer.'],
      ['Private like everything else', 'The conversation and the data behind it stay inside your account.'],
    ],
    art: 'guacai',
    narration: "Now meet the newest member of the team — Guac AI. It's a chat thread, pinned right at the top of your messages, and it knows one thing better than any chatbot on the planet: your receipts. Because its answers are grounded in a snapshot of your actual data — your stores, your items, your totals — you can just... ask. How much have I spent at Costco this year? When did I buy the blender, and what did I pay? What's my biggest grocery item this month? Plain English in, straight answers out. No dashboards to dig through, no filters to configure. It's the difference between owning your data and being able to talk to it. And like everything else in GetGuac, the conversation stays inside your account — grounded in your data, visible only to you.",
    aiPeople: ['assistant'],
    durationMs: 30000,
  },
  {
    n: '6g',
    accent: 'amber',
    icon: <CalendarDays size={26} className="text-amber-700" />,
    title: 'Bills & planning, one calendar ahead',
    subtitle: 'See what’s coming',
    bullets: [
      ['Bills calendar', 'Recurring subscriptions found in your spending get projected onto their next due dates — no more surprise renewals.'],
      ['Plan the big stuff', 'Retirement, college, healthcare, and emergency-fund calculators — plain inputs, honest math, no jargon.'],
      ['Resources hub', 'A free, public library of no-nonsense money guides — no account needed.'],
    ],
    art: 'bills',
    narration: "GetGuac doesn't just explain where your money went — it looks ahead. The Bills calendar takes the recurring charges hiding in your spending — the streaming services, the memberships, the annual renewals you always forget — and projects them forward onto their next due dates. You see the month before it happens. No more surprise renewals the day after the refund window closes. And for the big-picture stuff, there's a full set of planning calculators: retirement, college, healthcare, emergency fund. Plain inputs, honest math, and answers in dollars — not jargon. There's also a free public Resources hub stocked with no-nonsense money guides — open to everyone, account or not. Clarity about last month is good. Clarity about next month is better.",
    aiPeople: ['bills'],
    durationMs: 30000,
  },
  {
    n: '6h',
    accent: 'lime',
    icon: <Store size={26} className="text-lime-700" />,
    title: 'Marketplace — deals for everyone',
    subtitle: 'No account required',
    bullets: [
      ['Search live deals', 'The same price-hunting engine behind Steals, open to the public — search any product and compare stores side by side.'],
      ['Stores directory + coupons', 'Browse major retailers with current coupons and promo codes one tap away.'],
      ['Save your searches', 'Keep a saved search on anything you plan to buy and check back for a better price.'],
    ],
    art: 'market',
    narration: "And some of GetGuac is simply free for the whole internet. The Marketplace takes the same live price-hunting engine that powers Steals and opens it to everyone — no account required. Search any product and it lines up real, current prices from real stores, side by side. Browse the Stores directory and every major retailer comes with its current coupons and promo codes one tap away — check before you check out, every time. Planning a bigger purchase? Save the search and come back to see where the price has moved. It's the front door to GetGuac: start saving money before you've even signed up.",
    aiPeople: ['market'],
    durationMs: 28000,
  },
  {
    n: '6i',
    accent: 'rose',
    icon: <Gamepad2 size={26} className="text-rose-700" />,
    title: 'Guac Arcade — 15 free games',
    subtitle: 'Playing earns GuacMoney',
    bullets: [
      ['Classics, remade', 'A maze muncher, asteroids, darts, brick-breaker, invaders, a daily word puzzle, even full chess — free in your browser, no download.'],
      ['Goal games', 'Debt-free, dream-house, college-fund and retirement games that turn your savings goals into something you can play.'],
      ['+50 GuacMoney per game, per day', 'Your first finished round of each game every day adds 50 GuacMoney to your tally.'],
      ['Leaderboards', 'Signed-in players save their scores and compete for the top spot.'],
    ],
    art: 'arcade',
    narration: "And because money shouldn't always be homework — there's the Guac Arcade. Fifteen free games, right in your browser, no download, no coins needed. The classics are all here, remade with a money twist: a maze muncher, asteroids, darts, a brick-breaker, space invaders, a daily word puzzle, even full chess. And then there are the goal games — where the brick wall is your debt, the tower you're stacking is your dream house, and the platforms you're climbing lead to a one-million-dollar retirement. Here's the kicker: playing pays. Your first finished round of each game, every day, adds fifty GuacMoney to your tally. Sign in and your high scores hit the leaderboards, where the top spot is always up for grabs. Take a break. It counts.",
    aiPeople: ['arcade'],
    durationMs: 32000,
  },
  {
    n: 7,
    accent: 'emerald',
    icon: <ShieldCheck size={26} className="text-emerald-700" />,
    title: 'Security you can audit',
    subtitle: 'Row-level enforcement, end-to-end',
    bullets: [
      ['Row-level security (RLS) in Postgres', 'Every receipt, item, store, reward, email is gated by your auth.uid() in the database itself — not just in app code.'],
      ['Encrypted at rest, TLS in transit', "Supabase storage encrypts your receipt photos at rest; every request is TLS 1.2+. Mailbox passwords are AES-GCM encrypted with a separate key the app code can't read."],
      ['Biometric unlock on mobile', "Fingerprint or Face ID gates the app on every cold start. Credentials live in Android Keystore / iOS Keychain — never plain-text on disk."],
      ['No third-party trackers', "No Google Analytics, no Facebook pixel, no ad SDKs. We don't sell, share, or analyze your data for anyone else's benefit."],
      ['Diagnostic logs are yours too', "Even the debug events the mobile app uploads sit behind RLS — only you and you alone can read your own /api/me/logs."],
    ],
    art: 'security',
    narration: "Step seven. Security is not a checkbox at GetGuac — it's how the whole thing is built. Let me get specific. Every single row in our database — every receipt, every item, every store, every reward, every parsed email — is gated by row-level security. That means even if someone managed to bypass our app code entirely and hit the database directly, they would only ever see rows where the auth-uid matches their token. The enforcement lives in Postgres itself. Your receipt photos? Encrypted at rest in Supabase storage. Every request? TLS 1.2 or better. The passwords for your mail server? Encrypted with AES-GCM using a key that the application code cannot read. On mobile, your sign-in is gated by fingerprint or Face ID on every cold start — and the credentials sit inside the Android Keystore or iOS Keychain, not plain-text files on disk. No Google Analytics, no Facebook pixel, no ad SDKs anywhere in the app. And even the diagnostic debug logs the mobile app uploads to help us help you? Same RLS rule. Only you can read your own logs. Nobody else. Ever.",
    aiPeople: ['shield'],
    durationMs: 40000,
  },
  {
    n: 8,
    accent: 'rose',
    icon: <ShieldCheck size={26} className="text-rose-700" />,
    title: 'Your data, your call',
    subtitle: 'Delete anything, any time',
    bullets: [
      ['Delete individual receipts', 'Trash icon on any row. Cascades through receipt_items, refund policies, and the photo in storage.'],
      ['Delete individual emails', 'The inbox lets you delete any message — body, attachments, parsed receipt link, all of it.'],
      ['Privacy sweep', 'Profile → Privacy lets you wipe categories of data — emails, receipts, items, statements, logs — in one tap.'],
      ['Full data export', 'Download every row we have about you as a JSON archive. Take it with you wherever.'],
      ['Delete the whole account', "Account → Delete account. One click, full purge: receipts, emails, photos, debug logs, mailbox creds. Gone in seconds. We don't keep backups of deleted accounts."],
    ],
    art: 'data',
    narration: "Step eight — and this one matters as much as security. Your data is yours, and you can delete it whenever you want. Want to remove one receipt? Hit the trash icon on its row. Gone — along with its line items, refund policies, and the photo in storage. Want to delete one specific email from your inbox? Open it, hit delete. Body, attachments, the link to any parsed receipt, all of it. Need to do bulk cleanup? Open Profile, tap Privacy, and you can wipe entire categories of data — all emails, all receipts, all items, all statements, all diagnostic logs — in a single tap. Want a copy of everything before you leave? Download a full JSON archive of every row we have about you. Take it wherever. And if you ever decide GetGuac isn't for you anymore? Account, Delete account. One click. We purge everything in seconds — receipts, photos, emails, items, logs, mailbox credentials — and we don't keep backups of deleted accounts. No 'request your data deletion via email and wait thirty days' nonsense. It's a button. You press it. It's gone.",
    aiPeople: ['shield'],
    durationMs: 38000,
  },
  {
    n: 'closing',
    accent: 'emerald',
    type: 'closing',
    title: 'Every receipt stays in your account.',
    narration: "So here's the short version. GetGuac captures every receipt from camera, email, or statement. Guac-AI parses it in seconds. Duplicates collapse automatically. Categories assign themselves. Your dashboard reveals exactly where your money goes. Worth-It ratings turn it into smarter decisions. And your bank fees stop bleeding you. The Smashlist writes your next shopping list before you run out, Steals hunts down a better price on it, your Stash remembers every product you own, and GuacMoney keeps score of every dollar you keep. Ask Guac AI anything about your own spending, see next month's bills before they land, and unwind in the Guac Arcade — where even playing earns GuacMoney. All while your data stays yours, locked behind row-level security, deletable any time. So... ready to take control? Tap Get Started, snap your first receipt, and watch your finances finally make sense. Welcome to GetGuac. Welcome to spending smarter.",
    durationMs: 26000,
  },
]

export default function HowItWorksPage({ embedded = false, compact = false }) {
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [voices, setVoices] = useState([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(null)
  const [voicePickerOpen, setVoicePickerOpen] = useState(false)
  const slideRefs = useRef([])
  const advanceTimer = useRef(null)

  // ─── Load voices + pick the most natural-sounding one available ─────────
  // SpeechSynthesis on most platforms ships both "robotic" baseline voices
  // and high-quality "Neural" / "Online" / "Natural" / "Enhanced" voices.
  // Score each candidate, pick the best, expose a dropdown so the user can
  // override.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const load = () => {
      const all = window.speechSynthesis.getVoices()
      const en = all.filter(v => /^en[-_]?/i.test(v.lang))
      // Sort: highest quality + female + en-US first (heuristic — most demo
      // narrations sound best with a clear female voice).
      const scored = en.map(v => {
        const n = v.name
        let s = 0
        if (/natural|neural|online|premium|enhanced|wavenet|studio/i.test(n)) s += 50
        if (/aria|jenny|samantha|karen|joanna|emma|libby|amber|sarah|nova|shimmer/i.test(n)) s += 20
        if (/google/i.test(n)) s += 10
        if (/en-US/i.test(v.lang)) s += 5
        if (/microsoft.*online/i.test(n)) s += 20
        if (/female/i.test(n)) s += 8
        return { v, s }
      }).sort((a, b) => b.s - a.s)
      setVoices(scored.map(x => x.v))
      // Pick the top one if user hasn't chosen yet (or stored choice is gone).
      setSelectedVoiceURI(prev => {
        if (prev && scored.find(x => x.v.voiceURI === prev)) return prev
        return scored[0]?.v?.voiceURI ?? all[0]?.voiceURI ?? null
      })
    }
    load()
    window.speechSynthesis.addEventListener?.('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load)
  }, [])

  // ─── Narration via Web Speech API ───────────────────────────────────────
  // Break the narration into sentences and queue them as separate utterances.
  // Most TTS engines apply better intonation at sentence boundaries, and
  // the small inter-utterance gap sounds like a natural breath.
  const speak = useCallback((text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (muted) return
    window.speechSynthesis.cancel()
    const voice = voices.find(v => v.voiceURI === selectedVoiceURI)
        ?? voices[0]
    // Split on sentence terminators while keeping the punctuation. Falls back
    // to a single chunk if there are no sentence breaks (short text).
    const sentences = text
      .split(/(?<=[.!?…])\s+/)
      .map(s => s.trim())
      .filter(Boolean)
    const chunks = sentences.length > 0 ? sentences : [text]
    chunks.forEach((chunk) => {
      const utter = new SpeechSynthesisUtterance(chunk)
      if (voice) utter.voice = voice
      utter.rate = 0.95       // slightly slower than default for clarity
      utter.pitch = 1.0
      utter.volume = 1.0
      window.speechSynthesis.speak(utter)
    })
  }, [muted, voices, selectedVoiceURI])

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined') return
    window.speechSynthesis?.cancel()
  }, [])

  // ─── Scroll the active slide into view ──────────────────────────────────
  const scrollTo = useCallback((idx, withNarration = true) => {
    setCurrent(idx)
    const el = slideRefs.current[idx]
    // Compact mode is a one-slide-at-a-time carousel — nothing to scroll to,
    // we just swap which slide is visible. Otherwise scroll it into view.
    if (el && !compact) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (withNarration && SLIDES[idx]?.narration) {
      // Slight delay so the scroll lands before the voice starts.
      setTimeout(() => speak(SLIDES[idx].narration), 600)
    }
  }, [speak, compact])

  // ─── Auto-advance timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      stopSpeaking()
      return
    }
    const slide = SLIDES[current]
    if (!slide) return
    advanceTimer.current = setTimeout(() => {
      if (current >= SLIDES.length - 1) {
        setPlaying(false) // reached the end
        return
      }
      scrollTo(current + 1)
    }, slide.durationMs || 11000)
    return () => clearTimeout(advanceTimer.current)
  }, [playing, current, scrollTo, stopSpeaking])

  const togglePlay = () => {
    if (!playing) {
      // Starting from anywhere — re-narrate current slide.
      setPlaying(true)
      if (SLIDES[current]?.narration) speak(SLIDES[current].narration)
    } else {
      setPlaying(false)
    }
  }
  const toggleMute = () => {
    setMuted(m => {
      if (!m) stopSpeaking()
      return !m
    })
  }
  const skip = (dir) => {
    const next = Math.max(0, Math.min(SLIDES.length - 1, current + dir))
    // Narrate the new slide only mid-playback — browsing with ‹ › while
    // paused stays silent (matters most when the deck is embedded compact).
    scrollTo(next, playing)
  }

  // Cleanup speech on unmount
  useEffect(() => () => stopSpeaking(), [stopSpeaking])

  // ─── Track which slide is in view via IntersectionObserver ──────────────
  // (Lets manual user scroll also update the current-slide indicator.)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > 0.55) {
          const idx = Number(e.target.dataset.idx)
          if (!isNaN(idx) && idx !== current) setCurrent(idx)
        }
      })
    }, { threshold: [0.55] })
    slideRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [current])

  return (
    <div className={`${compact ? '' : 'min-h-screen'} bg-gradient-to-br from-emerald-50 via-white to-lime-50 text-gray-800 font-sans`}>
      {/* Top nav — hidden when embedded in another page (e.g. /tour) */}
      {!embedded && (
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-emerald-100 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 shadow-md ring-2 ring-white flex items-center justify-center text-lg">🥑</div>
            <div className="leading-none">
              <div className="text-base font-black tracking-tight text-emerald-900">GetGuac</div>
              <div className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">how it works</div>
            </div>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/" className="font-semibold text-gray-600 hover:text-emerald-800">Home</Link>
            <Link href="/how-email-works" className="hidden sm:inline font-semibold text-gray-600 hover:text-emerald-800">Email</Link>
            <Link href="/security" className="hidden sm:inline font-semibold text-gray-600 hover:text-emerald-800">Security</Link>
            <Link href="/download" className="hidden sm:inline font-semibold text-gray-600 hover:text-emerald-800">Download</Link>
            <Link href="/register" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>
      )}

      {/* Slides */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        {SLIDES.map((slide, idx) => (
          <section
            key={idx}
            ref={el => (slideRefs.current[idx] = el)}
            data-idx={idx}
            className={`${compact ? 'py-7' : 'min-h-[calc(100vh-4rem)] py-10'} ${compact && current !== idx ? 'hidden' : 'flex items-center'} print:break-after-page print:min-h-0 ${
              current === idx ? 'opacity-100' : 'opacity-95'
            } transition-opacity`}
          >
            {slide.type === 'hero' && <HeroSlide slide={slide} />}
            {slide.type === 'closing' && <ClosingSlide slide={slide} />}
            {!slide.type && <StepSlide slide={slide} idx={idx} />}
          </section>
        ))}
      </main>

      {/* Presentation controls (hidden on print). Full-page mode floats them
          bottom-center; compact mode (deck embedded inside another page)
          renders them inline under the slide so they never hover over the
          host page's other sections. */}
      <div className={compact ? 'flex justify-center pb-8 print:hidden' : 'fixed bottom-5 left-1/2 -translate-x-1/2 z-40 print:hidden'}>
        <div className="flex flex-col items-center gap-2">
          {/* Voice picker — opens above the control bar */}
          {voicePickerOpen && voices.length > 0 && (
            <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-emerald-200 p-3 max-h-72 overflow-y-auto w-72">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2 px-1">
                Narration voice
              </div>
              <ul className="space-y-1">
                {voices.slice(0, 20).map(v => (
                  <li key={v.voiceURI}>
                    <button
                      onClick={() => {
                        setSelectedVoiceURI(v.voiceURI)
                        // Preview the new voice on a short phrase.
                        const utter = new SpeechSynthesisUtterance('Hi, this is how I sound.')
                        utter.voice = v
                        utter.rate = 0.95
                        window.speechSynthesis.cancel()
                        window.speechSynthesis.speak(utter)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        v.voiceURI === selectedVoiceURI
                          ? 'bg-emerald-100 text-emerald-900 font-bold'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="font-semibold">{v.name}</div>
                      <div className="text-[10px] text-gray-500">{v.lang}{v.localService ? '' : ' · online'}</div>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setVoicePickerOpen(false)}
                className="mt-2 w-full text-xs text-emerald-700 hover:text-emerald-900 font-semibold py-1"
              >Close</button>
            </div>
          )}

          {/* Main control pill */}
          <div className="flex items-center gap-2 bg-emerald-900/95 text-white px-3 py-2 rounded-full shadow-2xl ring-1 ring-emerald-800">
            <button
              onClick={() => skip(-1)}
              disabled={current === 0}
              aria-label="Previous slide"
              className="w-9 h-9 rounded-full hover:bg-white/10 disabled:opacity-40 flex items-center justify-center transition"
            ><ChevronLeft size={18} /></button>
            <button
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
              className="w-11 h-11 rounded-full bg-lime-400 text-emerald-900 hover:bg-lime-300 flex items-center justify-center shadow-md transition"
            >{playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}</button>
            <button
              onClick={() => skip(1)}
              disabled={current === SLIDES.length - 1}
              aria-label="Next slide"
              className="w-9 h-9 rounded-full hover:bg-white/10 disabled:opacity-40 flex items-center justify-center transition"
            ><ChevronRight size={18} /></button>
            <div className="w-px h-6 bg-white/20 mx-1" />
            <button
              onClick={toggleMute}
              aria-label={muted ? 'Unmute narration' : 'Mute narration'}
              className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition"
            >{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
            <button
              onClick={() => setVoicePickerOpen(v => !v)}
              aria-label="Choose narration voice"
              title="Choose narration voice"
              className="px-2 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition text-xs font-bold"
            >Voice ▾</button>
            <span className="text-xs font-mono tabular-nums pr-1 pl-1 opacity-80">
              {current + 1}/{SLIDES.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Slide layouts                                                           */
/* ─────────────────────────────────────────────────────────────────────── */

function HeroSlide({ slide }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-6 flex-wrap">
        <GuacMascot expression="celebrating" size={160} />
        <div className="flex-1 min-w-[280px]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={12} /> How GetGuac works
          </span>
          <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-gray-900 mt-3 leading-tight">
            From receipt<br />
            <span className="bg-gradient-to-br from-emerald-500 via-lime-500 to-amber-500 bg-clip-text text-transparent">to insight, in seconds.</span>
          </h1>
          <p className="text-lg text-gray-600 mt-3 max-w-2xl">
            Forward an email, snap a photo, or import a credit-card statement — Guac-AI does the rest. Press <strong className="text-emerald-700">Play</strong> to watch the whole flow.
          </p>
          <div className="mt-5 flex gap-2 flex-wrap">
            <Pill icon={<Smartphone size={12} />}>Mobile</Pill>
            <Pill icon={<Globe size={12} />}>Web</Pill>
            <Pill icon={<ShieldCheck size={12} />}>Private by default</Pill>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClosingSlide({ slide }) {
  return (
    <div className="w-full">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-lime-700 text-white p-8 sm:p-12 shadow-xl">
        <div className="flex items-start gap-6 flex-wrap">
          <GuacMascot expression="thumbsup" size={140} />
          <div className="flex-1 min-w-[260px]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={12} /> Yours, only yours
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mt-3 leading-tight">
              {slide.title}
            </h2>
            <p className="text-emerald-50/90 mt-3 max-w-2xl">
              Row-level security at the database means GetGuac literally can&apos;t query your data without your token. No selling, no ad targeting, no resale of merchant data.
            </p>
            <div className="mt-5 flex gap-3 flex-wrap">
              <Link href="/register" className="inline-flex items-center gap-2 bg-white text-emerald-800 px-5 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition">
                Get started <ArrowRight size={16} />
              </Link>
              <Link href="/download" className="inline-flex items-center gap-2 bg-white/10 ring-1 ring-white/30 text-white px-5 py-3 rounded-xl font-bold hover:bg-white/20 transition">
                Download mobile app
              </Link>
            </div>
            {/* Try-before-you-register: a shared demo account pre-loaded with
                the John Doe data, so the curious can poke around the real app
                without creating anything. */}
            <div className="mt-5 rounded-2xl bg-white/10 ring-1 ring-white/25 px-4 py-3 max-w-xl">
              <p className="text-sm font-bold text-white">
                🔎 Want to try it first? Use the shared demo account:
              </p>
              <p className="mt-1.5 text-sm text-emerald-50">
                Email <span className="font-mono font-bold bg-white/15 rounded px-1.5 py-0.5">demo@getguac.app</span>
                {' '}· Password <span className="font-mono font-bold bg-white/15 rounded px-1.5 py-0.5">Guac!Demo2026</span>
              </p>
              <p className="mt-1.5 text-xs text-emerald-100/80">
                It&apos;s a shared, pre-loaded account — look around, then{' '}
                <Link href="/login?demo=1" className="font-bold text-white underline underline-offset-2">sign in here</Link>{' '}
                (we&apos;ll prefill it) or create your own when you&apos;re ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepSlide({ slide, idx }) {
  const A = ACCENTS[slide.accent] || ACCENTS.emerald
  const reverse = idx % 2 === 0
  return (
    <article className={`w-full ${A.bg} rounded-3xl ring-1 ${A.ring} p-6 sm:p-10 shadow-sm`}>
      <div className={`flex gap-8 items-center flex-wrap ${reverse ? 'sm:flex-row-reverse' : ''}`}>
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-3 mb-2">
            <div className={`${A.num} text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-base shadow`}>{slide.n}</div>
            <span className={`${A.sub} text-xs font-bold uppercase tracking-wider`}>{slide.subtitle}</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center gap-3 mb-4">
            {slide.icon}{slide.title}
          </h3>
          <ul className="space-y-3">
            {slide.bullets.map(([label, body], i) => (
              <li key={i} className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                <div>
                  <span className="font-bold text-gray-900">{label}.</span>{' '}
                  <span className="text-gray-700">{body}</span>
                </div>
              </li>
            ))}
          </ul>
          {slide.aiPeople && <AiPeopleStrip people={slide.aiPeople} />}
        </div>
        <div className="flex-shrink-0 mx-auto sm:mx-0 flex flex-col sm:flex-row items-center justify-center gap-5">
          <Art name={slide.art} />
          {SHOTS[slide.title] && (
            <div className="bg-gray-900 p-1.5 rounded-[1.8rem] shadow-xl flex-shrink-0" style={{ width: 168 }}>
              {/* Small real app screenshot, in a phone frame, beside the illustration. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SHOTS[slide.title]} alt={slide.title} className="block w-full rounded-[1.4rem]" loading="lazy" />
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

// Real app screenshots paired (small) with the illustration on slides where
// one fits. Keyed by slide title.
const SHOTS = {
  'Get a receipt': '/showcase/receipts.png',
  'Guac-AI reads it': '/showcase/items.png',
  'Duplicates get caught': '/showcase/receipts.png',
  'Auto-categorize': '/showcase/reports.png',
  'See where it all went': '/showcase/dashboard.png',
  'Smashlist — your list writes itself': '/showcase/shopping.png',
  'Steals — pay less for what you rebuy': '/showcase/steals.png',
  'Your Stash — every product you own': '/showcase/stash.png',
  'GuacMoney — watch your wins add up': '/showcase/dashboard.png',
  'Worth it?': '/showcase/bites.png',
  'Returns & refunds, finally tracked': '/showcase/returns.png',
  'GuacWizard — magically protects your money': '/showcase/guacwizard.png',
}

const ACCENTS = {
  emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-200', num: 'bg-emerald-600', sub: 'text-emerald-700' },
  lime:    { bg: 'bg-lime-50',    ring: 'ring-lime-200',    num: 'bg-lime-600',    sub: 'text-lime-700' },
  amber:   { bg: 'bg-amber-50',   ring: 'ring-amber-200',   num: 'bg-amber-600',   sub: 'text-amber-700' },
  sky:     { bg: 'bg-sky-50',     ring: 'ring-sky-200',     num: 'bg-sky-600',     sub: 'text-sky-700' },
  indigo:  { bg: 'bg-indigo-50',  ring: 'ring-indigo-200',  num: 'bg-indigo-600',  sub: 'text-indigo-700' },
  rose:    { bg: 'bg-rose-50',    ring: 'ring-rose-200',    num: 'bg-rose-600',    sub: 'text-rose-700' },
}

function Pill({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 text-xs font-bold">
      {icon}{children}
    </span>
  )
}

// ─── "AI people" strip ─────────────────────────────────────────────────
// Little avocado-headed avatars that represent the AI agents involved at
// each step. Keeps the brand mascot front-and-centre while making the
// "what's working under the hood" feel concrete.
function AiPeopleStrip({ people }) {
  const ROLES = {
    camera:    { emoji: '📷', label: 'Camera scout' },
    email:     { emoji: '📬', label: 'Email watcher' },
    statement: { emoji: '🏦', label: 'Statement reader' },
    gemini:    { emoji: '✨', label: 'Gemini vision' },
    groq:      { emoji: '⚡', label: 'Groq fallback' },
    ocr:       { emoji: '🔠', label: 'OCR cleanup' },
    sleuth:    { emoji: '🔍', label: 'Dedup sleuth' },
    tagger:    { emoji: '🏷️', label: 'Auto-tagger' },
    analyst:   { emoji: '📊', label: 'Insight analyst' },
    judge:     { emoji: '⚖️', label: 'Worth-It judge' },
    refund:    { emoji: '↩️', label: 'Refund tracker' },
    wizard:    { emoji: '🧙', label: 'GuacWizard coach' },
    shield:    { emoji: '🛡️', label: 'Privacy guard' },
    car:       { emoji: '🚗', label: 'Trip logger' },
    predictor: { emoji: '🛒', label: 'Smashlist predictor' },
    deals:     { emoji: '💸', label: 'Steals hunter' },
    tally:     { emoji: '💰', label: 'GuacMoney tally' },
    librarian: { emoji: '🗃️', label: 'Stash librarian' },
    assistant: { emoji: '💬', label: 'Guac AI' },
    bills:     { emoji: '📅', label: 'Bills planner' },
    market:    { emoji: '🛍️', label: 'Marketplace scout' },
    arcade:    { emoji: '🕹️', label: 'Arcade cabinet' },
  }
  return (
    <div className="mt-5 flex gap-3 flex-wrap items-center">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Under the hood</span>
      {people.map((p) => {
        const r = ROLES[p] || { emoji: '🤖', label: p }
        return (
          <div key={p} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-1.5 pr-3 py-1 shadow-sm">
            <span className="relative w-8 h-8 rounded-full bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 flex items-center justify-center shadow-inner">
              <span className="absolute -top-0.5 -right-0.5 text-[12px] leading-none">{r.emoji}</span>
              <span className="text-base leading-none">🥑</span>
            </span>
            <span className="text-xs font-bold text-gray-700">{r.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Art dispatch ─────────────────────────────────────────────────────
function Art({ name }) {
  switch (name) {
    case 'capture':    return <ArtCapture />
    case 'parse':      return <ArtParse />
    case 'dedup':      return <ArtDedup />
    case 'categorize': return <ArtCategorize />
    case 'dashboard':  return <ArtDashboard />
    case 'worthIt':    return <ArtWorthIt />
    case 'inbox':      return <ArtInbox />
    case 'returns':    return <ArtReturns />
    case 'wizard':     return <ArtWizard />
    case 'miles':      return <ArtMiles />
    case 'security':   return <ArtSecurity />
    case 'data':       return <ArtData />
    case 'smashlist':  return <ArtSmashlist />
    case 'steals':     return <ArtSteals />
    case 'guacmoney':  return <ArtGuacMoney />
    case 'stash':      return <ArtStash />
    case 'guacai':     return <ArtGuacAI />
    case 'bills':      return <ArtBills />
    case 'market':     return <ArtMarket />
    case 'arcade':     return <ArtArcade />
    default: return null
  }
}

// ── New-feature slide illustrations (2026-07-11 additions) ──
function ArtStash() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="stash-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e0f2fe" /><stop offset="1" stopColor="#7dd3fc" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#stash-bg)" />
      {/* shelves of product boxes */}
      <g>
        <rect x="26" y="46" width="148" height="4" rx="2" fill="#0369a1" opacity="0.5" />
        <rect x="26" y="104" width="148" height="4" rx="2" fill="#0369a1" opacity="0.5" />
      </g>
      <g>
        <rect x="34" y="20" width="30" height="26" rx="5" fill="#fff" stroke="#0284c7" strokeWidth="2" />
        <rect x="72" y="14" width="34" height="32" rx="5" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
        <rect x="114" y="24" width="26" height="22" rx="5" fill="#fff" stroke="#0284c7" strokeWidth="2" />
        <rect x="148" y="18" width="22" height="28" rx="5" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
        <rect x="38" y="76" width="34" height="28" rx="5" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
        <rect x="80" y="70" width="26" height="34" rx="5" fill="#fff" stroke="#0284c7" strokeWidth="2" />
        <rect x="114" y="80" width="36" height="24" rx="5" fill="#fff" stroke="#0284c7" strokeWidth="2" />
      </g>
      {/* price-history tag on one box */}
      <g transform="translate(56 120)">
        <rect x="0" y="0" width="88" height="30" rx="8" fill="#fff" stroke="#0284c7" strokeWidth="2" />
        <polyline points="10,20 28,14 46,17 64,8 78,11" fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
      </g>
      <text x="100" y="170" fontSize="11" fontWeight="800" fill="#075985" textAnchor="middle">every product, one card</text>
    </svg>
  )
}

function ArtGuacAI() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="gai-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d1fae5" /><stop offset="1" stopColor="#6ee7b7" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#gai-bg)" />
      {/* question bubble */}
      <g transform="translate(20 28)">
        <rect x="0" y="0" width="104" height="34" rx="12" fill="#fff" stroke="#059669" strokeWidth="2" />
        <path d="M18 34 L14 46 L30 34 Z" fill="#fff" stroke="#059669" strokeWidth="2" />
        <text x="52" y="22" fontSize="12" fontWeight="700" fill="#065f46" textAnchor="middle">Costco total?</text>
      </g>
      {/* answer bubble */}
      <g transform="translate(66 86)">
        <rect x="0" y="0" width="112" height="34" rx="12" fill="#065f46" />
        <path d="M94 34 L100 46 L82 34 Z" fill="#065f46" />
        <text x="56" y="22" fontSize="13" fontWeight="800" fill="#a7f3d0" textAnchor="middle">$412 this year</text>
      </g>
      {/* sparkle */}
      <path d="M162 30 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#059669" />
      <text x="100" y="168" fontSize="11" fontWeight="800" fill="#065f46" textAnchor="middle">grounded in your receipts</text>
    </svg>
  )
}

function ArtBills() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="bills-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset="1" stopColor="#fcd34d" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#bills-bg)" />
      {/* calendar */}
      <g transform="translate(38 30)">
        <rect x="0" y="0" width="124" height="104" rx="10" fill="#fff" stroke="#b45309" strokeWidth="2" />
        <rect x="0" y="0" width="124" height="24" rx="10" fill="#b45309" />
        <rect x="0" y="12" width="124" height="12" fill="#b45309" />
        <circle cx="26" cy="12" r="4" fill="#fef3c7" />
        <circle cx="98" cy="12" r="4" fill="#fef3c7" />
        {/* day cells */}
        {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => (
          <rect key={`${r}-${c}`} x={10 + c * 22} y={32 + r * 17} width="16" height="11" rx="3" fill="#fef9ec" stroke="#fde68a" />
        )))}
        {/* due-date markers */}
        <rect x="54" y="49" width="16" height="11" rx="3" fill="#f59e0b" />
        <rect x="98" y="83" width="16" height="11" rx="3" fill="#ef4444" />
      </g>
      <text x="100" y="160" fontSize="11" fontWeight="800" fill="#92400e" textAnchor="middle">renewals, seen coming</text>
    </svg>
  )
}

function ArtMarket() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="mkt-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ecfccb" /><stop offset="1" stopColor="#bef264" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#mkt-bg)" />
      {/* storefront awning */}
      <g transform="translate(34 28)">
        <rect x="0" y="18" width="132" height="76" rx="8" fill="#fff" stroke="#4d7c0f" strokeWidth="2" />
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M${i * 22} 18 h22 v-8 a11 11 0 0 0 -22 0 z`} fill={i % 2 ? '#65a30d' : '#d9f99d'} stroke="#4d7c0f" strokeWidth="1.5" />
          ))}
        </g>
        <rect x="14" y="40" width="42" height="38" rx="5" fill="#f7fee7" stroke="#65a30d" strokeWidth="2" />
        <text x="35" y="64" fontSize="13" fontWeight="800" fill="#3f6212" textAnchor="middle">-30%</text>
        <rect x="72" y="40" width="46" height="16" rx="8" fill="#65a30d" />
        <text x="95" y="52" fontSize="10" fontWeight="800" fill="#f7fee7" textAnchor="middle">COUPON</text>
        <rect x="72" y="62" width="46" height="16" rx="8" fill="#d9f99d" stroke="#65a30d" strokeWidth="1.5" />
        <text x="95" y="74" fontSize="10" fontWeight="800" fill="#3f6212" textAnchor="middle">$9.97</text>
      </g>
      <text x="100" y="152" fontSize="11" fontWeight="800" fill="#3f6212" textAnchor="middle">open to everyone</text>
    </svg>
  )
}

function ArtArcade() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="arc-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe4e6" /><stop offset="1" stopColor="#fda4af" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#arc-bg)" />
      {/* cabinet */}
      <g transform="translate(52 22)">
        <path d="M0 14 Q0 0 14 0 H82 Q96 0 96 14 V116 H0 Z" fill="#9f1239" />
        <rect x="10" y="12" width="76" height="52" rx="6" fill="#0f172a" />
        {/* maze dots on screen */}
        <g fill="#fde047"><circle cx="24" cy="30" r="3" /><circle cx="38" cy="30" r="3" /><circle cx="52" cy="30" r="3" /><circle cx="66" cy="30" r="3" /></g>
        <circle cx="30" cy="48" r="7" fill="#a3e635" />
        <path d="M30 48 L40 42 L40 54 Z" fill="#0f172a" />
        <circle cx="66" cy="48" r="6" fill="#f472b6" />
        {/* controls */}
        <circle cx="30" cy="86" r="8" fill="#fff" />
        <rect x="27" y="70" width="6" height="14" rx="3" fill="#fff" />
        <circle cx="58" cy="88" r="6" fill="#fde047" />
        <circle cx="76" cy="88" r="6" fill="#a3e635" />
      </g>
      <text x="100" y="162" fontSize="11" fontWeight="800" fill="#881337" textAnchor="middle">first play of the day = +50 GM</text>
    </svg>
  )
}

// ── Slide-specific illustrations (added so no slide reuses another's art) ──
function ArtInbox() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="inbox-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ecfccb" /><stop offset="1" stopColor="#bef264" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#inbox-bg)" />
      <g transform="translate(40 46)">
        <rect x="0" y="0" width="120" height="80" rx="10" fill="#fff" stroke="#65a30d" strokeWidth="2" />
        <path d="M6 10 L60 48 L114 10" fill="none" stroke="#65a30d" strokeWidth="3" strokeLinecap="round" />
        <circle cx="104" cy="10" r="16" fill="#15803d" />
        <text x="104" y="16" fontSize="18" fontWeight="800" fill="#ecfdf5" textAnchor="middle">@</text>
      </g>
      <g transform="translate(34 138)">
        <rect x="0" y="0" width="42" height="13" rx="3" fill="#bbf7d0" />
        <rect x="50" y="0" width="42" height="13" rx="3" fill="#86efac" />
        <rect x="100" y="0" width="42" height="13" rx="3" fill="#4ade80" />
      </g>
      <text x="100" y="172" fontSize="10" fontWeight="700" fill="#3f6212" textAnchor="middle">you@getguac.app</text>
    </svg>
  )
}

function ArtReturns() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="ret-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset="1" stopColor="#fcd34d" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#ret-bg)" />
      <g transform="translate(30 60)">
        <rect x="0" y="14" width="74" height="58" rx="6" fill="#fff" stroke="#b45309" strokeWidth="2" />
        <path d="M0 32 L74 32" stroke="#fcd34d" strokeWidth="3" />
        <path d="M37 14 L37 72" stroke="#fcd34d" strokeWidth="3" />
        <rect x="29" y="6" width="16" height="14" rx="2" fill="#fbbf24" />
      </g>
      <g fill="none" stroke="#b45309" strokeWidth="5" strokeLinecap="round">
        <path d="M118 122 A 32 32 0 1 0 124 70" />
      </g>
      <polygon points="110,64 130,68 118,84" fill="#b45309" />
      <g transform="translate(126 92)">
        <circle cx="22" cy="22" r="22" fill="#fff" stroke="#b45309" strokeWidth="2" />
        <path d="M22 9 L22 22 L33 28" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
      </g>
      <text x="100" y="170" fontSize="11" fontWeight="800" fill="#92400e" textAnchor="middle">money back, on time</text>
    </svg>
  )
}

function ArtWizard() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="wiz-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ede9fe" /><stop offset="1" stopColor="#c4b5fd" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#wiz-bg)" />
      {/* magic wand */}
      <g transform="rotate(-32 70 110)">
        <rect x="58" y="44" width="11" height="84" rx="5" fill="#4c1d95" />
        <rect x="58" y="44" width="11" height="22" rx="5" fill="#a78bfa" />
      </g>
      {/* wand star */}
      <path d="M118 44 l5 12 13 1 -10 9 3 13 -11 -7 -11 7 3 -13 -10 -9 13 -1 z" fill="#7c3aed" />
      {/* sparkles */}
      <g fill="#8b5cf6">
        <path d="M60 56 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z" />
        <path d="M150 96 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />
      </g>
      {/* avoidable fee tag, crossed out */}
      <g transform="translate(54 120)">
        <rect x="0" y="0" width="92" height="34" rx="8" fill="#fff" stroke="#7c3aed" strokeWidth="2" />
        <text x="46" y="22" fontSize="13" fontWeight="800" fill="#6d28d9" textAnchor="middle">−$35 fee</text>
        <path d="M8 26 L84 8" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function ArtMiles() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="miles-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e0f2fe" /><stop offset="1" stopColor="#7dd3fc" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#miles-bg)" />
      {/* road */}
      <path d="M10 150 Q100 120 190 150" fill="none" stroke="#0c4a6e" strokeWidth="3" opacity="0.4" />
      <path d="M14 142 Q100 114 186 142" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="8 10" strokeLinecap="round" />
      {/* car */}
      <g transform="translate(58 64)">
        <rect x="0" y="22" width="84" height="30" rx="10" fill="#0369a1" />
        <path d="M16 22 Q22 4 42 4 L60 4 Q74 4 80 22 Z" fill="#0ea5e9" />
        <rect x="22" y="9" width="20" height="13" rx="3" fill="#e0f2fe" />
        <rect x="46" y="9" width="18" height="13" rx="3" fill="#e0f2fe" />
        <circle cx="22" cy="54" r="11" fill="#1e293b" /><circle cx="22" cy="54" r="4" fill="#94a3b8" />
        <circle cx="64" cy="54" r="11" fill="#1e293b" /><circle cx="64" cy="54" r="4" fill="#94a3b8" />
      </g>
      {/* odometer tag */}
      <g transform="translate(120 30)">
        <rect x="0" y="0" width="60" height="26" rx="8" fill="#fff" stroke="#0369a1" strokeWidth="2" />
        <text x="30" y="18" fontSize="12" fontWeight="800" fill="#075985" textAnchor="middle">124 mi</text>
      </g>
    </svg>
  )
}

function ArtSecurity() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="sec-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d1fae5" /><stop offset="1" stopColor="#6ee7b7" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#sec-bg)" />
      {/* shield */}
      <path d="M100 28 L150 46 V94 C150 124 128 144 100 154 C72 144 50 124 50 94 V46 Z" fill="#15803d" />
      <path d="M100 38 L140 52 V92 C140 116 122 132 100 141 C78 132 60 116 60 92 V52 Z" fill="#ecfdf5" />
      {/* lock */}
      <g transform="translate(82 74)">
        <rect x="0" y="14" width="36" height="30" rx="6" fill="#15803d" />
        <path d="M6 14 V8 a12 12 0 0 1 24 0 V14" fill="none" stroke="#15803d" strokeWidth="5" />
        <circle cx="18" cy="27" r="4" fill="#ecfdf5" />
        <rect x="16" y="29" width="4" height="8" rx="2" fill="#ecfdf5" />
      </g>
      <text x="100" y="172" fontSize="10" fontWeight="700" fill="#065f46" textAnchor="middle">row-level security</text>
    </svg>
  )
}

function ArtData() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="data-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe4e6" /><stop offset="1" stopColor="#fda4af" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#data-bg)" />
      {/* database cylinder */}
      <g transform="translate(40 40)">
        <ellipse cx="40" cy="14" rx="40" ry="14" fill="#fff" stroke="#be123c" strokeWidth="2" />
        <path d="M0 14 V74 a40 14 0 0 0 80 0 V14" fill="#fff" stroke="#be123c" strokeWidth="2" />
        <path d="M0 44 a40 14 0 0 0 80 0" fill="none" stroke="#fecdd3" strokeWidth="2" />
        <ellipse cx="40" cy="14" rx="40" ry="14" fill="#fff5f5" />
        <ellipse cx="40" cy="14" rx="40" ry="14" fill="none" stroke="#be123c" strokeWidth="2" />
      </g>
      {/* export arrow badge */}
      <g transform="translate(20 116)">
        <circle cx="22" cy="22" r="22" fill="#fff" stroke="#be123c" strokeWidth="2" />
        <path d="M22 32 V12 M14 20 L22 12 L30 20" fill="none" stroke="#be123c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* trash badge */}
      <g transform="translate(138 116)">
        <circle cx="22" cy="22" r="22" fill="#fff" stroke="#be123c" strokeWidth="2" />
        <g transform="translate(10 10)" stroke="#be123c" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M2 6 H22" /><path d="M6 6 V20 a2 2 0 0 0 2 2 H16 a2 2 0 0 0 2 -2 V6" /><path d="M9 3 H15" />
        </g>
      </g>
      <text x="100" y="172" fontSize="10" fontWeight="700" fill="#9f1239" textAnchor="middle">export or delete, any time</text>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Infographic SVGs                                                        */
/* ─────────────────────────────────────────────────────────────────────── */

function ArtCapture() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="cap-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d1fae5" />
          <stop offset="1" stopColor="#bef264" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#cap-bg)" />
      <rect x="74" y="30" width="52" height="86" rx="8" fill="#064e3b" />
      <rect x="78" y="34" width="44" height="76" rx="4" fill="#ecfdf5" />
      <circle cx="100" cy="72" r="14" fill="#15803d" />
      <circle cx="100" cy="72" r="9" fill="#064e3b" />
      <circle cx="103" cy="69" r="2.5" fill="#a3e635" />
      <g transform="translate(20 120)">
        <rect x="0" y="0" width="60" height="50" rx="3" fill="#fff" stroke="#94a3b8" />
        <line x1="6" y1="10" x2="44" y2="10" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="6" y1="18" x2="40" y2="18" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="6" y1="26" x2="50" y2="26" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="6" y1="38" x2="30" y2="38" stroke="#cbd5e1" strokeWidth="2" />
      </g>
      <g transform="translate(125 130)">
        <rect x="0" y="0" width="50" height="34" rx="3" fill="#fff" stroke="#94a3b8" />
        <path d="M0 0 L25 18 L50 0" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
      </g>
    </svg>
  )
}

function ArtParse() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="parse-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecfccb" />
          <stop offset="1" stopColor="#d9f99d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#parse-bg)" />
      <g transform="translate(15 25)">
        <rect width="65" height="130" rx="3" fill="#fff" stroke="#a3a3a3" />
        <line x1="6" y1="14" x2="59" y2="14" stroke="#d4d4d8" strokeWidth="2.5" />
        <line x1="6" y1="24" x2="40" y2="24" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="32" x2="50" y2="32" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="40" x2="35" y2="40" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="48" x2="44" y2="48" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="80" x2="59" y2="80" stroke="#a3a3a3" strokeWidth="0.5" />
        <text x="32" y="100" fontSize="11" fontWeight="700" fill="#0f172a" textAnchor="middle">$24.74</text>
      </g>
      <g stroke="#65a30d" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M85 90 L110 90" />
        <polygon points="110,87 117,90 110,93" fill="#65a30d" />
      </g>
      <g transform="translate(125 60)">
        <rect x="0" y="0" width="60" height="60" rx="14" fill="#15803d" />
        <text x="30" y="42" fontSize="34" textAnchor="middle">🥑</text>
      </g>
      <g transform="translate(120 130)">
        <rect x="0" y="0" width="70" height="14" rx="3" fill="#fff" stroke="#84cc16" />
        <text x="35" y="10" fontSize="8" fontWeight="700" fill="#3f6212" textAnchor="middle">store · date · $</text>
        <rect x="0" y="18" width="50" height="14" rx="3" fill="#fff" stroke="#84cc16" />
        <text x="25" y="28" fontSize="8" fontWeight="700" fill="#3f6212" textAnchor="middle">items[ ]</text>
      </g>
    </svg>
  )
}

function ArtDedup() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="dup-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#dup-bg)" />
      <g transform="translate(25 30)">
        <rect x="0" y="0" width="55" height="70" rx="3" fill="#fff" stroke="#d97706" />
        <rect x="6" y="6" width="55" height="70" rx="3" fill="#fff" stroke="#d97706" />
        <rect x="12" y="12" width="55" height="70" rx="3" fill="#fff" stroke="#d97706" strokeWidth="1.5" />
        <line x1="18" y1="22" x2="62" y2="22" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="18" y1="32" x2="50" y2="32" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="18" y1="40" x2="58" y2="40" stroke="#cbd5e1" strokeWidth="1.5" />
        <text x="40" y="62" fontSize="10" fontWeight="700" fill="#9a3412" textAnchor="middle">$24.74</text>
      </g>
      <g stroke="#b45309" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M105 95 L130 95" />
        <polygon points="130,92 137,95 130,98" fill="#b45309" />
      </g>
      <g transform="translate(140 60)">
        <rect x="0" y="0" width="45" height="58" rx="3" fill="#fff" stroke="#15803d" strokeWidth="2" />
        <line x1="6" y1="12" x2="38" y2="12" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="6" y1="22" x2="30" y2="22" stroke="#cbd5e1" strokeWidth="1.5" />
        <text x="22" y="40" fontSize="10" fontWeight="700" fill="#065f46" textAnchor="middle">$24.74</text>
        <circle cx="22" cy="50" r="5" fill="#15803d" />
        <path d="M19 50 L21 52 L25 48" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="100" y="160" fontSize="10" fontWeight="700" fill="#92400e" textAnchor="middle">3 duplicates → 1 keeper</text>
    </svg>
  )
}

function ArtCategorize() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="cat-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#cat-bg)" />
      <g transform="translate(15 25)">
        <rect width="55" height="80" rx="3" fill="#fff" stroke="#94a3b8" />
        <line x1="6" y1="14" x2="49" y2="14" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="6" y1="24" x2="40" y2="24" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="32" x2="48" y2="32" stroke="#e4e4e7" strokeWidth="1.5" />
        <line x1="6" y1="40" x2="32" y2="40" stroke="#e4e4e7" strokeWidth="1.5" />
      </g>
      <g stroke="#0369a1" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M76 65 L100 65" />
        <polygon points="100,62 107,65 100,68" fill="#0369a1" />
      </g>
      <g transform="translate(110 25)">
        <rect x="0" y="0" width="78" height="22" rx="11" fill="#dcfce7" stroke="#86efac" />
        <text x="14" y="15" fontSize="11">🛒</text>
        <text x="50" y="14" fontSize="9" fontWeight="700" fill="#065f46" textAnchor="middle">Groceries</text>
      </g>
      <g transform="translate(110 52)">
        <rect x="0" y="0" width="78" height="22" rx="11" fill="#fef3c7" stroke="#fcd34d" />
        <text x="14" y="15" fontSize="11">🍽️</text>
        <text x="48" y="14" fontSize="9" fontWeight="700" fill="#92400e" textAnchor="middle">Dining</text>
      </g>
      <g transform="translate(110 79)">
        <rect x="0" y="0" width="78" height="22" rx="11" fill="#ede9fe" stroke="#c4b5fd" />
        <text x="14" y="15" fontSize="11">⛽</text>
        <text x="48" y="14" fontSize="9" fontWeight="700" fill="#5b21b6" textAnchor="middle">Gas</text>
      </g>
      <g transform="translate(110 106)">
        <rect x="0" y="0" width="78" height="22" rx="11" fill="#fce7f3" stroke="#f9a8d4" />
        <text x="14" y="15" fontSize="11">🐕</text>
        <text x="48" y="14" fontSize="9" fontWeight="700" fill="#9d174d" textAnchor="middle">Pet (custom)</text>
      </g>
    </svg>
  )
}

function ArtDashboard() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="dash-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0e7ff" />
          <stop offset="1" stopColor="#c7d2fe" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#dash-bg)" />
      <g transform="translate(20 25)">
        <text x="0" y="0" fontSize="9" fontWeight="800" fill="#312e81">Spending by Store</text>
        <rect x="0"   y="14" width="22" height="80" rx="3" fill="#6366f1" />
        <rect x="28"  y="34" width="22" height="60" rx="3" fill="#818cf8" />
        <rect x="56"  y="50" width="22" height="44" rx="3" fill="#a5b4fc" />
        <rect x="84"  y="62" width="22" height="32" rx="3" fill="#c7d2fe" />
        <rect x="112" y="74" width="22" height="20" rx="3" fill="#e0e7ff" stroke="#a5b4fc" />
        <line x1="-2" y1="94" x2="142" y2="94" stroke="#312e81" strokeWidth="0.6" />
        <g fontSize="7" fontWeight="700" fill="#312e81" textAnchor="middle">
          <text x="11"  y="106">Amzn</text>
          <text x="39"  y="106">Costco</text>
          <text x="67"  y="106">Target</text>
          <text x="95"  y="106">Lowe&apos;s</text>
          <text x="123" y="106">CVS</text>
        </g>
        <g transform="translate(0 125)">
          <rect x="0" y="0" width="60" height="18" rx="3" fill="#fff" stroke="#a5b4fc" />
          <text x="30" y="12" fontSize="8" fontWeight="700" fill="#312e81" textAnchor="middle">Last 90 days</text>
        </g>
      </g>
    </svg>
  )
}

function ArtWorthIt() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs>
        <linearGradient id="worth-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe4e6" />
          <stop offset="1" stopColor="#fecdd3" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="200" height="180" rx="20" fill="url(#worth-bg)" />
      <g transform="translate(60 26)">
        <circle cx="40" cy="40" r="32" fill="none" stroke="#fda4af" strokeWidth="10" />
        <circle cx="40" cy="40" r="32" fill="none" stroke="#15803d" strokeWidth="10"
                strokeDasharray="160 200" strokeLinecap="round" transform="rotate(-90 40 40)" />
        <text x="40" y="40" fontSize="18" fontWeight="900" fill="#0f172a" textAnchor="middle">82</text>
        <text x="40" y="54" fontSize="7" fontWeight="700" fill="#475569" textAnchor="middle">GuacScore</text>
      </g>
      <g transform="translate(50 120)">
        <text x="0"   y="12" fontSize="16">⭐</text>
        <text x="22"  y="12" fontSize="16">⭐</text>
        <text x="44"  y="12" fontSize="16">⭐</text>
        <text x="66"  y="12" fontSize="16">⭐</text>
        <text x="88"  y="12" fontSize="16" opacity="0.4">⭐</text>
      </g>
      <text x="100" y="160" fontSize="10" fontWeight="700" fill="#9f1239" textAnchor="middle">Worth-It · per receipt</text>
    </svg>
  )
}

function ArtSmashlist() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="smash-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ecfccb" /><stop offset="1" stopColor="#a3e635" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#smash-bg)" />
      {/* list card */}
      <g transform="translate(35 22)">
        <rect x="0" y="0" width="130" height="126" rx="10" fill="#fff" stroke="#65a30d" strokeWidth="2" />
        {/* store header */}
        <rect x="8" y="8" width="114" height="18" rx="5" fill="#f7fee7" />
        <circle cx="19" cy="17" r="6" fill="#65a30d" />
        <text x="19" y="20" fontSize="8" fontWeight="800" fill="#fff" textAnchor="middle">K</text>
        <text x="32" y="20" fontSize="9" fontWeight="800" fill="#3f6212">KROGER · 3 items</text>
        {/* item rows */}
        <g transform="translate(12 36)">
          {/* smashed item */}
          <rect x="0" y="0" width="12" height="12" rx="3" fill="#65a30d" />
          <path d="M2.5 6 L5 8.5 L9.5 3.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="20" y="10" fontSize="9" fontWeight="600" fill="#9ca3af">Milk 2%</text>
          <line x1="18" y1="7" x2="60" y2="7" stroke="#9ca3af" strokeWidth="1.5" />
          <text x="106" y="10" fontSize="8" fontWeight="700" fill="#9ca3af" textAnchor="end">est. $4</text>
        </g>
        <g transform="translate(12 58)">
          <rect x="0" y="0" width="12" height="12" rx="3" fill="#fff" stroke="#a3a3a3" strokeWidth="1.5" />
          <text x="20" y="10" fontSize="9" fontWeight="700" fill="#1f2937">Dog food</text>
          <text x="106" y="10" fontSize="8" fontWeight="700" fill="#4d7c0f" textAnchor="end">est. $23</text>
        </g>
        <g transform="translate(12 80)">
          <rect x="0" y="0" width="12" height="12" rx="3" fill="#fff" stroke="#a3a3a3" strokeWidth="1.5" />
          <text x="20" y="10" fontSize="9" fontWeight="700" fill="#1f2937">Detergent</text>
          <text x="106" y="10" fontSize="8" fontWeight="700" fill="#4d7c0f" textAnchor="end">est. $12</text>
        </g>
        {/* predicted badge */}
        <g transform="translate(8 102)">
          <rect x="0" y="0" width="114" height="16" rx="8" fill="#ecfccb" stroke="#a3e635" />
          <text x="57" y="11" fontSize="8" fontWeight="800" fill="#3f6212" textAnchor="middle">✨ predicted — due this week</text>
        </g>
      </g>
      <text x="100" y="168" fontSize="10" fontWeight="700" fill="#3f6212" textAnchor="middle">it fills itself, from your receipts</text>
    </svg>
  )
}

function ArtSteals() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="steal-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset="1" stopColor="#fbbf24" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#steal-bg)" />
      {/* old price tag */}
      <g transform="translate(24 40) rotate(-8)">
        <path d="M14 0 H64 a8 8 0 0 1 8 8 V40 a8 8 0 0 1 -8 8 H14 L0 24 Z" fill="#fff" stroke="#b45309" strokeWidth="2" />
        <circle cx="16" cy="24" r="4" fill="#fde68a" stroke="#b45309" strokeWidth="1.5" />
        <text x="44" y="29" fontSize="13" fontWeight="800" fill="#6b7280" textAnchor="middle">$8.99</text>
        <line x1="26" y1="24" x2="64" y2="24" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* new price tag */}
      <g transform="translate(102 66) rotate(6)">
        <path d="M14 0 H70 a8 8 0 0 1 8 8 V44 a8 8 0 0 1 -8 8 H14 L0 26 Z" fill="#15803d" />
        <circle cx="16" cy="26" r="4" fill="#ecfdf5" />
        <text x="48" y="33" fontSize="15" fontWeight="900" fill="#fff" textAnchor="middle">$6.49</text>
      </g>
      {/* STEAL badge */}
      <g transform="translate(124 36)">
        <rect x="0" y="0" width="52" height="20" rx="10" fill="#dc2626" />
        <text x="26" y="14" fontSize="10" fontWeight="900" fill="#fff" textAnchor="middle">STEAL</text>
      </g>
      {/* magnifier */}
      <g transform="translate(40 108)">
        <circle cx="20" cy="20" r="16" fill="#fff" fillOpacity="0.85" stroke="#92400e" strokeWidth="4" />
        <line x1="32" y1="32" x2="46" y2="46" stroke="#92400e" strokeWidth="6" strokeLinecap="round" />
      </g>
      <text x="100" y="170" fontSize="10" fontWeight="700" fill="#92400e" textAnchor="middle">same item · better price</text>
    </svg>
  )
}

function ArtGuacMoney() {
  return (
    <svg viewBox="0 0 200 180" width="220" height="200" aria-hidden="true">
      <defs><linearGradient id="gm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d1fae5" /><stop offset="1" stopColor="#fde68a" /></linearGradient></defs>
      <rect width="200" height="180" rx="20" fill="url(#gm-bg)" />
      {/* coin */}
      <g transform="translate(58 26)">
        <circle cx="42" cy="42" r="40" fill="#fbbf24" stroke="#b45309" strokeWidth="3" />
        <circle cx="42" cy="42" r="31" fill="#fde68a" stroke="#b45309" strokeWidth="1.5" />
        <text x="42" y="55" fontSize="34" textAnchor="middle">🥑</text>
      </g>
      {/* earning chips */}
      <g transform="translate(14 114)">
        <rect x="0" y="0" width="82" height="18" rx="9" fill="#fff" stroke="#15803d" strokeWidth="1.5" />
        <text x="41" y="13" fontSize="8.5" fontWeight="800" fill="#065f46" textAnchor="middle">+100 · receipt</text>
      </g>
      <g transform="translate(104 114)">
        <rect x="0" y="0" width="82" height="18" rx="9" fill="#fff" stroke="#b45309" strokeWidth="1.5" />
        <text x="41" y="13" fontSize="8.5" fontWeight="800" fill="#92400e" textAnchor="middle">+1,000 · $1 saved</text>
      </g>
      {/* tally */}
      <g transform="translate(40 140)">
        <rect x="0" y="0" width="120" height="20" rx="10" fill="#064e3b" />
        <text x="60" y="14" fontSize="10" fontWeight="900" fill="#fde68a" textAnchor="middle">12,400 GM = $12.40</text>
      </g>
      <text x="100" y="174" fontSize="10" fontWeight="700" fill="#065f46" textAnchor="middle">1,000 GM = $1 of value you kept</text>
    </svg>
  )
}
