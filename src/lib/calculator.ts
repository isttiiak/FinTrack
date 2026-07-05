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
    let value = this.term()
    while (this.peek()?.type === '+' || this.peek()?.type === '-') {
      const op = this.next().type
      const rhs = this.term()
      value = op === '+' ? value + rhs : value - rhs
    }
    return value
  }

  private term(): number {
    let value = this.unary()
    while (this.peek()?.type === '*' || this.peek()?.type === '/') {
      const op = this.next().type
      const rhs = this.unary()
      if (op === '/') {
        if (rhs === 0) throw new DivByZeroError()
        value = value / rhs
      } else {
        value = value * rhs
      }
    }
    return value
  }

  private unary(): number {
    if (this.peek()?.type === '-') { this.next(); return -this.postfix() }
    if (this.peek()?.type === '+') { this.next(); return this.postfix() }
    return this.postfix()
  }

  private postfix(): number {
    let value = this.primary()
    while (this.peek()?.type === '%') {
      this.next()
      value = value / 100
    }
    return value
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
