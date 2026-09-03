import type { Transaction } from '@/types/expense.types'
import type { PersonLedger, LedgerPayment, Person } from '@/types/ledger.types'
import type { Investment } from '@/types/investment.types'

// xlsx (~400 KB) is dynamically imported inside each function that needs it,
// not at module scope — this file is imported from SettingsPage, so a
// top-level `import * as XLSX` would pull the whole library into the
// initial bundle even for users who never click an Excel export button.
// See TODO.md §4.1.
export async function exportTransactionsExcel(transactions: Transaction[], filename = 'fintrack-expenses') {
  const XLSX = await import('xlsx')
  const rows = transactions.map((t) => ({
    Date:           t.txn_date,
    Type:           t.type,
    Category:       t.category?.name ?? '',
    'Main Group':   t.category?.main_group ?? '',
    Amount:         t.amount,
    Description:    t.description ?? '',
    'Payment Method': t.payment_method ?? '',
    Account:        t.account ?? '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportTransactionsCSV(transactions: Transaction[], filename = 'fintrack-expenses') {
  const headers = ['Date', 'Type', 'Category', 'Main Group', 'Amount', 'Description', 'Payment Method', 'Account']
  const rows = transactions.map((t) => [
    t.txn_date, t.type,
    t.category?.name ?? '', t.category?.main_group ?? '',
    t.amount, t.description ?? '',
    t.payment_method ?? '', t.account ?? '',
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  downloadText(csv, `${filename}.csv`, 'text/csv')
}

export async function exportFullExcel(
  transactions: Transaction[],
  persons: Person[],
  ledgers: PersonLedger[],
  payments: LedgerPayment[],
  investments: Investment[],
  filename = 'fintrack-full-export',
) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Sheet 1: Transactions
  const txnRows = transactions.map((t) => ({
    Date:             t.txn_date,
    Type:             t.type,
    Category:         t.category?.name ?? '',
    'Main Group':     t.category?.main_group ?? '',
    Amount:           t.amount,
    Description:      t.description ?? '',
    'Payment Method': t.payment_method ?? '',
    Account:          t.account ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txnRows), 'Transactions')

  // Sheet 2: Monthly Summary
  const byMonth: Record<string, { income: number; expense: number }> = {}
  for (const t of transactions) {
    const m = t.txn_date.slice(0, 7)
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 }
    if (t.type === 'Income') byMonth[m].income += t.amount
    else byMonth[m].expense += t.amount
  }
  const monthRows = Object.entries(byMonth)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, v]) => ({ Month: month, Income: v.income, Expense: v.expense, Net: v.income - v.expense }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthRows), 'Monthly Summary')

  // Sheet 3: Persons
  const personRows = persons.map((p) => ({ Name: p.name, Relationship: p.relationship ?? '', Phone: p.phone ?? '' }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(personRows), 'Persons')

  // Sheet 4: Ledger Entries
  const ledgerRows = ledgers.map((l) => ({
    Person:           l.person?.name ?? '',
    Type:             l.ledger_type,
    Amount:           l.total_amount,
    'Start Date':     l.start_date,
    Reason:           l.reason ?? '',
    'Payment Method': l.payment_method ?? '',
    Account:          l.account ?? '',
    'Settled Date':   l.settled_date ?? '',
    Notes:            l.notes ?? '',
    'Doc Link':       l.doc_link ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ledgerRows), 'Ledger Entries')

  // Sheet 5: Payments — payments attach to (person, type), not one entry
  const personById = new Map(persons.map((p) => [p.id, p.name]))
  const paymentRows = payments.map((p) => ({
    Person:           personById.get(p.person_id) ?? '',
    Type:             p.ledger_type,
    Amount:           p.amount,
    Date:             p.payment_date,
    'Payment Method': p.payment_method ?? '',
    Account:          p.account ?? '',
    Notes:            p.notes ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), 'Ledger Payments')

  // Sheet 6: Investments
  const investmentRows = investments.map((inv) => ({
    Name:               inv.name,
    Category:           inv.category ?? '',
    Company:            inv.company_name ?? '',
    'Committed Amount': inv.committed_amount ?? '',
    'Start Date':       inv.start_date ?? '',
    'End Date':         inv.end_date ?? '',
    'Market Value':     inv.market_value ?? '',
    'Total Returned':   inv.total_returned ?? 0,
    'Total Paid':       inv.total_paid ?? 0,
    'ROI %':            inv.roi_percent ?? '',
    'Profit/Loss':      inv.profit_loss ?? '',
    'Doc Link':         inv.doc_link ?? '',
    Notes:              inv.notes ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(investmentRows), 'Investments')

  // Sheet 7: Investment Returns
  const investmentById = new Map(investments.map((inv) => [inv.id, inv.name]))
  const returnRows = investments.flatMap((inv) => inv.returns ?? []).map((r) => ({
    Investment:       investmentById.get(r.investment_id) ?? '',
    Amount:           r.amount,
    Date:             r.return_date,
    Type:             r.return_type ?? '',
    'Payment Method': r.payment_method ?? '',
    Account:          r.account ?? '',
    Notes:            r.notes ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returnRows), 'Investment Returns')

  // Sheet 8: Investment Payments (installments toward committed_amount)
  const investmentPaymentRows = investments.flatMap((inv) => inv.payments ?? []).map((p) => ({
    Investment:       investmentById.get(p.investment_id) ?? '',
    Amount:           p.amount,
    Date:             p.payment_date,
    'Payment Method': p.payment_method ?? '',
    Account:          p.account ?? '',
    Notes:            p.notes ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(investmentPaymentRows), 'Investment Payments')

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
