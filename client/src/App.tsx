import { Switch, Route } from 'wouter'
import Home from './pages/Home'
import Search from './pages/Search'
import ArtisanDetail from './pages/ArtisanDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import BottomNav from './components/layout/BottomNav'

export default function App() {
  return (
    <div className="max-w-lg mx-auto min-h-screen bg-gray-50 relative">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/search" component={Search} />
        <Route path="/artisan/:id" component={ArtisanDetail} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/profile" component={Profile} />
        <Route>
          <div className="flex items-center justify-center min-h-screen text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">404</div>
              <p>Page introuvable</p>
            </div>
          </div>
        </Route>
      </Switch>
      <BottomNav />
    </div>
  )
}
