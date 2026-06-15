// Curated catalog of major US retailers for the Marketplace "Stores" directory.
//
// Honesty rule: we do NOT fabricate coupon codes. Each store links to its OWN
// official deals/coupons page (`dealsUrl`) so what the user sees is real. The
// directory's value is discovery + a jump into GetGuac's live price search
// scoped to that store, plus the GuacMoney-on-receipts tie-in.
//
// `color` is a brand-ish tile color (we render a colored initial tile rather
// than hotlinking trademarked logos). `popular` seeds a representative deals
// search so "Find deals" lands on a useful grid.

export const STORE_CATEGORIES = [
  'All', 'Big box', 'Grocery', 'Pharmacy', 'Electronics', 'Home', 'Fashion', 'Beauty', 'Warehouse', 'Sporting', 'Marketplace',
]

export const STORE_CATALOG = [
  { slug: 'walmart',    name: 'Walmart',     emoji: '🛒', category: 'Big box',     color: '#0071dc', dealsUrl: 'https://www.walmart.com/cp/deals/', popular: 'walmart rollback deals' },
  { slug: 'target',     name: 'Target',      emoji: '🎯', category: 'Big box',     color: '#cc0000', dealsUrl: 'https://www.target.com/c/top-deals/-/N-4tdmt', popular: 'target home deals' },
  { slug: 'amazon',     name: 'Amazon',      emoji: '📦', category: 'Marketplace', color: '#ff9900', dealsUrl: 'https://www.amazon.com/deals', popular: 'amazon today deals' },
  { slug: 'costco',     name: 'Costco',      emoji: '🏬', category: 'Warehouse',   color: '#e31837', dealsUrl: 'https://www.costco.com/savings.html', popular: 'costco member deals' },
  { slug: 'samsclub',   name: "Sam's Club",  emoji: '🏷️', category: 'Warehouse',   color: '#0067a0', dealsUrl: 'https://www.samsclub.com/savings', popular: 'sams club instant savings' },
  { slug: 'bestbuy',    name: 'Best Buy',    emoji: '💻', category: 'Electronics', color: '#0046be', dealsUrl: 'https://www.bestbuy.com/site/misc/deal-of-the-day/pcmcat248000050016.c', popular: 'best buy laptop deals' },
  { slug: 'homedepot',  name: 'Home Depot',  emoji: '🔨', category: 'Home',        color: '#f96302', dealsUrl: 'https://www.homedepot.com/c/Specials_and_Offers', popular: 'home depot tool deals' },
  { slug: 'lowes',      name: "Lowe's",      emoji: '🏡', category: 'Home',        color: '#004990', dealsUrl: 'https://www.lowes.com/c/Deals-savings', popular: 'lowes appliance deals' },
  { slug: 'wayfair',    name: 'Wayfair',     emoji: '🛋️', category: 'Home',        color: '#7b189f', dealsUrl: 'https://www.wayfair.com/deals', popular: 'wayfair furniture deals' },
  { slug: 'kroger',     name: 'Kroger',      emoji: '🥬', category: 'Grocery',     color: '#0c4da2', dealsUrl: 'https://www.kroger.com/savings/cl/coupons', popular: 'kroger grocery deals' },
  { slug: 'cvs',        name: 'CVS',         emoji: '💊', category: 'Pharmacy',    color: '#cc0000', dealsUrl: 'https://www.cvs.com/extracare/home', popular: 'cvs personal care deals' },
  { slug: 'walgreens',  name: 'Walgreens',   emoji: '🩹', category: 'Pharmacy',    color: '#e31837', dealsUrl: 'https://www.walgreens.com/topic/promotion/weekly-ad.jsp', popular: 'walgreens vitamins deals' },
  { slug: 'kohls',      name: "Kohl's",      emoji: '👕', category: 'Fashion',     color: '#7a2e8e', dealsUrl: 'https://www.kohls.com/sale-event/deals.jsp', popular: 'kohls clothing deals' },
  { slug: 'macys',      name: "Macy's",      emoji: '🛍️', category: 'Fashion',     color: '#e21a2c', dealsUrl: 'https://www.macys.com/shop/sale', popular: 'macys apparel deals' },
  { slug: 'nike',       name: 'Nike',        emoji: '👟', category: 'Fashion',     color: '#111111', dealsUrl: 'https://www.nike.com/w/sale-3yaep', popular: 'nike shoe deals' },
  { slug: 'sephora',    name: 'Sephora',     emoji: '💄', category: 'Beauty',      color: '#111111', dealsUrl: 'https://www.sephora.com/sale', popular: 'sephora skincare deals' },
  { slug: 'ulta',       name: 'Ulta Beauty', emoji: '💅', category: 'Beauty',      color: '#e1308f', dealsUrl: 'https://www.ulta.com/promotion/all', popular: 'ulta makeup deals' },
  { slug: 'dicks',      name: "Dick's",      emoji: '🏀', category: 'Sporting',    color: '#16753f', dealsUrl: 'https://www.dickssportinggoods.com/f/all-sale', popular: 'dicks sporting goods deals' },
  { slug: 'ebay',       name: 'eBay',        emoji: '🔖', category: 'Marketplace', color: '#e53238', dealsUrl: 'https://www.ebay.com/deals', popular: 'ebay daily deals' },
  { slug: 'apple',      name: 'Apple',       emoji: '🍎', category: 'Electronics', color: '#111111', dealsUrl: 'https://www.apple.com/shop/refurbished', popular: 'apple ipad deals' },
  { slug: 'gap',        name: 'Gap',         emoji: '🧥', category: 'Fashion',     color: '#00227b', dealsUrl: 'https://www.gap.com/browse/category.do?cid=1127944', popular: 'gap clothing deals' },
  { slug: 'wholefoods', name: 'Whole Foods', emoji: '🥑', category: 'Grocery',     color: '#00674b', dealsUrl: 'https://www.wholefoodsmarket.com/sales-flyer', popular: 'whole foods grocery deals' },
]

export function findStore(slug) {
  return STORE_CATALOG.find((s) => s.slug === slug) || null
}
