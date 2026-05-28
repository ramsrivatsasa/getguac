// Tax-summary engine — Dart mirror of web/src/lib/tax-summary.js.
//
// Pure function takes the user's receipts and returns the tax-relevant
// rollups: business spending, charity donations, sales tax paid. Same
// exclusion rules as the rest of the spending stack (payments out,
// returns out, $0 out).
//
// CSV helpers produce the same format as the web export so a user who
// exports on mobile gets a file byte-identical to the web version.

import '../models/receipt_model.dart';
import '../payment_rows.dart';

class TaxSummary {
  final double businessSpent;
  final double businessTax;
  final int businessCount;
  final double charityDonated;
  final int charityCount;
  final double salesTax;
  final int salesTaxCount;
  final double totalSpent;
  final List<Receipt> businessRows;
  final List<Receipt> charityRows;
  const TaxSummary({
    required this.businessSpent,
    required this.businessTax,
    required this.businessCount,
    required this.charityDonated,
    required this.charityCount,
    required this.salesTax,
    required this.salesTaxCount,
    required this.totalSpent,
    required this.businessRows,
    required this.charityRows,
  });
}

TaxSummary computeTaxSummary(List<Receipt> receipts) {
  double businessSpent = 0;
  double businessTax = 0;
  int    businessCount = 0;
  double charityDonated = 0;
  int    charityCount = 0;
  double salesTax = 0;
  int    salesTaxCount = 0;
  double totalSpent = 0;
  final businessRows = <Receipt>[];
  final charityRows  = <Receipt>[];

  for (final r in receipts) {
    if (r.isReturn) continue;
    if (isPaymentReceipt(r)) continue;
    if (r.totalAmount <= 0) continue;

    totalSpent += r.totalAmount;
    final tx = r.taxPaid;
    if (tx > 0) {
      salesTax += tx;
      salesTaxCount += 1;
    }
    if (r.businessPurchase) {
      businessSpent += r.totalAmount;
      businessTax   += tx;
      businessCount += 1;
      businessRows.add(r);
    }
    if ((r.category ?? '') == 'charity') {
      charityDonated += r.totalAmount;
      charityCount   += 1;
      charityRows.add(r);
    }
  }

  return TaxSummary(
    businessSpent: businessSpent,
    businessTax: businessTax,
    businessCount: businessCount,
    charityDonated: charityDonated,
    charityCount: charityCount,
    salesTax: salesTax,
    salesTaxCount: salesTaxCount,
    totalSpent: totalSpent,
    businessRows: businessRows,
    charityRows: charityRows,
  );
}

/// Render an array of receipts as a CSV string suitable for downloading.
/// Header: Date, Store, Category, Amount, Tax, Business, Notes.
/// Format matches the web export.
String taxRowsToCsv(List<Receipt> rows) {
  String esc(String v) => RegExp(r'[",\n]').hasMatch(v)
      ? '"${v.replaceAll('"', '""')}"'
      : v;
  final lines = <String>['Date,Store,Category,Amount,Tax,Business,Notes'];
  for (final r in rows) {
    lines.add([
      esc(r.date),
      esc(r.storeName),
      esc(r.category ?? ''),
      r.totalAmount.toStringAsFixed(2),
      r.taxPaid.toStringAsFixed(2),
      r.businessPurchase ? 'Yes' : 'No',
      // Receipt model doesn't carry validation_comment yet on mobile;
      // export as blank to keep column order stable with the web file.
      '',
    ].join(','));
  }
  return lines.join('\n');
}

class TaxExport {
  final String filename;
  final String body;
  final int count;
  const TaxExport({required this.filename, required this.body, required this.count});
}

/// Convenience: build a CSV file name + body for a year-end taxes pack
/// (business rows + charity rows merged, deduplicated, newest-first).
TaxExport buildTaxExportCsv(TaxSummary summary, {String periodLabel = 'export'}) {
  final merged = <String, Receipt>{};
  for (final r in summary.businessRows) merged[r.id] = r;
  for (final r in summary.charityRows)  merged[r.id] = r;
  final rows = merged.values.toList()
    ..sort((a, b) => b.date.compareTo(a.date));
  final safe = periodLabel.replaceAll(RegExp(r'[^A-Za-z0-9_-]+'), '-');
  return TaxExport(
    filename: 'getguac-tax-$safe.csv',
    body: taxRowsToCsv(rows),
    count: rows.length,
  );
}
