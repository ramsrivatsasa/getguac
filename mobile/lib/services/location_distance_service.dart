// LocationDistanceService — used by the Maps share-intent flow.
// Captures the user's current GPS, reverse-geocodes it into a "from"
// address, then asks /api/distance for an approximate driving-mile count
// to the shared destination.
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

const _kApiBase = 'https://getguac.app';

class TripEstimate {
  final String fromAddress;
  final double miles;
  final double straightLineMiles;
  TripEstimate({required this.fromAddress, required this.miles, required this.straightLineMiles});
}

class LocationDistanceService {
  /// Request permission + return the device's current position, or null
  /// if denied / unavailable. Never throws — failure is the empty case.
  static Future<Position?> currentPosition() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        return null;
      }
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 10),
      );
    } catch (_) {
      return null;
    }
  }

  /// Reverse-geocode coords into a human-readable address via our web proxy
  /// (which calls OpenStreetMap Nominatim with the right User-Agent + rate limits).
  static Future<String?> reverseGeocode(double lat, double lng) async {
    try {
      final res = await http.get(
        Uri.parse('$_kApiBase/api/distance?lat=$lat&lng=$lng'),
      ).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return (body['address'] as String?)?.trim();
    } catch (_) {
      return null;
    }
  }

  /// Calls /api/distance to compute approx driving miles between coords and
  /// the shared destination string. Returns null on any failure.
  static Future<TripEstimate?> estimate({
    required double fromLat,
    required double fromLng,
    required String fromLabel,
    required String to,
  }) async {
    try {
      final res = await http
          .post(
            Uri.parse('$_kApiBase/api/distance'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'fromCoords': {'lat': fromLat, 'lng': fromLng},
              'from': fromLabel,
              'to': to,
            }),
          )
          .timeout(const Duration(seconds: 12));
      if (res.statusCode != 200) return null;
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final miles = (body['miles'] as num?)?.toDouble();
      final straight = (body['straight_line_miles'] as num?)?.toDouble() ?? 0;
      if (miles == null) return null;
      return TripEstimate(
        fromAddress: fromLabel,
        miles: miles,
        straightLineMiles: straight,
      );
    } catch (_) {
      return null;
    }
  }
}
