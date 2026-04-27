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
  const abortRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSuggestedId(null)
    if (!isGroqConfigured() || description.trim().length < 4 || currentCategoryId) return

    if (abortRef.current) clearTimeout(abortRef.current)

    abortRef.current = setTimeout(async () => {
      if (!description.trim() || categories.length === 0) return
      setLoading(true)
      try {
        const catList = categories.map((c) => `${c.name} (${c.main_group})`).join(', ')
        const system = 'You are a financial transaction categorizer. Return ONLY the exact category name from the list that best matches. No explanation, no punctuation — just the category name.'
        const user   = `Transaction: "${description.trim()}"\nAvailable categories: ${catList}`
        const result = await groqChat(system, user, { maxTokens: 20, temperature: 0.1 })
        const matched = categories.find(
          (c) => c.name.toLowerCase() === result.trim().toLowerCase(),
        )
        if (matched) setSuggestedId(matched.id)
      } catch {
        // Silently fail — suggestion is optional
      } finally {
        setLoading(false)
      }
    }, 900)

    return () => { if (abortRef.current) clearTimeout(abortRef.current) }
  }, [description, currentCategoryId, categories.length])

  function dismiss() { setSuggestedId(null) }

  const suggestedCategory = categories.find((c) => c.id === suggestedId) ?? null

  return { suggestedCategory, loading, dismiss }
}
