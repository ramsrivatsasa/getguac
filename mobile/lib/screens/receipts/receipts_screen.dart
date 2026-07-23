import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
import 'dart:convert';
import '../../providers/auth_provider.dart';
import '../../providers/receipt_provider.dart';
import '../../models/receipt_model.dart';
import '../../utils/date_format.dart';
import '../../services/receipt_parse_service.dart';
import '../../services/voice_capture_service.dart';
import '../../categories.dart' as cat;
import '../../widgets/animated_primitives.dart';
import '../../widgets/receipt_scan_overlay.dart';
import '../../widgets/top_app_bar_actions.dart';
import '../../services/mascot_event_bus.dart';
import '../../theme/gg_design.dart';
import '../../services/auth_token.dart';

class ReceiptsScreen extends StatefulWidget {
  /// Optional initial store filter from a deep-link like
  /// /receipts?store=Glory%20Days%20Grill. Pre-populates the search box so
  /// tapping a bar on the dashboard's Spending-by-Store chart lands the
  /// user on a pre-filtered list.
  final String? initialStoreFilter;

  /// Optional initial period chip from /receipts?period=3M. When set,
  /// the chip row opens scoped to that window instead of the default 1M.
  /// Accepts: '1M' | '3M' | '6M' | '1Y' | 'All'. Anything else falls
  /// back to 1M.
  final String? initialPeriod;

  /// Optional explicit cutoff (YYYY-MM-DD) from /receipts?dateFrom=...
  /// When set, takes precedence over initialPeriod for client-side
  /// filtering. Used by the dashboard so the two screens never disagree
  /// on which receipts fall inside "Last 3 months" — the dashboard
  /// computes the cutoff once (calendar math) and hands it through
  /// verbatim instead of forcing a day-bucket roundtrip.
  final String? initialDateFrom;

  /// When true (deep link /receipts?add=1 — e.g. the dashboard "Add Receipt"
  /// button), the capture menu opens automatically on first frame.
  final bool openAdd;

  /// Changes each time the camera button is tapped, so re-navigating to
  /// /receipts while already on it still reopens the capture menu (a plain
  /// bool can't change, so didUpdateWidget couldn't detect the re-tap).
  final String? addNonce;

  const ReceiptsScreen({super.key, this.initialStoreFilter, this.initialPeriod, this.initialDateFrom, this.openAdd = false, this.addNonce});
  @override
  State<ReceiptsScreen> createState() => _ReceiptsScreenState();
}

class _ReceiptsScreenState extends State<ReceiptsScreen> {
  final _search = TextEditingController();
  String _filter = '';
  final Set<String> _selected = {};
  bool get _selectionMode => _selected.isNotEmpty;

  /// Busy flags for the two housekeeping tools in the app-bar overflow —
  /// mirror the web /receipts "Find duplicates" + "Auto-categorize" buttons,
  /// calling the SAME server routes with the mobile Bearer token so behaviour
  /// stays identical across platforms.
  bool _dedupBusy = false;
  bool _autocatBusy = false;
  static const _kApiBase = 'https://getguac.app';

  /// Period chip selection is LOCAL to this screen, not driven by the
  /// provider. The provider holds whatever was most recently fetched
  /// (often the dashboard's wider .all pre-fetch); this screen filters
  /// it client-side by [_selectedPeriod] so opening the tab is instant
  /// when the dashboard already has data in memory. We only call
  /// loadReceipts when the cache genuinely can't cover the requested
  /// period (cold start, or user taps a wider chip than cached).
  late ReceiptPeriod _selectedPeriod;
  /// Mirrors the dashboard's exact cutoff date when the deep link
  /// supplies one. Cleared as soon as the user taps a different chip
  /// (their explicit choice wins over the dashboard's carryover).
  String? _deepLinkCutoff;

  /// Parse the ?period= query param value into a ReceiptPeriod. Used
  /// when the dashboard chart deep-links here with the user's current
  /// time window. Unrecognized values fall back to 1M.
  static ReceiptPeriod _parseChipId(String? id) {
    switch (id) {
      case '1M':  return ReceiptPeriod.month;
      case '3M':  return ReceiptPeriod.threeMonth;
      case '6M':  return ReceiptPeriod.sixMonth;
      case '1Y':  return ReceiptPeriod.year;
      case 'All': return ReceiptPeriod.all;
      default:    return ReceiptPeriod.month;
    }
  }

  @override
  void initState() {
    super.initState();
    // Deep-link "add" (dashboard Add Receipt button) → pop the capture menu.
    if (widget.openAdd) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _openAddMenu();
      });
    }
    _selectedPeriod = _parseChipId(widget.initialPeriod);
    _deepLinkCutoff = widget.initialDateFrom;
    if (context.read<AppAuthProvider>().currentUser?.id != null) {
      final p = context.read<ReceiptProvider>();
      // Only fetch on cold start. If the dashboard (or any other surface)
      // pre-fetched a superset of 1M, the data is already in memory and
      // we render instantly via client-side filtering — no network wait.
      // If the deep-link asked for a wider scope than what's cached,
      // trigger a fetch for that wider period right away.
      if (p.receipts.isEmpty) {
        p.loadReceipts(period: _selectedPeriod);
      } else if (!_periodCovers(p.currentPeriod, _selectedPeriod)) {
        p.loadReceipts(period: _selectedPeriod);
      }
    }
    // Apply the deep-link store filter (if any) by pre-filling both the
    // visible search text and the filter state used by the list query.
    final initial = widget.initialStoreFilter;
    if (initial != null && initial.isNotEmpty) {
      _filter = initial;
      _search.text = initial;
    }
  }

  @override
  void didUpdateWidget(covariant ReceiptsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Handle the case where the user is already on /receipts and taps
    // a DIFFERENT bar on the dashboard (re-enters with new params). Reset
    // the chip + filter to match the fresh deep link.
    if (oldWidget.initialPeriod != widget.initialPeriod && widget.initialPeriod != null) {
      final newPeriod = _parseChipId(widget.initialPeriod);
      if (newPeriod != _selectedPeriod) setState(() => _selectedPeriod = newPeriod);
    }
    if (oldWidget.initialDateFrom != widget.initialDateFrom) {
      setState(() => _deepLinkCutoff = widget.initialDateFrom);
    }
    // Camera/Add tapped while already on /receipts: the route doesn't remount,
    // so initState won't re-run — reopen the capture menu when the add nonce
    // changes (the camera button sends a fresh nonce every tap).
    if (widget.addNonce != null && widget.addNonce != oldWidget.addNonce) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _openAddMenu();
      });
    }
    if (oldWidget.initialStoreFilter != widget.initialStoreFilter
        && widget.initialStoreFilter != null
        && widget.initialStoreFilter!.isNotEmpty) {
      setState(() {
        _filter = widget.initialStoreFilter!;
        _search.text = widget.initialStoreFilter!;
      });
    }
  }

  /// True when [have] (what's cached) covers everything [want] needs.
  /// .all covers anything; otherwise compare durations.
  bool _periodCovers(ReceiptPeriod have, ReceiptPeriod want) {
    if (have == ReceiptPeriod.all) return true;
    if (want == ReceiptPeriod.all) return false;
    return have.duration!.inDays >= want.duration!.inDays;
  }

  /// User tapped a chip. Update local state; only hit the network if the
  /// cached data can't cover the new period.
  void _selectPeriod(ReceiptPeriod p) {
    setState(() {
      _selectedPeriod = p;
      // User picked a chip explicitly — drop the dashboard's carryover.
      _deepLinkCutoff = null;
    });
    final prov = context.read<ReceiptProvider>();
    if (prov.receipts.isEmpty || !_periodCovers(prov.currentPeriod, p)) {
      prov.loadReceipts(period: p);
    }
  }

  /// Client-side filter: keep only rows whose date is on or after the
  /// cutoff for [_selectedPeriod]. Uses YYYY-MM-DD string compare so
  /// timezone differences can't shift the boundary (same approach as
  /// the dashboard chart).
  List<Receipt> _scopeToPeriod(List<Receipt> all) {
    // Deep-link cutoff wins: the dashboard hands us the EXACT date
    // string it used to compute its chart, so chart and list can't
    // disagree on which receipts fall inside "Last N months".
    if (_deepLinkCutoff != null && _deepLinkCutoff!.length >= 10) {
      return all.where((r) => r.date.compareTo(_deepLinkCutoff!) >= 0).toList();
    }
    if (_selectedPeriod.duration == null) return all;
    final cutoff = DateTime.now().subtract(_selectedPeriod.duration!);
    final mm = cutoff.month.toString().padLeft(2, '0');
    final dd = cutoff.day.toString().padLeft(2, '0');
    final cutoffStr = '${cutoff.year}-$mm-$dd';
    return all.where((r) => r.date.compareTo(cutoffStr) >= 0).toList();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  /// Capture a receipt photo from [source], show the full-screen scan overlay
  /// (mascot + scan-line + rotating ticker) while Guac-AI reads it, then open
  /// the review dialog — prefilled on success, blank-with-photo on failure.
  /// Shared by the camera/gallery items in the floating "+ Add" menu.
  /// Capture several receipts in a row from the camera. `pickImage` returns
  /// null when the user backs out of the camera, so the loop ends naturally;
  /// after each shot we ask whether to scan another so the camera doesn't
  /// reopen unexpectedly. Each photo is parsed + reviewed before the next.
  Future<void> _captureFromCamera() async {
    if (!mounted) return;
    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null) return;
    final picker = ImagePicker();
    var n = 0;
    while (mounted) {
      // Downscale on capture so the upload stays well under the server's size
      // cap — full-res phone photos were >5 MB and got rejected (413) before
      // they could parse. 2000px keeps receipt text crisp.
      final img = await picker.pickImage(
        source: ImageSource.camera, maxWidth: 2000, imageQuality: 85);
      if (img == null || !mounted) break; // backed out of camera → done
      n++;
      await _processOne(File(img.path), uid);
      if (!mounted) break;
      final again = await _askScanAnother(n);
      if (again != true) break;
    }
  }

  /// Pick MANY receipts from the gallery at once, then parse + review each in
  /// turn. `pickMultiImage` lets the user multi-select; the scan overlay shows
  /// the batch size while each is read.
  Future<void> _captureFromGallery() async {
    if (!mounted) return;
    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null) return;
    final picker = ImagePicker();
    // Downscale each pick (2000px / q85) so even large gallery photos upload
    // under the server size cap and parse reliably.
    final imgs = await picker.pickMultiImage(maxWidth: 2000, imageQuality: 85);
    if (imgs.isEmpty || !mounted) return;
    for (final img in imgs) {
      if (!mounted) break;
      await _processOne(File(img.path), uid, batchCount: imgs.length);
    }
  }

  /// Parse one image and open the review dialog (awaited so a batch shows the
  /// dialogs one after another). [batchCount] drives the "N receipts" pill in
  /// the scan overlay when capturing a batch.
  Future<void> _processOne(File file, String uid, {int batchCount = 1}) async {
    if (!mounted) return;
    // Full-screen scan overlay while we send the photo to /api/parse-receipt —
    // mirrors the web parsing animation (mascot + speech bubble + scan line).
    ReceiptScanOverlay.show(context, count: batchCount);
    // One automatic retry on transient errors so a single AI hiccup doesn't
    // drop the user into an empty edit form.
    ParseResult result = await ReceiptParseService.parseImage(file);
    if (!result.ok) result = await ReceiptParseService.parseImage(file);
    ReceiptScanOverlay.hide();
    if (!mounted) return;

    if (!result.ok) {
      // Surface the real reason, let the user edit manually instead of
      // dropping a blank placeholder in the table.
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text("Couldn't auto-read: ${result.error}"),
        duration: const Duration(seconds: 4),
      ));
      // Open the Add dialog with the photo attached but no prefill so the
      // user can type the fields by hand. Awaited so batch capture queues
      // the review dialogs instead of stacking them.
      await showDialog(
        context: context,
        builder: (ctx) => _AddReceiptDialog(uid: uid, imageFile: file),
      );
      return;
    }
    // Duplicate dialog removed (user-requested) — the substring matcher
    // caused too many false positives. Real dupes are cleaned up via the
    // web Find duplicates button which uses the strict server-side matcher.
    if (!mounted) return;
    await showDialog(
      context: context,
      builder: (ctx) => _AddReceiptDialog(uid: uid, imageFile: file, prefill: result.data!),
    );
  }

  /// After a camera shot, ask whether to capture another. Returns true to loop.
  Future<bool?> _askScanAnother(int doneCount) {
    return showModalBottomSheet<bool>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 14),
          Text('$doneCount receipt${doneCount == 1 ? '' : 's'} captured',
              style: ggHeading(size: 16, weight: FontWeight.w800)),
          const SizedBox(height: 4),
          const Text('Snap another, or finish up.', style: TextStyle(color: Colors.black54)),
          const SizedBox(height: 12),
          ListTile(
            leading: const Icon(Icons.add_a_photo, color: Color(0xFF064e3b)),
            title: Text('Scan another receipt', style: TextStyle(fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
            onTap: () => Navigator.of(ctx).pop(true),
          ),
          ListTile(
            leading: const Icon(Icons.check_circle_outline, color: Color(0xFF059669)),
            title: Text('Done', style: TextStyle(fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
            onTap: () => Navigator.of(ctx).pop(false),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }

  /// Voice → receipt capture. Mirrors the web flow:
  ///   1. Mic dialog records a transcript via [VoiceCaptureService].
  ///   2. Transcript → /api/receipts/from-voice → Gemini fills the schema.
  ///   3. Open the existing Add Receipt dialog pre-filled, with the original
  ///      transcript stashed for the save call so the new row carries
  ///      `validation_comment = [voice] <transcript>` for later audit.
  /// We always pop the review dialog instead of silently saving — speech
  /// recognition is noisy enough that a human-in-the-loop step is the only
  /// way to keep the data clean.
  Future<void> _captureVoice() async {
    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null) return;
    final service = VoiceCaptureService();
    final available = await service.isAvailable();
    if (!mounted) return;
    if (!available) {
      // TODO(voice): re-enable when the speech_to_text plugin runs cleanly
      // on this device. Surface a friendly nudge instead of crashing.
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text("Voice capture isn't available on this device yet. Use the camera instead."),
        duration: Duration(seconds: 4),
      ));
      return;
    }
    final transcript = await showDialog<String?>(
      context: context,
      builder: (ctx) => _VoiceCaptureDialog(service: service),
    );
    if (!mounted || transcript == null || transcript.trim().isEmpty) return;

    // Full-screen scan overlay while Gemini parses the spoken receipt.
    ReceiptScanOverlay.show(context);
    final result = await VoiceCaptureService.parseTranscript(transcript);
    ReceiptScanOverlay.hide();
    if (!mounted) return;

    if (!result.ok) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(result.error ?? 'Voice parse failed'),
        duration: const Duration(seconds: 4),
      ));
      return;
    }

    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => _AddReceiptDialog(
        uid: uid,
        prefill: result.data!,
        voiceTranscript: transcript,
      ),
    );
  }

  /// Floating "+ Add" menu — a bottom-sheet of capture options shown when the
  /// FAB is tapped. Mobile supports Camera / Gallery / Voice (Screen + PDF are
  /// web-only). Each tile runs its handler after the sheet closes.
  void _openAddMenu() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const SizedBox(height: 8),
          Container(width: 36, height: 4, decoration: BoxDecoration(
            color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2),
          )),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.camera_alt, color: Color(0xFF064e3b)),
            title: Text('Take photos', style: TextStyle(fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
            subtitle: const Text('Snap several paper receipts in a row'),
            onTap: () { Navigator.of(ctx).pop(); _captureFromCamera(); },
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined, color: Color(0xFF064e3b)),
            title: Text('Pick from gallery', style: TextStyle(fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
            subtitle: const Text('Select one or many — Amazon, Doordash, screenshots'),
            onTap: () { Navigator.of(ctx).pop(); _captureFromGallery(); },
          ),
          ListTile(
            leading: const Icon(Icons.mic_none, color: Color(0xFF064e3b)),
            title: Text('Voice', style: TextStyle(fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
            subtitle: const Text('Dictate a receipt — e.g. "thirty bucks at Costco"'),
            onTap: () { Navigator.of(ctx).pop(); _captureVoice(); },
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }

  /// Bottom-sheet category picker. Tapping a row's category chip opens
  /// this — pick a preset → updates receipts.category via the provider.
  /// Preset categories only; users edit custom categories on web.
  Future<void> _pickCategoryFor(Receipt r) async {
    final picked = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text('Categorize receipt',
                style: ggHeading(size: 16, weight: FontWeight.w900, color: const Color(0xFF064e3b)))),
              IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.of(ctx).pop()),
            ]),
            const SizedBox(height: 4),
            Text(r.storeName, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.black87, fontVariations: ggWght(FontWeight.w600))),
            const SizedBox(height: 12),
            Wrap(spacing: 6, runSpacing: 6, children: [
              ActionChip(
                avatar: const Icon(Icons.clear, size: 14, color: Colors.black54),
                label: const Text('Uncategorized', style: TextStyle(fontSize: 12)),
                onPressed: () => Navigator.of(ctx).pop(''),
              ),
              for (final c in cat.kPresetCategories)
                ActionChip(
                  avatar: Text(c.emoji, style: const TextStyle(fontSize: 14)),
                  label: Text(c.label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
                  backgroundColor: r.category == c.slug ? cat.tintFor(c.color).withValues(alpha: 0.18) : null,
                  onPressed: () => Navigator.of(ctx).pop(c.slug),
                ),
            ]),
            const SizedBox(height: 8),
          ]),
        ),
      ),
    );
    if (picked == null || !mounted) return;
    try {
      await context.read<ReceiptProvider>().updateReceipt(r.id, {'category': picked.isEmpty ? null : picked});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(picked.isEmpty ? 'Category cleared' : 'Categorized as $picked'),
        duration: const Duration(seconds: 2),
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Update failed: $e')));
    }
  }

  void _toggle(String id) {
    setState(() {
      if (_selected.contains(id)) {
        _selected.remove(id);
      } else {
        _selected.add(id);
      }
    });
  }

  void _selectAll(List<Receipt> visible) {
    setState(() {
      if (_selected.length == visible.length) {
        _selected.clear();
      } else {
        _selected
          ..clear()
          ..addAll(visible.map((r) => r.id));
      }
    });
  }

  Future<void> _deleteSelected() async {
    if (_selected.isEmpty) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete receipts?'),
        content: Text('Delete ${_selected.length} receipt${_selected.length == 1 ? '' : 's'}?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final provider = context.read<ReceiptProvider>();
    final ids = _selected.toList();
    final failures = <String>[];
    for (final id in ids) {
      try {
        await provider.deleteReceipt(id);
      } catch (e) {
        failures.add(id);
      }
    }
    setState(_selected.clear);
    if (mounted) {
      final deleted = ids.length - failures.length;
      final msg = failures.isEmpty
          ? 'Deleted $deleted'
          : failures.length == ids.length
              ? 'Delete failed — none removed'
              : 'Deleted $deleted · ${failures.length} failed';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  void _editReceipt(Receipt r) {
    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null) return;
    showDialog(context: context, builder: (_) => _AddReceiptDialog(uid: uid, existing: r));
  }

  /// Pull a readable error message out of a failed API response body.
  String _apiErr(http.Response r, String fallback) {
    try {
      final m = jsonDecode(r.body);
      if (m is Map && m['error'] is String) return m['error'] as String;
    } catch (_) {}
    return '$fallback (${r.statusCode})';
  }

  /// Find & merge duplicate receipts — same store/date/total. Mirrors the web
  /// "Find duplicates" button: a dry-run scan first (so we can show the count
  /// and confirm), then execute with { confirm:true }. The server keeps the
  /// richest row of each group (parsed receipt > has tax > has image > newest)
  /// and relinks emails before deleting the rest.
  Future<void> _findDuplicates() async {
    if (_dedupBusy) return;
    setState(() => _dedupBusy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final token = await ggAccessToken();
      if (token == null) throw Exception('Not signed in');
      final headers = {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      };
      // 1. Dry run (default when { confirm } is absent) — preview only.
      final dry = await http.post(Uri.parse('$_kApiBase/api/receipts/dedup'),
          headers: headers, body: '{}');
      if (dry.statusCode != 200) throw Exception(_apiErr(dry, 'Scan failed'));
      final data = jsonDecode(dry.body) as Map<String, dynamic>;
      final groups = (data['groups'] as List?) ?? const [];
      final toDelete = (data['receipts_to_delete'] as num?)?.toInt() ?? 0;
      if (groups.isEmpty || toDelete == 0) {
        messenger.showSnackBar(const SnackBar(content: Text('No duplicate receipts found 🎉')));
        return;
      }
      if (!mounted) return;
      // 2. Confirm before any deletion.
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Merge duplicates?'),
          content: Text(
            'Found ${groups.length} duplicate group${groups.length == 1 ? '' : 's'} — '
            '$toDelete extra receipt${toDelete == 1 ? '' : 's'} will be merged into the '
            'best copy of each and removed. This cannot be undone.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Merge')),
          ],
        ),
      );
      if (ok != true) return;
      // 3. Execute using the server's auto-picked keepers.
      final exec = await http.post(Uri.parse('$_kApiBase/api/receipts/dedup'),
          headers: headers, body: jsonEncode({'confirm': true}));
      if (exec.statusCode != 200) throw Exception(_apiErr(exec, 'Merge failed'));
      final res = jsonDecode(exec.body) as Map<String, dynamic>;
      final deleted = (res['receipts_deleted'] as num?)?.toInt() ?? 0;
      if (mounted) {
        await context.read<ReceiptProvider>().loadReceipts(period: _selectedPeriod, force: true);
        mascotBus.bounce();
      }
      messenger.showSnackBar(SnackBar(
          content: Text('Merged $deleted duplicate${deleted == 1 ? '' : 's'}')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Find duplicates failed: $e')));
    } finally {
      if (mounted) setState(() => _dedupBusy = false);
    }
  }

  /// Auto-categorize receipts with no / "misc" category via the shared AI
  /// route, then persist the returned slugs. Mirrors the web button (the web
  /// runs a client-side rule pass first; here we send everything to the route,
  /// which is fine — the AI covers the rule cases too).
  Future<void> _autoCategorize() async {
    if (_autocatBusy) return;
    final provider = context.read<ReceiptProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final targets = provider.receipts
        .where((r) => r.category == null || r.category!.isEmpty || r.category == 'misc')
        .toList();
    if (targets.isEmpty) {
      messenger.showSnackBar(const SnackBar(content: Text('Every receipt is already categorized ✓')));
      return;
    }
    setState(() => _autocatBusy = true);
    try {
      final sb = Supabase.instance.client;
      final token = await ggAccessToken();
      if (token == null) throw Exception('Not signed in');
      // Route caps at 200 receipts/call — chunk so large accounts still work.
      final cats = <String, String>{};
      for (var i = 0; i < targets.length; i += 200) {
        final chunk = targets.sublist(i, (i + 200).clamp(0, targets.length));
        final resp = await http.post(
          Uri.parse('$_kApiBase/api/categorize'),
          headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
          body: jsonEncode({
            'receipts': chunk.map((r) => {
              'id': r.id,
              'store_name': r.storeName,
              'total_amount': r.totalAmount,
            }).toList(),
          }),
        );
        if (resp.statusCode != 200) throw Exception(_apiErr(resp, 'Categorize failed'));
        final data = jsonDecode(resp.body) as Map<String, dynamic>;
        (data['categories'] as Map?)?.forEach((id, slug) {
          if (slug is String && slug.isNotEmpty && slug != 'misc') cats[id as String] = slug;
        });
      }
      if (cats.isEmpty) {
        messenger.showSnackBar(const SnackBar(
            content: Text("Couldn't confidently categorize any. Try labeling a few manually.")));
        return;
      }
      // Persist directly (RLS scopes to the user); one reload at the end so we
      // don't refetch per row.
      var okCount = 0;
      for (final e in cats.entries) {
        try {
          await sb.from('receipts').update({'category': e.value}).eq('id', e.key);
          okCount++;
        } catch (_) {/* skip the odd row, keep going */}
      }
      if (mounted) {
        await provider.loadReceipts(period: _selectedPeriod, force: true);
      }
      messenger.showSnackBar(SnackBar(
          content: Text('Categorized $okCount receipt${okCount == 1 ? '' : 's'}')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Auto-categorize failed: $e')));
    } finally {
      if (mounted) setState(() => _autocatBusy = false);
    }
  }

  /// The app-bar overflow of housekeeping tools (Find duplicates /
  /// Auto-categorize). Shows a spinner in place of the icon while either runs.
  Widget _receiptToolsAction() {
    final busy = _dedupBusy || _autocatBusy;
    return PopupMenuButton<String>(
      enabled: !busy,
      tooltip: 'Clean up',
      icon: busy
          ? const SizedBox(
              width: 18, height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: ggInk))
          : barActionChild(Icons.cleaning_services_outlined, 'Clean up', color: ggInk),
      onSelected: (v) {
        if (v == 'dedup') _findDuplicates();
        if (v == 'autocat') _autoCategorize();
      },
      itemBuilder: (_) => const [
        PopupMenuItem(value: 'dedup', child: ListTile(
          leading: Icon(Icons.copy_all_outlined), title: Text('Find duplicates'),
          contentPadding: EdgeInsets.zero, dense: true)),
        PopupMenuItem(value: 'autocat', child: ListTile(
          leading: Icon(Icons.sell_outlined), title: Text('Auto-categorize'),
          contentPadding: EdgeInsets.zero, dense: true)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final receipts = context.watch<ReceiptProvider>().receipts;
    final loading = context.watch<ReceiptProvider>().loading;
    // Scope client-side by the chip selection first, then apply the
    // text search. This way changing chips is instant (no network)
    // whenever the provider cache already covers the period.
    final scoped = _scopeToPeriod(receipts);
    final filtered = scoped.where((r) =>
      r.storeName.toLowerCase().contains(_filter.toLowerCase()) || r.id.contains(_filter)
    ).toList();

    return Scaffold(
      appBar: _selectionMode
        ? AppBar(
            leading: IconButton(icon: const Icon(Icons.close), onPressed: () => setState(_selected.clear)),
            title: Text('${_selected.length} selected'),
            actions: [
              IconButton(
                icon: const Icon(Icons.select_all),
                onPressed: () => _selectAll(filtered),
                tooltip: 'Select all',
              ),
              IconButton(icon: const Icon(Icons.delete), onPressed: _deleteSelected, tooltip: 'Delete'),
            ],
          )
        : ggAppBar(context, 'Receipts', extraActions: [_receiptToolsAction()]),
      // Add Receipt now lives in the bottom-bar centre camera button — the
      // floating button here was removed to avoid duplication.
      body: Column(children: [
        // Period chips — scope the query to save load time on big accounts
        Container(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          alignment: Alignment.centerLeft,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              Padding(
                padding: const EdgeInsets.only(right: 6),
                child: Text('Show:', style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
              ),
              for (final p in ReceiptPeriod.values)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(p.label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800))),
                    selected: _selectedPeriod == p,
                    onSelected: (_) => _selectPeriod(p),
                    selectedColor: const Color(0xFFd1fae5),
                    labelStyle: TextStyle(
                      color: _selectedPeriod == p
                        ? const Color(0xFF064e3b) : Colors.black54,
                    ),
                    visualDensity: VisualDensity.compact,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
            ]),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _search,
            decoration: const InputDecoration(hintText: 'Search receipts…', prefixIcon: Icon(Icons.search)),
            onChanged: (v) => setState(() => _filter = v),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            // Force a refetch scoped to whatever chip the user has selected.
            // Falls back to the provider's last period if for some reason
            // our local selection hasn't been satisfied yet.
            onRefresh: () async {
              await context.read<ReceiptProvider>()
                .loadReceipts(period: _selectedPeriod, force: true);
              // Small mascot bounce on successful refresh — gives the
              // pull-to-refresh gesture a payoff beyond "spinner stops".
              if (mounted) mascotBus.bounce();
            },
            child: loading
            ? ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: 6,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(children: [
                    const ShimmerBox(width: 40, height: 40, radius: 10),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
                      ShimmerBox(width: 160, height: 14),
                      SizedBox(height: 8),
                      ShimmerBox(width: 100, height: 11),
                    ])),
                    const ShimmerBox(width: 56, height: 18),
                  ]),
                ),
              )
            : filtered.isEmpty
              ? ListView(children: [
                  const SizedBox(height: 100),
                  Center(child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(children: [
                      const Icon(Icons.receipt_long, size: 40, color: Color(0xFF9ca3af)),
                      const SizedBox(height: 10),
                      Text(
                        'No receipts yet',
                        textAlign: TextAlign.center,
                        style: ggHeading(size: 15, weight: FontWeight.w800, color: const Color(0xFF374151)),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Tap the camera to scan a paper receipt — or pick a screenshot of an Amazon, Doordash, Uber Eats, Instacart, or Walmart order from your gallery. Guac-AI reads them all.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey, fontSize: 12.5, height: 1.4),
                      ),
                    ]),
                  )),
                ])
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final r = filtered[i];
                    final isSelected = _selected.contains(r.id);
                    // Each row keyed by id so inserts from background
                    // email-pull tween in cleanly rather than snapping
                    // the whole list. Index-based stagger only kicks in
                    // for the first 8 rows so scrolling far down isn't
                    // gated on a long stagger chain.
                    return FadeUpOnMount(
                      key: ValueKey('receipt-row-${r.id}'),
                      delay: i < 8 ? Duration(milliseconds: i * 40) : Duration.zero,
                      child: Card(
                      color: isSelected ? Colors.blue.shade50 : null,
                      child: ListTile(
                        leading: _selectionMode
                          ? Checkbox(value: isSelected, onChanged: (_) => _toggle(r.id))
                          : null,
                        title: Row(children: [
                          Expanded(child: Text(r.storeName, style: TextStyle(fontFamily: kBodyFont, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700)), overflow: TextOverflow.ellipsis)),
                          if (r.fromStatement) Container(
                            margin: const EdgeInsets.only(left: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFf3f4f6),
                              borderRadius: BorderRadius.circular(99),
                              border: Border.all(color: const Color(0xFFd1d5db)),
                            ),
                            child: Row(mainAxisSize: MainAxisSize.min, children: [
                              const Icon(Icons.account_balance_wallet_outlined, size: 9, color: Color(0xFF6b7280)),
                              const SizedBox(width: 2),
                              Text('Statement', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF374151), fontVariations: ggWght(FontWeight.w800))),
                            ]),
                          ),
                          if (r.isReturn) Container(
                            margin: const EdgeInsets.only(left: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFfee2e2),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: Text('Return', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF991b1b), fontVariations: ggWght(FontWeight.w800))),
                          ),
                          if (r.rating != null) ...[
                            const SizedBox(width: 4),
                            Icon(Icons.star, size: 13, color: _ratingColor(r.rating!)),
                            const SizedBox(width: 1),
                            Text('${r.rating}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: _ratingColor(r.rating!), fontVariations: ggWght(FontWeight.w800))),
                          ],
                        ]),
                        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                          Text(
                            '${formatDateShort(r.date)} • Tax: \$${r.taxPaid.toStringAsFixed(2)}'
                            '${r.itemCount > 0 ? " • ${r.itemCount} ${r.itemCount == 1 ? "item" : "items"}" : ""}',
                            style: const TextStyle(fontFamily: kBodyFont),
                          ),
                          const SizedBox(height: 4),
                          GestureDetector(
                            onTap: () => _pickCategoryFor(r),
                            child: _CategoryChip(slug: r.category),
                          ),
                        ]),
                        trailing: _selectionMode
                          ? Text('\$${r.totalAmount.toStringAsFixed(2)}', style: TextStyle(fontFamily: kBodyFont, fontSize: 14, fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800), color: ggInk, letterSpacing: -0.3))
                          : Row(mainAxisSize: MainAxisSize.min, children: [
                              Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('\$${r.totalAmount.toStringAsFixed(2)}', style: TextStyle(fontFamily: kBodyFont, fontSize: 15, fontWeight: FontWeight.w800, fontVariations: ggWght(FontWeight.w800), color: ggInk, letterSpacing: -0.3)),
                                  if (r.businessPurchase)
                                    const Text('Business', style: TextStyle(fontSize: 11, color: Colors.blue)),
                                ],
                              ),
                              IconButton(
                                icon: const Icon(Icons.edit, size: 18),
                                onPressed: () => _editReceipt(r),
                                tooltip: 'Edit',
                                visualDensity: VisualDensity.compact,
                              ),
                            ]),
                        onTap: _selectionMode ? () => _toggle(r.id) : () => context.go('/receipts/${r.id}'),
                        onLongPress: () => _toggle(r.id),
                      ),
                    ),
                    );
                  },
                ),
          ),
        ),
      ]),
    );
  }

  // Star colour scale 1→5 matches WorthItRating
  Color _ratingColor(int r) {
    switch (r) {
      case 1: return const Color(0xFFdc2626);
      case 2: return const Color(0xFFea580c);
      case 3: return const Color(0xFFca8a04);
      case 4: return const Color(0xFF65a30d);
      case 5: return const Color(0xFF15803d);
      default: return const Color(0xFF9ca3af);
    }
  }
}

class _AddReceiptDialog extends StatefulWidget {
  final String uid;
  final File? imageFile;
  final Receipt? existing;
  final ParsedReceipt? prefill;
  /// When non-null, this row came from the voice-capture flow. We thread
  /// the original transcript into receipts.validation_comment so we can
  /// grep `[voice]` rows later to audit accuracy. No image is uploaded.
  final String? voiceTranscript;
  const _AddReceiptDialog({
    required this.uid, this.imageFile, this.existing, this.prefill, this.voiceTranscript,
  });
  @override
  State<_AddReceiptDialog> createState() => _AddReceiptDialogState();
}

class _AddReceiptDialogState extends State<_AddReceiptDialog> {
  late final TextEditingController _store;
  late final TextEditingController _amount;
  late final TextEditingController _tax;
  late final TextEditingController _rewardNo;
  late String _date;
  late bool _business;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    final p = widget.prefill;
    // Initial values come from: edit-existing > AI-prefill > blank.
    _store    = TextEditingController(text: e?.storeName ?? p?.storeName ?? '');
    _amount   = TextEditingController(text: e?.totalAmount.toString() ?? (p?.totalAmount != null && p!.totalAmount > 0 ? p.totalAmount.toStringAsFixed(2) : ''));
    _tax      = TextEditingController(text: e?.taxPaid.toString()     ?? (p?.taxPaid     != null && p!.taxPaid     > 0 ? p.taxPaid.toStringAsFixed(2)     : ''));
    // Prefill Reward No from the AI-extracted membership number (Costco
    // "Member:", Giant "Customer", etc.) when adding from a scan.
    _rewardNo = TextEditingController(text: e?.rewardNo ?? (p?.memberNumber.isNotEmpty == true ? p!.memberNumber : ''));
    _date     = e?.date ?? p?.date ?? DateTime.now().toIso8601String().substring(0, 10);
    _business = e?.businessPurchase ?? false;
  }

  @override
  void dispose() {
    _store.dispose();
    _amount.dispose();
    _tax.dispose();
    _rewardNo.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    // Don't fail silently — tell the user exactly what's missing and point them
    // at the zoomable receipt image so they can read it off the photo.
    if (_store.text.trim().isEmpty || _amount.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Add the store name and total amount to save. Tip: tap the receipt above to zoom in and read them.'),
        duration: Duration(seconds: 4),
      ));
      return;
    }
    final navigator = Navigator.of(context);
    setState(() => _saving = true);
    final provider = context.read<ReceiptProvider>();
    if (widget.existing != null) {
      await provider.updateReceipt(widget.existing!.id, {
        'store_name': _store.text,
        'date': _date,
        'total_amount': double.tryParse(_amount.text) ?? 0,
        'tax_paid': double.tryParse(_tax.text) ?? 0,
        'reward_no': _rewardNo.text,
        'business_purchase': _business,
      });
    } else if (widget.voiceTranscript != null) {
      // Voice path — route through the server save pipeline so dedup,
      // Tier 2, store resolve, items, refund policies all run identically
      // to the photo path. validation_comment captures the transcript for
      // later accuracy audits.
      final p = widget.prefill;
      final parsed = <String, dynamic>{
        'store_name': _store.text,
        'date': _date,
        'total_amount': double.tryParse(_amount.text) ?? 0,
        'tax_paid': double.tryParse(_tax.text) ?? 0,
        'is_return': false,
        'category': p?.category,
        'items': p == null ? [] : p.items.map((it) => {
          'item_name': it.itemName,
          'qty': it.qty,
          'price': it.price ?? 0,
          'category': it.category,
        }).toList(),
        'business_purchase': _business,
      };
      await provider.addVoiceReceipt(
        parsed,
        validationComment: '[voice] ${widget.voiceTranscript}',
      );
    } else {
      final receipt = Receipt(
        id: '', storeName: _store.text, date: _date,
        totalAmount: double.tryParse(_amount.text) ?? 0,
        taxPaid: double.tryParse(_tax.text) ?? 0,
        rewardNo: _rewardNo.text, businessPurchase: _business,
      );
      await provider.addReceipt(receipt, imageFile: widget.imageFile);
    }
    if (mounted) navigator.pop();
  }

  // Full-screen, pinch-to-zoom view of the captured receipt — lets the user
  // read fields the AI missed (e.g. the total) straight off the image and type
  // them in, instead of cancelling and losing the receipt.
  void _showReceiptImage(BuildContext context, File file) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(8),
        child: Stack(children: [
          InteractiveViewer(
            minScale: 0.8,
            maxScale: 6,
            child: Center(child: Image.file(file, fit: BoxFit.contain)),
          ),
          Positioned(
            top: 4, right: 4,
            child: Material(
              color: Colors.black54,
              shape: const CircleBorder(),
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.of(ctx).pop(),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isVoice = widget.voiceTranscript != null;
    return AlertDialog(
      title: Text(widget.existing != null
        ? 'Edit Receipt'
        : isVoice ? 'Review Voice Receipt' : 'Add Receipt'),
      content: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (widget.imageFile != null) ...[
            // Tap to open a full-screen, pinch-to-zoom view of the receipt — so
            // when the AI misses a field (e.g. the total) the user can read it
            // off the image and type it in.
            GestureDetector(
              onTap: () => _showReceiptImage(context, widget.imageFile!),
              child: Stack(alignment: Alignment.bottomRight, children: [
                Image.file(widget.imageFile!, height: 120, fit: BoxFit.cover),
                Container(
                  margin: const EdgeInsets.all(4),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.zoom_in, size: 13, color: Colors.white),
                    const SizedBox(width: 3),
                    Text('Tap to zoom', style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w700, fontVariations: ggWght(FontWeight.w700))),
                  ]),
                ),
              ]),
            ),
            const SizedBox(height: 12),
          ],
          if (isVoice) ...[
            // Surface the heard transcript so the user knows what they're
            // reviewing. Voice recognition mishears brand names and amounts
            // constantly — this banner makes the audit step impossible to miss.
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFf0fdf4),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFd1fae5)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Icon(Icons.mic, size: 14, color: Color(0xFF065f46)),
                  const SizedBox(width: 6),
                  Text('Heard:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF065f46), fontVariations: ggWght(FontWeight.w800))),
                ]),
                const SizedBox(height: 4),
                Text(widget.voiceTranscript!,
                  style: const TextStyle(fontSize: 12, color: Color(0xFF065f46), fontStyle: FontStyle.italic)),
                const SizedBox(height: 6),
                const Text(
                  'Voice can mishear amounts and store names — double-check below.',
                  style: TextStyle(fontSize: 10.5, color: Color(0xFF047857)),
                ),
              ]),
            ),
            const SizedBox(height: 12),
          ],
          TextField(controller: _store, decoration: const InputDecoration(labelText: 'Store Name*')),
          const SizedBox(height: 8),
          TextField(controller: _amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Total Amount*', prefixText: '\$')),
          const SizedBox(height: 8),
          TextField(controller: _tax, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Tax Paid', prefixText: '\$')),
          const SizedBox(height: 8),
          TextField(controller: _rewardNo, decoration: const InputDecoration(labelText: 'Reward No')),
          const SizedBox(height: 8),
          InkWell(
            onTap: () async {
              final picked = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime(2000), lastDate: DateTime(2100));
              if (picked != null) setState(() => _date = picked.toIso8601String().substring(0, 10));
            },
            child: InputDecorator(decoration: const InputDecoration(labelText: 'Date'), child: Text(_date)),
          ),
          CheckboxListTile(
            title: const Text('Business Purchase', style: TextStyle(fontSize: 14)),
            value: _business, onChanged: (v) => setState(() => _business = v ?? false),
            contentPadding: EdgeInsets.zero,
          ),
        ]),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: _saving ? null : _save,
          child: _saving
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(widget.existing != null ? 'Update' : 'Save'),
        ),
      ],
    );
  }
}

/// Small pill showing the receipt's current category, tappable to change it.
/// Uncategorized rows render a dashed "+ Category" affordance so the action
/// is discoverable without explaining it.
class _CategoryChip extends StatelessWidget {
  final String? slug;
  const _CategoryChip({required this.slug});

  @override
  Widget build(BuildContext context) {
    final preset = (slug != null && slug!.isNotEmpty) ? cat.presetBySlug(slug!) : null;
    if (preset == null) {
      // Uncategorized state
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: const Color(0xFFcbd5e1), width: 1, style: BorderStyle.solid),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.add, size: 11, color: Color(0xFF64748b)),
          const SizedBox(width: 3),
          Text('Category', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: const Color(0xFF64748b), fontVariations: ggWght(FontWeight.w700))),
        ]),
      );
    }
    final tint = cat.tintFor(preset.color);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: tint.withValues(alpha: 0.4)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(preset.emoji, style: const TextStyle(fontSize: 11)),
        const SizedBox(width: 4),
        Text(preset.label, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: tint, fontVariations: ggWght(FontWeight.w800))),
      ]),
    );
  }
}

/// Push-to-talk dialog that captures a single spoken utterance and returns
/// the final transcript on dismiss. Mirrors the web VoiceCapture component.
/// When the underlying recognizer is unavailable (older OS / denied perms),
/// the caller short-circuits before this dialog opens — but we still defend
/// against it here in case the runtime state changes mid-screen.
class _VoiceCaptureDialog extends StatefulWidget {
  final VoiceCaptureService service;
  const _VoiceCaptureDialog({required this.service});
  @override
  State<_VoiceCaptureDialog> createState() => _VoiceCaptureDialogState();
}

class _VoiceCaptureDialogState extends State<_VoiceCaptureDialog>
    with SingleTickerProviderStateMixin {
  String _partial = '';
  String _finalText = '';
  bool _listening = false;
  String? _error;

  @override
  void dispose() {
    // Make sure the mic indicator doesn't linger after dismiss.
    widget.service.cancel();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_listening) {
      await widget.service.stop();
      setState(() => _listening = false);
      return;
    }
    setState(() {
      _error = null;
      _partial = '';
      _finalText = '';
      _listening = true;
    });
    final result = await widget.service.listenOnce(
      onPartial: (t) {
        if (mounted) setState(() => _partial = t);
      },
    );
    if (!mounted) return;
    setState(() {
      _listening = false;
      if (result != null && result.isNotEmpty) {
        _finalText = result;
        _partial = '';
      } else if (_partial.isEmpty) {
        _error = "Didn't catch anything. Tap the mic and try again.";
      } else {
        _finalText = _partial;
        _partial = '';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final text = _finalText.isNotEmpty ? _finalText : _partial;
    return AlertDialog(
      title: const Text('Voice → Receipt'),
      content: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text(
            'Say something like "Thirty bucks at Costco on groceries."',
            style: TextStyle(fontSize: 12, color: Colors.black54),
          ),
          const SizedBox(height: 12),
          Center(
            child: InkWell(
              onTap: _toggle,
              borderRadius: BorderRadius.circular(40),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 70, height: 70,
                decoration: BoxDecoration(
                  color: _listening ? const Color(0xFFef4444) : const Color(0xFF10b981),
                  borderRadius: BorderRadius.circular(40),
                  boxShadow: [
                    BoxShadow(
                      color: (_listening ? const Color(0xFFef4444) : const Color(0xFF10b981)).withValues(alpha: 0.35),
                      blurRadius: _listening ? 18 : 8,
                      spreadRadius: _listening ? 2 : 0,
                    ),
                  ],
                ),
                child: Icon(_listening ? Icons.stop : Icons.mic, color: Colors.white, size: 30),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Center(
            child: Text(
              _listening ? 'Listening… tap to stop' : 'Tap mic to start',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.black54, fontVariations: ggWght(FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            constraints: const BoxConstraints(minHeight: 60),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFf9fafb),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFe5e7eb)),
            ),
            child: Text(
              text.isEmpty ? 'Your spoken receipt will appear here…' : text,
              style: TextStyle(
                fontSize: 13,
                color: text.isEmpty ? Colors.black38 : Colors.black87,
                fontStyle: _partial.isNotEmpty && _finalText.isEmpty ? FontStyle.italic : FontStyle.normal,
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: Color(0xFFb91c1c), fontSize: 12)),
          ],
          const SizedBox(height: 8),
          const Text(
            'Heads up: voice recognition varies by accent and noise. You will review the parsed fields before saving.',
            style: TextStyle(fontSize: 10.5, color: Colors.black45),
          ),
        ]),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(null), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: _listening || (_finalText.isEmpty && _partial.isEmpty)
              ? null
              : () => Navigator.of(context).pop((_finalText.isNotEmpty ? _finalText : _partial).trim()),
          child: const Text('Parse this'),
        ),
      ],
    );
  }
}
