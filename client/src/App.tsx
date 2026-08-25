import { lazy, Suspense } from 'react'
import { Switch, Route } from 'wouter'
import BottomNav from './components/layout/BottomNav'

const Home = lazy(() => import('./pages/Home'))
const Search = lazy(() => import('./pages/Search'))
const ArtisanDetail = lazy(() => import('./pages/ArtisanDetail'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Profile = lazy(() => import('./pages/Profile'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <div className="max-w-lg mx-auto min-h-screen bg-gray-50 relative">
      <main>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/search" component={Search} />
            <Route path="/artisan/:id" component={ArtisanDetail} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/profile" component={Profile} />
            <Route>
              <div className="flex items-center justify-center min-h-screen text-gray-500">
                <div className="text-center">
                  <div className="text-5xl mb-3">404</div>
                  <p>Page introuvable</p>
                </div>
              </div>
            </Route>
          </Switch>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}
