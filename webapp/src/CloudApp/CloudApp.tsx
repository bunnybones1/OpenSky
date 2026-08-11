import clsx from 'clsx'
import { memo } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'

import { Icon, type IconTypes } from '~/shared/components/Icon/Icon'

import * as styles from './CloudApp.css'
import {
  AccountPage,
  CollectionPage,
  DecksPage,
  HomePage,
  PlayPage,
  QuestsPage,
  SkyPassPage
} from './CloudAppPages'
import type { CloudAppData } from './types'

interface CloudAppProps extends CloudAppData {
  onLaunchPractice: () => void
  onSignOut: () => Promise<void>
  isSigningOut: boolean
}

interface NavItem {
  to: string
  label: string
  icon: IconTypes
  mobile?: boolean
}

const navigation: NavItem[] = [
  { to: '/home', label: 'Home', icon: 'star', mobile: true },
  { to: '/play', label: 'Play', icon: 'play', mobile: true },
  { to: '/collection', label: 'Collection', icon: 'cards', mobile: true },
  { to: '/decks', label: 'Decks', icon: 'deck' },
  { to: '/quests', label: 'Quests', icon: 'quest', mobile: true },
  { to: '/skypass', label: 'SkyPass', icon: 'sky-pass', mobile: true }
]

const playerLabel = (name: string) => name.trim().split(/\s+/)[0] || 'Player'

export const CloudApp = memo((props: CloudAppProps) => {
  const { session, wallets } = props
  const initial = session.user.displayName.trim().charAt(0).toUpperCase() || 'W'
  const sharedPageProps = props

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <NavLink className={styles.brand} to="/home" aria-label="Cloud Weasel home">
          <span className={styles.brandMark}>CW</span>
          <span>
            <span className={styles.brandName}>Cloud Weasel</span>
            <span className={styles.brandMeta}>Player preview</span>
          </span>
        </NavLink>
        <nav className={styles.nav} aria-label="Primary navigation">
          <div className={styles.navSectionLabel}>Player</div>
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) =>
                clsx(styles.navItem, isActive && styles.navItemActive)
              }
              key={item.to}
              to={item.to}
            >
              <Icon type={item.icon} color="purple9" height="16px" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <footer className={styles.sidebarFooter}>
          <NavLink
            className={({ isActive }) =>
              clsx(styles.navItem, isActive && styles.navItemActive)
            }
            to="/account"
          >
            <Icon type="profile" color="purple9" height="16px" />
            {playerLabel(session.user.displayName)}
          </NavLink>
          <div className={styles.walletNote}>
            <span className={styles.walletDot} />
            {wallets.length
              ? `${wallets.length} wallet connected`
              : 'Wallet optional'}
          </div>
        </footer>
      </aside>

      <header className={styles.mobileHeader}>
        <NavLink className={styles.mobileBrand} to="/home">
          <span className={styles.brandMark}>CW</span>
          Cloud Weasel
        </NavLink>
        <NavLink
          className={styles.avatarButton}
          to="/account"
          aria-label="Open account"
        >
          {session.user.avatarUrl ? (
            <img
              className={styles.avatarImage}
              src={session.user.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
            />
          ) : (
            initial
          )}
        </NavLink>
      </header>

      <main className={styles.main}>
        <div className={styles.content}>
          <Routes>
            <Route path="/home" element={<HomePage {...sharedPageProps} />} />
            <Route path="/play" element={<PlayPage {...sharedPageProps} />} />
            <Route
              path="/collection"
              element={<CollectionPage {...sharedPageProps} />}
            />
            <Route path="/decks" element={<DecksPage {...sharedPageProps} />} />
            <Route path="/quests" element={<QuestsPage {...sharedPageProps} />} />
            <Route path="/skypass" element={<SkyPassPage {...sharedPageProps} />} />
            <Route path="/account" element={<AccountPage {...sharedPageProps} />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>
      </main>

      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {navigation
          .filter((item) => item.mobile)
          .map((item) => (
            <NavLink
              className={({ isActive }) =>
                clsx(styles.bottomNavItem, isActive && styles.bottomNavItemActive)
              }
              key={item.to}
              to={item.to}
            >
              <Icon type={item.icon} color="purple9" height="16px" />
              {item.label === 'Collection' ? 'Cards' : item.label}
            </NavLink>
          ))}
      </nav>
    </div>
  )
})

CloudApp.displayName = 'CloudApp'
