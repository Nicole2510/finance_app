import { Navigate, Route, Routes } from 'react-router'
import ProtectedLayout from './components/ProtectedLayout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ComingSoon from './pages/ComingSoon'
import Settings from './pages/Settings'
import Categories from './pages/Categories'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* "/*" lets Clerk use sub-steps like /sign-in/factor-one */}
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Pages below require sign-in */}
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        {/* The profile now lives in Settings */}
        <Route path="/profile" element={<Navigate to="/settings" replace />} />
        <Route path="/accounts/:id?" element={<Accounts />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<ComingSoon title="Budgets" />} />
        <Route path="/debts" element={<ComingSoon title="Debts & Loans" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/categories" element={<Categories />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
