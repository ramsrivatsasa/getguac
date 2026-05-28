import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'dart:io';
import '../../providers/auth_provider.dart';
import '../../providers/receipt_provider.dart';
import '../../providers/reward_provider.dart';
import '../../models/receipt_model.dart';
import '../../services/receipt_parse_service.dart';
import '../../services/document_scanner_service.dart';
import '../../widgets/guac_mascot.dart';
import '../../utils/date_format.dart';
import '../../store_name_normalize.dart';

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

  void _selectPeriod(_Period p) {
    setState(() {
      _period = p;
      _periodCount = _kDefaultCount[p]!;
    });
  }

  /// Maximum photos per batch capture. Set very high so users capturing
  /// many distinct receipts in one session aren't artificially throttled.
  /// Each photo is its own /api/parse-receipt call (one Gemini invocation
  /// per receipt), so the only real cost is per-image — there's no single
  /// long server call to blow the Vercel function ceiling. The picker is
  /// still bounded so a runaway tap doesn't queue thousands of photos.
  static const _kMaxBatchSize = 50;

  /// Capture flow.
  ///
  /// Two paths the user can pick from the bottom sheet:
  ///
  /// (1) Scan receipt — Google ML Kit Document Scanner. The scanner handles
  ///     its OWN multi-page session (live edge detection, perspective
  ///     correction, "Add page" button). When the user is done it returns
  ///     N cleaned page images for what is treated as ONE receipt. We send
  ///     them as a single multi-image request to /api/parse-receipt and
  ///     get back one parsed receipt. Long CVS / grocery receipts that
  ///     don't fit in one frame work here.
  ///
  /// (2) Choose from gallery — existing batch loop. Each gallery pick is
  ///     treated as a SEPARATE receipt (typical use: 3 unrelated receipts
  ///     to upload). Preview screen with Retry / Add another / Done caps
  ///     at _kMaxBatchSize photos.
  Future<void> _captureReceipt() async {
    final source = await _askImageSource();
    if (source == null || !mounted) return;

    if (source == _CaptureSource.scanner) {
      List<File>? pages;
      try {
        pages = await DocumentScannerService.scan(pageLimit: 5);
      } catch (e) {
        if (!mounted) return;
        final msg = e.toString();
        // The Play Services Doc Scanner module is downloaded on demand.
        // On first invocation (especially on sideloaded builds without Play
        // Store pre-fetch), `getStartScanIntent` can throw a raw NPE
        // synchronously before the module arrives. Detect that signature
        // and offer the camera as a fallback so the user can still capture
        // a receipt right now.
        final looksLikeModuleNotReady =
            msg.contains('NullPointerException') ||
            msg.contains('UNAVAILABLE') ||
            msg.contains('MlKitException') ||
            msg.contains('not yet available');
        final retryWithCamera = await _showScannerErrorDialog(
          isModuleNotReady: looksLikeModuleNotReady,
          rawError: msg,
        );
        if (!mounted) return;
        if (retryWithCamera == true) {
          // Fall back to the system camera via image_picker — the user still
          // gets to capture a receipt, just without the edge-detection UI.
          final picker = ImagePicker();
          final img = await picker.pickImage(source: ImageSource.camera, imageQuality: 80);
          if (img == null || !mounted) return;
          await _processSingleCapture(File(img.path));
        }
        return;
      }
      if (pages == null || pages.isEmpty) {
        // Scanner returned without an error AND without pages. Most common
        // cause: user cancelled inside the ML Kit camera UI. Surface a
        // small toast so they aren't left wondering whether anything
        // happened — silent returns were confusing in user testing.
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Scanner closed without saving any pages.'),
            duration: Duration(seconds: 2),
          ));
        }
        return;
      }
      if (!mounted) return;
      // ML Kit-cleaned pages are sent as ONE multi-page receipt.
      await _processScannerResult(pages);
      return;
    }

    // Camera path (long receipts via raw camera, no ML Kit dependency).
    // User takes one photo per page; after each shot we ask "Add another?"
    // until they say done. All pages get bundled as ONE receipt the same
    // way the ML Kit scanner output is processed.
    //
    // This is the guaranteed-working capture path — uses system camera
    // only, no Play Services / ML Kit module download required. Right
    // path when the document scanner fails to launch on a device.
    if (source == _CaptureSource.camera) {
      final picker = ImagePicker();
      final pages = <File>[];
      while (mounted) {
        final img = await picker.pickImage(
          source: ImageSource.camera,
          imageQuality: 85,
          maxWidth: 2400,
          maxHeight: 4000,
        );
        if (img == null) break; // user cancelled / hit back
        pages.add(File(img.path));
        if (!mounted) return;
        final more = await _confirmAnotherPage(pages.length);
        if (more != true) break;
      }
      if (pages.isEmpty || !mounted) return;
      await _processScannerResult(pages);
      return;
    }

    // Gallery path: each pick is a SEPARATE receipt (batch).
    //
    // First attempt: pickMultiImage opens a single gallery view where the
    // user can select up to _kMaxBatchSize photos in one shot. This is
    // dramatically better than the previous one-photo-then-reopen-gallery
    // loop. Trims the selection to the batch cap if the user picked more.
    final picker = ImagePicker();
    final List<File> queue = [];
    try {
      final picks = await picker.pickMultiImage(imageQuality: 80, limit: _kMaxBatchSize);
      if (!mounted) return;
      for (final p in picks) {
        queue.add(File(p.path));
        if (queue.length >= _kMaxBatchSize) break;
      }
      if (picks.length > _kMaxBatchSize) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Trimmed to first $_kMaxBatchSize photos.'),
          duration: const Duration(seconds: 2),
        ));
      }
    } catch (e) {
      // pickMultiImage is available on iOS 14+ and Android with native gallery
      // support. Older devices fall through to the legacy one-at-a-time loop
      // so the feature degrades gracefully instead of failing outright.
      if (!mounted) return;
      while (mounted) {
        final img = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
        if (img == null || !mounted) break;
        final file = File(img.path);
        final action = await _showCapturePreview(file, queue.length, _kMaxBatchSize);
        if (!mounted) break;
        switch (action) {
          case _PreviewAction.retry: continue;
          case _PreviewAction.addAnother:
            queue.add(file);
            if (queue.length >= _kMaxBatchSize) break;
            continue;
          case _PreviewAction.done: queue.add(file); break;
        }
        break;
      }
    }

    if (queue.isEmpty || !mounted) return;
    await _processBatch(queue);
  }

  Future<_CaptureSource?> _askImageSource() async {
    return showModalBottomSheet<_CaptureSource>(
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
            leading: const Icon(Icons.document_scanner_outlined, color: _kEmerald700),
            title: const Text('Scan receipt'),
            subtitle: const Text(
              'Auto-cropped multi-page. Best when it works — falls back to camera if the scanner module isn\'t ready.',
            ),
            onTap: () => Navigator.of(ctx).pop(_CaptureSource.scanner),
          ),
          ListTile(
            leading: const Icon(Icons.camera_alt_outlined, color: _kEmerald700),
            title: const Text('Camera (long receipt)'),
            subtitle: const Text(
              'Take ONE photo per page of a long receipt. Tap "Add another page" to capture each frame; all pages become a single receipt.',
            ),
            onTap: () => Navigator.of(ctx).pop(_CaptureSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined, color: _kEmerald700),
            title: const Text('Choose from gallery'),
            subtitle: const Text('Pick one or more existing photos — each is a separate receipt.'),
            onTap: () => Navigator.of(ctx).pop(_CaptureSource.gallery),
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }

  /// Multi-page parse + save for a single long receipt scanned via ML Kit.
  /// All pages go to /api/parse-receipt in one shot; one receipt row gets
  /// inserted. Receipt_link points at the first page; subsequent pages are
  /// uploaded to storage but not yet linked (DB schema for that is queued).
  Future<void> _processScannerResult(List<File> pages) async {
    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null || !mounted) return;
    final provider = context.read<ReceiptProvider>();

    // Keep the screen awake across the upload + Gemini parse + save. A
    // 10-page receipt can take 20-60s; if the screen sleeps, Android
    // may suspend the network and kill the parse. We acquire the wakelock
    // here and release it unconditionally in `finally` below.
    await WakelockPlus.enable();
    if (!mounted) { await WakelockPlus.disable(); return; }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        content: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
            const SizedBox(width: 14),
            Flexible(child: Text('Guac-AI is reading ${pages.length} page${pages.length == 1 ? "" : "s"}…')),
          ]),
        ),
      ),
    );

    try {
      ParseResult result = await ReceiptParseService.parseImages(pages);
      // One retry on transient errors.
      if (!result.ok && _looksTransient(result.error)) {
        result = await ReceiptParseService.parseImages(pages);
      }
      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop(); // loader

      if (!result.ok) {
        if (result.nonReceipt) {
          await _showNonReceiptDialog(result.error!, result.tip);
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(result.error ?? 'Parse failed'),
          duration: const Duration(seconds: 5),
        ));
        return;
      }

      final parsed = result.data!;
      // Duplicate auto-skip removed (user-requested) — see _processSingleCapture.
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
      // Multi-page: pages[0] is the cover (receipt_link), pages[1..] go to
      // extra_page_urls. Provider uploads each to storage and persists the
      // full set so the detail screen can paginate every captured page.
      final extras = pages.length > 1 ? pages.sublist(1) : <File>[];
      final insert = await provider.addParsedReceipt(asMap, pages.first, extraPages: extras);
      if (!mounted) return;
      if (insert.id == null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Insert failed: ${insert.error ?? "unknown reason"}'),
        ));
        return;
      }
      final id = insert.id!;
      final storeBit = parsed.storeName.isNotEmpty ? parsed.storeName : 'Receipt';
      final totalBit = parsed.totalAmount > 0 ? ' · \$${parsed.totalAmount.toStringAsFixed(2)}' : '';
      // When dedup merged into an existing row, say so explicitly so the
      // user isn't searching for a "new" receipt that was rolled up into
      // an existing one. The View action still opens the (now-enriched)
      // existing receipt.
      final msg = insert.merged
        ? 'Already had this receipt — merged $storeBit$totalBit into the existing row.'
        : '$storeBit$totalBit — ${parsed.items.length} item${parsed.items.length == 1 ? "" : "s"} from ${pages.length} page${pages.length == 1 ? "" : "s"}';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg),
        action: SnackBarAction(label: 'View', onPressed: () => context.go('/receipts/$id')),
        duration: const Duration(seconds: 5),
      ));
    } catch (e) {
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Scan failed: $e')));
      }
    } finally {
      // Always release — even if a caller above re-throws or the user
      // cancels mid-parse, we don't want the screen pinned awake forever.
      await WakelockPlus.disable();
    }
  }

  /// Full-screen preview after a capture. [queued] is how many photos are
  /// already in the batch (the one being previewed is NOT in queue yet);
  /// [maxBatchSize] is the hard cap. The preview hides Add-another on the
  /// last allowed photo so the user can't blow past the cap.
  Future<_PreviewAction> _showCapturePreview(File file, int queued, int maxBatchSize) async {
    final result = await Navigator.of(context).push<_PreviewAction>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _CapturePreviewScreen(
          file: file,
          queued: queued,
          maxBatchSize: maxBatchSize,
        ),
      ),
    );
    return result ?? _PreviewAction.retry;
  }

  /// Parse + dedup + save every photo in the batch sequentially, with a
  /// single progress dialog that updates as we go. Auto-retries each photo
  /// once on transient failure. Failures are tracked and surfaced in a
  /// summary dialog at the end so the user can see exactly which photos
  /// didn't make it.
  Future<void> _processBatch(List<File> files) async {
    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null || !mounted) return;
    final provider = context.read<ReceiptProvider>();

    final progress = ValueNotifier<_BatchProgress>(
      _BatchProgress(done: 0, total: files.length, currentLabel: 'Starting…'),
    );
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        content: ValueListenableBuilder<_BatchProgress>(
          valueListenable: progress,
          builder: (_, p, __) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)),
                const SizedBox(width: 14),
                Expanded(child: Text(
                  'Reading receipt ${p.done + 1} of ${p.total}…',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                )),
              ]),
              const SizedBox(height: 10),
              LinearProgressIndicator(
                value: p.total == 0 ? 0 : p.done / p.total,
                color: const Color(0xFF15803d),
                backgroundColor: const Color(0xFFf0fdf4),
              ),
              const SizedBox(height: 8),
              Text(p.currentLabel,
                style: const TextStyle(fontSize: 11, color: Colors.black54)),
            ],
          ),
        ),
      ),
    );

    int saved = 0, failed = 0, merged = 0;
    final failures = <String>[];
    final List<String> savedIds = [];
    final List<String> mergedIds = [];
    final List<_DupHit> duplicates = [];

    for (int i = 0; i < files.length; i++) {
      final file = files[i];
      progress.value = _BatchProgress(
        done: i, total: files.length,
        currentLabel: 'Parsing photo ${i + 1}…',
      );
      try {
        // Two automatic retries for transient errors. The first failure is
        // common when image_picker hands us a file with no MIME (now fixed
        // client-side) OR when the cell connection blips during upload.
        ParseResult result = await ReceiptParseService.parseImage(file);
        if (!result.ok && _looksTransient(result.error)) {
          progress.value = _BatchProgress(
            done: i, total: files.length,
            currentLabel: 'Retrying photo ${i + 1}…',
          );
          result = await ReceiptParseService.parseImage(file);
        }
        if (!result.ok && _looksTransient(result.error)) {
          // One more attempt with a short pause so the network has time to
          // settle if the radio just dropped.
          await Future.delayed(const Duration(seconds: 2));
          result = await ReceiptParseService.parseImage(file);
        }
        if (!result.ok) {
          failed++;
          failures.add('Photo ${i + 1}: ${result.error}');
          continue;
        }
        final parsed = result.data!;
        // Duplicate auto-skip removed (user-requested): see _processSingleCapture.
        // Every picked photo now becomes its own receipt; users clean up
        // real dupes via the /receipts Find duplicates button on web.
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
        final insert = await provider.addParsedReceipt(asMap, file);
        if (insert.id != null) {
          if (insert.merged) {
            merged++;
            mergedIds.add(insert.id!);
          } else {
            saved++;
            savedIds.add(insert.id!);
          }
        } else {
          failed++;
          failures.add('Photo ${i + 1}: ${insert.error ?? "insert failed"}');
        }
      } catch (e) {
        failed++;
        failures.add('Photo ${i + 1}: $e');
      }
      progress.value = _BatchProgress(
        done: i + 1, total: files.length,
        currentLabel: 'Saved ${i + 1} of ${files.length}',
      );
    }

    if (!mounted) return;
    Navigator.of(context, rootNavigator: true).pop(); // dismiss progress dialog
    progress.dispose();

    // Summary
    final summary = StringBuffer();
    summary.write('Saved $saved');
    if (merged > 0) summary.write(', $merged merged into existing');
    if (duplicates.isNotEmpty) summary.write(', ${duplicates.length} duplicate${duplicates.length == 1 ? '' : 's'} skipped');
    if (failed > 0) summary.write(', $failed failed');

    // Show a detail dialog whenever there's anything to call out beyond a
    // clean all-saved batch.
    final needsDialog = duplicates.isNotEmpty || failed > 0;
    if (needsDialog) {
      await _showBatchSummaryDialog(
        title: summary.toString(),
        savedIds: savedIds,
        duplicates: duplicates,
        failures: failures,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(summary.toString()),
        action: saved == 1 && savedIds.isNotEmpty
            ? SnackBarAction(
                label: 'View',
                onPressed: () => context.go('/receipts/${savedIds.first}'),
              )
            : null,
        duration: const Duration(seconds: 4),
      ));
    }
  }

  /// Heuristic: should we retry this parse failure? AI-empty-read and
  /// unsupported-file are NOT transient — retrying buys nothing. Network
  /// blips, timeouts, and 5xx errors usually clear up on a second try.
  bool _looksTransient(String? error) {
    if (error == null) return true;
    final e = error.toLowerCase();
    if (e.contains("couldn't read anything")) return false;
    if (e.contains('unsupported file type')) return false;
    if (e.contains('not signed in')) return false;
    return e.contains('timed out')
        || e.contains('timeout')
        || e.contains('network')
        || e.contains('connection')
        || e.contains('socket')
        || e.contains('server error')
        || e.contains('502')
        || e.contains('503')
        || e.contains('504');
  }

  /// Detailed batch summary — duplicates listed with their parsed
  /// store/date/total + a View link to the existing receipt, failures
  /// listed verbatim.
  Future<void> _showBatchSummaryDialog({
    required String title,
    required List<String> savedIds,
    required List<_DupHit> duplicates,
    required List<String> failures,
  }) async {
    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView(
            shrinkWrap: true,
            children: [
              if (duplicates.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.only(bottom: 6),
                  child: Text('Duplicates skipped',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF92400e))),
                ),
                ...duplicates.map((d) => Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFfef3c7),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFfde68a)),
                  ),
                  child: Row(children: [
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Photo ${d.photoIndex} — ${d.storeName}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF78350f))),
                        Text('${d.date}  ·  \$${d.totalAmount.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF92400e))),
                        if (d.existingId == null)
                          const Text('(also in this batch)',
                            style: TextStyle(fontSize: 10, color: Color(0xFF92400e), fontStyle: FontStyle.italic)),
                      ],
                    )),
                    if (d.existingId != null)
                      TextButton(
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          context.go('/receipts/${d.existingId}');
                        },
                        child: const Text('View'),
                      ),
                  ]),
                )),
                if (failures.isNotEmpty) const SizedBox(height: 12),
              ],
              if (failures.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.only(bottom: 6),
                  child: Text('Failed to read',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF991b1b))),
                ),
                ...failures.map((f) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text(f, style: const TextStyle(fontSize: 12, color: Color(0xFF991b1b))),
                )),
              ],
            ],
          ),
        ),
        actions: [
          if (failures.isNotEmpty)
            TextButton.icon(
              onPressed: () {
                Navigator.of(ctx).pop();
                // Pre-fill the report with the failure list and a structured
                // context payload so we can correlate the report with the
                // debug_log events that were uploaded alongside.
                context.push(
                  '/report-problem',
                  extra: {
                    'subject': 'Batch capture: $title',
                    'description': 'Failures from this batch:\n\n${failures.join("\n")}',
                    'context': {
                      'flow': 'dashboard_batch_capture',
                      'saved_ids': savedIds,
                      'duplicates': duplicates.map((d) => {
                        'photo': d.photoIndex,
                        'store': d.storeName,
                        'date': d.date,
                        'total': d.totalAmount,
                        'existing_id': d.existingId,
                      }).toList(),
                      'failures': failures,
                    },
                  },
                );
              },
              icon: const Icon(Icons.report_problem_outlined, size: 16),
              label: const Text('Report this'),
            ),
          if (savedIds.length == 1)
            TextButton(
              onPressed: () { Navigator.of(ctx).pop(); context.go('/receipts/${savedIds.first}'); },
              child: const Text('View saved'),
            ),
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('OK')),
        ],
      ),
    );
  }

  /// Legacy single-capture path — kept as a fallback for callers that haven't
  /// migrated to batch (currently none, but useful as a reference).
  // ignore: unused_element
  Future<void> _processSingleCapture(File file) async {
    final uid = context.read<AppAuthProvider>().currentUser?.id;
    if (uid == null || !mounted) return;
    final provider = context.read<ReceiptProvider>();
    // See note on the scanner path — hold a wakelock across parse + save.
    await WakelockPlus.enable();
    if (!mounted) { await WakelockPlus.disable(); return; }
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
        // Non-receipt (selfie / cat / blank page) → guacky dialog,
        // not the failure recovery UI (no point offering "Try again"
        // with the same image).
        if (result.nonReceipt) {
          await _showNonReceiptDialog(result.error!, result.tip);
          return;
        }
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
      // Duplicate auto-skip removed (user-requested): the batch flow used
      // to silently drop receipts that matched an existing one, but the
      // matcher's substring fallback caused false positives (e.g. WALMART
      // matching WALMART NEIGHBORHOOD). Every capture now becomes a
      // receipt; users clean up real dupes via the /receipts Find
      // duplicates button on web, which does the strict match.
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
      final insert = await provider.addParsedReceipt(asMap, file);
      if (!mounted) return;
      if (insert.id == null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Insert failed: ${insert.error ?? "unknown reason"}'),
          duration: const Duration(seconds: 5),
        ));
        return;
      }
      final id = insert.id!;
      final storeBit = parsed.storeName.isNotEmpty ? parsed.storeName : 'Receipt';
      final totalBit = parsed.totalAmount > 0 ? ' · \$${parsed.totalAmount.toStringAsFixed(2)}' : '';
      final msg = insert.merged
        ? 'Already had this receipt — merged $storeBit$totalBit into the existing row.'
        : '$storeBit$totalBit — ${parsed.items.length} item${parsed.items.length == 1 ? "" : "s"}';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg),
        action: SnackBarAction(label: 'View', onPressed: () => context.go('/receipts/$id')),
        duration: const Duration(seconds: 4),
      ));
    } catch (e) {
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Capture failed: $e')));
      }
    } finally {
      // Mirror _processScannerResult — wakelock is per-parse, not per-app.
      await WakelockPlus.disable();
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
    final filtered = receipts.where((r) {
      final d = (r.date).toString();
      // Empty-date receipts (parse failures) drop out via the empty
      // string being lexicographically smaller than any real date.
      return d.length >= 10 && d.compareTo(cutoffStr) >= 0;
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

  /// Shown when the ML Kit document scanner fails to start. Most common
  /// cause is the Play Services Doc Scanner module not yet downloaded —
  /// surfaces as a raw NullPointerException because the plugin doesn't
  /// wrap the sync error. We offer a one-tap fallback to the regular
  /// camera so capture still works while the module finishes downloading
  /// in the background.
  ///
  /// Returns true if the user picked the "Use camera" fallback.
  /// Asks the user after each camera shot whether they want to capture
  /// another page of the SAME receipt. Used by the long-receipt
  /// multi-photo flow. Returns true to take another shot, false / null
  /// to finalize the receipt with what we have so far.
  Future<bool?> _confirmAnotherPage(int pagesSoFar) async {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(children: [
          const Icon(Icons.photo_camera_outlined, color: _kEmerald700, size: 22),
          const SizedBox(width: 8),
          Expanded(child: Text('$pagesSoFar page${pagesSoFar == 1 ? '' : 's'} captured')),
        ]),
        content: Text(
          pagesSoFar == 1
            ? 'For a long receipt that doesn\'t fit one frame, take another shot of the next section. Otherwise tap Done to save.'
            : 'Add another page of this receipt, or tap Done to save all $pagesSoFar pages as one receipt.',
          style: const TextStyle(fontSize: 13.5, height: 1.45),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Done'),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF15803d)),
            icon: const Icon(Icons.add_a_photo, size: 16),
            label: const Text('Add another page'),
            onPressed: () => Navigator.of(ctx).pop(true),
          ),
        ],
      ),
    );
  }

  Future<bool?> _showScannerErrorDialog({required bool isModuleNotReady, required String rawError}) async {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(children: [
          GuacMascot(size: 36),
          SizedBox(width: 12),
          Expanded(child: Text('Scanner is warming up')),
        ]),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isModuleNotReady
                  ? "GuacWizard's scanner module is still downloading from Play Services — usually finishes within a minute on Wi-Fi. While you wait, use the camera and we'll parse it the same way."
                  : "GuacWizard couldn't open the scanner. Use the camera instead — we'll parse the photo with the same AI.",
              style: const TextStyle(fontSize: 13.5, height: 1.45),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFf3f4f6),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                rawError.length > 220 ? '${rawError.substring(0, 220)}…' : rawError,
                style: const TextStyle(fontSize: 9.5, color: Color(0xFF6b7280), fontFamily: 'monospace', height: 1.3),
              ),
            ),
          ],
        ),
        actionsPadding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
        actions: [
          TextButton(
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              minimumSize: const Size(0, 32),
            ),
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF15803d),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              minimumSize: const Size(0, 32),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            icon: const Icon(Icons.camera_alt, size: 16),
            label: const Text('Use camera'),
            onPressed: () => Navigator.of(ctx).pop(true),
          ),
        ],
      ),
    );
  }

  /// Shown when the server flagged the upload as "not a receipt" (selfie,
  /// pet, landscape, etc.). GuacWizard-themed dialog with the witty server
  /// message — no retry-with-same-image affordance, since the image isn't
  /// going to magically become a receipt.
  Future<void> _showNonReceiptDialog(String message, String? tip) async {
    if (!mounted) return;
    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(children: [
          GuacMascot(size: 40),
          SizedBox(width: 12),
          Expanded(child: Text('Not a receipt')),
        ]),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message, style: const TextStyle(fontSize: 14, height: 1.45)),
            if (tip != null && tip.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFf0fdf4),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(tip,
                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF065f46), height: 1.4)),
              ),
            ],
          ],
        ),
        actionsPadding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
        actions: [
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF15803d),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              minimumSize: const Size(0, 32),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Got it'),
          ),
        ],
      ),
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
    // Aggregate by SHARED-normalized store name so "COSTCO WHOLESALE",
    // "Costco", "Costco #218", "amazon.com" and "AMAZON.COM, INC." all roll
    // into a single bar. Uses store_name_normalize.dart which mirrors the
    // web normalizer character-for-character so the mobile chart can't
    // disagree with the web /dashboard chart for the same user.
    final byStore = <String, _StoreSpend>{};
    for (final r in filtered) {
      final raw = r.storeName.trim();
      if (raw.isEmpty) continue;
      final key = normalizeStoreName(raw);
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
                  context.go('/receipts?store=${Uri.encodeQueryComponent(store)}');
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

/// Per-store aggregation row for the dashboard's Spending-by-Store chart.
/// Mirrors the web's chartData entries — keep them in sync if the web
/// aggregation logic changes (lib/src/app/(dashboard)/dashboard/DashboardClient.jsx).
class _StoreSpend {
  String name;
  double amount;
  int count;
  _StoreSpend({required this.name, required this.amount, required this.count});
}

/// Top-level pick on the capture entry sheet — scanner (multi-page,
/// auto-cropped, treated as ONE receipt) vs. gallery (multi-pick, each
/// treated as a SEPARATE receipt).
enum _CaptureSource { scanner, camera, gallery }

/// Choice the user makes on the preview screen after a capture.
enum _PreviewAction {
  /// Discard this photo, reopen the camera/gallery picker.
  retry,
  /// Add this photo to the batch, then finish — kick off the AI parse for
  /// all queued photos at once.
  done,
  /// Add this photo to the batch and immediately reopen the picker for the
  /// next one. No parsing happens between shots.
  addAnother,
}

/// Progress snapshot the batch processor publishes to its dialog.
class _BatchProgress {
  final int done;
  final int total;
  final String currentLabel;
  _BatchProgress({required this.done, required this.total, required this.currentLabel});
}

/// A duplicate the batch processor identified — either against the DB
/// (existingId is non-null) or against another photo in the same batch
/// (existingId is null). Surfaced in the batch summary dialog with a View
/// button so the user can jump to the existing receipt.
class _DupHit {
  final int photoIndex;
  final String storeName;
  final String date;
  final double totalAmount;
  final String? existingId;
  _DupHit({
    required this.photoIndex,
    required this.storeName,
    required this.date,
    required this.totalAmount,
    required this.existingId,
  });
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

/// Full-screen preview shown right after a capture. Pure UI — no parsing
/// happens here. The dashboard queues the photo and runs the AI in a single
/// batch once the user is Done. [queued] is how many photos are already in
/// the batch; [maxBatchSize] caps the queue. Once accepting this photo
/// would saturate the batch, the Add-another button is hidden so the user
/// must finish.
class _CapturePreviewScreen extends StatelessWidget {
  final File file;
  final int queued;
  final int maxBatchSize;
  const _CapturePreviewScreen({
    required this.file,
    required this.queued,
    required this.maxBatchSize,
  });

  @override
  Widget build(BuildContext context) {
    // "Done" parses queued + this one = queued + 1 receipts.
    final doneCount = queued + 1;
    // Adding this one + then adding ANOTHER would exceed the cap. So we
    // only show "Add another" while doneCount < maxBatchSize.
    final canAddAnother = doneCount < maxBatchSize;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(queued == 0
            ? 'Preview'
            : 'Preview · ${queued + 1}/$maxBatchSize'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          tooltip: 'Discard this photo',
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
              child: Column(
                children: [
                  if (queued > 0 || !canAddAnother)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        canAddAnother
                            ? '$queued photo${queued == 1 ? '' : 's'} queued. Done parses all $doneCount.'
                            : 'Batch limit ($maxBatchSize). Tap Done to parse all $doneCount.',
                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ),
                  Row(
                    children: [
                      Expanded(child: OutlinedButton.icon(
                        onPressed: () => Navigator.of(context).pop(_PreviewAction.retry),
                        icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
                        label: const Text('Retake',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white54),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      )),
                      if (canAddAnother) ...[
                        const SizedBox(width: 8),
                        Expanded(child: FilledButton.icon(
                          onPressed: () => Navigator.of(context).pop(_PreviewAction.addAnother),
                          icon: const Icon(Icons.add_a_photo, size: 18),
                          label: const Text('Add another',
                            style: TextStyle(fontWeight: FontWeight.w800)),
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF1d4ed8),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        )),
                      ],
                      const SizedBox(width: 8),
                      Expanded(child: FilledButton.icon(
                        onPressed: () => Navigator.of(context).pop(_PreviewAction.done),
                        icon: const Icon(Icons.check, size: 18),
                        label: Text(
                          queued == 0 ? 'Done' : 'Done · $doneCount',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF15803d),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      )),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
