// Bottom-sheet category picker for mobile. Two stacked sheets:
//   1. Pick existing — presets + the user's custom categories, with search.
//      Tap a tile → onPicked(slug) → sheet closes.
//   2. Create new — opened from a "+ New category" tile in sheet 1. Inputs:
//      label TextField, EmojiCatalogWidget, color swatches, health-tier
//      dropdown. On submit → CategoriesService.createUserCategory → sheet
//      closes back to caller with the new slug.
//
// Usage:
//   showCategoryPickerSheet(
//     context,
//     currentSlug: item.category,
//     onPicked: (slug) => save(slug),
//   );

import 'package:flutter/material.dart';
import '../categories.dart';
import '../services/categories_service.dart';
import 'emoji_catalog_widget.dart';

Future<String?> showCategoryPickerSheet(
  BuildContext context, {
  String? currentSlug,
}) {
  return showModalBottomSheet<String?>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _CategoryPickerSheet(currentSlug: currentSlug),
  );
}

class _CategoryPickerSheet extends StatefulWidget {
  final String? currentSlug;
  const _CategoryPickerSheet({this.currentSlug});

  @override
  State<_CategoryPickerSheet> createState() => _CategoryPickerSheetState();
}

class _CategoryPickerSheetState extends State<_CategoryPickerSheet> {
  String _query = '';
  List<Category> _custom = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final rows = await CategoriesService.getUserCategories();
    if (!mounted) return;
    setState(() {
      _custom = rows;
      _loading = false;
    });
  }

  List<Category> _filter(List<Category> src) {
    if (_query.trim().isEmpty) return src;
    final q = _query.toLowerCase();
    return src.where((c) =>
        c.label.toLowerCase().contains(q) ||
        c.slug.contains(q) ||
        c.desc.toLowerCase().contains(q)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (ctx, scrollCtrl) {
        final presets = _filter(kPresetCategories);
        final yours = _filter(_custom);

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              Container(
                width: 40, height: 4, margin: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text('Pick a category', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search categories',
                    prefixIcon: const Icon(Icons.search, size: 18),
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onChanged: (v) => setState(() => _query = v),
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : ListView(
                        controller: scrollCtrl,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: [
                          if (yours.isNotEmpty) ...[
                            const _SectionHeader(label: 'Yours'),
                            ...yours.map((c) => _CategoryTile(
                                  cat: c,
                                  selected: c.slug == widget.currentSlug,
                                  onTap: () => Navigator.of(context).pop(c.slug),
                                )),
                            const SizedBox(height: 12),
                          ],
                          const _SectionHeader(label: 'Presets'),
                          ...presets.map((c) => _CategoryTile(
                                cat: c,
                                selected: c.slug == widget.currentSlug,
                                onTap: () => Navigator.of(context).pop(c.slug),
                              )),
                          const SizedBox(height: 12),
                          _NewCategoryTile(onCreated: (slug) {
                            Navigator.of(context).pop(slug);
                          }),
                          const SizedBox(height: 24),
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String label;
  const _SectionHeader({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 8, 4, 4),
      child: Text(label.toUpperCase(),
          style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  final Category cat;
  final bool selected;
  final VoidCallback onTap;
  const _CategoryTile({required this.cat, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final tint = tintFor(cat.color);
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 3),
      elevation: 0,
      color: selected ? tint.withValues(alpha: 0.12) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: selected ? tint : Colors.grey.shade200, width: selected ? 1.5 : 1),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: tint.withValues(alpha: 0.15),
          child: Text(cat.emoji, style: const TextStyle(fontSize: 20)),
        ),
        title: Text(cat.label, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: cat.desc.isEmpty ? null : Text(cat.desc, style: const TextStyle(fontSize: 11)),
        trailing: selected ? Icon(Icons.check_circle, color: tint) : null,
        onTap: onTap,
      ),
    );
  }
}

class _NewCategoryTile extends StatelessWidget {
  final ValueChanged<String> onCreated;
  const _NewCategoryTile({required this.onCreated});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 3),
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: const Color(0xFF15803D).withValues(alpha: 0.5), width: 1.5, style: BorderStyle.solid),
      ),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: Color(0xFFD1FAE5),
          child: Icon(Icons.add, color: Color(0xFF15803D)),
        ),
        title: const Text('New category', style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF15803D))),
        subtitle: const Text('Make your own — emoji, color, health tier', style: TextStyle(fontSize: 11)),
        onTap: () async {
          final slug = await showModalBottomSheet<String?>(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (_) => const _CreateCategorySheet(),
          );
          if (slug != null && slug.isNotEmpty) onCreated(slug);
        },
      ),
    );
  }
}

class _CreateCategorySheet extends StatefulWidget {
  const _CreateCategorySheet();

  @override
  State<_CreateCategorySheet> createState() => _CreateCategorySheetState();
}

class _CreateCategorySheetState extends State<_CreateCategorySheet> {
  final _labelCtrl = TextEditingController();
  String _emoji = '📦';
  String _color = 'emerald';
  String _healthTier = kHealthTierDefault;
  bool _saving = false;
  String? _error;

  static const Map<String, String> _tierLabels = {
    'healthy': 'Healthy 🥦',
    'neutral': 'Neutral 🥖',
    'treat': 'Treat 🍰',
    'harmful': 'Unhealthy 🍩',
  };

  @override
  void dispose() {
    _labelCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final label = _labelCtrl.text.trim();
    if (label.isEmpty) {
      setState(() => _error = 'Name is required');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final cat = await CategoriesService.createUserCategory(
        label: label, emoji: _emoji, color: _color, healthTier: _healthTier,
      );
      if (!mounted) return;
      Navigator.of(context).pop(cat.slug);
    } catch (e) {
      setState(() { _saving = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (ctx, scrollCtrl) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: Column(
            children: [
              Container(
                width: 40, height: 4, margin: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(children: [
                  Text(_emoji, style: const TextStyle(fontSize: 24)),
                  const SizedBox(width: 8),
                  const Text('New category', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                ]),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Name', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _labelCtrl,
                        autofocus: true,
                        style: const TextStyle(fontSize: 16),
                        decoration: InputDecoration(
                          hintText: 'e.g. Pet supplies',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                        ),
                        maxLength: 40,
                      ),
                      const SizedBox(height: 6),
                      const Text('Emoji', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      const SizedBox(height: 4),
                      EmojiCatalogWidget(value: _emoji, onPick: (e) => setState(() => _emoji = e)),
                      const SizedBox(height: 14),
                      const Text('Color', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8, runSpacing: 8,
                        children: kColorOptions.map((c) {
                          final selected = _color == c;
                          return InkWell(
                            onTap: () => setState(() => _color = c),
                            child: Container(
                              width: 30, height: 30,
                              decoration: BoxDecoration(
                                color: tintFor(c),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: selected ? Colors.black87 : Colors.transparent,
                                  width: selected ? 2.5 : 0,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),
                      const Text('Health tier', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      const Text('(for the future Guac Health Score)', style: TextStyle(fontSize: 11, color: Colors.black54)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        initialValue: _healthTier,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          isDense: true,
                        ),
                        items: kHealthTiers
                            .map((t) => DropdownMenuItem(value: t, child: Text(_tierLabels[t] ?? t)))
                            .toList(),
                        onChanged: (v) => setState(() => _healthTier = v ?? kHealthTierDefault),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(_error!, style: const TextStyle(color: Colors.red)),
                      ],
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity, height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF15803D),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: _saving ? null : _save,
                          child: _saving
                              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Text('Create', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity, height: 44,
                        child: TextButton(
                          onPressed: _saving ? null : () => Navigator.of(context).pop(),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
