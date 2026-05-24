class CarTrip {
  final String id;
  final String startDate;
  final String endDate;
  final double totalMiles;
  final String description;
  final String category; // Business or Personal

  CarTrip({
    required this.id,
    required this.startDate,
    required this.endDate,
    required this.totalMiles,
    this.description = '',
    required this.category,
  });

  factory CarTrip.fromMap(String id, Map<String, dynamic> map) => CarTrip(
    id: id,
    startDate: map['startDate'] ?? '',
    endDate: map['endDate'] ?? '',
    totalMiles: double.tryParse(map['totalMiles']?.toString() ?? '0') ?? 0,
    description: map['description'] ?? '',
    category: map['category'] ?? 'Personal',
  );

  Map<String, dynamic> toMap() => {
    'startDate': startDate,
    'endDate': endDate,
    'totalMiles': totalMiles,
    'description': description,
    'category': category,
  };
}
