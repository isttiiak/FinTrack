import * as XLSX from 'xlsx'
import type { Transaction } from '@/types/expense.types'
import type { PersonLedger, LedgerPayment, Person } from '@/types/ledger.types'

export function exportTransactionsExcel(transactions: Transaction[], filename = 'fintrack-expenses') {
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

export function exportFullExcel(
  transactions: Transaction[],
  persons: Person[],
  ledgers: PersonLedger[],
  payments: LedgerPayment[],
  filename = 'fintrack-full-export',
) {
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
    Status:           l.status ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ledgerRows), 'Ledger Entries')

  // Sheet 5: Payments
  const paymentRows = payments.map((p) => ({
    'Ledger ID':      p.ledger_id,
    Amount:           p.amount,
    Date:             p.payment_date,
    'Payment Method': p.payment_method ?? '',
    Account:          p.account ?? '',
    Notes:            p.notes ?? '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows), 'Ledger Payments')

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
