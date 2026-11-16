import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import type { Category } from '@/types/expense.types'
import type { TxnType } from '@/lib/constants'

export function useCategories(type?: TxnType) {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  return useQuery({
    queryKey: ['categories', userId, type],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<Category[]> => {
      if (isDemo) {
        const cats = useDemoStore.getState().categories
        return type ? cats.filter((c) => c.type === type) : cats
      }
      const query = supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId!)
        .order('main_group')
        .order('name')
      if (type) query.eq('type', type)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Category[]
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (cat: Omit<Category, 'id' | 'user_id' | 'created_at'>) => {
      if (useDemoStore.getState().isDemo) {
        const created: Category = {
          ...cat,
          id: `demo-cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          user_id: 'demo',
          created_at: new Date().toISOString(),
        }
        useDemoStore.getState().addCategory(created)
        return created
      }
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...cat, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

// Expenses, budgets and recurring rules embed their category (name, group,
// colour), so a rename/recolour/delete has to refresh them too — not just the
// category list — or they keep showing the old values until a reload.
function invalidateCategoryViews(qc: QueryClient) {
  for (const key of ['categories', 'expenses', 'budgets', 'recurring_rules']) {
    qc.invalidateQueries({ queryKey: [key] })
  }
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Category> & { id: string }) => {
      if (useDemoStore.getState().isDemo) {
        useDemoStore.getState().updateCategory(id, fields)
        return
      }
      const { error } = await supabase.from('categories').update(fields).eq('id', id).eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => invalidateCategoryViews(qc),
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      if (useDemoStore.getState().isDemo) {
        useDemoStore.getState().removeCategory(id)
        return
      }
      const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => invalidateCategoryViews(qc),
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useRenameMainGroup() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      if (useDemoStore.getState().isDemo) {
        useDemoStore.getState().renameMainGroup(oldName, newName)
        return
      }
      const { error } = await supabase
        .from('categories')
        .update({ main_group: newName })
        .eq('user_id', userId!)
        .eq('main_group', oldName)
      if (error) throw error
    },
    onSuccess: () => invalidateCategoryViews(qc),
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeleteMainGroup() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (groupName: string) => {
      if (useDemoStore.getState().isDemo) {
        useDemoStore.getState().deleteMainGroup(groupName)
        return
      }
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', userId!)
        .eq('main_group', groupName)
      if (error) throw error
    },
    onSuccess: () => invalidateCategoryViews(qc),
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}
