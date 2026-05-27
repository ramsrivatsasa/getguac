// Sectioned emoji picker with search — mirrors web/src/components/EmojiCatalog.jsx.
// Same sections + same keyword tag table so typing "starbucks" surfaces ☕ on both
// platforms. Emits onPick(emoji) up to the parent.

import 'package:flutter/material.dart';

class EmojiSection {
  final String id;
  final String label;
  final List<String> emojis;
  const EmojiSection({required this.id, required this.label, required this.emojis});
}

const List<EmojiSection> kEmojiSections = [
  EmojiSection(id: 'drinks', label: 'Drinks', emojis: [
    '☕','🍵','🥤','🧃','🥛','🧋','💧','🧊','🍶','🍹','🧉','🍺','🍻','🍷','🥂','🥃','🍸','🍾','🍼',
  ]),
  EmojiSection(id: 'food', label: 'Food', emojis: [
    '🍎','🍌','🍇','🍊','🍓','🍑','🍍','🥝','🍒','🥭','🍉','🥥','🍈','🥦','🥕','🌽','🥒','🥬','🌶️','🍅','🥑',
    '🍞','🥖','🥨','🥯','🧀','🥩','🍗','🍖','🥓','🍳','🥚','🥗','🥪','🌮','🌯','🥙','🍕','🍔','🍟','🍝','🍜','🍣','🍱','🥟','🍤',
  ]),
  EmojiSection(id: 'sweets', label: 'Sweets', emojis: [
    '🍪','🎂','🍰','🧁','🍫','🍬','🍭','🍩','🍮','🍯','🍦','🍨','🥧',
  ]),
  EmojiSection(id: 'home', label: 'Home', emojis: [
    '🏠','🛏️','🛋️','🪑','🚪','🪟','🚿','🛁','🚽','🧻','🧴','🪣','🧹','🧺','🧽','🧼','🪥','🪒','🧯','🪜','🔑','🪞','🛒',
  ]),
  EmojiSection(id: 'tech', label: 'Tech', emojis: [
    '📱','💻','🖥️','⌨️','🖱️','🖨️','💾','💿','📀','🎧','🎤','📷','📸','📹','📺','📻','🔌','🔋','📡','💡','🎮','🕹️',
  ]),
  EmojiSection(id: 'health', label: 'Health', emojis: [
    '💊','🩺','🦷','👓','🥽','🧘','🏋️','🚴','🏃','⚽','🏀','🏈','⚾','🎾','🏐','🏓','🏸','🥊','🥋','🩹','🧪','🌡️','🧬','💉',
  ]),
  EmojiSection(id: 'pets', label: 'Pets', emojis: [
    '🐶','🐱','🐹','🐰','🐦','🐟','🐠','🐢','🦎','🦴','🐾','🐕','🐈','🐇','🦜','🦢',
  ]),
  EmojiSection(id: 'travel', label: 'Travel', emojis: [
    '✈️','🚗','🚕','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚛','🚜','🛵','🏍️','🚲','🛴','🚆','🚇','🚉','🚊','🚝','🚂','⛴️','🛳️','⛵','🚤','⚓','⛽','🏨','🗺️','🧳','🛂','🛃',
  ]),
  EmojiSection(id: 'work', label: 'Work', emojis: [
    '💼','📁','📂','📋','📌','📍','📎','🖇️','📏','📐','✂️','🖊️','🖋️','✏️','📝','📒','📓','📔','📕','📗','📘','📙','📚','📰','🗞️','🖼️','🎨','🖌️','🧮',
  ]),
  EmojiSection(id: 'fun', label: 'Fun', emojis: [
    '🎬','🎮','🕹️','🎲','🧩','🎯','🎳','🎤','🎵','🎶','🎷','🎸','🎹','🥁','🎺','🎻','🪕','🎭','🎟️','🎫','🎪','🎨','📚','📖',
  ]),
  EmojiSection(id: 'beauty', label: 'Beauty', emojis: [
    '💄','👄','💋','💅','🧴','🧼','🪥','🪒','💇','💆','🧖','👗','👘','👚','👕','👖','🩳','👔','👞','👟','👠','👡','👢','🥿','🩴','🧢','🎩','👑','💍','💎','👜','👛','👝','🎒',
  ]),
  EmojiSection(id: 'money', label: 'Money', emojis: [
    '💰','💵','💴','💶','💷','💳','🏦','📈','📉','💸','🪙','🧾',
  ]),
  EmojiSection(id: 'nature', label: 'Nature', emojis: [
    '🌳','🌲','🌴','🌵','🌿','☘️','🍀','🍁','🍂','🍃','🌱','🌷','🌹','🌺','🌻','🌼','🌸','💐','🪴','🌾','🌊','☀️','🌧️','⛈️','❄️','🔥','🌈',
  ]),
  EmojiSection(id: 'symbols', label: 'Symbols', emojis: [
    '📦','🎁','❤️','💚','💛','🧡','💙','💜','🖤','🤍','⭐','✨','✅','❌','❓','❗','🔁','🔄','🆕','🆙','🆓','🔒','🔓','📅','🗓️','⏰','⏱️','⏳','⌛','💡','🔥','🌱','🧩','🎉','🎊','🏆','🥇','🥈','🥉','🏅','🎖️',
  ]),
];

const Map<String, List<String>> _emojiTags = {
  '☕': ['coffee','latte','espresso','starbucks','dunkin','peets','mocha','americano','cappuccino','brew'],
  '🍵': ['tea','matcha','chai','oolong','earlgrey','green'],
  '🥤': ['soda','coke','pepsi','cola','pop','drink','fountain'],
  '🧃': ['juice','minutemaid','tropicana','box','oj'],
  '🥛': ['milk','milkshake','shake','dairy'],
  '🧋': ['boba','bubbletea','tapioca'],
  '💧': ['water','hydrate','aqua'],
  '🍺': ['beer','ale','lager','pint','bar','pub'],
  '🍻': ['beer','cheers','bar','pub','toast'],
  '🍷': ['wine','red','merlot','cabernet','chardonnay','bar'],
  '🥂': ['champagne','toast','celebrate','bar'],
  '🥃': ['whiskey','whisky','bourbon','scotch','spirits','bar'],
  '🍸': ['martini','cocktail','bar'],
  '🍾': ['champagne','sparkling','bar','celebrate'],
  '🥑': ['avocado','guac','guacamole'],
  '🥦': ['broccoli','veggie','vegetable','green'],
  '🥕': ['carrot','veggie','vegetable'],
  '🍞': ['bread','loaf','bakery'],
  '🧀': ['cheese','dairy'],
  '🥩': ['meat','steak','beef'],
  '🍗': ['chicken','meat','poultry','drumstick'],
  '🥗': ['salad','healthy','veggie'],
  '🍪': ['cookie','sweet'],
  '🎂': ['cake','birthday','dessert'],
  '🍩': ['donut','doughnut','dessert','dunkin'],
  '🍦': ['icecream','dessert','softserve'],
  '🏠': ['home','house','property'],
  '🛏️': ['bed','sleep','bedroom'],
  '🛋️': ['couch','sofa','livingroom'],
  '🛒': ['cart','shopping','grocery'],
  '📱': ['phone','mobile','cell','smartphone'],
  '💻': ['laptop','computer'],
  '💊': ['pill','medicine','pharmacy'],
  '🩺': ['stethoscope','medical','doctor'],
  '🧘': ['yoga','meditate','wellness'],
  '🏋️': ['gym','weights','fitness'],
  '🐶': ['dog','puppy','pet'],
  '🐱': ['cat','kitten','pet'],
  '🦴': ['bone','dog','treat'],
  '✈️': ['plane','flight','travel','airline'],
  '🚗': ['car','auto','drive'],
  '⛽': ['gas','fuel','petrol'],
  '🏨': ['hotel','lodging','stay'],
  '💼': ['briefcase','work','business'],
  '🎬': ['movie','film','cinema'],
  '🎮': ['gaming','console','controller'],
  '💄': ['lipstick','makeup','beauty'],
  '👔': ['shirt','tie','formal'],
  '💰': ['money','cash','bag'],
  '💳': ['card','credit','debit'],
  '🏦': ['bank','finance'],
  '🌳': ['tree','outdoor','plant','garden'],
  '🌱': ['seedling','grow','green','plant'],
  '🔥': ['fire','hot','spicy'],
  '📦': ['box','package','shipping','default'],
  '🎁': ['gift','present','wrap','birthday'],
  '🔁': ['repeat','loop','recurring','subscription'],
};

List<String> searchEmoji(String query, {int limit = 64}) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) {
    return [for (final s in kEmojiSections) ...s.emojis].take(limit).toList();
  }
  final sectionHits = <String>[];
  for (final s in kEmojiSections) {
    if (s.label.toLowerCase().contains(q) || s.id.contains(q)) {
      sectionHits.addAll(s.emojis);
    }
  }
  final tagHits = <String>[];
  _emojiTags.forEach((emoji, tags) {
    if (tags.any((t) => t.contains(q))) tagHits.add(emoji);
  });
  final seen = <String>{};
  final merged = <String>[];
  for (final e in [...sectionHits, ...tagHits]) {
    if (seen.add(e)) merged.add(e);
    if (merged.length >= limit) break;
  }
  return merged;
}

class EmojiCatalogWidget extends StatefulWidget {
  final String? value;
  final ValueChanged<String> onPick;
  const EmojiCatalogWidget({super.key, this.value, required this.onPick});

  @override
  State<EmojiCatalogWidget> createState() => _EmojiCatalogWidgetState();
}

class _EmojiCatalogWidgetState extends State<EmojiCatalogWidget> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final searching = _q.trim().isNotEmpty;
    final results = searching ? searchEmoji(_q, limit: 120) : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          decoration: InputDecoration(
            hintText: 'Search emojis (e.g. starbucks, beer, pet)',
            prefixIcon: const Icon(Icons.search, size: 18),
            isDense: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          onChanged: (v) => setState(() => _q = v),
        ),
        const SizedBox(height: 8),
        Container(
          height: 260,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFB),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            borderRadius: BorderRadius.circular(10),
          ),
          child: searching
              ? _grid(results!)
              : ListView(
                  children: [
                    for (final s in kEmojiSections) ...[
                      Padding(
                        padding: const EdgeInsets.only(left: 2, top: 4, bottom: 4),
                        child: Text(
                          s.label.toUpperCase(),
                          style: const TextStyle(fontSize: 10, color: Colors.black54, fontWeight: FontWeight.w700, letterSpacing: 0.5),
                        ),
                      ),
                      _grid(s.emojis),
                      const SizedBox(height: 8),
                    ],
                  ],
                ),
        ),
      ],
    );
  }

  Widget _grid(List<String> emojis) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 8,
      mainAxisSpacing: 4,
      crossAxisSpacing: 4,
      childAspectRatio: 1,
      children: emojis.map((e) {
        final selected = widget.value == e;
        return InkWell(
          onTap: () => widget.onPick(e),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            decoration: BoxDecoration(
              color: selected ? const Color(0xFFD1FAE5) : Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: selected ? const Color(0xFF10B981) : const Color(0xFFE5E7EB)),
            ),
            alignment: Alignment.center,
            child: Text(e, style: const TextStyle(fontSize: 20)),
          ),
        );
      }).toList(),
    );
  }
}
