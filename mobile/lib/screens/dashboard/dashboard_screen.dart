import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../providers/auth_provider.dart';
import '../../providers/receipt_provider.dart';
import '../../providers/reward_provider.dart';
import '../../models/receipt_model.dart';
import '../../services/receipt_parse_service.dart';
import '../../widgets/guac_mascot.dart';
import '../../utils/date_format.dart';

const _kEmerald700 = Color(0xFF15803d);
const _kEmerald800 = Color(0xFF166534);
const _kEmerald900 = Color(0xFF064e3b);
const _kEmerald50  = Color(0xFFf0fdf4);
const _kEmerald100 = Color(0xFFdcfce7);

enum _Period { daily, weekly, monthly, yearly }

const _kCountOptions = {
  _Period.daily:   [1, 3, 7, 14, 30, 60, 90],
  _Period.weekly:  [1, 2, 4, 8, 12, 26, 52],
  _Period.monthly: [1, 3, 6, 12, 24, 36],
  _Period.yearly:  [1, 2, 3, 5, 10],
};
const _kDefaultCount = {_Period.daily: 7, _Period.weekly: 4, _Period.monthly: 3, _Period.yearly: 1};
const _kUnitLabel    = {_Period.daily: 'day', _Period.weekly: 'week', _Period.monthly: 'month', _Period.yearly: 'year'};

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  _Period _period = _Period.monthly;
  int _periodCount = 3;

  @override
  void initState() {
    super.initState();
    context.read<ReceiptProvider>().loadReceipts();
    context.read<RewardProvider>().loadRewards();
  }

  DateTime _periodCutoff() {
    final now = DateTime.now();
    switch (_period) {
      case _Period.daily:   return now.subtract(Duration(days: _periodCount));
      case _Period.weekly:  return now.subtract(Duration(days: _periodCount * 7));
      case _Period.monthly: return DateTime(now.year, now.month - _periodCount, now.day);
      case _Period.yearly:  return DateTime(now.year - _periodCount, now.month, now.day);
    }
  }

  void _selectPeriod(_Period p) {
    setState(() {
      _period = p;
      _periodCount = _kDefaultCount[p]!;
    });
  }

  /// Pre-camera entry: ask the user whether to use the camera or pick from
  /// the gallery. Some users find the camera UI fiddly with paper receipts
  /// — letting them snap with the system camera app first and then pick
  /// the result from gallery is more reliable on certain devices.
  Future<void> _captureReceipt() async {
    final source = await _askImageSource();
    if (source == null || !mounted) return;
    final picker = ImagePicker();
    int saved = 0;
    while (mounted) {
      final img = await picker.pickImage(source: source, imageQuality: 80);
      if (img == null || !mounted) break;
      final file = File(img.path);

      // Preview screen — OK / Add more / Retry.
      final action = await _showCapturePreview(file);
      if (!mounted) break;
      if (action == _PreviewAction.retry) continue;     // back to picker
      await _processSingleCapture(file);
      if (!mounted) break;
      saved++;
      if (action == _PreviewAction.ok) break;
      // _PreviewAction.addMore → loop continues, picker opens again
    }
    if (saved > 1 && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Saved $saved receipts.'),
        duration: const Duration(seconds: 2),
      ));
    }
  }

  Future<ImageSource?> _askImageSource() async {
    return showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text('Add receipt',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF064e3b))),
          ),
          ListTile(
            leading: const Icon(Icons.camera_alt, color: _kEmerald700),
            title: const Text('Take a photo'),
            subtitle: const Text('Snap one or more receipts with the camera'),
            onTap: () => Navigator.of(ctx).pop(ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined, color: _kEmerald700),
            title: const Text('Choose from gallery'),
            subtitle: const Text('Pick an existing photo'),
            onTap: () => Navigator.of(ctx).pop(ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }

  /// Full-screen preview after a capture. Returns the user's chosen action.
  Future<_PreviewAction> _showCapturePreview(File file) async {
    final result = await Navigator.of(context).push<_PreviewAction>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _CapturePreviewScreen(file: file),
      ),
    );
    return result ?? _PreviewAction.retry;
  }

  /// Parse + dedup + save a single captured photo. The preview screen has
  /// already shown the user the image and confirmed they want to keep it;
  /// any duplicate-found case is handled silently with a snackbar (no
  /// dialog interrupts the multi-capture loop).
  Future<void> _processSingleCapture(File file) async {
    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null || !mounted) return;
    final provider = context.read<ReceiptProvider>();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const AlertDialog(
        content: Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
            SizedBox(width: 14),
            Flexible(child: Text('Guac-AI is reading your receipt…')),
          ]),
        ),
      ),
    );
    try {
      // One automatic retry for transient errors — a single AI hiccup
      // shouldn't end up as a useless placeholder.
      ParseResult result = await ReceiptParseService.parseImage(file);
      if (!result.ok) {
        result = await ReceiptParseService.parseImage(file);
      }
      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop(); // loader off

      if (!result.ok) {
        // Real failure (network / server / unreadable). Don't silently dump
        // a placeholder — ask the user what to do.
        final action = await _showParseFailureDialog(result.error ?? 'Unknown error', file);
        if (!mounted) return;
        switch (action) {
          case _FailAction.retry:
            // Re-enter the same path with a fresh loader.
            return _processSingleCapture(file);
          case _FailAction.savePhoto:
            final placeholder = Receipt(
              id: '', storeName: 'Untitled receipt',
              date: DateTime.now().toIso8601String().substring(0, 10),
              totalAmount: 0, taxPaid: 0,
            );
            await provider.addReceipt(placeholder, imageFile: file);
            if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Saved photo only. Open the receipt to fill in details or tap Re-parse.'),
            ));
            return;
          case _FailAction.cancel:
          case null:
            return; // nothing saved
        }
      }

      final parsed = result.data!;
      final today = DateTime.now().toIso8601String().substring(0, 10);
      final dupDate = (parsed.date != null && parsed.date!.isNotEmpty) ? parsed.date! : today;
      if (parsed.storeName.isNotEmpty && parsed.totalAmount > 0) {
        final dup = await provider.findDuplicate(
          storeName: parsed.storeName,
          date: dupDate,
          totalAmount: parsed.totalAmount,
        );
        if (dup != null) {
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Skipped duplicate: ${parsed.storeName} · \$${parsed.totalAmount.toStringAsFixed(2)}'),
            duration: const Duration(seconds: 2),
          ));
          return;
        }
      }
      final asMap = <String, dynamic>{
        'store_name': parsed.storeName,
        'date': parsed.date,
        'total_amount': parsed.totalAmount,
        'tax_paid': parsed.taxPaid,
        'payment_method': parsed.paymentMethod,
        'payment_last4': parsed.paymentLast4,
        'is_return': parsed.isReturn,
        'category': parsed.category,
        'items': parsed.items.map((it) => {
          'sku': it.sku, 'model': it.model, 'item_name': it.itemName,
          'qty': it.qty, 'price': it.price,
          'returned': it.returned, 'category': it.category,
        }).toList(),
      };
      final id = await provider.addParsedReceipt(asMap, file);
      if (!mounted) return;
      if (id == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Saved the photo but failed to insert the receipt. Open Receipts to retry.'),
        ));
        return;
      }
      final storeBit = parsed.storeName.isNotEmpty ? parsed.storeName : 'Receipt';
      final totalBit = parsed.totalAmount > 0 ? ' · \$${parsed.totalAmount.toStringAsFixed(2)}' : '';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('$storeBit$totalBit — ${parsed.items.length} item${parsed.items.length == 1 ? "" : "s"}'),
        action: SnackBarAction(label: 'View', onPressed: () => context.go('/receipts/$id')),
        duration: const Duration(seconds: 3),
      ));
    } catch (e) {
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Capture failed: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AppAuthProvider>();
    final receipts = context.watch<ReceiptProvider>().receipts;
    final rewards  = context.watch<RewardProvider>().rewards;
    final firstName = auth.userProfile?['first_name']?.toString().trim();
    final greeting = (firstName == null || firstName.isEmpty) ? 'there' : firstName;

    final cutoff = _periodCutoff();
    final filtered = receipts.where((r) {
      final d = DateTime.tryParse(r.date);
      return d != null && d.isAfter(cutoff);
    }).toList();

    final totalSpend = filtered.fold<double>(0, (s, r) => s + r.totalAmount);
    final totalTax   = filtered.fold<double>(0, (s, r) => s + r.taxPaid);
    final rangeLabel = 'Last $_periodCount ${_kUnitLabel[_period]}${_periodCount == 1 ? '' : 's'}';

    return Scaffold(
      backgroundColor: const Color(0xFFf9fafb),
      appBar: _buildAppBar(),
      floatingActionButton: _buildFab(),
      body: RefreshIndicator(
        onRefresh: () async {
          final receiptProv = context.read<ReceiptProvider>();
          final rewardProv = context.read<RewardProvider>();
          await receiptProv.loadReceipts(force: true);
          await rewardProv.loadRewards(force: true);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
          children: [
            // Greeting
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Good day, $greeting 👋',
                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: _kEmerald900, height: 1.1)),
                const SizedBox(height: 4),
                const Text("Here's your financial snapshot",
                  style: TextStyle(fontSize: 13, color: Colors.black54)),
              ])),
            ]),
            const SizedBox(height: 18),

            // CTA pills — primary actions
            Row(children: [
              Expanded(child: _ctaPill(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [Color(0xFFfbbf24), Color(0xFFf59e0b), Color(0xFFe11d48)],
                ),
                emoji: '🥑',
                title: 'Worth It?',
                subtitle: 'Rate every purchase',
                onTap: () => context.go('/receipts'),
              )),
              const SizedBox(width: 10),
              Expanded(child: _ctaPill(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [Color(0xFF22c55e), _kEmerald700],
                ),
                icon: Icons.auto_awesome,
                title: 'Guacanomics',
                subtitle: 'GuacScore + insights',
                onTap: () => context.go('/guacscore'),
              )),
            ]),
            const SizedBox(height: 10),
            // Feature pills — the rest of the menu surfaced directly on the dashboard
            Row(children: [
              Expanded(child: _ctaPill(
                gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [Color(0xFFfcd34d), Color(0xFFca8a04)]),
                icon: Icons.mark_email_unread_rounded,
                title: 'Inbox',
                subtitle: 'Mail + auto-receipts',
                onTap: () => context.go('/inbox'),
              )),
              const SizedBox(width: 10),
              Expanded(child: _ctaPill(
                gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [Color(0xFFa78bfa), Color(0xFF7c3aed)]),
                icon: Icons.auto_fix_high,
                title: 'GuacWizard',
                subtitle: 'Bank Bite + insights',
                onTap: () => context.go('/guacwizard'),
              )),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _ctaPill(
                gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [Color(0xFFf472b6), Color(0xFFdb2777)]),
                icon: Icons.card_giftcard_rounded,
                title: 'Rewards',
                subtitle: 'Loyalty + expiring',
                onTap: () => context.go('/rewards'),
              )),
              const SizedBox(width: 10),
              Expanded(child: _ctaPill(
                gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [Color(0xFFfde047), Color(0xFFca8a04)]),
                icon: Icons.inventory_2,
                title: 'Stash',
                subtitle: 'Everything you own',
                onTap: () => context.go('/stash'),
              )),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _ctaPill(
                gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [Color(0xFFf9a8d4), Color(0xFFdb2777)]),
                icon: Icons.local_offer,
                title: 'Steals',
                subtitle: 'AI price hunt',
                onTap: () => context.go('/steals'),
              )),
              const SizedBox(width: 10),
              Expanded(child: _ctaPill(
                gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [Color(0xFF67e8f9), Color(0xFF0891b2)]),
                icon: Icons.directions_car_filled_rounded,
                title: 'Car Miles',
                subtitle: 'Trip log',
                onTap: () => context.go('/car-miles'),
              )),
            ]),
            const SizedBox(height: 18),

            // Period selector pill
            _periodSelector(),
            const SizedBox(height: 8),
            _periodCountRow(filtered.length, rangeLabel),
            const SizedBox(height: 16),

            // Stat tiles
            _statGrid(filtered, totalSpend, totalTax, rewards.length),
            const SizedBox(height: 20),

            // Spending chart
            _spendingChart(filtered),
            const SizedBox(height: 20),

            // Recent transactions
            if (filtered.isNotEmpty) _recentTransactions(filtered),

            // Recent rewards
            if (rewards.isNotEmpty) ...[
              const SizedBox(height: 16),
              _recentRewards(rewards),
            ],
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: _kEmerald800,
      foregroundColor: Colors.white,
      elevation: 0,
      titleSpacing: 0,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      iconTheme: const IconThemeData(color: Colors.white),
      title: Row(children: [
        Container(
          width: 36, height: 36,
          margin: const EdgeInsets.only(right: 8),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.12),
          ),
          padding: const EdgeInsets.all(4),
          child: const GuacMascot(size: 28),
        ),
        const Text('GetGuac', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
        const SizedBox(width: 12),
        const Text("MONEY'S WINGMAN",
          style: TextStyle(color: Color(0xFFa3e635), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1)),
      ]),
      actions: [
        IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () {}),
        IconButton(
          icon: const Icon(Icons.logout),
          tooltip: 'Sign out',
          onPressed: () => _confirmSignOut(),
        ),
      ],
    );
  }

  Widget _buildFab() {
    return FloatingActionButton.extended(
      onPressed: _captureReceipt,
      backgroundColor: _kEmerald700,
      foregroundColor: Colors.white,
      elevation: 6,
      icon: const GuacMascot(size: 24),
      label: const Icon(Icons.camera_alt, size: 20),
      tooltip: 'Add receipt (camera or gallery)',
    );
  }

  /// Shown when the AI fails to read the receipt. Returns the user's
  /// chosen recovery action (or null on dismiss).
  Future<_FailAction?> _showParseFailureDialog(String reason, File file) async {
    return showDialog<_FailAction>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Couldn't read this receipt"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(reason, style: const TextStyle(fontSize: 13, height: 1.4)),
            const SizedBox(height: 12),
            Container(
              constraints: const BoxConstraints(maxHeight: 180),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFe5e7eb)),
              ),
              clipBehavior: Clip.antiAlias,
              child: Image.file(file, fit: BoxFit.contain),
            ),
            const SizedBox(height: 10),
            const Text(
              'Tips: hold the phone steady, fit the whole receipt in frame, avoid glare.',
              style: TextStyle(fontSize: 11, color: Colors.black54),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(_FailAction.cancel),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(_FailAction.savePhoto),
            child: const Text('Save photo only'),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF15803d)),
            onPressed: () => Navigator.of(ctx).pop(_FailAction.retry),
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('Try again'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmSignOut() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text(
          "You'll need to sign in again next time. Biometric stays saved — fingerprint unlock will still work.",
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFb91c1c)),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await context.read<AppAuthProvider>().logout();
    if (mounted) context.go('/login');
  }

  Widget _ctaPill({LinearGradient? gradient, IconData? icon, String? emoji, required String title, required String subtitle, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(40),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(40),
          boxShadow: [BoxShadow(color: (gradient?.colors.last ?? _kEmerald700).withValues(alpha: 0.35), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (emoji != null) Text(emoji, style: const TextStyle(fontSize: 22)),
          if (icon != null) Icon(icon, size: 22, color: Colors.white),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14, height: 1.0)),
            const SizedBox(height: 2),
            Text(subtitle, style: TextStyle(color: Colors.white.withValues(alpha: 0.92), fontSize: 10, height: 1.0)),
          ])),
          const Icon(Icons.arrow_forward, size: 16, color: Colors.white),
        ]),
      ),
    );
  }

  Widget _periodSelector() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: _kEmerald50,
        borderRadius: BorderRadius.circular(40),
        border: Border.all(color: _kEmerald100),
      ),
      child: Row(children: _Period.values.map((p) {
        final active = _period == p;
        return Expanded(child: GestureDetector(
          onTap: () => _selectPeriod(p),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: active ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(40),
              boxShadow: active ? [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4)] : null,
            ),
            alignment: Alignment.center,
            child: Text(p.name[0].toUpperCase() + p.name.substring(1),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: active ? _kEmerald900 : _kEmerald700.withValues(alpha: 0.7),
              )),
          ),
        ));
      }).toList()),
    );
  }

  Widget _periodCountRow(int txCount, String rangeLabel) {
    final opts = _kCountOptions[_period]!;
    return Row(children: [
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: _kEmerald100),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4)],
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Text('Last ', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700)),
          DropdownButton<int>(
            value: opts.contains(_periodCount) ? _periodCount : opts.first,
            underline: const SizedBox.shrink(),
            isDense: true,
            style: const TextStyle(fontSize: 13, color: _kEmerald800, fontWeight: FontWeight.w900),
            items: opts.map((n) => DropdownMenuItem(value: n, child: Text('$n'))).toList(),
            onChanged: (n) { if (n != null) setState(() => _periodCount = n); },
          ),
          Text(' ${_kUnitLabel[_period]}${_periodCount == 1 ? '' : 's'}',
            style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700)),
        ]),
      ),
      const SizedBox(width: 10),
      Expanded(child: Text('$txCount transaction${txCount == 1 ? '' : 's'} • $rangeLabel',
        style: const TextStyle(fontSize: 11, color: Colors.black45),
        overflow: TextOverflow.ellipsis)),
    ]);
  }

  Widget _statGrid(List<Receipt> filtered, double totalSpend, double totalTax, int rewardCount) {
    return Column(children: [
      Row(children: [
        Expanded(child: _StatTile(
          label: 'GuacScore',
          value: 'Rate to unlock',
          isLeader: true,
          icon: null,
          iconBg: _kEmerald100,
          iconChild: const GuacMascot(size: 38),
          valueColor: _kEmerald800,
          onTap: () => context.go('/guacscore'),
        )),
        const SizedBox(width: 10),
        Expanded(child: _StatTile(
          label: 'Total Spent',
          value: '\$${totalSpend.toStringAsFixed(2)}',
          icon: Icons.attach_money,
          iconGradient: const LinearGradient(colors: [Color(0xFFfb7185), Color(0xFFe11d48), Color(0xFF9f1239)]),
          iconColor: Colors.white,
        )),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: _StatTile(
          label: 'Tax Paid',
          value: '\$${totalTax.toStringAsFixed(2)}',
          icon: Icons.trending_up,
          iconBg: const Color(0xFFfef3c7),
          iconColor: const Color(0xFFb45309),
        )),
        const SizedBox(width: 10),
        Expanded(child: _StatTile(
          label: 'Transactions',
          value: '${filtered.length}',
          icon: Icons.receipt_long,
          iconBg: const Color(0xFFd1fae5),
          iconColor: _kEmerald700,
          onTap: () => context.go('/receipts'),
        )),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: _StatTile(
          label: 'Rewards',
          value: '$rewardCount',
          icon: Icons.card_giftcard,
          iconBg: const Color(0xFFecfccb),
          iconColor: const Color(0xFF65a30d),
          onTap: () => context.go('/rewards'),
        )),
        const SizedBox(width: 10),
        const Expanded(child: SizedBox()),  // keep grid alignment
      ]),
    ]);
  }

  Widget _spendingChart(List<Receipt> filtered) {
    final data = filtered.take(8).toList().reversed.toList();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Spending by Store', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF111827))),
        const SizedBox(height: 12),
        if (data.isEmpty)
          const SizedBox(height: 160, child: Center(child: Text('No transactions for this period', style: TextStyle(color: Colors.black38, fontSize: 13))))
        else
          SizedBox(
            height: 200,
            child: BarChart(BarChartData(
              alignment: BarChartAlignment.spaceAround,
              maxY: (data.map((r) => r.totalAmount).reduce((a, b) => a > b ? a : b)) * 1.2,
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(show: false),
              barGroups: data.asMap().entries.map((e) => BarChartGroupData(
                x: e.key,
                barRods: [BarChartRodData(
                  toY: e.value.totalAmount,
                  color: const Color(0xFFe11d48),
                  width: 18,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                )],
              )).toList(),
              titlesData: FlTitlesData(
                leftTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles:    const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles:  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 28,
                  getTitlesWidget: (v, _) {
                    final idx = v.toInt();
                    if (idx < 0 || idx >= data.length) return const SizedBox();
                    final name = data[idx].storeName;
                    return Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(name.length > 6 ? name.substring(0, 6) : name,
                        style: const TextStyle(fontSize: 10, color: Colors.black54)),
                    );
                  },
                )),
              ),
            )),
          ),
      ]),
    );
  }

  Widget _recentTransactions(List<Receipt> filtered) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Expanded(child: Text('Recent Transactions', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14))),
          InkWell(
            onTap: () => context.go('/receipts'),
            child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.arrow_forward, size: 16, color: _kEmerald700)),
          ),
        ]),
        const SizedBox(height: 4),
        ...filtered.take(5).map((r) => ListTile(
          contentPadding: EdgeInsets.zero,
          dense: true,
          title: Text(r.storeName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          subtitle: Text(formatDateShort(r.date), style: const TextStyle(fontSize: 11, color: Colors.black45)),
          trailing: Text('\$${r.totalAmount.toStringAsFixed(2)}',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
          onTap: () => context.go('/receipts/${r.id}'),
        )),
      ]),
    );
  }

  Widget _recentRewards(List rewards) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Expanded(child: Text('Rewards', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14))),
          InkWell(
            onTap: () => context.go('/rewards'),
            child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.arrow_forward, size: 16, color: _kEmerald700)),
          ),
        ]),
        const SizedBox(height: 4),
        ...rewards.take(4).map((r) => ListTile(
          contentPadding: EdgeInsets.zero,
          dense: true,
          title: Text(r.rewardTitle, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          subtitle: Text(r.storeName, style: const TextStyle(fontSize: 11, color: Colors.black45)),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: r.isExpired ? const Color(0xFFfee2e2) : const Color(0xFFd1fae5),
              borderRadius: BorderRadius.circular(99),
            ),
            child: Text(r.isExpired ? 'Expired' : formatDateShort(r.expiryDate),
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800,
                color: r.isExpired ? const Color(0xFF991b1b) : _kEmerald800)),
          ),
          onTap: () => context.go('/rewards/${r.id}'),
        )),
      ]),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;
  final Color? iconBg;
  final LinearGradient? iconGradient;
  final Color? iconColor;
  final Widget? iconChild;
  final Color? valueColor;
  final bool isLeader;
  final VoidCallback? onTap;
  const _StatTile({
    required this.label, required this.value,
    this.icon, this.iconBg, this.iconGradient, this.iconColor, this.iconChild,
    this.valueColor, this.isLeader = false, this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
        ),
        child: Row(children: [
          Container(
            width: 46, height: 46,
            decoration: BoxDecoration(
              color: iconGradient == null ? iconBg : null,
              gradient: iconGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: iconChild ?? (icon != null ? Icon(icon, size: 22, color: iconColor) : null),
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text(value,
              style: TextStyle(
                fontSize: isLeader ? 13 : 17,
                fontWeight: FontWeight.w900,
                color: valueColor ?? const Color(0xFF111827),
              ),
              maxLines: 1, overflow: TextOverflow.ellipsis,
            ),
          ])),
        ]),
      ),
    );
  }
}

/// Choice the user makes on the preview screen after a capture.
enum _PreviewAction {
  /// Discard this photo, reopen the camera/gallery picker.
  retry,
  /// Save this one and finish.
  ok,
  /// Save this one and immediately open the picker again.
  addMore,
}

/// Choice the user makes when the AI fails to read a receipt.
enum _FailAction {
  /// Re-run the parser against the same photo.
  retry,
  /// Save the photo with a blank "Untitled receipt" row so the user can
  /// edit / re-parse later.
  savePhoto,
  /// Don't save anything.
  cancel,
}

/// Full-screen preview shown right after a capture. The user sees the photo
/// they just took and picks Retry / OK / Add more. Pure UI — no parsing or
/// upload happens here, the dashboard does that based on the returned action.
class _CapturePreviewScreen extends StatelessWidget {
  final File file;
  const _CapturePreviewScreen({required this.file});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Preview'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          tooltip: 'Cancel',
          onPressed: () => Navigator.of(context).pop(_PreviewAction.retry),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: InteractiveViewer(
              child: Center(child: Image.file(file)),
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              color: Colors.black,
              child: Row(
                children: [
                  Expanded(child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).pop(_PreviewAction.retry),
                    icon: const Icon(Icons.refresh, color: Colors.white),
                    label: const Text('Retry',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white54),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  )),
                  const SizedBox(width: 8),
                  Expanded(child: FilledButton.icon(
                    onPressed: () => Navigator.of(context).pop(_PreviewAction.ok),
                    icon: const Icon(Icons.check),
                    label: const Text('OK',
                      style: TextStyle(fontWeight: FontWeight.w800)),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF15803d),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  )),
                  const SizedBox(width: 8),
                  Expanded(child: FilledButton.icon(
                    onPressed: () => Navigator.of(context).pop(_PreviewAction.addMore),
                    icon: const Icon(Icons.add_a_photo),
                    label: const Text('Add more',
                      style: TextStyle(fontWeight: FontWeight.w800)),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF1d4ed8),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
