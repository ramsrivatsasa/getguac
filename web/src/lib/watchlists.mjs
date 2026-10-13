import { validSymbol } from './market-data.mjs'
export function readWatchlists(metadata = {}) {
  const lists = Array.isArray(metadata.guac_watchlists) ? metadata.guac_watchlists.map(list => ({ id: list.id, name: list.name, symbols: [...new Set((list.symbols || []).filter(validSymbol))] })) : []
  if (!Array.isArray(metadata.guac_watchlists) && metadata.guac_watchlist?.length) lists.push({ id: 'default', name: 'My watchlist', symbols: [...new Set(metadata.guac_watchlist.filter(validSymbol))] })
  const activeId = lists.some(list => list.id === metadata.guac_active_watchlist) ? metadata.guac_active_watchlist : lists[0]?.id || null
  return { lists, activeId, symbols: lists.find(list => list.id === activeId)?.symbols || [] }
}
export function changeWatchlists(state, body, newId) {
  const lists = state.lists.map(list => ({ ...list, symbols: [...list.symbols] }))
  let activeId = state.activeId
  const action = body?.action || 'symbols'
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const checkName = except => {
    if (!name || name.length > 40) throw new Error('Use a watchlist name between 1 and 40 characters.')
    if (lists.some(list => list.id !== except && list.name.toLowerCase() === name.toLowerCase())) throw new Error('A watchlist with that name already exists.')
  }
  const checkSymbols = symbols => {
    if (!Array.isArray(symbols) || symbols.length > 50 || symbols.some(s => !validSymbol(s))) throw new Error('Choose up to 50 valid symbols.')
    return [...new Set(symbols)]
  }
  if (action === 'create') {
    checkName()
    if (lists.length >= 20) throw new Error('You can create up to 20 watchlists.')
    lists.push({ id: newId, name, symbols: checkSymbols(body.symbols || []) }); activeId = newId
  } else {
    const id = body?.listId || activeId
    let list = lists.find(list => list.id === id)
    if (!list && action === 'symbols' && !id && lists.length === 0) {
      list = { id: newId, name: 'My watchlist', symbols: [] }; lists.push(list); activeId = newId
    }
    if (!list) throw new Error('Watchlist not found. Refresh and choose a list.')
    if (action === 'symbols') list.symbols = checkSymbols(body?.symbols)
    else if (action === 'add-symbol') {
      const symbol = typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() : ''
      if (!validSymbol(symbol)) throw new Error('Enter a stock or ETF symbol, such as AAPL or SPY.')
      list.symbols = checkSymbols([...new Set([...list.symbols, symbol])])
    }
    else if (action === 'rename') { checkName(list.id); list.name = name }
    else if (action === 'select') activeId = list.id
    else if (action === 'delete') { lists.splice(lists.indexOf(list), 1); if (activeId === list.id) activeId = lists[0]?.id || null }
    else throw new Error('Invalid watchlist action.')
  }
  return { lists, activeId, symbols: lists.find(list => list.id === activeId)?.symbols || [] }
}
