// Receipt + ReceiptItem models. Postgres column names are snake_case — these
// `fromMap` / `toMap` mappings translate to/from the camelCase Dart fields.
class Receipt {
  final String id;
  final String storeName;
  final String date;
  final double totalAmount;
  final double taxPaid;
  final String rewardNo;
  final String receiptLink;
  // Additional page image URLs for multi-page captures. receiptLink is
  // page 1; extraPageUrls is pages 2..N. Empty for single-page receipts.
  final List<String> extraPageUrls;
  final bool businessPurchase;
  final bool processed;
  final String? category;
  final int? rating;
  final bool fromStatement;  // imported from a credit-card statement (no image, no rating)
  final bool isReturn;       // return / refund — no rating, no Worth It widget
  final int itemCount;       // # of receipt_items rows — shown as "N lines" on the list

  Receipt({
    required this.id,
    required this.storeName,
    required this.date,
    required this.totalAmount,
    required this.taxPaid,
    this.rewardNo = '',
    this.receiptLink = '',
    this.extraPageUrls = const [],
    this.businessPurchase = false,
    this.processed = false,
    this.category,
    this.rating,
    this.fromStatement = false,
    this.isReturn = false,
    this.itemCount = 0,
  });

  /// True if rating UI should be hidden: returns, statement imports, and any
  /// transaction with non-positive amount (refund / payment / fee).
  bool get hideRatingUI => fromStatement || isReturn || totalAmount <= 0;

  factory Receipt.fromMap(String id, Map<String, dynamic> map) => Receipt(
        id: id,
        storeName: map['store_name'] ?? '',
        date: (map['date'] ?? '').toString(),
        totalAmount: double.tryParse(map['total_amount']?.toString() ?? '0') ?? 0,
        taxPaid: double.tryParse(map['tax_paid']?.toString() ?? '0') ?? 0,
        rewardNo: map['reward_no'] ?? '',
        receiptLink: map['receipt_link'] ?? '',
        extraPageUrls: () {
          final raw = map['extra_page_urls'];
          if (raw is List) return raw.whereType<String>().toList();
          return const <String>[];
        }(),
        businessPurchase: map['business_purchase'] ?? false,
        processed: map['processed'] ?? false,
        category: map['category'],
        rating: map['rating'],
        fromStatement: map['from_statement'] == true,
        isReturn: map['is_return'] == true,
        // Supabase returns a count aggregate as [{count: N}] or an int depending on version.
        itemCount: () {
          final raw = map['receipt_items'];
          if (raw is List && raw.isNotEmpty && raw.first is Map) {
            return (raw.first['count'] as int?) ?? 0;
          }
          if (raw is int) return raw;
          return 0;
        }(),
      );

  // Build a payload for INSERT/UPDATE against the `receipts` table. Only
  // includes columns the user explicitly set so server defaults still apply.
  Map<String, dynamic> toMap() => {
        'store_name': storeName,
        'date': date,
        'total_amount': totalAmount,
        'tax_paid': taxPaid,
        'reward_no': rewardNo,
        'receipt_link': receiptLink,
        'business_purchase': businessPurchase,
        'processed': processed,
        if (category != null) 'category': category,
        if (rating != null) 'rating': rating,
      };
}

class ReceiptItem {
  final String id;
  final String sku;
  final String itemName;
  final String purchaseDate;
  final int qty;
  final double price;
  final String warrantyInfo;
  final String itemManual;
  final String returnDate;
  final bool returned;
  final String? category;
  final String? model;
  final int? rating;

  ReceiptItem({
    required this.id,
    this.sku = '',
    required this.itemName,
    this.purchaseDate = '',
    this.qty = 1,
    this.price = 0,
    this.warrantyInfo = '',
    this.itemManual = '',
    this.returnDate = '',
    this.returned = false,
    this.category,
    this.model,
    this.rating,
  });

  factory ReceiptItem.fromMap(String id, Map<String, dynamic> map) => ReceiptItem(
        id: id,
        sku: map['sku'] ?? '',
        itemName: map['item_name'] ?? '',
        purchaseDate: (map['purchase_date'] ?? '').toString(),
        qty: (map['qty'] is int) ? map['qty'] : int.tryParse(map['qty']?.toString() ?? '1') ?? 1,
        price: double.tryParse(map['price']?.toString() ?? '0') ?? 0,
        warrantyInfo: map['warranty_info'] ?? '',
        itemManual: map['item_manual'] ?? '',
        returnDate: (map['return_date'] ?? '').toString(),
        returned: map['returned'] ?? false,
        category: map['category'],
        model: map['model'],
        rating: map['rating'] is int ? map['rating'] : null,
      );

  Map<String, dynamic> toMap() => {
        'sku': sku,
        'item_name': itemName,
        if (purchaseDate.isNotEmpty) 'purchase_date': purchaseDate,
        'qty': qty,
        'price': price,
        if (warrantyInfo.isNotEmpty) 'warranty_info': warrantyInfo,
        if (itemManual.isNotEmpty) 'item_manual': itemManual,
        if (returnDate.isNotEmpty) 'return_date': returnDate,
        'returned': returned,
        if (category != null) 'category': category,
        if (model != null) 'model': model,
      };
}
