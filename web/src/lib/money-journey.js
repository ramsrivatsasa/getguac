import { Users, Camera, Mail, FileText, Landmark, LayoutDashboard, Wallet, BarChart3 as ChartNoAxesCombined, Gauge, Calculator, GraduationCap, Target, CalendarDays, RotateCcw, Gift, ShoppingBasket, Tags, Package, Store, Car } from 'lucide-react'

export const MONEY_GROUPS = [
  {
    slug: 'capture', name: 'Capture', Icon: Camera, color: '#9a3412',
    title: 'Bring your money together.',
    cardTitle: 'Receipts and records.',
    summary: 'Turn paper and digital receipts into searchable purchase records. Keep items, stores and totals alongside income, accounts and statements.',
    photo: '/home/story-people/capture-blonde-produce-v1-768.webp', photoAlt: 'A shopper keeping a record of an everyday purchase on her phone',
    action: 'Explore receipts and records',
    items: [
      { id:'receipts', name:'Receipts and purchase history', shortName:'Receipts', tabLabel:'Start here', kicker:'Remember every item', Icon:Camera, text:'Scan paper receipts or add digital ones. Review the merchant, date, items and total, then search the purchase later.', href:'/join?try=receipt', action:'Try one receipt free' },
      { id:'income', name:'Income and money records', shortName:'Income', tabLabel:'Plan from', kicker:'Give your plan a starting point', Icon:Wallet, text:'Enter income sources and payment schedules so your budget starts with the timing you know.', href:'/goals/first-budget.html', action:'Read the budget guide' },
      { id:'accounts', name:'Accounts, assets and debts', shortName:'Accounts and debts', tabLabel:'See your', kicker:'See a fuller position', Icon:Landmark, text:'Record balances, assets and debts together. Add only what helps; linking a bank is not required.', href:'/goals/money-goals.html', action:'Read the goals guide' },
      { id:'documents', name:'Statements and documents', shortName:'Statements', tabLabel:'Import', kicker:'Review before you rely on it', Icon:FileText, text:'Upload supported statements and documents, then review the information GetGuac extracts.', href:'/bank', action:'Open statements' },
      { id:'email', name:'Email and retailer connections', shortName:'Email and retailers', tabLabel:'Bring in', kicker:'File digital purchases', Icon:Mail, text:'Bring supported retailer receipts and shopping messages together while keeping promotions separate from purchase records.', href:'/how-email-works', action:'Read the email guide' },
      { id:'miles', name:'Car miles', shortName:'Car miles', tabLabel:'Track', kicker:'Keep trips with your records', Icon:Car, text:'Record mileage by purpose so trip history stays alongside the rest of your money information.', href:'/goals/miles.html', action:'Read the mileage guide' },
    ],
  },
  {
    slug:'understand', name:'Understand', Icon:ChartNoAxesCombined, color:'#1d4ed8',
    title:'Make sense of your money.',
    summary:'See the items behind your spending, not just a store total. Review categories, build your budget and understand where you stand.',
    photo:'/home/story-people/protect-couple-tablet-768.webp', photoAlt:'A couple reviewing household records together at their table',
    action:'Explore budgets and insights',
    items:[
      { id:'dashboard', name:'Dashboard', Icon:LayoutDashboard, text:'Bring spending activity, useful reminders and your money overview into one place.', href:'/dashboard', action:'Open Dashboard' },
      { id:'budget', name:'Budget', Icon:Wallet, text:'Plan income, spending, bills and savings. Compare your plan with recorded activity and adjust the month.', href:'/goals/first-budget.html', action:'Read the budget guide' },
      { id:'reports', name:'Categories and reports', Icon:ChartNoAxesCombined, text:'Turn receipt and purchase records into spending insights by category and time period, including records for tax reporting.', href:'/reports', action:'Open Reports' },
      { id:'scores', name:'GuacScore and GuacWizard', Icon:Gauge, text:'Explore spending scores and financial indicators alongside the information behind them.', href:'/goals/wizard.html', action:'Explore money indicators' },
      { id:'worth-it', name:'Worth It', Icon:ShoppingBasket, text:'Rate purchases and remember which ones were worth repeating.', href:'/features/worth-it', action:'Explore purchase ratings' },
      { id:'calculators', name:'Calculators', Icon:Calculator, text:'Explore savings, debt and other money scenarios using your own assumptions.', href:'/calculators', action:'Use the calculators' },
      { id:'learning', name:'Learning, news and games', Icon:GraduationCap, text:'Build money knowledge with practical guides, news and learning activities.', href:'/learn', action:'Explore learning' },
    ],
  },
  {
    slug:'protect', name:'Protect', Icon:Target, color:'#6d28d9',
    title:'Protect what matters.',
    summary:'Keep purchase records handy for returns and track refunds. Review recurring bills while making room for savings and long-term goals.',
    photo:'/images/goals/first-home-768.webp', photoAlt:'A couple holding the keys to a home, representing a long-term savings goal',
    action:'Explore savings and goals',
    items:[
      { id:'retirement', name:'Retirement', Icon:Landmark, text:'Explore retirement scenarios using your savings, timeframe and assumptions.', href:'/calculators', action:'Explore retirement calculators' },
      { id:'wealth', name:'Wealth', Icon:ChartNoAxesCombined, text:'Review assets, debts and net worth in Wealth Path.', href:'/goals/money-goals.html', action:'Read the goals guide' },
      { id:'family', name:'Family', Icon:Users, text:'Manage household connections and available sharing controls.', href:'/connections', action:'Explore family connections' },
      { id:'goals', name:'Goals and savings', Icon:Target, text:'Set a target, record progress and review the pace toward an emergency cushion, a home or another long-term goal.', href:'/goals/money-goals.html', action:'Read the goals guide' },
      { id:'bills', name:'Bills and subscriptions', Icon:CalendarDays, text:'Track upcoming payments and recurring costs so you can review what still belongs in your budget.', href:'/features/prepare', action:'Explore bill tracking' },
      { id:'returns', name:'Returns and refunds', Icon:RotateCcw, text:'Keep return deadlines, refundable amounts and refund status visible after checkout.', href:'/goals/recover.html', action:'Explore return tracking' },
      { id:'deals', name:'Steals, deals and promotions', Icon:Tags, text:'Compare offers for things you already plan to buy. Promotions stay separate from purchases.', href:'/deals', action:'Explore deals' },
      { id:'marketplace', name:'Marketplace', Icon:Store, text:'Search products and compare offers across retailers before deciding where to buy.', href:'/marketplace', action:'Open Marketplace' },
    ],
  },
]

export const getMoneyGroup = slug => MONEY_GROUPS.find(group => group.slug === slug)
export const TOOL_GROUP = { remember:'protect', prepare:'protect', 'shop-smart':'protect', 'worth-it':'understand', 'next-trip':'protect' }


