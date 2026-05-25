// CarTrip model — Postgres columns are snake_case, Dart fields camelCase.
class CarTrip {
  final String id;
  final String startDate;
  final String endDate;
  final double totalMiles;
  final String description;
  final String category; // Business or Personal
  final String fromAddress;
  final String toAddress;

  CarTrip({
    required this.id,
    required this.startDate,
    required this.endDate,
    required this.totalMiles,
    this.description = '',
    required this.category,
    this.fromAddress = '',
    this.toAddress = '',
  });

  factory CarTrip.fromMap(String id, Map<String, dynamic> map) => CarTrip(
        id: id,
        startDate: (map['start_date'] ?? '').toString(),
        endDate: (map['end_date'] ?? '').toString(),
        totalMiles: double.tryParse(map['total_miles']?.toString() ?? '0') ?? 0,
        description: map['description'] ?? '',
        category: map['category'] ?? 'Personal',
        fromAddress: map['from_address'] ?? '',
        toAddress: map['to_address'] ?? '',
      );

  Map<String, dynamic> toMap() => {
        'start_date': startDate,
        'end_date': endDate,
        'total_miles': totalMiles,
        'description': description,
        'category': category,
        'from_address': fromAddress,
        'to_address': toAddress,
      };
}
