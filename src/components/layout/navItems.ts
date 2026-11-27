import { Compass, House, Library, Search, TrendingUp, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Left out of the mobile tab bar. Reached from Home instead. */
  desktopOnly?: boolean;
}

/** Main destinations, shared by the desktop sidebar and mobile tab bar. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/top', label: 'Top songs', icon: TrendingUp, desktopOnly: true },
];
