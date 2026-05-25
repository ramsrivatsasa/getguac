// Reward model — Postgres columns are snake_case, Dart fields camelCase.
class Reward {
  final String id;
  final String rewardNo;
  final String expiryDate;
  final String rewardType;
  final String rewardTitle;
  final String description;
  final String storeName;

  Reward({
    required this.id,
    required this.rewardNo,
    required this.expiryDate,
    required this.rewardType,
    required this.rewardTitle,
    this.description = '',
    required this.storeName,
  });

  factory Reward.fromMap(String id, Map<String, dynamic> map) => Reward(
        id: id,
        rewardNo: map['reward_no'] ?? '',
        expiryDate: (map['expiry_date'] ?? '').toString(),
        rewardType: map['reward_type'] ?? '',
        rewardTitle: map['reward_title'] ?? '',
        description: map['description'] ?? '',
        storeName: map['store_name'] ?? '',
      );

  Map<String, dynamic> toMap() => {
        'reward_no': rewardNo,
        'expiry_date': expiryDate,
        'reward_type': rewardType,
        'reward_title': rewardTitle,
        'description': description,
        'store_name': storeName,
      };

  bool get isExpired => expiryDate.compareTo(DateTime.now().toIso8601String().substring(0, 10)) < 0;
}
