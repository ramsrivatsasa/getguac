import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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
import '../../widgets/guac_money_pill.dart';
import '../../widgets/horizontal_section.dart';
import '../../widgets/feature_card.dart';
import '../../widgets/feature_pill.dart';
import '../../widgets/payment_tile.dart';
import '../../widgets/engagement_tile.dart';
import '../../widgets/animated_primitives.dart';
import '../../services/analysis_engine.dart';
import '../../services/mascot_event_bus.dart';
import '../../services/wizard_score.dart';
import '../../services/guacoscore.dart' as guac_engine;
import '../../services/timeframe_store.dart';
import '../../theme/gg_design.dart';

// De-greened dashboard chrome: these former lime/emerald aliases now map to
// neutral slate so the dashboard reads neutral (no green highlights). ggInk is
// near-black, so the *800/*900 text aliases stay put as the dark text colour.
const _kEmerald700 = Color(0xFF475569); // slate-600 — arrows, inactive tab text
const _kEmerald800 = ggInk;             // near-black text
const _kEmerald900 = ggInk;             // near-black text
const _kEmerald50  = Color(0xFFF1F5F9); // slate-100 — pill / track background
const _kEmerald100 = Color(0xFFE2E8F0); // slate-200 — hairline border

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
  // Bank data (statements/fees/transactions) is loaded once per
  // dashboard mount and shared with the 8-tile PaymentTile row +
  // the GuacWizard engagement tile + the GuacScore bank-bite
  // penalty. Future is kicked off in initState so the network
  // round-trip overlaps with the rest of the page mount.
  late Future<BankData> _bankDataFuture;

  // Referral bonus — adds to the Smash-days streak count. Written by
  // the apply_referral_code RPC into profiles.smash_days_bonus.
  // Loaded once per mount and passed to every computeSmashDays call.
  int _smashDaysBonus = 0;
  int _referralCount = 0;  // for the GuacMoney balance (referral bonus)
  int _arcadeGmDays = 0;   // arcade GM days (×50) — parity with web's arcade_gm_days
  int _freshSteals = 0;    // new Steals found overnight (unread on saved searches)

  @override
  void initState() {
    super.initState();
    _bankDataFuture = fetchBankData();
    _loadSmashDaysBonus();
    fetchReferralCount().then((n) { if (mounted) setState(() => _referralCount = n); });
    fetchArcadeGmDays().then((d) { if (mounted) setState(() => _arcadeGmDays = d); });
    _loadFreshSteals();
    // Hydrate the persisted time-frame from SharedPreferences so the
    // mobile dashboard remembers the user's last selection across
    // app launches — same UX guarantee the web Zustand store gives
    // via localStorage.
    TimeframeStore.load().then((tf) {
      if (!mounted) return;
      setState(() {
        _period = _periodFromKey(tf.period);
        _periodCount = tf.count;
      });
    });
    // Listen for changes from OTHER screens. If the user opens
    // /guacscore or /guacwizard and flips the time-frame there,
    // popping back to the dashboard must show the new selection +
    // recomputed numbers. The store's ValueNotifier fires every
    // save() across the app — we just push the new value into our
    // local state so the build picks it up.
    TimeframeStore.notifier.addListener(_onTimeframeChanged);
    // Dashboard needs FULL history for cross-period analytics
    // (year-over-year totals, month-by-month bars). The list-screen
    // default (1-month, 10-cap) is too narrow. Deferred one frame:
    // loadReceipts notifies synchronously, which is illegal while this
    // widget is still mounting (setState-during-build assertion).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ReceiptProvider>().loadReceipts(period: ReceiptPeriod.all);
      context.read<RewardProvider>().loadRewards();
    });
  }

  // New Steals found overnight = seen_steals rows newer than the last time the
  // user opened the Steals feed (steals_state.checked_at).
  Future<void> _loadFreshSteals() async {
    try {
      final sb = Supabase.instance.client;
      final user = sb.auth.currentUser;
      if (user == null) return;
      final state = await sb.from('steals_state').select('checked_at').eq('user_id', user.id).maybeSingle();
      final checkedAt = (state?['checked_at'] as String?) ?? '1970-01-01';
      final rows = await sb.from('seen_steals').select('deal_key').eq('user_id', user.id).gt('first_seen_at', checkedAt);
      if (mounted) setState(() => _freshSteals = (rows as List).length);
    } catch (_) {/* tables may not exist / offline */}
  }

  Future<void> _loadSmashDaysBonus() async {
    try {
      final sb = Supabase.instance.client;
      final user = sb.auth.currentUser;
      if (user == null) return;
      final row = await sb.from('profiles')
        .select('smash_days_bonus')
        .eq('id', user.id)
        .maybeSingle();
      final n = (row?['smash_days_bonus'] as int?) ?? 0;
      if (mounted && n != _smashDaysBonus) {
        setState(() => _smashDaysBonus = n);
      }
    } catch (_) {/* best-effort */}
  }

  void _onTimeframeChanged() {
    if (!mounted) return;
    final tf = TimeframeStore.notifier.value;
    final p = _periodFromKey(tf.period);
    if (p == _period && tf.count == _periodCount) return;
    setState(() {
      _period = p;
      _periodCount = tf.count;
    });
  }

  @override
  void dispose() {
    TimeframeStore.notifier.removeListener(_onTimeframeChanged);
    super.dispose();
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
    _persistTimeframe();
  }

  void _setPeriodCount(int n) {
    setState(() => _periodCount = n);
    _persistTimeframe();
  }

  void _persistTimeframe() {
    TimeframeStore.save(Timeframe(_periodKey(), _periodCount));
  }

  String _periodKey() {
    switch (_period) {
      case _Period.daily:   return 'daily';
      case _Period.weekly:  return 'weekly';
      case _Period.monthly: return 'monthly';
      case _Period.yearly:  return 'yearly';
    }
  }

  static _Period _periodFromKey(String k) {
    switch (k) {
      case 'daily':   return _Period.daily;
      case 'weekly':  return _Period.weekly;
      case 'yearly':  return _Period.yearly;
      default:        return _Period.monthly;
    }
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

    // totalSpend / totalTax / spending-trend chip used to feed the old
    // _statGrid — replaced by the analysis-engine-driven
    // _paymentTileScroll + _engagementStrip which compute their own
    // totals + deltas, so the locals are gone.
    final rangeLabel = 'Last $_periodCount ${_kUnitLabel[_period]}${_periodCount == 1 ? '' : 's'}';

    // Smash-days milestone — celebrate every 7-day stretch (7, 14, 21…).
    // celebrateOnce uses a stable key (`smash_days_7`) backed by
    // shared_preferences so the mascot fires exactly once per stretch
    // across cold starts. Runs in post-frame to avoid firing during a
    // build pass.
    final smashDays = computeSmashDays(spendingReceipts, bonus: _smashDaysBonus).smashDays;
    if (smashDays > 0 && smashDays % 7 == 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        mascotBus.celebrateOnce('smash_days_$smashDays',
            message: '$smashDays Smash days');
      });
    }

    return Scaffold(
      // Plain white page (was ggBgTint, a green-tinted surface) per user
      // request — matches the white app bar + de-greened tiles.
      backgroundColor: Colors.white,
      appBar: _buildAppBar(),
      // Floating Games + Guac AI shortcuts (bottom-right), matching the web
      // dashboard's floating buttons. They open the web-embedded arcade + AI
      // assistant via the WebView routes.
      floatingActionButton: _floatingShortcuts(),
      // Add Receipt now lives in the bottom-bar centre camera button.
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
            // Greeting + live snapshot — deliver on "financial snapshot" with
            // real numbers for the selected window instead of dead subtitle.
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('$_salutation $greeting',
                  style: ggHeading(size: 26, weight: FontWeight.w800, color: ggInk, height: 1.1)),
                const SizedBox(height: 6),
                Row(children: [
                  Text(_money(_periodSpend(filtered)), style: ggAmount(size: 18, color: ggInk)),
                  Text('  spent · ${filtered.length} receipt${filtered.length == 1 ? '' : 's'}',
                    style: ggBody(size: 13, weight: FontWeight.w600, color: ggMuted)),
                ]),
                Text(rangeLabel.toLowerCase(),
                  style: ggBody(size: 11, color: ggFaint)),
              ])),
              // GuacMoney (saved $ + scan/refer points) — coin pill, counts up.
              GuacMoneyPill(points: guacMoneyPoints(
                receipts: receipts.length,
                referrals: _referralCount,
                savedDollars: guacMoneySaved(receipts)) + _arcadeGmDays * kGmPerFirstPlay),
            ]),
            if (_freshSteals > 0) ...[
              const SizedBox(height: 12),
              _freshStealsBanner(),
            ],
            const SizedBox(height: 14),
            // Quick-access feature icons — horizontal scroll under the snapshot.
            _featureIconStrip(),
            const SizedBox(height: 14),

            // Heads-up alerts right after the greeting — both
            // auto-hide when nothing's worth flagging, so the
            // dashboard stays clean on a calm month. Pink anomaly
            // banner sits first (matches web style), purple
            // subscription card directly below.
            AnomaliesCard(receipts: receipts),
            SubscriptionsCard(receipts: spendingReceipts),
            const SizedBox(height: 8),

            // Period picker controls the window for all the numbers
            // below it (engagement strip + PaymentTile deltas).
            _periodSelector(),
            const SizedBox(height: 8),
            _periodCountRow(filtered.length, rangeLabel),
            const SizedBox(height: 12),
            // Timeframe-keyed cross-fade so flipping the period pill row
            // doesn't hard-swap the metric grid — feels like a retally,
            // not a refresh. The combined key forces AnimatedSwitcher to
            // rebuild whenever either dimension changes.
            AnimatedCrossFadeKey(
              child: Column(
                key: ValueKey('${_periodKey()}_$_periodCount'),
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _engagementStrip(spendingReceipts, rewards.length),
                  const SizedBox(height: 10),
                  _paymentTileScroll(spendingReceipts),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // _featureSections() (Smart shopping + Quick actions
            // rectangular-card rows) removed — replaced by the
            // FeaturePill horizontal scroll directly under the
            // greeting at the top of this build method.

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
      // Clean light bar — the new home-page look. Pulls its surface, ink
      // foreground, and hairline divider from the central AppBarTheme.
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      foregroundColor: ggInk,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleSpacing: 16,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      iconTheme: const IconThemeData(color: ggInk),
      title: Row(children: [
        // Logo matches the website header — the 🥑 emoji + "GetGuac" wordmark,
        // no coloured chip, on the neutral white app bar (per user request).
        const Padding(
          padding: EdgeInsets.only(right: 8),
          child: Text('🥑', style: TextStyle(fontSize: 24)),
        ),
        Text('GetGuac', style: ggHeading(size: 20, weight: FontWeight.w800, color: ggInk)),
        // Tagline "MONEY'S WINGMAN" lives only on the login screen now — kept
        // off the app bar to free space for the action icons.
      ]),
      actions: [
        // Notifications + Chat + Sign Out from the shared helper. whiteIcons
        // false → dark ink icons, visible on the new light app bar.
        ...topAppBarActions(context, whiteIcons: false),
      ],
    );
  }
  /// Vertical stack of horizontally-scrolling card carousels —
  /// Fetch-style. Three sections group the 8 main features by
  /// purpose so the eye can sweep through related actions instead
  /// of decoding a dense 4×2 grid.
  /// Horizontal-scroll row of Guac-AI pills — same widget the
  /// Profile screen uses. Sits directly under the dashboard
  /// greeting now. Each pill drills into its detail surface via
  /// context.push() so the back-stack builds (edge-swipe + ←
  /// AppBar both work).
  // ignore: unused_element
  Widget _featurePillScroll() {
    return SizedBox(
      height: 64,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        children: [
          SizedBox(width: 180, child: FeaturePill(
            gradient: const [Color(0xFFfbbf24), Color(0xFFf59e0b), Color(0xFFe11d48)],
            emoji: '🥑', title: 'Worth It?', subtitle: 'Rate every purchase',
            onTap: () => context.push(_receiptsDeepLink()),
          )),
          const SizedBox(width: 10),
          SizedBox(width: 180, child: FeaturePill(
            gradient: const [Color(0xFF22c55e), Color(0xFF15803d)],
            icon: Icons.auto_awesome, title: 'Guacanomics', subtitle: 'GuacScore + insights',
            onTap: () => context.push('/guacanomics'),
          )),
          const SizedBox(width: 10),
          SizedBox(width: 180, child: FeaturePill(
            gradient: const [Color(0xFFa78bfa), Color(0xFF7c3aed)],
            icon: Icons.auto_fix_high, title: 'GuacWizard', subtitle: 'Bank Bite + leaks',
            onTap: () => context.push('/guacwizard'),
          )),
          const SizedBox(width: 10),
          SizedBox(width: 180, child: FeaturePill(
            gradient: const [Color(0xFFf9a8d4), Color(0xFFdb2777)],
            icon: Icons.local_offer, title: 'Steals', subtitle: 'AI price hunt',
            onTap: () => context.push('/steals'),
          )),
          const SizedBox(width: 10),
          SizedBox(width: 180, child: FeaturePill(
            gradient: const [Color(0xFFf472b6), Color(0xFFdb2777)],
            icon: Icons.card_giftcard_rounded, title: 'Rewards', subtitle: 'Loyalty + expiring',
            onTap: () => context.push('/rewards'),
          )),
          const SizedBox(width: 10),
          SizedBox(width: 180, child: FeaturePill(
            gradient: const [Color(0xFFfde047), Color(0xFFca8a04)],
            icon: Icons.inventory_2, title: 'Stash', subtitle: 'Everything you own',
            onTap: () => context.push('/stash'),
          )),
          const SizedBox(width: 10),
          SizedBox(width: 180, child: FeaturePill(
            gradient: const [Color(0xFFfcd34d), Color(0xFFca8a04)],
            icon: Icons.mark_email_unread_rounded, title: 'Inbox', subtitle: 'Mail + auto-receipts',
            onTap: () => context.push('/inbox'),
          )),
          const SizedBox(width: 10),
          SizedBox(width: 180, child: FeaturePill(
            gradient: const [Color(0xFF67e8f9), Color(0xFF0891b2)],
            icon: Icons.directions_car_filled_rounded, title: 'Car Miles', subtitle: 'Trip log',
            onTap: () => context.push('/car-miles'),
          )),
        ],
      ),
    );
  }

  // Compact thousands-formatted dollars for the header snapshot ($1,240).
  String _money(double v) {
    final s = v.abs().toStringAsFixed(0);
    final b = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
      b.write(s[i]);
    }
    return '\$$b';
  }

  // Fixed greeting prefix — same regardless of time of day.
  String get _salutation => 'Hello!!';

  // Gross spend over the selected window (returns excluded).
  double _periodSpend(List<Receipt> rs) =>
      rs.fold<double>(0.0, (s, r) => s + (r.isReturn ? 0 : r.totalAmount));

  // Banner for new Steals found by the overnight cron — taps into /steals.
  Widget _freshStealsBanner() {
    return InkWell(
      onTap: () => context.push('/steals'),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFfb7185), Color(0xFFdb2777)]),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: const Color(0xFFdb2777).withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: Row(children: [
          const Text('🥑', style: TextStyle(fontSize: 22)),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text('$_freshSteals new Steal${_freshSteals == 1 ? '' : 's'} found',
              style: ggHeading(size: 15, weight: FontWeight.w900, color: Colors.white)),
            Text('on your saved searches — tap to see them',
              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600, fontVariations: ggWght(FontWeight.w600))),
          ])),
          const Icon(Icons.chevron_right_rounded, color: Colors.white),
        ]),
      ),
    );
  }

  // Quick-access feature icons shown under the dashboard snapshot.
  Widget _featureIconStrip() {
    final items = <({String route, IconData icon, String label, List<Color> gradient, Color color})>[
      (route: '/validate',    icon: Icons.fact_check_rounded,            label: 'Worth It?',   gradient: const [Color(0xFFfbbf24), Color(0xFFf43f5e)], color: const Color(0xFFf59e0b)),
      (route: '/guacanomics', icon: Icons.auto_awesome,                  label: 'Guacanomics', gradient: const [Color(0xFF64748B), Color(0xFF334155)], color: const Color(0xFF475569)),
      (route: '/guacwizard',  icon: Icons.auto_fix_high,                 label: 'GuacWizard',  gradient: const [Color(0xFFa78bfa), Color(0xFF7c3aed)], color: const Color(0xFF7c3aed)),
      (route: '/steals',      icon: Icons.local_offer,                   label: 'Steals',      gradient: const [Color(0xFFf9a8d4), Color(0xFFdb2777)], color: const Color(0xFFdb2777)),
      (route: '/rewards',     icon: Icons.card_giftcard_rounded,         label: 'Rewards',     gradient: const [Color(0xFFfb7185), Color(0xFFe11d48)], color: const Color(0xFFe11d48)),
      (route: '/stash',       icon: Icons.inventory_2,                   label: 'Stash',       gradient: const [Color(0xFFfde047), Color(0xFFca8a04)], color: const Color(0xFFca8a04)),
      (route: '/inbox',       icon: Icons.mark_email_unread_rounded,     label: 'Inbox',       gradient: const [Color(0xFFfcd34d), Color(0xFFd97706)], color: const Color(0xFFd97706)),
      (route: '/car-miles',   icon: Icons.directions_car_filled_rounded, label: 'Miles',       gradient: const [Color(0xFF67e8f9), Color(0xFF0891b2)], color: const Color(0xFF0891b2)),
    ];
    return SizedBox(
      height: 80,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (_, i) {
          final it = items[i];
          return InkWell(
            onTap: () => context.push(it.route),
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              width: 66,
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  width: 54, height: 54,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                      colors: it.gradient,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: it.color.withValues(alpha: 0.30), blurRadius: 6, offset: const Offset(0, 2))],
                  ),
                  child: Icon(it.icon, color: Colors.white, size: 25),
                ),
                const SizedBox(height: 4),
                Text(it.label, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: it.color, fontVariations: ggWght(FontWeight.w700))),
              ]),
            ),
          );
        },
      ),
    );
  }

  // Floating Games + Guac AI pills, stacked bottom-right like the web
  // dashboard. Games on top, Guac AI below (closest to the thumb).
  Widget _floatingShortcuts() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        _shortcutPill(
          label: 'Games',
          icon: Icons.sports_esports_rounded,
          gradient: const [Color(0xFF22D3EE), Color(0xFF8B5CF6), Color(0xFFEC4899)],
          onTap: () => context.push('/games'),
        ),
        const SizedBox(height: 10),
        _shortcutPill(
          label: 'Guac AI',
          icon: Icons.smart_toy_rounded,
          gradient: const [Color(0xFF34D399), Color(0xFF059669)],
          onTap: () => context.push('/guac-ai'),
        ),
      ],
    );
  }

  Widget _shortcutPill({
    required String label,
    required IconData icon,
    required List<Color> gradient,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft, end: Alignment.bottomRight, colors: gradient),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 7),
            Text(label, style: TextStyle(
              color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13,
              fontVariations: ggWght(FontWeight.w800))),
          ]),
        ),
      ),
    );
  }

  Widget _featureSections() {
    // listPadding/headerPadding zero here because the outer ListView
    // already supplies 16px horizontal padding; doubling it pushes
    // the headings inward by 32px and squeezes the cards.
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      HorizontalSection(
        title: 'Smart shopping',
        subtitle: 'Save more, find more',
        headerPadding: EdgeInsets.zero,
        listPadding: EdgeInsets.zero,
        height: 130,
        children: [
          FeatureCard(
            title: 'Steals', subtitle: 'AI price hunt',
            gradient: kFeatureGradients['pink']!, icon: Icons.local_offer,
            onTap: () => context.push('/steals'),
          ),
          FeatureCard(
            title: 'Rewards', subtitle: 'Loyalty + expiring',
            gradient: kFeatureGradients['rose']!, icon: Icons.card_giftcard_rounded,
            onTap: () => context.push('/rewards'),
          ),
          FeatureCard(
            title: 'Stash', subtitle: 'Everything you own',
            gradient: kFeatureGradients['yellow']!, icon: Icons.inventory_2,
            onTap: () => context.push('/stash'),
          ),
        ],
      ),
      const SizedBox(height: 14),
      HorizontalSection(
        title: 'Quick actions',
        subtitle: 'Inbox · trips · more',
        headerPadding: EdgeInsets.zero,
        listPadding: EdgeInsets.zero,
        height: 130,
        children: [
          FeatureCard(
            title: 'Inbox', subtitle: 'Mail + auto-receipts',
            gradient: kFeatureGradients['amber']!, icon: Icons.mark_email_unread_rounded,
            onTap: () => context.push('/inbox'),
          ),
          FeatureCard(
            title: 'Car Miles', subtitle: 'Trip log',
            gradient: kFeatureGradients['teal']!, icon: Icons.directions_car_filled_rounded,
            onTap: () => context.push('/car-miles'),
          ),
        ],
      ),
    ]);
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
                fontVariations: ggWght(FontWeight.w700),
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
          Text('Last ', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
          DropdownButton<int>(
            value: opts.contains(_periodCount) ? _periodCount : opts.first,
            underline: const SizedBox.shrink(),
            isDense: true,
            style: TextStyle(fontSize: 13, color: _kEmerald800, fontWeight: FontWeight.w900, fontVariations: ggWght(FontWeight.w900)),
            items: opts.map((n) => DropdownMenuItem(value: n, child: Text('$n'))).toList(),
            onChanged: (n) { if (n != null) _setPeriodCount(n); },
          ),
          Text(' ${_kUnitLabel[_period]}${_periodCount == 1 ? '' : 's'}',
            style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
        ]),
      ),
      const SizedBox(width: 10),
      Expanded(child: Text('$txCount transaction${txCount == 1 ? '' : 's'} • $rangeLabel',
        style: const TextStyle(fontSize: 11, color: Colors.black45),
        overflow: TextOverflow.ellipsis)),
    ]);
  }

  /// 2×2 engagement strip — GuacScore / GuacWizard / GuacMoney /
  /// Rewards. Mirrors the web dashboard's 4-tile engagement row.
  /// Shares the BankData FutureBuilder with `_paymentTileScroll`
  /// so we fire a single network round-trip for both surfaces.
  Widget _engagementStrip(List<Receipt> spendingReceipts, int rewardCount) {
    return FutureBuilder<BankData>(
      future: _bankDataFuture,
      builder: (ctx, snap) {
        final bank = snap.data ?? BankData.empty;
        final isLoading = snap.connectionState == ConnectionState.waiting;
        final since = periodStartIso(_periodKey(), _periodCount);
        // GuacWizard score
        WizardScoreResult wiz;
        if (isLoading) {
          wiz = const WizardScoreResult(score: null);
        } else {
          final agg = aggregateBankForWizard(bank: bank, startStr: since, endStr: null);
          wiz = computeWizardScore(summary: agg.summary, accounts: agg.accounts);
        }
        // GuacScore — delegates to the centralized engine. Lifetime
        // scope so the tile matches /guacanomics "All time" exactly.
        final guacScore = _computeGuacScore(spendingReceipts, bank);
        // Horizontal-scroll row so all four engagement tiles read
        // as a single swipeable strip rather than a dense 2×2
        // grid. Each card has an onTap that routes to its detail
        // screen (GuacScore → /guacanomics, GuacWizard →
        // /guacwizard, GuacMoney → /shopping for the Cheapest
        // flow, Rewards → /rewards).
        // Engagement-tile widths bumped 180 → 220 so they match the
        // PaymentTile row below them. Earlier the visual hierarchy
        // was off — the engagement (top) tiles read as smaller than
        // the metric (bottom) tiles when they should be the headline.
        return SizedBox(
          height: 92,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.zero,
            children: [
              SizedBox(width: 220, child: _guacScoreTile(guacScore)),
              const SizedBox(width: 10),
              SizedBox(width: 220, child: _guacWizardTile(wiz, isLoading)),
              const SizedBox(width: 10),
              // GuacMoney tile hidden for now — no savings data yet.
              SizedBox(width: 220, child: _rewardsTile(rewardCount)),
            ],
          ),
        );
      },
    );
  }

  // Delegates to the central engine in services/guacoscore.dart
  // (mirrors web/src/lib/guacoscore.js exactly).
  //
  // Scope: LIFETIME on both sides. `spendingReceipts` is the
  // unfiltered (non-payment) receipt list and the bank-bite is
  // the unfiltered sum of every fee + interest row. Mixing scopes
  // (lifetime receipts vs period-scoped bankBite) created an
  // artificially-tiny penalty ratio that made this tile show a
  // higher score than /guacanomics in All-time mode. Web tile has
  // the same fix; mobile now matches.
  _GuacScoreResult _computeGuacScore(List<Receipt> spendingReceipts, BankData bank) {
    double interest = 0, fees = 0;
    for (final f in bank.fees) {
      final v = (double.tryParse((f['amount'] ?? '0').toString()) ?? 0).abs();
      if (f['kind'] == 'interest') interest += v;
      else if (f['kind'] == 'fee' || f['kind'] == 'penalty') fees += v;
    }
    final result = guac_engine.calculateGuacoScore(
      spendingReceipts.map((r) => guac_engine.GuacoScoreInputReceipt(
        rating: r.rating,
        totalAmount: r.totalAmount,
      )).toList(),
      bankBite: guac_engine.GuacoBankBite(interest: interest, fees: fees),
    );
    if (result.score == null) {
      return _GuacScoreResult(score: null, grade: 'fresh', ratedCount: result.ratedCount);
    }
    final s = result.score!;
    final grade = s >= 80 ? 'rich' : s >= 65 ? 'celebrating' : s >= 50 ? 'thumbsup' : s >= 35 ? 'sleepy' : 'surprised';
    return _GuacScoreResult(score: s, grade: grade, ratedCount: result.ratedCount);
  }

  Widget _guacScoreTile(_GuacScoreResult r) {
    // Tone tracks the score band (matches web GuacoScoreCard).
    EngagementTone tone;
    String subtext;
    String value;
    if (r.score == null) {
      tone = kToneSlate;
      value = 'Fresh';
      subtext = 'rate to start';
    } else {
      final s = r.score!;
      tone = kToneSlate; // neutral — no score-band green/amber/rose tinting
      value = '$s';
      subtext = '${r.ratedCount} rated';
    }
    // Count-up overlay for the score number — synchronises with the
    // value displayed by EngagementTile so the user sees the score
    // tween from previous to current rather than snapping.
    final scoreCounter = r.score == null
        ? null
        : CountUp(
            value: r.score!.toDouble(),
            duration: const Duration(milliseconds: 600),
            formatter: (v) => v.round().toString(),
            style: TextStyle(
              fontSize: 18, fontWeight: FontWeight.w900,
              fontVariations: ggWght(FontWeight.w900),
              color: tone.value, height: 1.05,
            ),
          );
    return EngagementTile(
      label: 'GUACSCORE',
      value: value,
      subtext: subtext,
      valueOverlay: scoreCounter,
      bg: tone.bg, ringColor: tone.ring, chip: tone.chip,
      labelColor: tone.label, valueColor: tone.value, subColor: tone.sub,
      themeEmoji: '😋',
      iconChild: Center(child: Text(r.score == null ? '🥑' : '😊', style: const TextStyle(fontSize: 20))),
      // Both surfaces route to /guacanomics — the page that
      // displays the GuacScore + the supporting analytics
      // (mirrors how the web works: GuacScore lives inside
      // /guacanomics, not its own dedicated route).
      onTap: () => context.push('/guacanomics'),
    );
  }

  Widget _guacWizardTile(WizardScoreResult r, bool loading) {
    // Tone tracks the score band; loading uses neutral slate so the
    // tile doesn't flash through the wrong color before bank data
    // lands (same fix the web dashboard's GuacWizardTile has).
    EngagementTone tone;
    String value;
    String? sub;
    if (loading) {
      tone = kToneSlate;
      value = '—';
      sub = 'loading…';
    } else if (r.score == null) {
      tone = kToneSlate;
      value = 'Set up';
      sub = 'connect bank →';
    } else {
      final s = r.score!;
      tone = kToneSlate; // neutral — no score-band tinting
      value = '$s/100';
      sub = 'health score';
    }
    return EngagementTile(
      label: 'GUACWIZARD', value: value, subtext: sub,
      bg: tone.bg, ringColor: tone.ring, chip: tone.chip,
      labelColor: tone.label, valueColor: tone.value, subColor: tone.sub,
      icon: Icons.auto_fix_high,
      themeEmoji: '🧙‍♂️',
      onTap: () => context.push('/guacwizard'),
    );
  }

  // ignore: unused_element
  Widget _guacMoneyTile() {
    return FutureBuilder<double>(
      future: fetchGuacMoneyTotal(),
      builder: (ctx, snap) {
        final total = snap.data ?? 0;
        final active = total > 0;
        final loading = snap.connectionState == ConnectionState.waiting && !snap.hasData;
        final tone = active ? kToneEmerald : kToneSlate;
        final overlay = loading
            ? null
            : CountUp(
                value: total,
                duration: const Duration(milliseconds: 480),
                formatter: (v) => formatGuacMoney(v),
                style: TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w900,
                  fontVariations: ggWght(FontWeight.w900),
                  color: tone.value, height: 1.05,
                ),
              );
        return EngagementTile(
          label: 'GUACMONEY',
          value: loading ? '—' : formatGuacMoney(total),
          subtext: active ? 'saved' : 'tap Cheapest →',
          valueOverlay: overlay,
          bg: tone.bg, ringColor: tone.ring, chip: tone.chip,
          labelColor: tone.label, valueColor: tone.value, subColor: tone.sub,
          icon: Icons.savings_outlined,
          themeEmoji: '💰',
          // Cheapest-routing lives on /shopping (Smashlist) — that
          // page is where saves get logged into GuacMoney, so it's
          // the right destination for users who tap the tile.
          onTap: () => context.push('/shopping'),
        );
      },
    );
  }

  Widget _rewardsTile(int count) {
    final active = count > 0;
    const tone = kToneSlate; // neutral — was rose when active
    return EngagementTile(
      label: 'REWARDS', value: '$count',
      subtext: active ? 'available' : 'none yet',
      valueOverlay: CountUp(
        value: count.toDouble(),
        duration: const Duration(milliseconds: 480),
        formatter: (v) => v.round().toString(),
        style: TextStyle(
          fontSize: 18, fontWeight: FontWeight.w900,
          fontVariations: ggWght(FontWeight.w900),
          color: tone.value, height: 1.05,
        ),
      ),
      bg: tone.bg, ringColor: tone.ring, chip: tone.chip,
      labelColor: tone.label, valueColor: tone.value, subColor: tone.sub,
      icon: Icons.card_giftcard_rounded,
      themeEmoji: '🎁',
      onTap: () => context.push('/rewards'),
    );
  }

  /// 8-tile horizontal scroll row, mirroring the web dashboard's
  /// `AllPaymentsScroll`. Receipt-side metrics (transactions /
  /// totalSpent / taxPaid / bankFees) come from the in-memory
  /// receipts list; bank-side metrics (purchases / payments /
  /// interestPaid / feesPaid) come from a single bank-data fetch
  /// kicked off in initState. The shared analysis engine computes
  /// the current value AND the period-over-period delta for each
  /// tile so the user gets the same "↑ 12% vs prior" signal here
  /// as on the web.
  Widget _paymentTileScroll(List<Receipt> spendingReceipts) {
    final periodKey = _period == _Period.daily   ? 'daily'
                    : _period == _Period.weekly  ? 'weekly'
                    : _period == _Period.yearly  ? 'yearly'
                    :                              'monthly';
    return FutureBuilder<BankData>(
      future: _bankDataFuture,
      builder: (ctx, snap) {
        // While loading, render the row with bank tiles at $0 so the
        // page doesn't pop in late. Receipt-side tiles work from
        // already-loaded data and show their real value immediately.
        final bank = snap.data ?? BankData.empty;
        final a = computeDashboardAnalysis(
          receipts: spendingReceipts,
          bank: bank,
          period: periodKey,
          periodCount: _periodCount,
        );
        String money(double n) => '\$${n.toStringAsFixed(2)}';
        // (metric-key, formatter, good-direction). good-direction
        // tints the delta subtext: green when a cost goes DOWN, green
        // when payments go UP, neutral gray otherwise.
        final tiles = <List<dynamic>>[
          ['transactions', (double v) => v.round().toString(), DeltaGoodWhen.neutral],
          ['totalSpent',   money, DeltaGoodWhen.down],
          ['taxPaid',      money, DeltaGoodWhen.down],
          ['purchases',    money, DeltaGoodWhen.neutral],
          ['payments',     money, DeltaGoodWhen.up],
          ['interestPaid', money, DeltaGoodWhen.down],
          ['feesPaid',     money, DeltaGoodWhen.down],
          ['bankFees',     money, DeltaGoodWhen.down],
        ];
        return SizedBox(
          height: 96,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.zero,
            itemCount: tiles.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) {
              final key = tiles[i][0] as String;
              final fmt = tiles[i][1] as String Function(double);
              final dir = tiles[i][2] as DeltaGoodWhen;
              final preset = kPaymentTilePresets[key]!;
              final m = a.metrics[key]!;
              return PaymentTile(
                emoji: preset.emoji,
                chipGradient: kPaymentTileGradients[preset.tone]!,
                label: preset.label,
                value: fmt(m.current),
                themeEmoji: preset.themeEmoji,
                deltaLabel: m.deltaLabel,
                deltaArrow: m.deltaArrow,
                deltaGoodWhen: dir,
                avocadoPos: preset.avocadoPos,
                themePos: preset.themePos,
              );
            },
          ),
        );
      },
    );
  }

  // Old 2×4 stat grid — superseded by _engagementStrip (4-up brand
  // tiles) + _paymentTileScroll (8-tile analysis-engine row). Kept
  // here only because Dart's tree-shaker doesn't elide unreferenced
  // method bodies; replace with `// removed` once we're confident.
  // ignore: unused_element
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
          onTap: () => context.push('/guacscore'),
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
          onTap: () => context.push(_receiptsDeepLink()),
        )),
        const SizedBox(width: 10),
        Expanded(child: _StatTile(
          label: 'Rewards',
          value: '$rewardCount',
          icon: Icons.card_giftcard,
          iconBg: const Color(0xFFecfccb),
          iconColor: const Color(0xFF65a30d),
          onTap: () => context.push('/rewards'),
        )),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        // Smash days — consecutive-day receipt activity counter.
        // Mirrors the web /dashboard tile. Tile turns warm-yellow when
        // the streak is alive (animate-pulse on web becomes a static
        // flame icon on mobile — same color signal without the spin).
        Expanded(child: () {
          final smash = computeSmashDays(filtered, bonus: _smashDaysBonus).smashDays;
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

  // One horizontal spending bar: store name · rounded track (length ∝ spend)
  // · dollar amount. Tapping opens that store's receipts.
  // Each bar carries the full green → amber → red heat gradient along its
  // own length — the app-wide chart style, mirroring the web dashboard and
  // the marketing tour deck.
  Widget _storeBar(_StoreSpend s, double maxAmount) {
    final frac = maxAmount > 0 ? (s.amount / maxAmount).clamp(0.08, 1.0) : 0.0;
    const grad = [
      Color(0xFF16a34a), // green-600
      Color(0xFFf59e0b), // amber-500
      Color(0xFFdc2626), // red-600
    ];
    return InkWell(
      onTap: () => context.push(_receiptsDeepLink(store: s.name)),
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 7),
        child: Row(children: [
          SizedBox(
            width: 66,
            child: Text(s.name, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: ggBody(size: 12.5, weight: FontWeight.w600, color: ggInk)),
          ),
          const SizedBox(width: 10),
          Expanded(child: ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: Container(
              height: 13,
              color: const Color(0xFFF1F5F9),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: frac,
                child: const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: grad),
                  ),
                ),
              ),
            ),
          )),
          const SizedBox(width: 12),
          SizedBox(
            width: 58,
            child: Text(_money(s.amount), textAlign: TextAlign.right,
              style: ggAmount(size: 13.5, color: ggInk)),
          ),
        ]),
      ),
    );
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
      decoration: ggCard(radius: 20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Spending by Store', style: ggHeading(size: 15, color: ggInk)),
        Text('Tap a bar to see that store’s receipts.', style: ggBody(size: 11, color: ggMuted)),
        const SizedBox(height: 12),
        if (topData.isEmpty)
          const SizedBox(height: 160, child: Center(child: Text('No transactions for this period', style: TextStyle(color: Colors.black38, fontSize: 13))))
        else
          // Horizontal gradient bars (store · bar · amount) — cleaner than the
          // old vertical fl_chart. Each row taps into that store's receipts.
          Column(children: [
            for (final s in topData) _storeBar(s, topData.first.amount),
          ]),
      ]),
    );
  }

  Widget _recentTransactions(List<Receipt> filtered) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: ggCard(radius: 20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text('Recent Transactions', style: ggHeading(size: 15, color: ggInk))),
          InkWell(
            onTap: () => context.push(_receiptsDeepLink()),
            child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.arrow_forward, size: 16, color: _kEmerald700)),
          ),
        ]),
        const SizedBox(height: 4),
        ...filtered.take(5).map((r) => ListTile(
          contentPadding: EdgeInsets.zero,
          dense: true,
          title: Text(r.storeName, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, fontVariations: ggWght(FontWeight.w600))),
          subtitle: Text(formatDateShort(r.date), style: const TextStyle(fontSize: 11, color: Colors.black45)),
          trailing: Text('\$${r.totalAmount.toStringAsFixed(2)}',
            style: ggAmount(size: 14)),
          onTap: () => context.push('/receipts/${r.id}'),
        )),
      ]),
    );
  }

  Widget _recentRewards(List rewards) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: ggCard(radius: 20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text('Rewards', style: ggHeading(size: 15, color: ggInk))),
          InkWell(
            onTap: () => context.push('/rewards'),
            child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.arrow_forward, size: 16, color: _kEmerald700)),
          ),
        ]),
        const SizedBox(height: 4),
        ...rewards.take(4).map((r) => ListTile(
          contentPadding: EdgeInsets.zero,
          dense: true,
          title: Text(r.rewardTitle, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, fontVariations: ggWght(FontWeight.w600))),
          subtitle: Text(r.storeName, style: const TextStyle(fontSize: 11, color: Colors.black45)),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: r.isExpired ? const Color(0xFFfee2e2) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(99),
            ),
            child: Text(r.isExpired ? 'Expired' : formatDateShort(r.expiryDate),
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800,
                fontVariations: ggWght(FontWeight.w800),
                color: r.isExpired ? const Color(0xFF991b1b) : _kEmerald800)),
          ),
          onTap: () => context.push('/rewards/${r.id}'),
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
            Text(label, style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w600, fontVariations: ggWght(FontWeight.w600))),
            const SizedBox(height: 2),
            Text(value,
              style: TextStyle(
                fontSize: isLeader ? 13 : 17,
                fontWeight: FontWeight.w900,
                fontVariations: ggWght(FontWeight.w900),
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
                  fontVariations: ggWght(FontWeight.w800),
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
/// Result of the GuacScore calc — same fields the web's
/// calculateGuacoScore returns. Score is null when there are no
/// rated purchases yet (pre-rating "fresh" state).
class _GuacScoreResult {
  final int? score;
  final String grade;     // mascot expression name
  final int ratedCount;
  const _GuacScoreResult({
    required this.score, required this.grade, required this.ratedCount,
  });
}

/// Same heading layout that HorizontalSection renders, extracted so
/// callers can pair the heading with custom-bodied rows (the
/// engagement strip uses its own ListView, so we can't pass it as
/// `children` to HorizontalSection).
class _SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  const _SectionHeader({required this.title, this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 6, 0, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(title,
            style: ggHeading(size: 16, weight: FontWeight.w900, color: Color(0xFF111827)),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(subtitle!,
              style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w500, fontVariations: ggWght(FontWeight.w500)),
            ),
          ],
        ],
      ),
    );
  }
}

class _StoreSpend {
  String name;
  double amount;
  int count;
  _StoreSpend({required this.name, required this.amount, required this.count});
}

