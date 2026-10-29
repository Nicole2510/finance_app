import {
  ArrowLeftRight,
  HandCoins,
  LayoutGrid,
  PieChart,
  Settings,
  Tags,
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

// Shown in the sidebar's bottom section (on phones, via the user menu)
export const secondaryNav: NavItem[] = [
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings },
]
