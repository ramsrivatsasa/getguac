// Dart mirror of web/src/lib/categories.js. Kept in sync by hand — when you
// add a preset on web you add it here too, or the picker on mobile will show
// "— Uncategorized" for the new slug.
//
// health_tier seeds the future Guac Health Score:
//   'healthy' | 'neutral' | 'treat' | 'harmful'
import 'package:flutter/material.dart';

class Category {
  final String slug;
  final String label;
  final String emoji;
  final String desc;
  final String color;
  final String healthTier;
  final bool custom;
  final String? id;

  const Category({
    required this.slug,
    required this.label,
    required this.emoji,
    required this.desc,
    required this.color,
    required this.healthTier,
    this.custom = false,
    this.id,
  });
}

const List<String> kHealthTiers = ['healthy', 'neutral', 'treat', 'harmful'];

const String kHealthTierDefault = 'neutral';

const List<Category> kPresetCategories = [
  Category(slug: 'grub',       label: 'Grub',      emoji: '🥑', desc: 'Groceries & food shopping',       color: 'emerald', healthTier: 'neutral'),
  Category(slug: 'eats',       label: 'Eats',      emoji: '🍽️', desc: 'Restaurants & dining',             color: 'orange',  healthTier: 'neutral'),
  Category(slug: 'bars',       label: 'Bars',      emoji: '🍻', desc: 'Bars, beer, wine & spirits',       color: 'fuchsia', healthTier: 'treat'),
  Category(slug: 'coffee',     label: 'Coffee',    emoji: '☕', desc: 'Coffee shops & beans',             color: 'amber',   healthTier: 'neutral'),
  Category(slug: 'tea',        label: 'Tea',       emoji: '🍵', desc: 'Tea & matcha',                     color: 'emerald', healthTier: 'healthy'),
  Category(slug: 'coke',       label: 'Coke',      emoji: '🥤', desc: 'Coca-Cola & sugary cola',          color: 'red',     healthTier: 'harmful'),
  Category(slug: 'pepsi',      label: 'Pepsi',     emoji: '🥤', desc: 'Pepsi & sugary cola',              color: 'sky',     healthTier: 'harmful'),
  Category(slug: 'juice',      label: 'Juice',     emoji: '🧃', desc: 'Fruit & vegetable juices',         color: 'orange',  healthTier: 'treat'),
  Category(slug: 'milkshake',  label: 'Milkshake', emoji: '🥛', desc: 'Milkshakes & sweet dairy drinks',  color: 'pink',    healthTier: 'harmful'),
  Category(slug: 'subs',       label: 'Subs',      emoji: '🔁', desc: 'Streaming + subscriptions',        color: 'violet',  healthTier: 'neutral'),
  Category(slug: 'bills',      label: 'Bills',     emoji: '💡', desc: 'Utilities',                        color: 'sky',     healthTier: 'neutral'),
  Category(slug: 'tech',       label: 'Tech',      emoji: '📱', desc: 'Electronics & gadgets',            color: 'sky',     healthTier: 'neutral'),
  Category(slug: 'big-stuff',  label: 'Big Stuff', emoji: '🔌', desc: 'Appliances & large purchases',     color: 'indigo',  healthTier: 'neutral'),
  Category(slug: 'fix-it',     label: 'Fix-It',    emoji: '🛠️', desc: 'Home maintenance & tools',         color: 'amber',   healthTier: 'neutral'),
  Category(slug: 'outdoors',   label: 'Outdoors',  emoji: '🌳', desc: 'Garden & plants',                  color: 'lime',    healthTier: 'healthy'),
  Category(slug: 'supplies',   label: 'Supplies',  emoji: '📎', desc: 'Office & school supplies',         color: 'indigo',  healthTier: 'neutral'),
  Category(slug: 'fits',       label: 'Fits',      emoji: '👔', desc: 'Clothing & shoes',                 color: 'fuchsia', healthTier: 'neutral'),
  Category(slug: 'wellness',   label: 'Wellness',  emoji: '💊', desc: 'Pharmacy, health, fitness',        color: 'rose',    healthTier: 'healthy'),
  Category(slug: 'gas-up',     label: 'Gas Up',    emoji: '⛽', desc: 'Fuel & auto service',              color: 'red',     healthTier: 'neutral'),
  Category(slug: 'fun',        label: 'Fun',       emoji: '🎬', desc: 'Entertainment & gaming',           color: 'violet',  healthTier: 'neutral'),
  Category(slug: 'gifting',    label: 'Gifting',   emoji: '🎁', desc: 'Gifts for others',                 color: 'pink',    healthTier: 'neutral'),
  Category(slug: 'charity',    label: 'Charity',   emoji: '❤️', desc: 'Donations & contributions',        color: 'rose',    healthTier: 'neutral'),
  Category(slug: 'misc',       label: 'Misc',      emoji: '📦', desc: 'Anything else',                    color: 'gray',    healthTier: 'neutral'),
];

const List<String> kColorOptions = [
  'emerald','orange','sky','indigo','amber','lime','fuchsia','rose','red','violet','pink','gray',
];

// Mirrors the tailwind tone map on web — used to tint chips on the picker.
const Map<String, Color> kColorSwatch = {
  'emerald': Color(0xFF10B981),
  'orange':  Color(0xFFF97316),
  'sky':     Color(0xFF0EA5E9),
  'indigo':  Color(0xFF6366F1),
  'amber':   Color(0xFFF59E0B),
  'lime':    Color(0xFF84CC16),
  'fuchsia': Color(0xFFD946EF),
  'rose':    Color(0xFFF43F5E),
  'red':     Color(0xFFEF4444),
  'violet':  Color(0xFF8B5CF6),
  'pink':    Color(0xFFEC4899),
  'gray':    Color(0xFF6B7280),
};

Color tintFor(String? color) => kColorSwatch[color] ?? const Color(0xFF6B7280);

Category? presetBySlug(String slug) {
  for (final c in kPresetCategories) {
    if (c.slug == slug) return c;
  }
  return null;
}

String categoryLabel(String? slug, {List<Category>? custom}) {
  if (slug == null || slug.isEmpty) return '— Uncategorized';
  final p = presetBySlug(slug);
  if (p != null) return '${p.emoji} ${p.label}';
  if (custom != null) {
    for (final c in custom) {
      if (c.slug == slug) return '${c.emoji} ${c.label}';
    }
  }
  return slug;
}

String healthTierFor(String? slug, {List<Category>? custom}) {
  if (slug == null) return kHealthTierDefault;
  final p = presetBySlug(slug);
  if (p != null) return p.healthTier;
  if (custom != null) {
    for (final c in custom) {
      if (c.slug == slug) return c.healthTier;
    }
  }
  return kHealthTierDefault;
}
