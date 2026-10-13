// Deterministic item artwork used while a product photo is loading or when
// the image service is unavailable. Keep this local and predictable: Stash
// must never collapse a whole basket into the generic package icon merely
// because an external lookup was throttled.
const ITEM_EMOJI_RULES = [
  [/(avocado|guacamole)/i, '🥑'],
  [/(apple|pear)/i, '🍎'],
  [/(banana)/i, '🍌'],
  [/(orange|clementine|tangerine)/i, '🍊'],
  [/(lemon|lime)/i, '🍋'],
  [/(grape)/i, '🍇'],
  [/(strawberr|blueberr|raspberr|blackberr|berries)/i, '🍓'],
  [/(watermelon|melon)/i, '🍉'],
  [/(tomato)/i, '🍅'],
  [/(potato|fries)/i, '🥔'],
  [/(carrot)/i, '🥕'],
  [/(broccoli|cauliflower)/i, '🥦'],
  [/(lettuce|spinach|kale|salad|greens)/i, '🥬'],
  [/(pepper|chili|jalape)/i, '🌶️'],
  [/(corn)/i, '🌽'],
  [/(bread|bagel|bun|roll|loaf)/i, '🍞'],
  [/(croissant)/i, '🥐'],
  [/(egg)/i, '🥚'],
  [/(milk|cream|yogurt)/i, '🥛'],
  [/(cheese)/i, '🧀'],
  [/(chicken|turkey)/i, '🍗'],
  [/(beef|steak|pork|meat)/i, '🥩'],
  [/(fish|salmon|tuna|seafood)/i, '🐟'],
  [/(shrimp|prawn)/i, '🍤'],
  [/(rice)/i, '🍚'],
  [/(pasta|spaghetti|noodle)/i, '🍝'],
  [/(pizza)/i, '🍕'],
  [/(burger)/i, '🍔'],
  [/(taco|tortilla)/i, '🌮'],
  [/(cookie|biscuit)/i, '🍪'],
  [/(cake|cupcake)/i, '🧁'],
  [/(candy|chocolate)/i, '🍫'],
  [/(chip|popcorn|cracker|snack)/i, '🍿'],
  [/(coffee|espresso)/i, '☕'],
  [/(tea|matcha)/i, '🍵'],
  [/(water|seltzer|soda|juice|drink)/i, '🥤'],
  [/(beer|ale|lager)/i, '🍺'],
  [/(wine)/i, '🍷'],
  [/(soap|detergent|cleaner|sponge)/i, '🧽'],
  [/(toilet paper|tissue|paper towel)/i, '🧻'],
  [/(tooth|dental|mouthwash)/i, '🪥'],
  [/(shampoo|conditioner|lotion|skincare)/i, '🧴'],
  [/(medicine|tablet|capsule|vitamin|tylenol|advil)/i, '💊'],
  [/(shirt|jacket|pants|jeans|clothing)/i, '👕'],
  [/(shoe|sneaker|boot)/i, '👟'],
  [/(phone|tablet|charger|headphone)/i, '📱'],
  [/(computer|laptop|keyboard|mouse)/i, '💻'],
  [/(book|notebook)/i, '📚'],
  [/(pen|pencil|marker)/i, '✏️'],
  [/(dog|puppy)/i, '🐶'],
  [/(cat|kitten)/i, '🐱'],
  [/(flower|plant|garden)/i, '🪴'],
  [/(tool|hammer|drill|hardware)/i, '🛠️'],
]

export function itemEmoji(itemName, categoryEmoji = '📦') {
  const name = String(itemName || '').trim()
  for (const [pattern, emoji] of ITEM_EMOJI_RULES) {
    if (pattern.test(name)) return emoji
  }
  return categoryEmoji || '📦'
}
