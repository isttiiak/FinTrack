import { useEffect } from 'react'
import {
  RouterProvider,
  createRouter,
  createRoute,
  createRootRoute,
  lazyRouteComponent,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { Logo } from '@/components/common/Logo'
import ToastContainer from '@/components/common/ToastContainer'
import type { UserProfile } from '@/types/database.types'

// Pages — code-split per route via lazyRouteComponent (TanStack Router's own
// wrapper around React.lazy/dynamic import; it integrates with the router's
// pending state instead of needing a hand-wrapped <Suspense> per route). See
// TODO.md §4.1 — this + the manualChunks split in vite.config.ts is what
// gets recharts/xlsx and each page's own code out of the initial bundle.
const LoginPage            = lazyRouteComponent(() => import('@/pages/auth/LoginPage'))
const SignupPage           = lazyRouteComponent(() => import('@/pages/auth/SignupPage'))
const ForgotPasswordPage   = lazyRouteComponent(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage    = lazyRouteComponent(() => import('@/pages/auth/ResetPasswordPage'))
const DashboardPage        = lazyRouteComponent(() => import('@/pages/DashboardPage'))
const ExpensesPage         = lazyRouteComponent(() => import('@/pages/ExpensesPage'))
const LedgerPage           = lazyRouteComponent(() => import('@/pages/LedgerPage'))
const PersonDetailPage     = lazyRouteComponent(() => import('@/pages/PersonDetailPage'))
const PeoplePage           = lazyRouteComponent(() => import('@/pages/PeoplePage'))
const InvestmentsPage      = lazyRouteComponent(() => import('@/pages/InvestmentsPage'))
const InvestmentDetailPage = lazyRouteComponent(() => import('@/pages/InvestmentDetailPage'))
const AnalyticsPage        = lazyRouteComponent(() => import('@/pages/AnalyticsPage'))
const SettingsPage         = lazyRouteComponent(() => import('@/pages/SettingsPage'))
const DataSettingsPage     = lazyRouteComponent(() => import('@/pages/DataSettingsPage'))
const ProfilePage          = lazyRouteComponent(() => import('@/pages/ProfilePage'))
const LandingPage          = lazyRouteComponent(() => import('@/pages/LandingPage'))

// Layout — not split: AppShell is needed immediately by every protected
// route, so lazy-loading it would only add a waterfall hop with no payoff.
import AppShell from '@/components/layout/AppShell'
import RoutePendingFallback from '@/components/common/RoutePendingFallback'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

// ── Root route ────────────────────────────────────
const rootRoute = createRootRoute({
  component: Root,
})

function Root() {
  const { setSession, setLoading, setProfile, loading } = useAuthStore()

  useEffect(() => {
    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) setProfile(data as UserProfile)
    }

    // Protected-route prefixes used for post-getSession redirect
    const PROTECTED = ['/dashboard', '/expenses', '/ledger', '/analytics', '/settings', '/profile', '/investments', '/investment']

    // Initial session check — await profile so splash hides only when data is ready
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) await loadProfile(session.user.id)
      setLoading(false)

      // If no session and on a protected route, send to login now that we know for certain
      if (!session && !useDemoStore.getState().isDemo) {
        const { pathname } = router.state.location
        if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
          router.navigate({ to: '/login', replace: true })
        }
      }
    })

    // Auth pages — only navigate away from these
    const AUTH_PATHS = ['/', '/login', '/signup', '/forgot-password']

    // Listen to all auth events and drive navigation from here
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setLoading(false)

      if (event === 'SIGNED_IN') {
        if (session?.user) loadProfile(session.user.id)
        // Only redirect when on a public/auth page.
        // Token refreshes also fire SIGNED_IN — don't kick the user to /dashboard mid-session.
        const currentPath = router.state.location.pathname
        if (AUTH_PATHS.includes(currentPath)) {
          router.navigate({ to: '/dashboard', replace: true })
        }
      } else if (event === 'SIGNED_OUT') {
        router.navigate({ to: '/login', replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading, setProfile])

  // Splash screen while we wait for the initial getSession() call.
  // Prevents flash of wrong page (login vs dashboard) on hard refresh.
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
      }}>
        <motion.div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Logo size={52} />
          <div style={{
            width: 24,
            height: 24,
            border: '2px solid rgba(79, 169, 129,0.3)',
            borderTopColor: '#4FA981',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <Outlet />
      </AnimatePresence>
      <ToastContainer />
    </>
  )
}

// ── Public routes — redirect to /dashboard if already signed in ───
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    const { session, loading } = useAuthStore.getState()
    const { isDemo } = useDemoStore.getState()
    if (loading) return  // wait for getSession to resolve
    if (session || isDemo) throw redirect({ to: '/dashboard' })
  },
  component: LoginPage,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: () => {
    const { session, loading } = useAuthStore.getState()
    const { isDemo } = useDemoStore.getState()
    if (loading) return
    if (session || isDemo) throw redirect({ to: '/dashboard' })
  },
  component: SignupPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
})

// ── Protected layout route ────────────────────────
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: () => {
    const { session, loading } = useAuthStore.getState()
    const { isDemo } = useDemoStore.getState()
    if (loading) return  // Root shows splash screen; getSession callback handles redirect
    if (!session && !isDemo) throw redirect({ to: '/login' })
  },
  component: AppShell,
})

const dashboardRoute      = createRoute({ getParentRoute: () => appRoute, path: '/dashboard',         component: DashboardPage })
const expensesRoute       = createRoute({ getParentRoute: () => appRoute, path: '/expenses',          component: ExpensesPage })
const ledgerRoute         = createRoute({ getParentRoute: () => appRoute, path: '/ledger',            component: LedgerPage })
const peopleRoute         = createRoute({ getParentRoute: () => appRoute, path: '/ledger/people',     component: PeoplePage })
const personDetailRoute   = createRoute({ getParentRoute: () => appRoute, path: '/ledger/$personId',  component: PersonDetailPage })
const investmentsRoute       = createRoute({ getParentRoute: () => appRoute, path: '/investments',                 component: InvestmentsPage })
const investmentDetailRoute  = createRoute({ getParentRoute: () => appRoute, path: '/investments/$investmentId',   component: InvestmentDetailPage })
const analyticsRoute      = createRoute({ getParentRoute: () => appRoute, path: '/analytics',         component: AnalyticsPage })
const settingsRoute       = createRoute({ getParentRoute: () => appRoute, path: '/settings',          component: SettingsPage })
const dataSettingsRoute   = createRoute({ getParentRoute: () => appRoute, path: '/settings/data',     component: DataSettingsPage })
const profileRoute        = createRoute({ getParentRoute: () => appRoute, path: '/profile',           component: ProfilePage })

// ── Router ────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  appRoute.addChildren([
    dashboardRoute,
    expensesRoute,
    ledgerRoute,
    peopleRoute,
    personDetailRoute,
    investmentsRoute,
    investmentDetailRoute,
    analyticsRoute,
    settingsRoute,
    dataSettingsRoute,
    profileRoute,
  ]),
])

const router = createRouter({ routeTree, defaultPendingComponent: RoutePendingFallback })

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
