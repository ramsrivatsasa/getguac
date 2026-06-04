// Voice → receipt capture (mobile).
//
// Records a transcript via the `speech_to_text` plugin and POSTs it to
// /api/receipts/from-voice for parsing. Mirrors the web flow:
// SpeechRecognition records → server uses Gemini to fill the receipt
// schema → caller pops a review dialog before saving.
//
// Speech recognition accuracy varies a lot by accent / noise / mumbled
// brand names. Always surface a review-and-edit step before insert.
//
// Graceful degradation:
//   * If `speech_to_text` isn't pluggable (older OS, missing perms, or
//     a future Kotlin/AGP bump like sentry_flutter that breaks compile)
//     this whole file should compile but every `start()` call returns
//     a [VoiceCaptureResult.unavailable] result, and the caller shows a
//     "Not supported on this device" message + TODO.
//   * If transcript comes back empty (user opened the mic but never
//     spoke / mic muted), we return [VoiceCaptureResult.empty].

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:supabase_flutter/supabase_flutter.dart';

import 'receipt_parse_service.dart';
import 'debug_log.dart';

const _kApiBase = 'https://getguac.app';

class VoiceParseResult {
  final ParsedReceipt? data;
  final String? error;
  final String? transcript;
  final bool unavailable;
  const VoiceParseResult.ok(this.data, this.transcript)
      : error = null, unavailable = false;
  const VoiceParseResult.fail(this.error, {this.transcript})
      : data = null, unavailable = false;
  const VoiceParseResult.unavailable(this.error)
      : data = null, transcript = null, unavailable = true;
  bool get ok => error == null && data != null;
}

/// Singleton-ish wrapper around the platform speech recognizer. Holds the
/// SpeechToText instance so consecutive listens reuse the same engine
/// session (cheaper, and the OS mic indicator doesn't flicker).
class VoiceCaptureService {
  static final VoiceCaptureService _instance = VoiceCaptureService._();
  factory VoiceCaptureService() => _instance;
  VoiceCaptureService._();

  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _initialized = false;
  bool _available = false;

  /// True when the device exposes a working recognizer AND the user has
  /// (or is about to be asked for) mic + speech permissions. Cached after
  /// the first call so the modal can render the support state immediately.
  Future<bool> isAvailable() async {
    if (_initialized) return _available;
    try {
      _available = await _speech.initialize(
        onError: (e) => DebugLog.event('voice-capture',
          'recognizer error',
          level: 'warn',
          meta: {'error': e.errorMsg, 'permanent': e.permanent},
        ),
        onStatus: (s) => DebugLog.event('voice-capture', 'status $s'),
      );
    } catch (e) {
      _available = false;
      DebugLog.event('voice-capture', 'init failed',
        level: 'error', meta: {'error': e.toString()});
    }
    _initialized = true;
    return _available;
  }

  /// Listening status — UI binds the mic-pulse animation to this.
  bool get isListening => _speech.isListening;

  /// Start a single-utterance listen. [onPartial] fires with the running
  /// transcript so the UI can show interim text. Resolves when the user
  /// stops (or the recognizer auto-ends after silence). Returns the final
  /// transcript, or null when nothing was captured.
  Future<String?> listenOnce({
    required void Function(String partial) onPartial,
    Duration listenFor = const Duration(seconds: 25),
    Duration pauseFor = const Duration(seconds: 4),
  }) async {
    if (!await isAvailable()) return null;
    final completer = Completer<String?>();
    String last = '';
    try {
      await _speech.listen(
        onResult: (r) {
          last = r.recognizedWords;
          onPartial(last);
          if (r.finalResult && !completer.isCompleted) {
            completer.complete(last.trim().isEmpty ? null : last.trim());
          }
        },
        listenOptions: stt.SpeechListenOptions(
          listenFor: listenFor,
          pauseFor: pauseFor,
          partialResults: true,
          cancelOnError: true,
          listenMode: stt.ListenMode.dictation,
        ),
      );
    } catch (e) {
      DebugLog.event('voice-capture', 'listen threw',
        level: 'error', meta: {'error': e.toString()});
      if (!completer.isCompleted) completer.complete(null);
    }
    // Belt-and-suspenders: if onResult never fires final=true within the
    // listen window, resolve with whatever we have so the UI doesn't hang.
    Timer(listenFor + const Duration(seconds: 1), () {
      if (!completer.isCompleted) {
        completer.complete(last.trim().isEmpty ? null : last.trim());
      }
    });
    return completer.future;
  }

  Future<void> stop() async {
    try { await _speech.stop(); } catch (_) {}
  }

  Future<void> cancel() async {
    try { await _speech.cancel(); } catch (_) {}
  }

  /// Send [transcript] to /api/receipts/from-voice. Returns a parsed receipt
  /// the caller can hand to the review dialog.
  static Future<VoiceParseResult> parseTranscript(String transcript) async {
    final t = transcript.trim();
    if (t.isEmpty) return const VoiceParseResult.fail("Didn't catch anything — try again.");

    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      DebugLog.event('voice-capture', 'no session', level: 'warn');
      return const VoiceParseResult.fail('Not signed in.');
    }
    DebugLog.event('voice-capture', 'POST /api/receipts/from-voice', meta: {
      'chars': t.length,
    });
    try {
      final res = await http.post(
        Uri.parse('$_kApiBase/api/receipts/from-voice'),
        headers: {
          'Authorization': 'Bearer ${session.accessToken}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'transcript': t}),
      ).timeout(const Duration(seconds: 30));
      Map<String, dynamic>? m;
      try { m = jsonDecode(res.body) as Map<String, dynamic>; } catch (_) {}
      if (res.statusCode != 200) {
        final reason = (m?['error'] ?? 'Server error ${res.statusCode}').toString();
        DebugLog.event('voice-capture', 'http $reason',
          level: 'error', meta: {'status': res.statusCode});
        return VoiceParseResult.fail(reason, transcript: t);
      }
      if (m == null) {
        return const VoiceParseResult.fail('Server returned non-JSON.');
      }
      final parsed = ParsedReceipt.fromMap(m);
      final hasAnything = parsed.storeName.isNotEmpty
          || parsed.totalAmount > 0
          || parsed.items.isNotEmpty;
      if (!hasAnything) {
        return VoiceParseResult.fail(
          "Guac-AI couldn't pull anything out of that. Try again with a clearer phrase.",
          transcript: t,
        );
      }
      DebugLog.event('voice-capture', 'ok', meta: {
        'store': parsed.storeName,
        'total': parsed.totalAmount,
        'items': parsed.items.length,
      });
      return VoiceParseResult.ok(parsed, t);
    } on http.ClientException catch (e) {
      DebugLog.event('voice-capture', 'ClientException',
        level: 'error', meta: {'message': e.message});
      return VoiceParseResult.fail('Network error: ${e.message}', transcript: t);
    } catch (e) {
      DebugLog.event('voice-capture', 'exception',
        level: 'error', meta: {'error': e.toString()});
      if (kDebugMode) debugPrint('voice-capture exception: $e');
      return VoiceParseResult.fail('Voice parse failed: $e', transcript: t);
    }
  }
}
