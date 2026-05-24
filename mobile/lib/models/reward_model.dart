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
    rewardNo: map['rewardNo'] ?? '',
    expiryDate: map['expiryDate'] ?? '',
    rewardType: map['rewardType'] ?? '',
    rewardTitle: map['rewardTitle'] ?? '',
    description: map['description'] ?? '',
    storeName: map['storeName'] ?? '',
  );

  Map<String, dynamic> toMap() => {
    'rewardNo': rewardNo,
    'expiryDate': expiryDate,
    'rewardType': rewardType,
    'rewardTitle': rewardTitle,
    'description': description,
    'storeName': storeName,
  };

  bool get isExpired => expiryDate.compareTo(DateTime.now().toIso8601String().substring(0, 10)) < 0;
}
