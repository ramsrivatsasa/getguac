// Detect whether a receipt line item is a perishable that can't be returned —
// fresh produce, dairy, raw meat, eggs, fresh bakery, prepared deli, ice.
//
// Why per-item vs per-receipt: a Costco run typically contains both perishable
// (broccoli, milk, raw chicken) AND non-perishable goods (paper towels, dish
// soap, canned beans). Costco takes the non-perishables back happily under
// their lifetime policy, but won't refund a half-eaten salad. Marking the
// whole grocery receipt as non-returnable would block real returns; marking
// only the perishable lines is correct.
//
// Conservative bias: we only flag things that are UNAMBIGUOUSLY perishable.
// False negatives (e.g. failing to flag "raw turkey breast") are way less
// damaging than false positives blocking a legit return.

// Whole-word, case-insensitive keyword sets. We match the item_name against
// each set; one hit is enough.
const PRODUCE = [
  'apple','apples','banana','bananas','orange','oranges','lemon','lemons',
  'lime','limes','grape','grapes','strawberr','strawberries','blueberr',
  'raspberr','blackberr','cherr','cherries','peach','peaches','pear','pears',
  'plum','plums','mango','mangoes','pineapple','watermelon','melon','cantaloupe',
  'kiwi','avocado','avocados',
  'lettuce','spinach','kale','arugula','cabbage','cauliflower','broccoli',
  'celery','asparagus','cucumber','cucumbers','tomato','tomatoes','onion','onions',
  'garlic','potato','potatoes','carrot','carrots','pepper','peppers','jalapeno',
  'mushroom','mushrooms','zucchini','squash','pumpkin','eggplant','radish',
  'cilantro','parsley','basil','mint','rosemary','thyme','sage','dill','chives',
  'sprouts','salad','salads','greens',
]

const DAIRY = [
  'milk','milks',
  'yogurt','yoghurt','yogurts',
  'butter','cream','creamer','half and half','heavy cream','sour cream',
  'cottage cheese','ricotta','feta','mozzarella','cheddar','brie','goat cheese',
  'parmesan','provolone','swiss',
]

// Raw cheese in shrink-wrap can be returned at most chains, but fresh deli
// cuts / fresh-grated can't. Conservative: only flag clearly-fresh cheese terms.
// (Generic "cheese" alone catches too many shelf-stable variants.)

const MEAT_SEAFOOD = [
  'chicken','chicken breast','chicken thigh','chicken wing','chicken leg',
  'ground beef','steak','ribeye','sirloin','tenderloin','brisket','roast',
  'pork','pork chop','bacon','sausage','ham','prosciutto','salami','pepperoni',
  'turkey','turkey breast','ground turkey','ground pork',
  'lamb','veal',
  'fish','salmon','tuna','tilapia','cod','halibut','mahi','swordfish','trout',
  'shrimp','prawn','crab','lobster','scallop','clam','mussel','oyster','calamari',
]

const EGGS = ['egg','eggs','dozen eggs']

const BAKERY_FRESH = [
  // Fresh bakery: bagel, croissant, donut, danish — these go stale.
  'bagel','bagels','croissant','croissants','donut','donuts','doughnut',
  'danish','muffin','muffins','scone','scones','cupcake','cupcakes',
  // Generic "bread" alone catches sandwich bread (shelf-stable). Skip it.
  'fresh bread','artisan bread','sourdough loaf','baguette',
  // Sliced cake / pie sold fresh
  'pie','tart','cheesecake','tiramisu','cake slice',
]

const PREPARED = [
  'sushi','sashimi','poke','salad bowl','rotisserie chicken','deli sandwich',
  'sub sandwich','wrap','burrito bowl','prepared meal','meal kit',
  'hummus','salsa fresca','guacamole','pico de gallo','tzatziki',
  // Costco-style prepared: "kirkland deli pizza", "cooked shrimp tray"
  'deli pizza','cooked shrimp','ready to eat','heat and eat','heat-and-eat',
]

const ICE_AND_FLOWERS = [
  'ice','ice cubes','crushed ice','bag of ice',
  'flowers','roses','bouquet','plant','potted plant',
]

// Pharmacy items that can't be returned for re-sale once dispensed or once
// the sterile/safety seal is broken. Federal + state pharmacy regulations
// generally prohibit reselling prescription medications — the merchant
// won't take them back even if unopened. Same for diabetes test strips,
// CGM sensors, hearing aids, contact lenses, etc.
const PHARMACY = [
  // Generic markers
  'rx','prescription','prescription medicine','prescription drug',
  'pharmacy item','controlled substance',
  // Diabetes care — the user specifically called these out
  'one touch','onetouch','accu-chek','accuchek','contour next','truetest',
  'test strip','test strips','glucose strip','glucose strips',
  'lancet','lancets','lancing device',
  'glucose meter','glucometer',
  'dexcom','dexcom g6','dexcom g7','freestyle libre','libre sensor',
  'libre 2','libre 3','cgm sensor','continuous glucose monitor',
  // Insulin + injectable rx
  'insulin','insulin pen','insulin vial','insulin syringe',
  'humalog','novolog','lantus','tresiba','levemir','toujeo',
  'epipen','epinephrine auto injector','epinephrine auto-injector',
  'naloxone','narcan',
  // Inhalers + respiratory
  'inhaler','rescue inhaler','albuterol inhaler','nebulizer','spacer chamber',
  // Sensors + custom-fit medical devices
  'hearing aid','hearing aids','pulse oximeter','medical sensor',
  'cgm patch','heart rate sensor','sleep apnea','cpap mask','cpap supplies',
  // Vision (often non-returnable once opened)
  'contact lens','contact lenses','prescription glasses','prescription lenses',
  // Sterile single-use
  'syringe','syringes','needle','needles','insulin needle','catheter',
  'ostomy','colostomy bag','urinary catheter',
  'wound dressing','sterile gauze','sterile pad',
  // Personal use / intimate health (typically final sale once opened)
  'thermometer probe','rectal thermometer','enema','suppositor',
]

const ALL = [
  ...PRODUCE, ...DAIRY, ...MEAT_SEAFOOD, ...EGGS,
  ...BAKERY_FRESH, ...PREPARED, ...ICE_AND_FLOWERS,
]

function compilePattern(keywords) {
  return new RegExp(
    '\\b(?:' +
      keywords
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .sort((a, b) => b.length - a.length)
        .join('|') +
    ')\\b',
    'i'
  )
}

const PATTERN = compilePattern(ALL)
const PHARMACY_PATTERN = compilePattern(PHARMACY)

/**
 * Why an item can't be returned. Null when it CAN be returned.
 *
 * @param {{ item_name?: string, category?: string }} item
 * @returns {'perishable' | 'pharmacy' | null}
 */
export function getNonReturnableReason(item) {
  if (!item) return null
  const name = String(item.item_name || '').toLowerCase()
  if (!name) return null
  // Pharmacy first — some pharmacy-counter items might also match a
  // perishable keyword (e.g. a refrigerated insulin pen could match
  // "insulin" first); pharmacy is the more specific label.
  if (PHARMACY_PATTERN.test(name)) return 'pharmacy'
  if (PATTERN.test(name)) return 'perishable'
  return null
}

/**
 * @param {{ item_name?: string, category?: string }} item
 * @returns {boolean}
 */
export function isItemPerishable(item) {
  return getNonReturnableReason(item) !== null
}

export const _internals = { PRODUCE, DAIRY, MEAT_SEAFOOD, EGGS, BAKERY_FRESH, PREPARED, ICE_AND_FLOWERS, PHARMACY, PATTERN, PHARMACY_PATTERN }
