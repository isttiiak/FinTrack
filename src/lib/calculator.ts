// Safe arithmetic expression evaluator — hand-rolled tokenizer + recursive-descent
// parser. Deliberately no eval()/new Function(): this is a financial app, so
// arbitrary code execution is avoided even though input is always local.
//
// Grammar (precedence low → high):
//   expression := term (('+'|'-') term)*
//   term       := unary (('*'|'/') unary)*
//   unary      := ('-'|'+')? postfix
//   postfix    := primary ('%')?
//   primary    := NUMBER | '(' expression ')'
//
// '%' is context-aware, calculator-app style: a bare "N%" immediately after
// a '+' or '-' means "N% of the running total so far" (1000+15% = 1150), not
// "N/100" (which would give 1000.15 — surprising in a money field). Every
// other position ('%' after '*'/'/', standalone, or buried inside parens)
// still means plain N/100, matching a real calculator. See TODO.md §3.10.

export type CalcResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'div-by-zero' }

const MAX_INPUT_LENGTH = 64

type Token =
  | { type: 'num'; value: number }
  | { type: '+' | '-' | '*' | '/' | '%' | '(' | ')' }

class ParseError extends Error {}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (ch === ' ' || ch === '\t') { i++; continue }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '(' || ch === ')') {
      tokens.push({ type: ch })
      i++
      continue
    }
    // '×' / '÷' are the operator-chip glyphs — accept them as aliases for */÷
    if (ch === '×') { tokens.push({ type: '*' }); i++; continue }
    if (ch === '÷') { tokens.push({ type: '/' }); i++; continue }
    if (/[0-9.]/.test(ch)) {
      const match = /^\d+(\.\d+)?|^\.\d+/.exec(input.slice(i))
      if (!match) throw new ParseError('bad number')
      tokens.push({ type: 'num', value: Number(match[0]) })
      i += match[0].length
      continue
    }
    throw new ParseError(`unexpected character: ${ch}`)
  }
  return tokens
}

// A term's value, plus whether it's a bare "N%" — i.e. nothing but a
// (possibly negated) percentage literal, with no '*'/'/' applied to it.
// Only that shape triggers the "percent of the running total" rule in
// expression() — 1000+10*2% still means 1000 + (10*0.02), same as any
// ordinary calculator.
interface TermResult { value: number; isBarePercent: boolean }

class Parser {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private next(): Token {
    const t = this.tokens[this.pos]
    if (!t) throw new ParseError('unexpected end of input')
    this.pos++
    return t
  }

  parse(): number {
    const value = this.expression()
    if (this.pos !== this.tokens.length) throw new ParseError('trailing tokens')
    return value
  }

  private expression(): number {
    let value = this.term().value
    while (this.peek()?.type === '+' || this.peek()?.type === '-') {
      const op = this.next().type
      const rhs = this.term()
      if (rhs.isBarePercent) {
        value = op === '+' ? value + value * rhs.value : value - value * rhs.value
      } else {
        value = op === '+' ? value + rhs.value : value - rhs.value
      }
    }
    return value
  }

  private term(): TermResult {
    let result = this.unary()
    while (this.peek()?.type === '*' || this.peek()?.type === '/') {
      const op = this.next().type
      const rhs = this.unary()
      if (op === '/') {
        if (rhs.value === 0) throw new DivByZeroError()
        result = { value: result.value / rhs.value, isBarePercent: false }
      } else {
        result = { value: result.value * rhs.value, isBarePercent: false }
      }
    }
    return result
  }

  private unary(): TermResult {
    if (this.peek()?.type === '-') { this.next(); const r = this.postfix(); return { value: -r.value, isBarePercent: r.isBarePercent } }
    if (this.peek()?.type === '+') { this.next(); return this.postfix() }
    return this.postfix()
  }

  private postfix(): TermResult {
    let value = this.primary()
    let isBarePercent = false
    while (this.peek()?.type === '%') {
      this.next()
      value = value / 100
      isBarePercent = true
    }
    return { value, isBarePercent }
  }

  private primary(): number {
    const t = this.next()
    if (t.type === 'num') return t.value
    if (t.type === '(') {
      const value = this.expression()
      const closing = this.next()
      if (closing.type !== ')') throw new ParseError('expected )')
      return value
    }
    throw new ParseError('expected number or (')
  }
}

class DivByZeroError extends Error {}

/** True if the raw input contains a binary/postfix operator (used to decide whether to show a live preview). */
export function hasOperator(input: string): boolean {
  return /[+\-*/%×÷]/.test(input)
}

export function evaluate(input: string): CalcResult {
  const trimmed = input.trim()
  if (trimmed.length === 0) return { ok: false, reason: 'empty' }
  if (trimmed.length > MAX_INPUT_LENGTH) return { ok: false, reason: 'invalid' }

  try {
    const tokens = tokenize(trimmed)
    if (tokens.length === 0) return { ok: false, reason: 'empty' }
    const value = new Parser(tokens).parse()
    if (!Number.isFinite(value)) return { ok: false, reason: 'invalid' }
    return { ok: true, value }
  } catch (err) {
    if (err instanceof DivByZeroError) return { ok: false, reason: 'div-by-zero' }
    return { ok: false, reason: 'invalid' }
  }
}
