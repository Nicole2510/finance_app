import {
  ArrowLeftRight,
  HandCoins,
  LayoutGrid,
  PieChart,
  Settings,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

type NavItem = { to: string; label: string; icon: LucideIcon }

// Main pages, shared by the desktop sidebar and the mobile tab bar
export const mainNav: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PieChart },
  { to: '/debts', label: 'Debts & Loans', icon: HandCoins },
]

export const settingsNav: NavItem = { to: '/settings', label: 'Settings', icon: Settings }
