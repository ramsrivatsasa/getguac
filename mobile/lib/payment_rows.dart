// Statement-row classification helpers — Dart mirror of
// web/src/lib/payment-rows.js. One source of truth for the prefix
// patterns: change them HERE and on the web in lockstep.
//
// Receipts imported from bank statements show up in the receipts
// table in three flavours:
//   1. PAYMENTS — credit-card payoffs / inter-account transfers.
//      NOT spending. Must be filtered out of every "what did you
//      spend" view. Live in /bank (web) only.
//   2. BANK FEES — annual fees, late fees, ATM fees, foreign-txn
//      fees, overdraft fees. ARE spending; category 'bank-fees'.
//   3. BANK INTEREST — purchase interest, cash-advance interest.
//      ARE spending; category 'bank-fees'.
//
// The web dashboard excludes payment rows before computing totalSpend
// + transaction count. Mobile didn't, so the two dashboards disagreed
// on Total Spent / Transactions for the same time window.

import 'models/receipt_model.dart';

final RegExp _paymentPrefix      = RegExp(r'^\[card payment\]', caseSensitive: false);
final RegExp _bankFeePrefix      = RegExp(r'^\[(fee|annual fee|late|atm|foreign|overdraft)', caseSensitive: false);
final RegExp _bankInterestPrefix = RegExp(r'^\[(interest|purchase interest|cash[- ]advance interest)', caseSensitive: false);

/// True when this receipt is a credit-card payment / inter-account
/// transfer — i.e. NOT a spending event. Should be filtered out of
/// every "what did you spend" view.
bool isPaymentReceipt(Receipt r) {
  return _paymentPrefix.hasMatch(r.storeName);
}

/// True when this receipt is a bank fee (annual / late / ATM / foreign
/// / overdraft). Counts as spending but belongs in 'bank-fees'.
bool isBankFeeReceipt(Receipt r) {
  return _bankFeePrefix.hasMatch(r.storeName);
}

/// True when this receipt is a bank-issued interest charge (purchase
/// interest, cash-advance interest, balance-transfer interest). Counts
/// as spending; belongs in 'bank-fees'.
bool isBankInterestReceipt(Receipt r) {
  return _bankInterestPrefix.hasMatch(r.storeName);
}

/// Filter list to exclude payment rows. Sibling of web's
/// `excludePaymentReceipts` so the two dashboards stay in lockstep.
List<Receipt> excludePaymentReceipts(List<Receipt> receipts) {
  return receipts.where((r) => !isPaymentReceipt(r)).toList();
}
