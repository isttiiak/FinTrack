import { PAYMENT_METHOD_GROUPS, BANK_ACCOUNTS } from './constants'

// Persisted per-user customization (visibility + order) of the MFS provider
// list and the shared bank-accounts list. Each stored value is the full
// ordered, *visible* list — an item missing from it is hidden; array order
// is display order. Built-in defaults are just the initial value, not a
// protected subset, so users can reorder, rename, or hide any entry
// (including built-ins) and add their own.
const LS_METHOD_LIST  = 'fintrack_method_list'   // { MFS: string[] }
const LS_ACCOUNT_LIST = 'fintrack_account_list'  // { BankAccounts: string[] }

function readMap(key: string): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') } catch { return {} }
}
function saveMap(key: string, val: Record<string, string[]>) {
  localStorage.setItem(key, JSON.stringify(val))
}

export function getMfsProviders(): string[] {
  const map = readMap(LS_METHOD_LIST)
  return map.MFS ?? [...PAYMENT_METHOD_GROUPS.MFS.methods]
}
export function setMfsProviders(list: string[]) {
  const map = readMap(LS_METHOD_LIST)
  map.MFS = list
  saveMap(LS_METHOD_LIST, map)
}
export function resetMfsProviders() {
  const map = readMap(LS_METHOD_LIST)
  delete map.MFS
  saveMap(LS_METHOD_LIST, map)
}

export function getBankAccounts(): string[] {
  const map = readMap(LS_ACCOUNT_LIST)
  return map.BankAccounts ?? [...BANK_ACCOUNTS]
}
export function setBankAccounts(list: string[]) {
  const map = readMap(LS_ACCOUNT_LIST)
  map.BankAccounts = list
  saveMap(LS_ACCOUNT_LIST, map)
}
export function resetBankAccounts() {
  const map = readMap(LS_ACCOUNT_LIST)
  delete map.BankAccounts
  saveMap(LS_ACCOUNT_LIST, map)
}
