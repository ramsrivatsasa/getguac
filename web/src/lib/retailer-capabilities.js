// Receipt capture and shopping-cart access are separate permissions and must
// never share one generic "connected" badge.
export const RETAILER_CAPABILITIES = {
  amazon:    { receipt: 'account_or_email', shopping: 'product_handoff', label: 'Account import' },
  target:    { receipt: 'email', shopping: 'search_handoff', label: 'Target handoff' },
  walmart:   { receipt: 'account_or_email', shopping: 'search_handoff', label: 'Account import' },
  costco:    { receipt: 'account_or_email', shopping: 'instacart', label: 'Account import' },
  instacart: { receipt: 'account_or_email', shopping: 'partner_ready', label: 'Account import' },
  doordash:  { receipt: 'email', shopping: 'partner_required', label: 'Partner access required' },
  kroger:    { receipt: 'email', shopping: 'partner_required', label: 'Partner access required' },
}

export function retailerCapability(id) {
  return RETAILER_CAPABILITIES[id] || {
    receipt: 'email', shopping: 'search_handoff', label: 'Store handoff',
  }
}
