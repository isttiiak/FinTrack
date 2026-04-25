import { useEffect } from 'react'
import {
  RouterProvider,
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'

// Pages
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import ExpensesPage from '@/pages/ExpensesPage'
import LedgerPage from '@/pages/LedgerPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import SettingsPage from '@/pages/SettingsPage'
import ProfilePage from '@/pages/ProfilePage'
import LandingPage from '@/pages/LandingPage'

// Layout
import AppShell from '@/components/layout/AppShell'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

// ── Root route ────────────────────────────────────
const rootRoute = createRootRoute({
  component: Root,
})

function Root() {
  const { setSession, setLoading } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading])

  return (
    <AnimatePresence mode="wait">
      <Outlet />
    </AnimatePresence>
  )
}

// ── Public routes ─────────────────────────────────
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignupPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
})

// ── Protected layout route ────────────────────────
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: () => {
    const { session } = useAuthStore.getState()
    const { isDemo } = useDemoStore.getState()
    if (!session && !isDemo) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppShell,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const expensesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/expenses',
  component: ExpensesPage,
})

const ledgerRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/ledger',
  component: LedgerPage,
})

const analyticsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/analytics',
  component: AnalyticsPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: SettingsPage,
})

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/profile',
  component: ProfilePage,
})

// ── Router ────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  appRoute.addChildren([
    dashboardRoute,
    expensesRoute,
    ledgerRoute,
    analyticsRoute,
    settingsRoute,
    profileRoute,
  ]),
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
