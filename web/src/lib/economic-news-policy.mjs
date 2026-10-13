// The owner excludes stock/ETF picks, ratings and price targets. Use factual
// releases plus publisher reporting. Source discovery must not exclude ordinary
// savings, benefits, business or consumer news merely because it is syndicated.
const primarySources = new Set(['BLS', 'Federal Reserve', 'CFPB', 'U.S. Treasury', 'New York Fed', 'Yahoo Finance', 'USA TODAY via Yahoo', 'Moneywise via Yahoo', 'MarketWatch', '24/7 Wall St.', 'TheStreet', 'FTC', 'News discovery'])
const discoveryHosts = new Set(['finance.yahoo.com', 'yahoo.com', 'cnbc.com', 'marketwatch.com', 'thestreet.com', '247wallst.com', 'usatoday.com', 'apnews.com', 'reuters.com', 'bbc.com', 'bbc.co.uk', 'theguardian.com', 'npr.org', 'pbs.org', 'cbsnews.com', 'abcnews.com', 'cnn.com', 'investopedia.com', 'moneywise.com', 'consumerreports.org', 'ftc.gov', 'irs.gov', 'ssa.gov', 'fda.gov', 'cpsc.gov', 'nhtsa.gov', 'fsis.usda.gov'])
function trustedDiscovery(item) {
  try { return discoveryHosts.has(new URL(item.publisherUrl).hostname.replace(/^www\./, '')) } catch { return false }
}
export function educationalEconomicItem(item) {
  if (!primarySources.has(item.source) && !trustedDiscovery(item)) return false
  if (/\b(should you buy|which (?:stock|etf|utility dividend)|which will carry|buy or sell|why you should (?:buy|own))\b/i.test(item.title || '')) return false
  if (/\b(buying opportunity|buy ratings?|sell ratings?|upgrades?|downgrades?|outperform ratings?|underperform ratings?)\b/i.test(item.title || '')) return false
  if (/\b(these|top|best|\d+)\s+(?:[\w.-]+\s+){0,4}(stocks|etfs)\b/i.test(item.title || '')) return false
  return !/\b(stocks? to buy|etfs? to buy|buy these|top stock picks?|price targets?|strong buy|stocks? you should|best stocks?|best etfs?|buy now|millionaire.maker|stocks? to sell)\b/i.test(item.title || '')
}
