// Wraps Google ML Kit's on-device Document Scanner. Replaces raw
// image_picker for receipts.
//
// What ML Kit gives us for free:
//   - Native scanner camera UI with live edge-detection overlay
//   - Auto-shutter when the user holds steady on a flat document
//   - Perspective correction (de-skew)
//   - Contrast boost so faded thermal-paper receipts read cleanly
//   - Multi-page session ("Add page" button inside the scanner)
//
// Returns a list of File paths — one per scanned page, in order. Long
// receipts produce N>1 pages; short receipts produce N=1. The caller
// sends all pages to /api/parse-receipt as file_1, file_2, … and the
// server bundles them into a single Gemini Vision call.

import 'dart:io';
import 'package:google_mlkit_document_scanner/google_mlkit_document_scanner.dart';
import 'debug_log.dart';

class DocumentScannerService {
  /// Open the ML Kit scanner UI. Returns the captured page files in
  /// capture order, or null if the user cancelled. Throws on platform
  /// errors so the caller can surface a snackbar.
  ///
  /// Common runtime failures we want to capture in the debug log so we
  /// don't have to guess:
  ///   - "MlKitException" with code "UNAVAILABLE" → Play Services Doc
  ///     Scanner module is not installed yet (downloaded on-demand on
  ///     first scan; first launch on a fresh device can fail until that
  ///     finishes).
  ///   - Missing/old Google Play Services entirely → device too old.
  ///   - Permission errors → camera permission denied.
  static Future<List<File>?> scan({int pageLimit = 50}) async {
    DebugLog.event('scanner', 'scan() called', meta: {'pageLimit': pageLimit});
    DocumentScanner? scanner;
    try {
      scanner = DocumentScanner(
        options: DocumentScannerOptions(
          documentFormats: const {DocumentFormat.jpeg},
          mode: ScannerMode.full,
          pageLimit: pageLimit,
          // full mode: includes the contrast-boosted "scanner" filter
          // appearance. filter is also fine; base alone returns the raw
          // photo and we lose the contrast win.
          isGalleryImport: false,
        ),
      );
      DebugLog.event('scanner', 'DocumentScanner ctor ok');
      final result = await scanner.scanDocument();
      // result.images is a nullable list of file paths to the scanned pages.
      final paths = result.images ?? const <String>[];
      DebugLog.event('scanner', 'scanDocument returned', meta: {'pages': paths.length});
      if (paths.isEmpty) return null;
      return paths.map((p) => File(p)).toList();
    } catch (e, st) {
      DebugLog.event('scanner', 'scan threw', level: 'error', meta: {
        'error_type': e.runtimeType.toString(),
        'error': e.toString(),
        // First line of stack tells us whether this is platform-channel,
        // ML Kit availability, permission, or anything else.
        'stack_head': st.toString().split('\n').take(3).join(' | '),
      });
      rethrow;
    } finally {
      try { await scanner?.close(); } catch (_) {}
    }
  }
}
