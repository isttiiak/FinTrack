import { useState, useEffect, useRef } from 'react'
import { groqChat, isGroqConfigured } from '@/lib/groq'
import type { Category } from '@/types/expense.types'

export function useAICategorySuggest(
  description: string,
  categories: Category[],
  currentCategoryId: string,
) {
  const [suggestedId, setSuggestedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Monotonic token identifying the "current" request. Bumped in the cleanup
  // below so a superseded (fast retyping) or post-unmount response can tell
  // it's stale and skip touching state — groqChat() has no cancellable
  // signal to actually abort the in-flight fetch, so this discards the
  // result instead. See TODO.md §3.8.
  const requestIdRef = useRef(0)

  useEffect(() => {
    setSuggestedId(null)
    if (!isGroqConfigured() || description.trim().length < 4 || currentCategoryId) return

    if (timerRef.current) clearTimeout(timerRef.current)

    const requestId = ++requestIdRef.current

    timerRef.current = setTimeout(async () => {
      if (!description.trim() || categories.length === 0) return
      setLoading(true)
      try {
        const catList = categories.map((c) => `${c.name} (${c.main_group})`).join(', ')
        const system = 'You are a financial transaction categorizer. Return ONLY the exact category name from the list that best matches. No explanation, no punctuation — just the category name.'
        const user   = `Transaction: "${description.trim()}"\nAvailable categories: ${catList}`
        const result = await groqChat(system, user, { maxTokens: 20, temperature: 0.1 })
        if (requestId !== requestIdRef.current) return // superseded or unmounted
        const matched = categories.find(
          (c) => c.name.toLowerCase() === result.trim().toLowerCase(),
        )
        if (matched) setSuggestedId(matched.id)
      } catch {
        // Silently fail — suggestion is optional
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    }, 900)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      // Intentional: always bump whatever the ref currently holds, not a
      // value captured at effect-start — this is a plain counter, not a
      // DOM ref, so the "stale ref in cleanup" warning doesn't apply.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestIdRef.current++
    }
    // `categories` (not `.length`) so renaming a category without changing
    // the count doesn't leave this effect reading a stale list. See TODO.md §3.8.
  }, [description, currentCategoryId, categories])

  function dismiss() { setSuggestedId(null) }

  const suggestedCategory = categories.find((c) => c.id === suggestedId) ?? null

  return { suggestedCategory, loading, dismiss }
}
