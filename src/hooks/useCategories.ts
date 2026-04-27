import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import type { Category } from '@/types/expense.types'
import type { TxnType } from '@/lib/constants'

export function useCategories(type?: TxnType) {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)
  const demoCategories = useDemoStore((s) => s.categories)

  return useQuery({
    queryKey: ['categories', userId, type],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<Category[]> => {
      if (isDemo) {
        return type ? demoCategories.filter((c) => c.type === type) : demoCategories
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

  return useMutation({
    mutationFn: async (cat: Omit<Category, 'id' | 'user_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...cat, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Category> & { id: string }) => {
      const { error } = await supabase.from('categories').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useRenameMainGroup() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({ main_group: newName })
        .eq('user_id', userId!)
        .eq('main_group', oldName)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteMainGroup() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async (groupName: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', userId!)
        .eq('main_group', groupName)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
