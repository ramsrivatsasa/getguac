class Receipt {
  final String id;
  final String storeName;
  final String date;
  final double totalAmount;
  final double taxPaid;
  final String rewardNo;
  final String receiptLink;
  final bool businessPurchase;
  final bool processed;

  Receipt({
    required this.id,
    required this.storeName,
    required this.date,
    required this.totalAmount,
    required this.taxPaid,
    this.rewardNo = '',
    this.receiptLink = '',
    this.businessPurchase = false,
    this.processed = false,
  });

  factory Receipt.fromMap(String id, Map<String, dynamic> map) => Receipt(
    id: id,
    storeName: map['storeName'] ?? '',
    date: map['date'] ?? '',
    totalAmount: double.tryParse(map['totalAmount']?.toString() ?? '0') ?? 0,
    taxPaid: double.tryParse(map['taxPaid']?.toString() ?? '0') ?? 0,
    rewardNo: map['rewardNo'] ?? '',
    receiptLink: map['receiptLink'] ?? '',
    businessPurchase: map['businessPurchase'] ?? false,
    processed: map['processed'] ?? false,
  );

  Map<String, dynamic> toMap() => {
    'storeName': storeName,
    'date': date,
    'totalAmount': totalAmount,
    'taxPaid': taxPaid,
    'rewardNo': rewardNo,
    'receiptLink': receiptLink,
    'businessPurchase': businessPurchase,
    'processed': processed,
  };
}

class ReceiptItem {
  final String id;
  final String sku;
  final String itemName;
  final String purchaseDate;
  final int qty;
  final double price;
  final String storeNameId;
  final String warrantyInfo;
  final String itemManual;
  final String returnDate;
  final bool returned;

  ReceiptItem({
    required this.id,
    this.sku = '',
    required this.itemName,
    this.purchaseDate = '',
    this.qty = 1,
    this.price = 0,
    this.storeNameId = '',
    this.warrantyInfo = '',
    this.itemManual = '',
    this.returnDate = '',
    this.returned = false,
  });

  factory ReceiptItem.fromMap(String id, Map<String, dynamic> map) => ReceiptItem(
    id: id,
    sku: map['sku'] ?? '',
    itemName: map['itemName'] ?? '',
    purchaseDate: map['purchaseDate'] ?? '',
    qty: map['qty'] ?? 1,
    price: double.tryParse(map['price']?.toString() ?? '0') ?? 0,
    storeNameId: map['storeNameId'] ?? '',
    warrantyInfo: map['warrantyInfo'] ?? '',
    itemManual: map['itemManual'] ?? '',
    returnDate: map['returnDate'] ?? '',
    returned: map['returned'] ?? false,
  );

  Map<String, dynamic> toMap() => {
    'sku': sku, 'itemName': itemName, 'purchaseDate': purchaseDate,
    'qty': qty, 'price': price, 'storeNameId': storeNameId,
    'warrantyInfo': warrantyInfo, 'itemManual': itemManual,
    'returnDate': returnDate, 'returned': returned,
  };
}
