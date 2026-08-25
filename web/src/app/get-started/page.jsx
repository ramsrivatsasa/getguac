import Link from 'next/link'
import { ArrowRight, Camera, Check, Clock3, Inbox, Lightbulb, LockKeyhole, Receipt, Sparkles } from 'lucide-react'
import MarketingShell from '../../components/MarketingShell'
import ZoomableImage from './ZoomableImage'
import GuideHeroSlideshow from './GuideHeroSlideshow'
import FeatureExplorer from './FeatureExplorer'

export const metadata = {
  title: 'How to Use GetGuac: Complete Setup & Features Guide',
  description: 'Learn how to scan receipts, automate email receipts, track bills and returns, analyze spending, and use all 22 GetGuac features—step by step.',
  keywords: ['GetGuac guide','receipt scanner app','receipt tracking','spending habits','GuacScore','GuacMoney','GuacWizard','bill tracker','return tracker','shopping list app'],
  alternates: { canonical: '/get-started' },
  openGraph: {
    type: 'article',
    url: '/get-started',
    title: 'How to Use GetGuac: Complete Setup & Features Guide',
    description: 'A practical guide to receipt scanning, spending insights, bills, returns, smarter shopping, and all 22 GetGuac features.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'The complete GetGuac setup and features guide' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Use GetGuac: Complete Setup & Features Guide',
    description: 'Learn GetGuac step by step and explore all 22 receipt, spending, shopping, and money tools.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
}

const GUIDE_URL = 'https://getguac.app/get-started'
const GUIDE_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${GUIDE_URL}#webpage`,
      url: GUIDE_URL,
      name: 'How to Use GetGuac: Complete Setup & Features Guide',
      description: 'A step-by-step guide to setting up GetGuac and using its receipt, spending, shopping, planning, and money-protection features.',
      isPartOf: { '@id': 'https://getguac.app/#website' },
      about: { '@type': 'SoftwareApplication', name: 'GetGuac', applicationCategory: 'FinanceApplication', operatingSystem: 'Web, Android, iOS' },
      breadcrumb: { '@id': `${GUIDE_URL}#breadcrumb` },
      primaryImageOfPage: { '@type': 'ImageObject', url: 'https://getguac.app/og.png', width: 1200, height: 630 },
      dateModified: '2026-08-10',
      inLanguage: 'en-US',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${GUIDE_URL}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'GetGuac', item: 'https://getguac.app/' },
        { '@type': 'ListItem', position: 2, name: 'Get Started Guide', item: GUIDE_URL },
      ],
    },
  ],
}

const DISPLAY = { fontFamily: 'var(--font-bricolage), var(--font-jakarta), system-ui, sans-serif' }

const GS_CSS = `
.gg-guide { --ink:#16331f; --lime:#b8ef52; --cream:#fbf8ec; --sage:#eaf4df; font-family:var(--font-jakarta),system-ui,sans-serif; }
.gg-guide h1,.gg-guide h2,.gg-guide h3,.gg-guide h4 { font-family:var(--font-bricolage),var(--font-jakarta),system-ui,sans-serif; }
.gg-hero { background:radial-gradient(circle at 82% 12%,rgba(184,239,82,.32),transparent 27%),linear-gradient(145deg,#f7f3df 0%,#eef7e7 58%,#fff 100%); }
.gg-grid { display:grid; grid-template-columns:236px minmax(0,1fr); gap:44px; align-items:start; }
.gg-toc { position:sticky; top:92px; max-height:calc(100vh - 112px); overflow-y:auto; scrollbar-width:thin; }
.gg-chapter { scroll-margin-top:100px; }
.gg-step { display:grid; grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr); gap:36px; align-items:start; }
.gg-step:nth-child(even) { grid-template-columns:minmax(0,1.22fr) minmax(0,.78fr); }
.gg-step:nth-child(even) .gg-copy { order:2; }
.gg-step:nth-child(even) .gg-media { order:1; }
.gg-media { min-width:0; }
.gg-visual { position:relative; overflow:hidden; border-radius:28px; padding:18px; background:linear-gradient(145deg,#eef8df,#d8efb1); box-shadow:0 28px 75px -38px rgba(22,51,31,.78); }
.gg-visual img { width:100%; display:block; border-radius:16px; border:1px solid rgba(22,51,31,.1); background:white; }
.gg-shot-stack { display:grid; gap:16px; align-items:center; justify-items:center; }
.gg-shot-stack.paired { grid-template-columns:minmax(0,1fr) minmax(104px,.36fr); gap:14px; }
.gg-shot-card { min-width:0; width:100%; }
.gg-shot-card.phone img { border:0; border-radius:0; background:transparent; }
.gg-shot-stack:not(.paired) .gg-shot-card.phone { max-width:268px; }
.gg-shot-label { display:block; margin:0 0 7px; font-size:10px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; color:#31533a; }
.gg-practice { position:relative; overflow:hidden; margin-top:18px; border:1px solid rgba(77,124,15,.18); border-radius:24px; padding:20px; background:linear-gradient(145deg,#fbfdf5,#fff 72%); color:#173d27; box-shadow:inset 5px 0 #b8ef52,0 20px 48px -38px rgba(9,32,17,.45); }
.gg-practice-list { display:grid; gap:10px; margin-top:14px; }
.gg-practice-item { display:grid; grid-template-columns:24px 1fr; gap:10px; align-items:start; font-size:13px; line-height:1.55; color:#496052; }
.gg-practice-number { display:flex; width:24px; height:24px; align-items:center; justify-content:center; border-radius:999px; background:#b8ef52; color:#173d27; font-size:11px; font-weight:900; }
.gg-visual button img { transition:transform .25s ease; }
.gg-visual button:hover img { transform:scale(1.015); }
.gg-feature-shot { overflow:hidden; border-radius:24px; background:#eaf4df; padding:14px; }
.gg-feature-shot img { display:block; border-radius:14px; border:1px solid rgba(22,51,31,.1); background:white; }
.gg-tip { background:#173d27; color:#fff; box-shadow:0 24px 70px -45px rgba(9,32,17,.8); }
@media (max-width:900px) { .gg-grid{grid-template-columns:1fr;gap:28px}.gg-toc{position:static;max-height:none;overflow:visible}.gg-step,.gg-step:nth-child(even){grid-template-columns:minmax(0,1fr)}.gg-step:nth-child(even) .gg-copy,.gg-step:nth-child(even) .gg-media{order:initial} }
@media (max-width:600px) { .gg-visual{padding:14px;border-radius:22px}.gg-shot-stack.paired{grid-template-columns:minmax(0,1fr) minmax(84px,.36fr);gap:10px}.gg-shot-stack:not(.paired) .gg-shot-card.phone{max-width:212px} }
`

const chapters = [
  { id: 'first-receipt', label: '1. Capture the real picture' },
  { id: 'make-automatic', label: '2. Make it automatic' },
  { id: 'read-patterns', label: '3. Read your patterns' },
  { id: 'protect-money', label: '4. Protect your money' },
  { id: 'rhythm', label: '5. Keep the habit easy' },
]

const steps = [
  { n:'01', chapter:'first-receipt', icon:Camera, title:'Scan a real receipt', body:'Photograph a paper receipt or add a receipt image, screenshot, or PDF. Guac-AI reads the merchant, date, tax, total, and individual items so you can review the result before saving it.', why:'A real receipt shows whether GetGuac can replace manual typing with a useful item-level record.', action:['/join?try=receipt','Try one receipt'], shot:['/home/goals/phone-receipts.webp','The GetGuac mobile receipt scanner and receipt history','phone'] },
  { n:'02', chapter:'first-receipt', icon:Inbox, title:'Use your GetGuac email inbox', body:'Create your free account and use your private @getguac.app address at online checkout or forward existing digital receipts to it. New email receipts join the same searchable history as paper receipts.', why:'A dedicated receipt inbox keeps purchase records together without mixing them into your regular email workflow.', action:['/how-email-works','See how email receipts work'], shot:['/home/goals/web-inbox.png','The GetGuac web inbox showing emailed receipts filed automatically'] },
  { n:'03', chapter:'first-receipt', icon:Receipt, title:'Import statements when they add context', body:'Receipt-first tracking works on its own. When you want broader coverage, import a supported bank or card statement PDF and review the rows before keeping them.', why:'Statements can fill history gaps without requiring a bank login or replacing the richer details inside receipts.', action:['/statements','Open statement import'], shot:['/home/goals/web-bank.webp','Optional statement records reviewed inside GetGuac'] },
  { n:'04', chapter:'make-automatic', icon:Sparkles, title:'Let Guac-AI parse every purchase', body:'Guac-AI extracts stores, dates, totals, taxes, payment details, and line items. Review unusual results once so each saved purchase remains accurate and searchable.', why:'Structured details turn receipt images into records you can search, compare, and learn from.', action:['/how-it-works','Follow a receipt through GetGuac'], shot:['/marketing/slides/v2/receipts-web.webp','The GetGuac receipt workspace where parsed purchases become searchable records'] },
  { n:'05', chapter:'make-automatic', icon:Receipt, title:'Organize categories and duplicates', body:'GetGuac categorizes the items inside each receipt and flags possible duplicate captures. Review only unusual categories or matches instead of organizing every purchase manually.', why:'Clean categories and duplicate control make reports useful without creating another bookkeeping chore.', action:['/goals/categories.html','See automatic organization'], shot:['/home/goals/web-receipts.webp','Receipt categories and the Find duplicates control on the GetGuac web app'] },
  { n:'06', chapter:'make-automatic', icon:Clock3, title:'Surface subscriptions and recurring charges', body:'As history builds, GetGuac recognizes similar payments that repeat. Review likely subscriptions, expected charges, and changes in amount before deciding what to keep or cancel.', why:'Recurring charges are easier to control when they are visible before another payment lands.', action:['/resources/guides/subscriptions.html','Use the subscription guide'], shot:['/home/goals/phone-subs.webp','Detected subscriptions and recurring charges on mobile','phone'] },
  { n:'07', chapter:'make-automatic', icon:Clock3, title:'Put bills on a forward-looking calendar', body:'Add the recurring bills and due dates you already know. Review the calendar alongside detected recurring charges so the next month feels planned instead of surprising.', why:'A visible bill is easier to prepare for than a charge discovered after it lands.', action:['/goals/bills.html','Learn about the bills calendar'], shot:['/home/goals/web-bills.webp','Upcoming bills displayed on the GetGuac calendar'] },
  { n:'08', chapter:'read-patterns', icon:Lightbulb, title:'Explore your dashboard and reports', body:'Use the dashboard for scores, anomalies, rewards, recent activity, and timely actions. Open Reports to compare categories, stores, items, subscriptions, business receipts, tax summaries, and time periods.', why:'The dashboard tells you what deserves attention; Reports helps explain why and keeps the source receipts close enough to act.', action:['/dashboard-reports','Explore Dashboard & Reports'], shot:['/marketing/slides/v2/reports-web.webp','GetGuac reports showing spending categories, tax summaries, subscriptions, and period comparisons'] },
  { n:'09', chapter:'read-patterns', icon:Sparkles, title:'Ask Guac AI a question', body:'Ask about one store, category, purchase, or change in your saved history. Guac AI answers from the receipts and records you provided, keeping the conversation grounded in your money.', why:'A specific question turns stored data into an answer you can act on.', action:['/goals/read.html','Open the Guac AI guide'], shot:['/home/goals/web-guac-ai.webp','Guac AI answering a question about saved spending'] },
  { n:'10', chapter:'read-patterns', icon:Lightbulb, title:'Rate purchases with Worth-It', body:'Mark whether a recent purchase was worthwhile while the experience is still fresh. Use quick, honest ratings rather than trying to evaluate every purchase perfectly.', why:'Your own definition of value is more useful than a generic rule about what you should buy.', action:['/resources/worth-it.html','Learn about Worth-It'], shot:['/home/goals/phone-worth-it.webp','Worth-It purchase ratings on mobile','phone'] },
  { n:'11', chapter:'read-patterns', icon:Lightbulb, title:'Understand and improve your GuacScore', body:'GuacScore answers one personal question: “Was this spending worth it?” It turns your own Worth-It ratings into a simple 0–100 signal, giving more importance to the purchases that cost you more.', why:'The score connects how much you spent with how you felt afterward. It helps you find expensive regrets and repeat patterns worth changing without judging necessary spending.', action:['/guacscore','Explore the GuacScore guide'], shot:['/home/goals/phone-guacscore.webp','The mobile GuacScore view showing the score, grade, spending, refunds, fees, and trend','phone'] },
  { n:'12', chapter:'read-patterns', icon:Sparkles, title:'Make progress visible with GuacMoney', body:'GuacMoney makes the value of useful actions visible. It separates real dollars GetGuac helped you save from GM points that recognize receipts, recovered money, referrals, and eligible learning activity.', why:'Visible progress makes helpful behavior easier to repeat. GM points are not redeemable today; GetGuac will update customers when planned redemption becomes available.', action:['/goals/guacmoney.html','Explore the GuacMoney guide'], shot:['/home/goals/web-organized.webp','The GuacMoney balance visible in the GetGuac dashboard summary'] },
  { n:'13', chapter:'read-patterns', icon:Receipt, title:'Prepare tax and charity records', body:'Categorize relevant receipts, business purchases, charity records, and mileage as they occur. Review the correct reporting period before using any export.', why:'Organized source records reduce the scramble when reimbursement or tax time arrives.', action:['/goals/reports.html','See reporting tools'], shot:['/home/goals/phone-tax.webp','Business, charity, and sales-tax records on mobile','phone'] },
  { n:'14', chapter:'protect-money', icon:Sparkles, title:'Find quiet leaks with GuacWizard', body:'GuacWizard reads your bank-statement totals and turns avoidable costs into a clear health signal. Instead of showing an unexplained number, it ranks the interest, fees, debt changes, and high-APR cards that deserve attention first.', why:'The benefit is diagnostic: you see the actual dollar costs behind the score and get a focused next step. It is also the only GetGuac engine that rewards debt moving down.', action:['/goals/wizard.html','Explore the GuacWizard guide'], shot:['/home/goals/web-fees.webp','GuacWizard showing ranked interest, fee, debt, and high-APR bank costs'] },
  { n:'15', chapter:'protect-money', icon:LockKeyhole, title:'Protect returns and refunds', body:'Keep the receipt, review the store return policy when available, and track the deadline and refund status. Check recent purchases while there is still time to act.', why:'A return window is a countdown on money you may still be able to recover.', action:['/goals/recover.html','See how GetGuac protects returns'], shot:['/home/goals/web-returns.webp','Return deadlines and refund progress tracked in GetGuac'] },
  { n:'16', chapter:'protect-money', icon:Receipt, title:'Remember products with Stash', body:'Stash builds a living library of products found on itemized receipts. Revisit what you own, loved, regretted, or may want to buy again before starting from scratch.', why:'Remembering past purchases helps you repeat the good decisions and avoid the disappointing ones.', action:['/goals/stash.html','Explore Stash'], shot:['/home/goals/web-stash.webp','Products remembered in the GetGuac Stash'] },
  { n:'17', chapter:'protect-money', icon:Sparkles, title:'Compare repeat purchases with Steals', body:'Choose an item you buy again and compare matching products, sizes, quantities, and current prices. Use the result as context before deciding where to purchase.', why:'A familiar product is easier to compare when GetGuac remembers exactly what you bought before.', action:['/goals/steals.html','See how Steals works'], shot:['/home/goals/web-steals.webp','GetGuac Steals comparing prices for remembered products'] },
  { n:'18', chapter:'protect-money', icon:Lightbulb, title:'Check Marketplace and coupons', body:'Search public store offers, coupons, and promotion codes without creating an account. Compare the available options before completing a purchase you already planned.', why:'Checking the market before checkout can lower the cost without encouraging an unnecessary purchase.', action:['/goals/marketplace.html','Browse the Marketplace guide'], shot:['/home/goals/web-marketplace.webp','Marketplace offers and coupons compared in GetGuac'] },
  { n:'19', chapter:'protect-money', icon:LockKeyhole, title:'Stay private and in control', body:'Use receipt-first tracking without a required bank login. Review optional connections before enabling them, keep access limited, and use account controls whenever you want to remove data.', why:'A money tool is only useful when you understand what it accesses and remain in control of your records.', action:['/goals/security.html','Review GetGuac security'], shot:['/home/goals/phone-bank.webp','The mobile statement-handling screen explaining processing, storage, and deletion controls','phone'] },
  { n:'20', chapter:'rhythm', icon:Inbox, title:'Let Shopping List prepare the next trip', body:'Review predicted or remembered items, keep only what you need, group the list by store, and share it when someone else is shopping with you.', why:'A prepared list reduces repeat decisions and makes the next shopping trip easier to finish.', action:['/goals/prepare.html','See how Shopping List prepares'], shot:['/home/goals/web-smashlist.webp','A GetGuac Shopping List organized for the next shopping trip'] },
  { n:'21', chapter:'rhythm', icon:Receipt, title:'Track Car Miles when they matter', body:'Add qualifying trips manually, choose the correct purpose, and review the mileage log before using it for reimbursement or tax records. GetGuac does not require background location tracking.', why:'Focused mileage records are useful when they stay accurate without tracking everywhere you go.', action:['/goals/miles.html','Learn about Car Miles'], shot:['/home/goals/web-car-miles.webp','GetGuac Car Miles records prepared for reporting'] },
  { n:'22', chapter:'rhythm', icon:Lightbulb, title:'Learn through Guac Arcade', body:'Choose from free money-themed games when a short challenge is a better way to practice an idea. Saved scores, eligible GuacMoney activity, and leaderboards remain optional.', why:'A habit is easier to keep when learning can be useful, light, and enjoyable.', action:['/goals/arcade.html','Explore Guac Arcade'], shot:['/home/goals/web-games.webp','The GetGuac Arcade collection of money-themed games'] },
]

const HABIT_IMPROVEMENTS = {
  '01':'Replace end-of-month guesswork with a tiny capture habit: save the receipt when the purchase is still fresh, then let item-level history build itself.',
  '02':'Use the same private receipt address at checkout so digital purchases arrive automatically instead of depending on memory or a crowded personal inbox.',
  '03':'Import statements only when they fill a real gap. This creates a deliberate monthly review without turning constant bank monitoring into a chore.',
  '04':'Review only unusual extractions. Correcting exceptions—not retyping every purchase—builds trust in the record while keeping the routine light.',
  '05':'Let categories form automatically and fix only meaningful exceptions. Over time, clean patterns replace the urge to organize every line perfectly.',
  '06':'Check recurring charges before renewal dates. The habit shifts subscription management from discovering a charge afterward to making a choice beforehand.',
  '07':'A short weekly calendar glance turns upcoming bills into expected events, making it easier to leave room for them before discretionary spending.',
  '08':'Begin each report visit with one question. Acting on one clear pattern is more sustainable than scanning many charts without changing anything.',
  '09':'Ask specific questions tied to a store, category, or period. This trains the habit of using evidence from your own history before making the next decision.',
  '10':'Rate purchases soon after using them. Honest reflection builds a personal definition of value and makes future buying decisions less automatic.',
  '11':'Review the largest low-rated purchases first, change one repeated regret, and watch the multi-purchase trend. The score rewards better patterns, not perfection.',
  '12':'Use saved dollars and GM points as visible feedback for repeating helpful actions. Customers will be notified when planned GM redemption becomes available.',
  '13':'Tag useful tax, business, charity, and mileage records as they happen. Small classifications now prevent a stressful reconstruction later.',
  '14':'Work down the ranked reasons from the highest real-dollar cost. Fixing one fee, interest source, or high-APR balance creates a measurable next step.',
  '15':'Review active return windows once a week and close each loop when the refund lands. The habit converts forgotten deadlines into recovered money.',
  '16':'Check what you already own before buying again. Remembered products help repeat satisfying purchases and interrupt duplicates or past regrets.',
  '17':'Compare the exact product, size, and quantity before a repeat buy. This turns price checking into a focused decision rather than endless deal hunting.',
  '18':'Search for offers only after deciding what you need. That order keeps coupons useful without letting a discount create an unnecessary purchase.',
  '19':'Enable only the data sources you understand and revisit permissions periodically. Privacy becomes an active, understandable choice instead of a one-time promise.',
  '20':'Edit the predicted list before leaving and share one source of truth. A prepared trip reduces impulse additions, forgotten items, and duplicate buying.',
  '21':'Log only qualifying trips and choose their purpose immediately. A short, intentional record is easier to trust than rebuilding mileage months later.',
  '22':'Use short games to rehearse one money idea, then apply it outside the game. Light repetition makes learning easier to return to without turning it into homework.',
}

const SECONDARY_SHOTS = {
  '01':['/home/goals/web-receipts.webp','The GetGuac web receipt history with searchable purchase details'],
  '02':['/home/goals/phone-inbox.png','The GetGuac mobile inbox showing emailed receipts and receipt filters','phone'],
  '03':['/home/goals/phone-bank.webp','Optional bank and statement records on mobile','phone'],
  '04':['/home/goals/phone-receipts.webp','Parsed receipt records ready to review on mobile','phone'],
  '05':['/home/goals/phone-receipts.webp','Organized receipt records and categories on mobile','phone'],
  '06':['/home/goals/web-subs.webp','The GetGuac desktop Subscriptions table showing each recurring charge, its cadence and its monthly cost'],
  '07':['/home/goals/phone-bills.webp','The forward-looking bills calendar on mobile','phone'],
  '08':['/home/goals/phone-organized.webp','The mobile dashboard with spending totals and daily, weekly, and monthly views','phone'],
  '09':['/home/goals/phone-guac-ai.webp','Guac AI answering from saved money records on mobile','phone'],
  '10':['/home/goals/web-worth-it.webp','Worth-It ratings and the average rating shown on the GetGuac web app'],
  '11':['/marketing/slides/v2/guacanomics-web.webp','GuacScore and spending-quality insights on the web'],
  '12':['/home/goals/phone-organized.webp','The GuacMoney balance visible in the mobile dashboard','phone'],
  '13':['/home/goals/web-tax.webp','The GetGuac Tax summary card showing business, charity and sales-tax totals with a CSV export'],
  '14':['/home/goals/phone-fees.webp','GuacWizard Bank Bite reasons on mobile','phone'],
  '15':['/home/goals/phone-returns.webp','Return deadlines and refund status on mobile','phone'],
  '16':['/home/goals/phone-stash.webp','Remembered products in Stash on mobile','phone'],
  '17':['/home/goals/phone-steals.webp','Repeat-purchase price comparisons on mobile','phone'],
  '18':['/home/goals/phone-marketplace.webp','Marketplace offers and coupons on mobile','phone'],
  '19':['/home/goals/web-bank.webp','The GetGuac web Bank screen showing which statements were uploaded and what they cost'],
  '20':['/home/goals/phone-smashlist.webp','A prepared Shopping List on mobile','phone'],
  '21':['/home/goals/phone-car-miles.webp','Purpose-based Car Miles records on mobile','phone'],
  '22':['/home/goals/phone-games.webp','GetGuac Arcade games on mobile','phone'],
}

const QUICK_ACTIONS = {
  '01':['Choose one clear recent receipt.','Capture the whole receipt in good light.','Review the store, total, and items before saving.'],
  '02':['Find your private @getguac.app address.','Use it at checkout or forward one email receipt.','Confirm the new receipt joined your history.'],
  '03':['Choose one supported statement PDF.','Import it only when receipts leave a useful gap.','Review the rows before keeping them.'],
  '04':['Add one clear receipt.','Let Guac-AI extract the purchase details.','Correct only anything that looks unusual.'],
  '05':['Open a recently saved purchase.','Check its category and possible duplicate matches.','Fix only the exceptions that affect your reports.'],
  '06':['Open recurring charges after history builds.','Review the amount and expected next date.','Keep, investigate, or cancel one charge.'],
  '07':['Add the bills and due dates you already know.','Check the next seven days once a week.','Leave room before each charge arrives.'],
  '08':['Choose one period and one question.','Compare the relevant store or category.','Write down one decision for next month.'],
  '09':['Ask about one store, category, or time period.','Read the answer against your saved records.','Use the result for one specific decision.'],
  '10':['Choose a purchase you have already used.','Give it a quick, honest Worth-It rating.','Notice what you would repeat or avoid.'],
  '11':['Rate a small group of recent purchases.','Look first at high-cost, low-rated choices.','Change one repeating pattern and revisit the trend.'],
  '12':['Use GetGuac normally for one week.','Review saved dollars separately from GM points.','Repeat the actions that created real value.'],
  '13':['Tag one relevant business, tax, or charity record.','Add its purpose while you still remember it.','Review the correct period before exporting.'],
  '14':['Open the highest-cost GuacWizard reason.','Read the real dollar amount behind it.','Choose one action that prevents a repeat.'],
  '15':['Open a purchase still inside its return window.','Confirm the deadline and return status.','Close the loop when the refund arrives.'],
  '16':['Open Stash before buying something again.','Check what you owned, liked, or regretted.','Reuse that memory for the next decision.'],
  '17':['Choose one product you buy repeatedly.','Compare the same size and quantity.','Pick the better current value—not only the lowest label.'],
  '18':['Decide what you need before searching.','Compare current offers and usable coupons.','Ignore deals that add an unplanned purchase.'],
  '19':['Review what each optional connection can access.','Enable only the sources you understand.','Revisit controls whenever your needs change.'],
  '20':['Review predicted and remembered items.','Remove anything you do not need.','Group or share the final list before the trip.'],
  '21':['Add a qualifying trip and its purpose.','Check the distance while it is fresh.','Review the log before reimbursement or tax use.'],
  '22':['Choose one short money game.','Finish a round and notice the lesson.','Apply that idea to one real-life decision.'],
}

const HOW_TO_SCHEMA = {
  '@context':'https://schema.org',
  '@type':'HowTo',
  '@id':`${GUIDE_URL}#howto`,
  name:'How to get started with GetGuac and build better money habits',
  description:'A complete 22-step guide to capturing receipts, automating records, understanding spending, protecting money, and maintaining useful habits with GetGuac.',
  image:'https://getguac.app/og.png',
  supply:[{ '@type':'HowToSupply', name:'One recent paper or digital receipt' }],
  tool:[{ '@type':'HowToTool', name:'GetGuac on web or mobile' }],
  step:steps.map((step,index)=>({
    '@type':'HowToStep',
    position:index+1,
    name:step.title,
    text:`${step.body} ${HABIT_IMPROVEMENTS[step.n]}`,
    url:`${GUIDE_URL}#step-${step.n}`,
    image:`https://getguac.app${step.shot[0]}`,
  })),
}

const ALL_FEATURES = [
  { group:'Capture & organize', title:'Receipt scanner', body:'Photograph paper receipts, add screenshots, PDFs, or batches.', href:'/receipts', image:'/home/goals/web-receipts.webp' },
  { group:'Capture & organize', title:'GetGuac email inbox', body:'Forward digital receipts to your private @getguac.app address.', href:'/how-email-works', image:'/home/goals/phone-inbox.png', phone:true },
  { group:'Capture & organize', title:'Statement import', body:'Optionally turn bank or card statement PDFs into trackable rows.', href:'/statements', image:'/home/goals/web-bank.webp' },
  { group:'Capture & organize', title:'Guac-AI parsing', body:'Extract stores, dates, totals, tax, payment details, and every line item.', href:'/how-it-works', image:'/home/goals/phone-guac-ai.webp', phone:true },
  { group:'Capture & organize', title:'Categories and duplicates', body:'Automatically organize purchases and collapse duplicate captures.', href:'/goals/categories.html', image:'/home/goals/web-categories.webp' },
  { group:'Understand your money', title:'Dashboard and reports', body:'Explore stores, categories, time periods, trends, and tax-ready views.', href:'/reports', image:'/marketing/slides/v2/reports-web.webp' },
  { group:'Understand your money', title:'Guac AI questions', body:'Ask conversational questions about the receipts and spending you saved.', href:'/goals/read.html', image:'/home/goals/web-guac-ai.webp' },
  { group:'Understand your money', title:'Worth-It ratings', body:'Rate purchases in seconds and learn which spending was truly worthwhile.', href:'/resources/worth-it.html', image:'/home/goals/phone-worth-it.webp', phone:true },
  { group:'Understand your money', title:'GuacScore', body:'See a simple score that improves as your spending choices improve.', href:'/guacscore', image:'/home/goals/phone-guacscore.webp', phone:true },
  { group:'Keep more', title:'Subscriptions and recurring charges', body:'Surface repeat payments and see what is likely coming next.', href:'/resources/guides/subscriptions.html', image:'/home/goals/phone-subs.webp', phone:true },
  { group:'Keep more', title:'GuacWizard bank bites', body:'Find avoidable fees, interest, penalties, and other quiet money leaks.', href:'/bites', image:'/home/goals/web-fees.webp' },
  { group:'Keep more', title:'Returns and refunds', body:'Track return windows, policies, refund progress, and price-drop deadlines.', href:'/returns', image:'/home/goals/web-returns.webp' },
  { group:'Shop smarter', title:'Stash', body:'Build a living library of products you own, love, regret, and rebuy.', href:'/stash', image:'/home/goals/web-stash.webp' },
  { group:'Shop smarter', title:'Shopping List', body:'Predict what you will need next and create shareable shopping lists.', href:'/shopping', image:'/home/goals/web-smashlist.webp' },
  { group:'Shop smarter', title:'Steals', body:'Search current prices for the exact products you buy repeatedly.', href:'/steals', image:'/home/goals/web-steals.webp' },
  { group:'Shop smarter', title:'Marketplace and coupons', body:'Compare public deals, stores, coupons, and promo codes without an account.', href:'/marketplace', image:'/home/goals/web-marketplace.webp' },
  { group:'Plan & grow', title:'Bills calendar', body:'See recurring bills and known due dates before they arrive.', href:'/bills', image:'/home/goals/web-bills.webp' },
  { group:'Plan & grow', title:'GuacMoney', body:'Make refunds, savings, smarter choices, referrals, and activity visible.', href:'/goals/guacmoney.html', image:'/home/goals/web-organized.webp' },
  { group:'Plan & grow', title:'Car Miles', body:'Save tax- and reimbursement-ready mileage without background tracking.', href:'/goals/miles.html', image:'/home/goals/web-car-miles.webp' },
  { group:'Plan & grow', title:'Tax and charity reports', body:'Separate useful business, tax, charity, and spending records.', href:'/goals/reports.html', image:'/home/goals/phone-tax.webp', phone:true },
  { group:'Play & learn', title:'Guac Arcade', body:'Play 15 free money-themed games, earn GuacMoney, and join leaderboards.', href:'/games', image:'/home/goals/web-games.webp' },
  { group:'Privacy & control', title:'Private by design', body:'No bank login required, row-level security, and delete controls for your data.', href:'/goals/security.html', image:'/home/goals/phone-bank.webp', phone:true },
]

const FEATURE_STARTS = {
  'Receipt scanner': 'Open Receipts, choose Add, then photograph a paper receipt or select a receipt image or PDF. Review the store, date, total, and line items after Guac-AI finishes.',
  'GetGuac email inbox': 'Use your private @getguac.app address at checkout or forward an existing digital receipt to it. New email receipts will be organized with your other purchases.',
  'Statement import': 'Open Statements and upload a supported bank or card statement PDF. Review the imported rows and keep this optional if receipt-only tracking already fits you.',
  'Guac-AI parsing': 'Add a clear receipt and let Guac-AI extract its details. Check the result once; corrections help keep the saved purchase accurate and searchable.',
  'Categories and duplicates': 'Let categories build automatically as receipts arrive. Review unusual categories and run duplicate review when the same purchase may have entered more than once.',
  'Dashboard and reports': 'After several receipts are saved, open Reports and choose a useful period. Start with one question, such as where grocery spending changed this month.',
  'Guac AI questions': 'Open Guac AI and ask a specific question grounded in your saved receipts, such as what you spent at one store or which category increased.',
  'Worth-It ratings': 'Open Validate or a saved receipt and rate whether the purchase was worthwhile. A quick honest rating is more useful than trying to review everything perfectly.',
  'GuacScore': 'Rate a small group of recent purchases first. Revisit GuacScore after more ratings exist so it reflects your real pattern rather than one shopping trip.',
  'Subscriptions and recurring charges': 'Open recurring charges after enough history has accumulated. Review each detected repeat payment and decide whether to keep, investigate, or cancel it.',
  'GuacWizard bank bites': 'Import a statement, open Bank Bites, and review detected fees or interest. Focus on one avoidable charge and the action that prevents it next time.',
  'Returns and refunds': 'Open Returns after saving a recent receipt. Confirm the item and deadline, then update the status as the return and refund move forward.',
  'Stash': 'Save a few itemized receipts, then open Stash. Review the products GetGuac remembered and use an item card to rebuy, rate, or compare it.',
  'Shopping List': 'Open Shopping List and review predicted or previously purchased items. Add what you actually need, group the list by store, and share it when shopping with others.',
  'Steals': 'Choose an item you rebuy from Stash or Shopping List, open Steals, and compare matching sizes and quantities before deciding where to buy.',
  'Marketplace and coupons': 'Open Marketplace without signing in, search for a product, and compare current store offers. Check coupons before completing a purchase.',
  'Bills calendar': 'Add the recurring bills you already know with their due dates. Review the calendar weekly so upcoming charges are visible before they land.',
  'GuacMoney': 'Use GetGuac normally and let verified activity build the total. Treat GuacMoney as a scoreboard for visible value, not money that must be redeemed.',
  'Car Miles': 'Open Car Miles when starting a qualifying trip, add the route, and choose the correct purpose. Review the log before exporting it for records.',
  'Tax and charity reports': 'Categorize relevant receipts and mileage as they occur. Open Reports for the appropriate period and review the records before using an export.',
  'Guac Arcade': 'Open Games, choose any title, and finish a round. Sign in when you want eligible activity, saved high scores, and leaderboard participation.',
  'Private by design': 'Review Security and your account controls before importing sensitive records. Use only the optional connections you understand and delete data whenever needed.',
}

// The /goals and /resources guides are static files in public/, not Next routes.
// <Link> prefetches an RSC payload for whatever it points at, and for a static
// file that 404s — 16 links here meant ~17 failed requests on every production
// load. Dev never shows it, because Next only prefetches in production builds.
// Anything that is not a real route gets a plain <a>.
const isStaticPage = (href) => href.endsWith('.html') || href.startsWith('/resources')

function GuideLink({ href, className, children }) {
  return isStaticPage(href)
    ? <a href={href} className={className}>{children}</a>
    : <Link href={href} className={className}>{children}</Link>
}

function Step({ step }) {
  const Icon = step.icon
  const shots = [step.shot, SECONDARY_SHOTS[step.n]].filter(Boolean).sort((a,b)=>(a[2] === 'phone' ? 1 : 0) - (b[2] === 'phone' ? 1 : 0))
  return <article id={`step-${step.n}`} className="gg-step gg-chapter border-t border-emerald-950/10 py-12 first:border-0 first:pt-0">
    <div className="gg-copy">
      <div className="flex items-center gap-3"><span className="text-4xl font-black text-lime-600" style={DISPLAY}>{step.n}</span></div>
      <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173d27] text-[#b8ef52]"><Icon size={21}/></div>
      <h3 className="mt-4 text-2xl font-black leading-tight text-[#16331f] sm:text-3xl" style={DISPLAY}>{step.title}</h3>
      <p className="mt-4 text-[17px] leading-8 text-gray-700">{step.body}</p>
      <div className="mt-5 rounded-2xl bg-[#f5f8ed] p-4 text-[15px] leading-6 text-[#31533a]"><strong>Why this matters:</strong> {step.why}</div>
      <div className="mt-3 rounded-2xl border border-lime-700/15 bg-lime-50 p-4 text-[15px] leading-6 text-[#31533a]"><strong className="block text-[#173d27]">How this improves your habits</strong>{HABIT_IMPROVEMENTS[step.n]}</div>
      {step.note && <p className="mt-4 flex gap-2 text-sm leading-6 text-emerald-800"><LockKeyhole className="mt-0.5 shrink-0" size={16}/>{step.note}</p>}
      <GuideLink href={step.action[0]} className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-900/15 bg-white px-4 py-2.5 font-extrabold text-[#4d7c0f] shadow-sm transition hover:-translate-y-0.5 hover:border-lime-500 hover:text-[#365909] hover:shadow-md">{step.action[1]} <ArrowRight size={17}/></GuideLink>
    </div>
    {step.shot && <div className="gg-media"><div className="gg-visual"><div className={`gg-shot-stack ${shots.length > 1 ? 'paired' : ''}`}>{shots.map((shot)=><div className={`gg-shot-card ${shot[2] || ''}`} key={shot[0]}><span className="gg-shot-label">{shot[2] === 'phone' ? 'Mobile app' : 'Web app'} · tap to zoom</span><ZoomableImage src={shot[0]} alt={shot[1]} width={shot[2] ? 420 : 1200} height={shot[2] ? 860 : 780}/></div>)}</div></div><div className="gg-practice"><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#4d7c0f]">Try it now</p><p className="mt-2 text-lg font-black" style={DISPLAY}>One useful action, three small steps.</p><div className="gg-practice-list">{QUICK_ACTIONS[step.n].map((item,index)=><div className="gg-practice-item" key={item}><span className="gg-practice-number">{index+1}</span><span>{item}</span></div>)}</div></div></div>}
  </article>
}

export default function GetStartedPage() {
  return <MarketingShell subtitle="get-started">
    <style>{GS_CSS}</style>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(GUIDE_SCHEMA) }}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HOW_TO_SCHEMA) }}/>
    <main className="gg-guide text-[#16331f]">
      <GuideHeroSlideshow />
      {false && <section className="hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 px-3 py-1.5 text-xs font-black uppercase tracking-[.16em] text-emerald-800"><Sparkles size={14}/> The ultimate GetGuac guide</span>
            <p className="mt-6 text-5xl font-black leading-[.98] tracking-tight sm:text-7xl" style={DISPLAY}>One receipt.<br/><span className="text-lime-600">A clearer money life.</span></p>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#48614d]">A practical, step-by-step guide to getting GetGuac working for you—from your first scan to a receipt system that catches patterns, bills, subscriptions, and return deadlines.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/join?try=receipt" className="btn-primary">Try one receipt <ArrowRight size={17}/></Link><a href="#guide" className="btn-secondary">Read the guide</a></div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px]"><div className="absolute -left-5 -top-5 h-24 w-24 rounded-full bg-[#b8ef52]"/><img className="relative rounded-[32px] shadow-2xl shadow-emerald-950/20" src="/home/story-people/openai-hero-giggling-family-baby-v2.webp" alt="A family enjoying the confidence that comes from clearer spending" width="1200" height="900"/><div className="absolute -bottom-5 right-4 rounded-2xl bg-white p-4 shadow-xl"><p className="text-xs font-bold uppercase tracking-wider text-gray-400">The GetGuac promise</p><p className="mt-1 font-black">See it. Understand it. Keep more.</p></div></div>
        </div>
      </section>}

      {false && <section className="hidden">
        <div className="grid gap-5 md:grid-cols-3">
          {[['30 minutes','of hands-on setup'],['No bank login','receipt-first by design'],['Free forever','no card or paywall']].map(([a,b])=><div key={a} className="rounded-3xl border border-emerald-950/10 bg-white p-6"><p className="text-2xl font-black" style={DISPLAY}>{a}</p><p className="mt-1 text-sm text-gray-500">{b}</p></div>)}
        </div>
      </section>}

      <section id="guide" className="mx-auto pb-20" style={{ width: 'min(1264px, calc(100% - clamp(24px, 5vw, 56px)))' }}>
        <div className="gg-grid">
          <aside className="gg-toc rounded-3xl bg-[#173d27] p-6 text-white">
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#b8ef52]">Table of contents</p>
            <nav className="mt-5 space-y-4">{chapters.map((c,i)=><div key={c.id}><a href={`#${c.id}`} className="block rounded-xl px-3 py-2.5 text-white/75 transition hover:bg-white/10 hover:text-white"><span className="block text-[10px] font-black uppercase tracking-[.14em] text-[#b8ef52]">Chapter {i+1}</span><span className="mt-1 block text-sm font-bold leading-5">{c.label.replace(/^\d+\. /,'')}</span></a><div className="ml-3 mt-1 border-l border-white/15 pl-3">{steps.filter(step=>step.chapter===c.id).map(step=><a key={step.n} href={`#step-${step.n}`} className="block py-1.5 text-[11px] font-semibold leading-4 text-white/55 transition hover:text-white"><span className="mr-1.5 text-[#b8ef52]">{step.n}</span>{step.title}</a>)}</div></div>)}</nav>
            <div className="mt-5 border-t border-white/15 pt-5">
              <Link href="/how-it-works" className="group block rounded-2xl bg-[#b8ef52] p-4 text-[#173d27] transition hover:bg-lime-300">
                <span className="block text-[11px] font-black uppercase tracking-[.15em]">Explore next</span>
                <span className="mt-1 flex items-center justify-between gap-3 font-black">Our Features Guide <ArrowRight className="transition group-hover:translate-x-1" size={17}/></span>
                <span className="mt-2 block text-xs font-semibold leading-5 text-[#31533a]">See the complete interactive How It Works story.</span>
              </Link>
              <a href="#all-features" className="mt-3 block rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-white/85 transition hover:bg-white/10 hover:text-white">All 22 feature guides <ArrowRight className="ml-1 inline" size={15}/></a>
            </div>
            <div className="mt-6 border-t border-white/15 pt-6"><p className="text-sm leading-6 text-white/65">New here? Do only step one today. You can try it without creating an account.</p></div>
          </aside>
          <div>
            <section className="rounded-[32px] bg-[#fbf8ec] p-7 sm:p-9">
              <p className="text-xs font-black uppercase tracking-[.18em] text-lime-700">Before you begin</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl" style={DISPLAY}>Bring less than you think.</h2>
              <p className="mt-4 text-base leading-7 text-gray-600">You do not need a budget, a spreadsheet, or your bank password. Bring one recent receipt and access to the email where stores send receipts.</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">{['One paper or digital receipt','Your email address','A few known bill dates','Curiosity—not perfect records'].map(x=><li key={x} className="flex gap-3 rounded-2xl bg-white p-4 text-sm font-bold"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-200"><Check size={14}/></span>{x}</li>)}</ul>
            </section>

            <div className="mt-10">
              {chapters.map((chapter, i)=><section key={chapter.id} id={chapter.id} className="gg-chapter">
                <div className="mb-7 mt-14"><p className="text-xs font-black uppercase tracking-[.2em] text-lime-700">Chapter {i+1}</p><h2 className="mt-2 text-3xl font-black sm:text-4xl" style={DISPLAY}>{chapter.label.replace(/^\d+\. /,'')}</h2></div>
                {steps.filter(s=>s.chapter===chapter.id).map(s=><Step key={s.n} step={s}/>)}
              </section>)}
            </div>

            <section className="mt-10 rounded-[32px] bg-[#eaf4df] p-7 sm:p-10">
              <p className="text-xs font-black uppercase tracking-[.2em] text-lime-700">A rhythm that lasts</p><h2 className="mt-2 text-3xl font-black sm:text-4xl" style={DISPLAY}>Keep the system light.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-700">GetGuac works best as a light weekly rhythm, not a daily chore. Let receipts arrive automatically, then review only the signals that are useful to you.</p>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">{[['Each week','Add any paper receipts and glance at new return deadlines.'],['Each month','Review categories, recurring charges, and the next bill dates.'],['When life changes','Keep useful categories; ignore the rest. The system should fit you.']].map(([a,b])=><div key={a} className="rounded-2xl bg-white p-5"><p className="font-black">{a}</p><p className="mt-2 text-sm leading-6 text-gray-600">{b}</p></div>)}</div>
              <div className="mt-9 border-t border-emerald-950/10 pt-8">
                <p className="text-xs font-black uppercase tracking-[.18em] text-lime-700">Keep learning</p>
                <h3 className="mt-2 text-2xl font-black sm:text-3xl" style={DISPLAY}>Want to learn more?</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">Go deeper whenever you are ready. These are the best next places to understand the product and make more of your receipts.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ['/how-it-works','Our Features Guide','See the complete interactive story of how GetGuac learns from every receipt.'],
                    ['/faq','Frequently Asked Questions','Quick answers about receipts, privacy, email, and what is free.'],
                    ['/resources#guides','Read the money guides','Practical help with subscriptions, refunds, fees, and smarter shopping.'],
                    ['/tour','Watch the product tour','See the important GetGuac screens and workflows in action.'],
                    ['/security','Security and privacy','Understand how your data is protected and stays under your control.'],
                    ['/features','Browse every feature','Compare the complete toolkit by the benefit it provides.'],
                  ].map(([href,title,body])=><GuideLink key={href} href={href} className="group rounded-2xl bg-white p-4 ring-1 ring-emerald-950/10 transition hover:-translate-y-0.5 hover:shadow-md"><span className="flex items-center justify-between gap-3 font-black text-[#173d27]">{title}<ArrowRight className="shrink-0 text-lime-700 transition group-hover:translate-x-1" size={16}/></span><span className="mt-1.5 block text-xs leading-5 text-gray-500">{body}</span></GuideLink>)}
                </div>
              </div>
            </section>

            <section className="gg-tip mt-10 rounded-[32px] p-7 sm:p-10"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b8ef52] text-[#173d27]"><Lightbulb/></div><h2 className="mt-5 text-3xl font-black" style={DISPLAY}>What not to do yet</h2><ul className="mt-5 space-y-3 text-white/75">{['Do not hunt for every old receipt. Start now and let history build forward.','Do not wait for perfect categories. Useful patterns beat tidy labels.','Do not connect anything you do not understand. Email automation is optional and reversible.','Do not try every feature on day one. Complete the next useful step, then stop.'].map(x=><li key={x} className="flex gap-3"><Check className="mt-1 shrink-0 text-[#b8ef52]" size={17}/><span className="leading-7">{x}</span></li>)}</ul></section>
          </div>
        </div>
      </section>

      <section id="all-features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.2em] text-lime-700">Everything included</p><h2 className="mt-3 text-4xl font-black sm:text-6xl" style={DISPLAY}>Your guide to all 22 features.</h2><p className="mt-5 text-lg leading-8 text-gray-600">Every GetGuac tool is listed here. Choose one for a practical starting step and a large, zoomable view of the real app.</p></div>
        <FeatureExplorer features={ALL_FEATURES} starts={FEATURE_STARTS}/>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8"><p className="text-xs font-black uppercase tracking-[.2em] text-lime-700">What good looks like</p><h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black sm:text-5xl" style={DISPLAY}>A month from now, money feels less mysterious.</h2><div className="mx-auto mt-9 grid max-w-4xl gap-3 text-left sm:grid-cols-2">{['Receipts arrive without constant effort.','You know what you bought—not only where.','A forgotten recurring charge is visible.','Upcoming bills no longer feel sudden.','Return deadlines are caught before they close.','Your spending questions have real answers.'].map(x=><div key={x} className="flex gap-3 rounded-2xl border border-emerald-950/10 p-4 font-bold"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-200"><Check size={14}/></span>{x}</div>)}</div><div className="mt-10 flex flex-wrap justify-center gap-3"><Link href="/join?try=receipt" className="btn-primary">Start with one receipt <ArrowRight size={17}/></Link><Link href="/why-getguac" className="btn-secondary">Why GetGuac is different</Link></div></section>
    </main>
  </MarketingShell>
}
