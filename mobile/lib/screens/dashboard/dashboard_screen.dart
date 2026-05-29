import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../providers/receipt_provider.dart';
import '../../providers/reward_provider.dart';
import '../../models/receipt_model.dart';
import '../../widgets/guac_mascot.dart';
import '../../widgets/anomalies_card.dart';
import '../../utils/date_format.dart';
import '../../store_name_normalize.dart';
import '../../payment_rows.dart';
import '../../services/spending_trends_service.dart';
import '../../services/smash_days_service.dart';
import '../../services/guac_money_service.dart';
import '../../widgets/subscriptions_card.dart';
import '../../widgets/top_app_bar_actions.dart';

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
    // Dashboard needs FULL history for cross-period analytics (year-over-
    // year totals, month-by-month bars going back). The list-screen
    // default (1-month, 10-cap) is too narrow for this view — selecting
    // Monthly·36 should chart 36 months of bars, not the same 10 rows.
    // Provider caches by period, so other screens that explicitly call
    // with `month` will still get the lighter payload.
    context.read<ReceiptProvider>().loadReceipts(period: ReceiptPeriod.all);
    context.read<RewardProvider>().loadRewards();
  }

  /// Cutoff as a YYYY-MM-DD string. Mirrors the web filter so receipt
  /// rows on the boundary are counted identically across platforms.
  String _periodCutoffStr() {
    final d = _periodCutoff();
    final mm = d.month.toString().padLeft(2, '0');
    final dd = d.day.toString().padLeft(2, '0');
    return '${d.year}-$mm-$dd';
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

  /// Map the dashboard's free-form (period, count) into the nearest
  /// Receipts-screen chip id (1M / 3M / 6M / 1Y / All). Used when the
  /// user taps a Spending-by-Store bar so the receipts page opens
  /// scoped to the SAME time window. We round UP to the next chip so
  /// nothing the user just saw on the dashboard disappears on arrival.
  /// Build a /receipts deep link that carries the dashboard's current
  /// period as both an exact cutoff (`dateFrom=YYYY-MM-DD`) AND the
  /// approximate chip (`period=3M`). The receipts screen prefers the
  /// cutoff (no day-bucket roundtrip drift) and uses the chip only to
  /// highlight the matching chip in its UI.
  String _receiptsDeepLink({String? store}) {
    final params = <String, String>{};
    if (store != null && store.isNotEmpty) {
      params['store'] = store;
    }
    params['dateFrom'] = _periodCutoffStr();
    params['period']   = _periodToReceiptsChip();
    final qs = params.entries
        .map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}')
        .join('&');
    return '/receipts?$qs';
  }

  String _periodToReceiptsChip() {
    int days;
    switch (_period) {
      case _Period.daily:   days = _periodCount;          break;
      case _Period.weekly:  days = _periodCount * 7;      break;
      case _Period.monthly: days = _periodCount * 30;     break;
      case _Period.yearly:  days = _periodCount * 365;    break;
    }
    if (days <= 30)  return '1M';
    if (days <= 90)  return '3M';
    if (days <= 180) return '6M';
    if (days <= 365) return '1Y';
    return 'All';
  }

  void _selectPeriod(_Period p) {
    setState(() {
      _period = p;
      _periodCount = _kDefaultCount[p]!;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AppAuthProvider>();
    final receipts = context.watch<ReceiptProvider>().receipts;
    final rewards  = context.watch<RewardProvider>().rewards;
    final firstName = auth.userProfile?['first_name']?.toString().trim();
    final greeting = (firstName == null || firstName.isEmpty) ? 'there' : firstName;

    // Date comparison is done on the STRING form (YYYY-MM-DD) to avoid
    // timezone drift. Receipt.date is a calendar date with no time; if
    // we parse it to DateTime (UTC midnight by default) and compare to
    // a locally-constructed cutoff, the offset between UTC and the
    // user's timezone shifts the boundary by one day. Web compares dates
    // as strings, so mobile must too — otherwise the two dashboards
    // disagree on which rows fall inside "Last 3 months".
    final cutoffStr = _periodCutoffStr();
    // Drop card-payment + inter-account-transfer rows BEFORE any spending
    // math runs — same pre-filter web/dashboard does. Without this the
    // mobile Total Spent / Transactions stats include [card payment]
    // entries from statement imports, and the two dashboards disagree
    // for the same time window.
    final spendingReceipts = receipts.where((r) => !isPaymentReceipt(r)).toList();
    final filtered = spendingReceipts.where((r) {
      final d = (r.date).toString();
      // Empty-date receipts (parse failures) drop out via the empty
      // string being lexicographically smaller than any real date.
      return d.length >= 10 && d.compareTo(cutoffStr) >= 0;
    }).toList();

    final totalSpend = filtered.fold<double>(0, (s, r) => s + r.totalAmount);
    final totalTax   = filtered.fold<double>(0, (s, r) => s + r.taxPaid);

    // Period-over-period trend chip for the Total Spent tile. Computed
    // off `spendingReceipts` (payment-rows already excluded) so the
    // delta matches what's totalled above.
    final periodKey = _period == _Period.daily   ? 'daily'
                    : _period == _Period.weekly  ? 'weekly'
                    : _period == _Period.yearly  ? 'yearly'
                    :                              'monthly';
    final trend = computeSpendingTrend(spendingReceipts, periodKey, _periodCount);
    final trendFmt = formatTrend(trend.deltaPct);
    final rangeLabel = 'Last $_periodCount ${_kUnitLabel[_period]}${_periodCount == 1 ? '' : 's'}';

    return Scaffold(
      backgroundColor: const Color(0xFFf9fafb),
      appBar: _buildAppBar(),
      body: RefreshIndicator(
        onRefresh: () async {
          final receiptProv = context.read<ReceiptProvider>();
          final rewardProv = context.read<RewardProvider>();
          // Dashboard always needs full history — refresh must preserve
          // that scope, NOT fall back to the 1-month default.
          await receiptProv.loadReceipts(period: ReceiptPeriod.all, force: true);
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
            // Spending alerts (auto-hides when none). Reads receipts already
            // loaded by ReceiptProvider — no extra fetch.
            AnomaliesCard(receipts: receipts),
            // Recurring-charge summary. Same auto-hide behaviour.
            SubscriptionsCard(receipts: spendingReceipts),
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
                onTap: () => context.go(_receiptsDeepLink()),
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
            _statGrid(filtered, totalSpend, totalTax, rewards.length, trendFmt),
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
        // App-bar logo — branded rounded-square with the 🥑 emoji so the
        // top bar reads identical to the launcher icon. Replaced the
        // detailed GuacMascot SVG here per design direction.
        Container(
          width: 36, height: 36,
          margin: const EdgeInsets.only(right: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            gradient: const LinearGradient(
              begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: [Color(0xFFa3e635), Color(0xFF15803d)],
            ),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 4, offset: const Offset(0, 1))],
          ),
          alignment: Alignment.center,
          child: const Text('🥑', style: TextStyle(fontSize: 22)),
        ),
        const Text('GetGuac', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
        const SizedBox(width: 12),
        const Text("MONEY'S WINGMAN",
          style: TextStyle(color: Color(0xFFa3e635), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1)),
      ]),
      actions: [
        // Notifications + Chat + Sign Out from the shared
        // topAppBarActions helper — any new screen that drops the
        // same helper in its appBar inherits the same row, so the
        // user always finds Sign Out in the same place.
        ...topAppBarActions(context),
      ],
    );
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

  Widget _statGrid(List<Receipt> filtered, double totalSpend, double totalTax, int rewardCount, TrendFormat? spendTrend) {
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
        // GuacMoney tile — pulls the user's lifetime accumulated saved
        // dollars via the guac_money_total SQL aggregate. Live-loaded
        // via a FutureBuilder so it ticks up when the user comes back
        // from /shopping after a Cheapest-routing.
        Expanded(child: FutureBuilder<double>(
          future: fetchGuacMoneyTotal(),
          builder: (ctx, snap) {
            final total = snap.data ?? 0;
            return _StatTile(
              label: 'GuacMoney 🥑',
              value: snap.connectionState == ConnectionState.waiting && total == 0
                  ? '—'
                  : formatGuacMoney(total),
              icon: Icons.savings_outlined,
              iconGradient: total > 0
                ? const LinearGradient(colors: [Color(0xFF34d399), Color(0xFF10b981), Color(0xFF65a30d)])
                : null,
              iconBg: total > 0 ? null : const Color(0xFFd1fae5),
              iconColor: total > 0 ? Colors.white : _kEmerald700,
              trendLabel: total > 0 ? 'saved' : 'tap Cheapest',
              trendTone: total > 0 ? 'down' : null,
            );
          },
        )),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: _StatTile(
          label: 'Total Spent',
          value: '\$${totalSpend.toStringAsFixed(2)}',
          icon: Icons.attach_money,
          iconGradient: const LinearGradient(colors: [Color(0xFFfb7185), Color(0xFFe11d48), Color(0xFF9f1239)]),
          iconColor: Colors.white,
          trendLabel: spendTrend?.label,
          trendTone:  spendTrend?.tone,
        )),
        const SizedBox(width: 10),
        Expanded(child: _StatTile(
          label: 'Tax Paid',
          value: '\$${totalTax.toStringAsFixed(2)}',
          icon: Icons.trending_up,
          iconBg: const Color(0xFFfef3c7),
          iconColor: const Color(0xFFb45309),
        )),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: _StatTile(
          label: 'Transactions',
          value: '${filtered.length}',
          icon: Icons.receipt_long,
          iconBg: const Color(0xFFd1fae5),
          iconColor: _kEmerald700,
          onTap: () => context.go(_receiptsDeepLink()),
        )),
        const SizedBox(width: 10),
        Expanded(child: _StatTile(
          label: 'Rewards',
          value: '$rewardCount',
          icon: Icons.card_giftcard,
          iconBg: const Color(0xFFecfccb),
          iconColor: const Color(0xFF65a30d),
          onTap: () => context.go('/rewards'),
        )),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        // Smash days — consecutive-day receipt activity counter.
        // Mirrors the web /dashboard tile. Tile turns warm-yellow when
        // the streak is alive (animate-pulse on web becomes a static
        // flame icon on mobile — same color signal without the spin).
        Expanded(child: () {
          final smash = computeSmashDays(filtered).smashDays;
          return _StatTile(
            label: 'Smash days',
            value: smash == 0 ? '0' : '$smash',
            icon: Icons.local_fire_department,
            iconGradient: smash > 0
              ? const LinearGradient(colors: [Color(0xFFfb923c), Color(0xFFf59e0b), Color(0xFFeab308)])
              : null,
            iconBg: smash > 0 ? null : const Color(0xFFf3f4f6),
            iconColor: smash > 0 ? Colors.white : const Color(0xFF9ca3af),
            trendLabel: smash == 0 ? 'scan to start' : (smash == 1 ? 'day' : 'days'),
            trendTone: smash > 0 ? 'up' : null,
          );
        }()),
        const SizedBox(width: 10),
        const Expanded(child: SizedBox()),
      ]),
    ]);
  }

  Widget _spendingChart(List<Receipt> filtered) {
    // Aggregate by SHARED-normalized store name so "COSTCO WHOLESALE",
    // "Costco", "Costco #218", "amazon.com" and "AMAZON.COM, INC." all roll
    // into a single bar. Uses store_name_normalize.dart which mirrors the
    // web normalizer character-for-character so the mobile chart can't
    // disagree with the web /dashboard chart for the same user.
    final byStore = <String, _StoreSpend>{};
    for (final r in filtered) {
      final raw = r.storeName.trim();
      if (raw.isEmpty) continue;
      // Bucket by canonical display name (lowercased) — not just normalized
      // form. Without this, "Costco" and "Costco Wholesale" hash to
      // different keys but both DISPLAY as "Costco" via the alias map,
      // producing two separate bars that look like duplicates to the user.
      final key = storeGroupKey(raw);
      if (key.isEmpty) continue;
      final entry = byStore[key] ?? _StoreSpend(name: canonicalStoreName(raw), amount: 0, count: 0);
      entry.amount += r.totalAmount;
      entry.count += 1;
      byStore[key] = entry;
    }
    final data = byStore.values.toList()
      ..sort((a, b) => b.amount.compareTo(a.amount));
    final topData = data.take(8).toList();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Spending by Store', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF111827))),
        const Text('Tap a bar to see that store’s receipts.',
          style: TextStyle(fontSize: 11, color: Colors.black54)),
        const SizedBox(height: 12),
        if (topData.isEmpty)
          const SizedBox(height: 160, child: Center(child: Text('No transactions for this period', style: TextStyle(color: Colors.black38, fontSize: 13))))
        else
          SizedBox(
            height: 200,
            child: BarChart(BarChartData(
              alignment: BarChartAlignment.spaceAround,
              maxY: (topData.map((s) => s.amount).reduce((a, b) => a > b ? a : b)) * 1.2,
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(show: false),
              // Tap handling: when the user taps a bar, fl_chart fires
              // touchCallback with the bar index. Navigate to /receipts
              // with the aggregated store name as the filter so the user
              // sees every receipt that contributed to the bar.
              barTouchData: BarTouchData(
                enabled: true,
                handleBuiltInTouches: true,
                touchCallback: (event, response) {
                  if (!event.isInterestedForInteractions) return;
                  if (response?.spot == null) return;
                  final idx = response!.spot!.touchedBarGroupIndex;
                  if (idx < 0 || idx >= topData.length) return;
                  final store = topData[idx].name;
                  if (store.isEmpty) return;
                  // Carry the dashboard's EXACT cutoff date into the
                  // receipts screen so chart-aggregated bars and the
                  // filtered receipts list can't disagree on which rows
                  // fall inside "Last N months" — the chip-bucket
                  // (1M/3M/6M/1Y) is too coarse for calendar-month math.
                  context.go(_receiptsDeepLink(store: store));
                },
              ),
              barGroups: topData.asMap().entries.map((e) => BarChartGroupData(
                x: e.key,
                barRods: [BarChartRodData(
                  toY: e.value.amount,
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
                    if (idx < 0 || idx >= topData.length) return const SizedBox();
                    final name = topData[idx].name;
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
            onTap: () => context.go(_receiptsDeepLink()),
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
  /// Tiny period-over-period trend chip rendered just below `value`.
  /// Optional. e.g. label='+18%', tone='up' | 'down' | 'flat'.
  final String? trendLabel;
  final String? trendTone;
  const _StatTile({
    required this.label, required this.value,
    this.icon, this.iconBg, this.iconGradient, this.iconColor, this.iconChild,
    this.valueColor, this.isLeader = false, this.onTap,
    this.trendLabel, this.trendTone,
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
            if (trendLabel != null) ...[
              const SizedBox(height: 2),
              Text(
                '$trendLabel vs prior',
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w800,
                  color: trendTone == 'up'
                    ? const Color(0xFFb91c1c)   // red — spending more
                    : trendTone == 'down'
                      ? const Color(0xFF15803d) // green — spending less
                      : Colors.black45,
                ),
              ),
            ],
          ])),
        ]),
      ),
    );
  }
}

/// Per-store aggregation row for the dashboard's Spending-by-Store chart.
/// Mirrors the web's chartData entries — keep them in sync if the web
/// aggregation logic changes (lib/src/app/(dashboard)/dashboard/DashboardClient.jsx).
class _StoreSpend {
  String name;
  double amount;
  int count;
  _StoreSpend({required this.name, required this.amount, required this.count});
}

