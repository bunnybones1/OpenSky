import clsx from 'clsx'
import { CSSProperties, memo } from 'react'
import { Link } from 'react-router-dom'

import { Icon } from '~/shared/components/Icon/Icon'

import * as styles from './CloudApp.css'
import type { CloudAppData, CloudPlayerQuest } from './types'

interface PageProps extends CloudAppData {
  onLaunchPractice: () => void
  onSignOut: () => Promise<void>
  isSigningOut: boolean
}

const pageHeader = (eyebrow: string, title: string, description: string) => (
  <header className={styles.pageHeader}>
    <div>
      <div className={styles.eyebrow}>{eyebrow}</div>
      <h1 className={styles.pageTitle}>{title}</h1>
      <p className={styles.pageDescription}>{description}</p>
    </div>
    <div className={styles.statusPill}>
      <span className={styles.statusDot} />
      Cloudflare player online
    </div>
  </header>
)

const questProgress = (quest: CloudPlayerQuest) => {
  const percent = Math.round((quest.progress / quest.target) * 100)
  return (
    <div
      className={styles.progressTrack}
      role="progressbar"
      aria-label={`${quest.title} progress`}
      aria-valuemin={0}
      aria-valuemax={quest.target}
      aria-valuenow={quest.progress}
    >
      <div
        className={styles.progressFill}
        style={{ '--progress': `${percent}%` } as CSSProperties}
      />
    </div>
  )
}

export const HomePage = memo(({ session, player, onLaunchPractice }: PageProps) => {
  const firstName = session.user.displayName.trim().split(/\s+/)[0] || 'player'
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroKicker}>Welcome back, {firstName}</div>
          <h1 className={styles.heroTitle}>Your next run starts in the cloud.</h1>
          <p className={styles.heroText}>
            Your player profile, starter collection, quests, and basic SkyPass are
            ready. No wallet is needed to play Practice or grow this account.
          </p>
          <div className={styles.actionRow}>
            <button className={styles.primaryButton} onClick={onLaunchPractice}>
              <Icon type="play" color="white" height="16px" />
              Play Practice
            </button>
            <Link className={styles.secondaryButton} to="/collection">
              View starter cards
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.statsGrid} aria-label="Player overview">
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Player level</span>
          <strong className={styles.statValue}>{player.profile.level}</strong>
          <span className={styles.statMeta}>{player.profile.xp} account XP</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Basic cards</span>
          <strong className={styles.statValue}>
            {player.collection.basicCardCount}
          </strong>
          <span className={styles.statMeta}>Account-owned unlocks</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active quests</span>
          <strong className={styles.statValue}>
            {player.quests.filter((quest) => quest.status === 'active').length}
          </strong>
          <span className={styles.statMeta}>Wallet-free objectives</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Basic SkyPass</span>
          <strong className={styles.statValue}>
            Lv. {player.basicSkyPass.level}
          </strong>
          <span className={styles.statMeta}>{player.basicSkyPass.xp} pass XP</span>
        </div>
      </section>

      <section className={styles.sectionGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Current quests</h2>
            <Link className={styles.textLink} to="/quests">
              See all quests
            </Link>
          </div>
          <div className={styles.list}>
            {player.quests.slice(0, 3).map((quest) => (
              <div className={styles.listItem} key={quest.key}>
                <div>
                  <div className={styles.listTitle}>{quest.title}</div>
                  <div className={styles.listDescription}>
                    {quest.progress} of {quest.target}
                  </div>
                  {questProgress(quest)}
                </div>
                <div className={styles.questReward}>+{quest.rewardXp} XP</div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Starter deck</h2>
            <Link className={styles.textLink} to="/decks">
              Open decks
            </Link>
          </div>
          <div className={styles.deckPrism}>Strength</div>
          <div className={styles.deckTitle}>
            {player.decks[0]?.name || 'Starter deck'}
          </div>
          <div className={styles.deckDetails}>
            {player.decks[0]?.cardCount || 0} basic cards · Ready for local Practice
          </div>
        </div>
      </section>
    </>
  )
})

HomePage.displayName = 'CloudHomePage'

export const PlayPage = memo(({ onLaunchPractice }: PageProps) => (
  <>
    {pageHeader(
      'Play',
      'Choose a mode',
      'Practice is live now. Networked modes will appear here as their Cloudflare services are ported.'
    )}
    <div className={styles.modesGrid}>
      <section className={clsx(styles.modeCard, styles.modeCardReady)}>
        <span className={clsx(styles.availability, styles.availabilityReady)}>
          Ready
        </span>
        <h2 className={styles.modeTitle}>Practice</h2>
        <p className={styles.modeDescription}>
          Play a full match against the local bot with your starter deck. A wallet is
          not required.
        </p>
        <div className={styles.modeFooter}>
          <button className={styles.primaryButton} onClick={onLaunchPractice}>
            Launch Practice
          </button>
        </div>
      </section>
      <section className={styles.modeCard}>
        <span className={styles.availability}>Service not ported</span>
        <h2 className={styles.modeTitle}>Unranked</h2>
        <p className={styles.modeDescription}>
          Friendly matchmaking will return when the matchmaker and realtime game
          services move to Cloudflare.
        </p>
        <div className={styles.modeFooter}>
          <button className={styles.secondaryButton} disabled>
            Coming later
          </button>
        </div>
      </section>
      <section className={styles.modeCard}>
        <span className={styles.availability}>Service not ported</span>
        <h2 className={styles.modeTitle}>Ranked</h2>
        <p className={styles.modeDescription}>
          Competitive queues, ranks, and match history need the networked game stack.
          They are not blocked by wallet status.
        </p>
        <div className={styles.modeFooter}>
          <button className={styles.secondaryButton} disabled>
            Coming later
          </button>
        </div>
      </section>
    </div>
  </>
))

PlayPage.displayName = 'CloudPlayPage'

export const CollectionPage = memo(({ player }: PageProps) => (
  <>
    {pageHeader(
      'Collection',
      'Your basic cards',
      'These starter unlocks belong to your Cloud Weasel player account. Wallet-linked collectibles will be shown separately.'
    )}
    <div className={styles.notice}>
      This milestone uses the licensed legacy card names without their artwork.
      Original Cloud Weasel cards and weasel-themed art can replace them
      incrementally.
    </div>
    <div className={styles.cardsGrid}>
      {player.collection.basicCards.map((card) => (
        <article className={styles.card} key={card.id}>
          <div className={styles.cardId}>BASIC · {card.id}</div>
          <h2 className={styles.cardName}>{card.name}</h2>
          <div className={styles.cardMeta}>{card.prism} starter unlock</div>
        </article>
      ))}
    </div>
  </>
))

CollectionPage.displayName = 'CloudCollectionPage'

export const DecksPage = memo(({ player, onLaunchPractice }: PageProps) => (
  <>
    {pageHeader(
      'Decks',
      'Ready for the table',
      'Starter decks are part of the player account. Custom deck editing will be connected in a later service milestone.'
    )}
    <div className={styles.list}>
      {player.decks.map((deck) => (
        <article className={styles.deckCard} key={deck.id}>
          <div>
            <div className={styles.deckPrism}>{deck.prism} · starter</div>
            <h2 className={styles.deckTitle}>{deck.name}</h2>
            <p className={styles.deckDetails}>
              {deck.cardCount} basic cards · Account-owned · Practice ready
            </p>
          </div>
          <button className={styles.primaryButton} onClick={onLaunchPractice}>
            Play this deck
          </button>
        </article>
      ))}
    </div>
  </>
))

DecksPage.displayName = 'CloudDecksPage'

export const QuestsPage = memo(({ player }: PageProps) => (
  <>
    {pageHeader(
      'Quests',
      'Small steps, steady progress',
      'Quest progress is attached to your player identity. Wallet-linked objectives can be added as an optional category later.'
    )}
    <div className={styles.panel}>
      <div className={styles.list}>
        {player.quests.map((quest) => (
          <article className={styles.listItem} key={quest.key}>
            <div>
              <h2 className={styles.listTitle}>{quest.title}</h2>
              <p className={styles.listDescription}>{quest.description}</p>
              {questProgress(quest)}
            </div>
            <div className={styles.questReward}>+{quest.rewardXp} XP</div>
          </article>
        ))}
      </div>
    </div>
  </>
))

QuestsPage.displayName = 'CloudQuestsPage'

export const SkyPassPage = memo(({ player }: PageProps) => {
  const current = player.basicSkyPass.level
  return (
    <>
      {pageHeader(
        'Basic SkyPass',
        `Level ${current}`,
        'The basic progression track is included with every player account and never requires a wallet.'
      )}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Cloud trail</h2>
            <p className={styles.listDescription}>
              {player.basicSkyPass.xp} / {player.basicSkyPass.nextLevelXp} XP to the
              next level
            </p>
          </div>
          <span className={styles.optionalBadge}>Basic track active</span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Basic SkyPass progress"
          aria-valuemin={0}
          aria-valuemax={player.basicSkyPass.nextLevelXp}
          aria-valuenow={player.basicSkyPass.xp}
        >
          <div
            className={styles.progressFill}
            style={
              {
                '--progress': `${Math.round(
                  (player.basicSkyPass.xp / player.basicSkyPass.nextLevelXp) * 100
                )}%`
              } as CSSProperties
            }
          />
        </div>
      </div>
      <div className={styles.passTrack} aria-label="Basic SkyPass levels">
        {[1, 2, 3, 4, 5].map((level) => (
          <article
            className={clsx(
              styles.passLevel,
              level === current && styles.passLevelCurrent
            )}
            key={level}
          >
            <div className={styles.passLevelNumber}>LEVEL {level}</div>
            <div className={styles.passReward}>
              {level === 1 ? 'Starter deck access' : 'Basic reward slot'}
            </div>
            <div className={styles.passState}>
              {level < current
                ? 'Earned'
                : level === current
                  ? 'Current level'
                  : 'Ahead'}
            </div>
          </article>
        ))}
      </div>
    </>
  )
})

SkyPassPage.displayName = 'CloudSkyPassPage'

export const AccountPage = memo(
  ({ session, player, wallets, onSignOut, isSigningOut }: PageProps) => {
    const initial = session.user.displayName.trim().charAt(0).toUpperCase() || 'W'
    return (
      <>
        {pageHeader(
          'Account',
          'Identity and integrations',
          'Your Google sign-in is the account. Wallets are optional connections for on-chain contents and transactions.'
        )}
        <div className={styles.accountGrid}>
          <section className={styles.panel}>
            <div className={styles.profileRow}>
              <div className={styles.profileAvatar}>
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
              </div>
              <div>
                <div className={styles.profileName}>{session.user.displayName}</div>
                <div className={styles.profileEmail}>{session.user.email}</div>
              </div>
            </div>
            <div className={styles.accountFacts}>
              <div className={styles.accountFact}>
                <span className={styles.accountFactLabel}>Sign-in provider</span>
                <span>Google OpenID Connect</span>
              </div>
              <div className={styles.accountFact}>
                <span className={styles.accountFactLabel}>Player level</span>
                <span>{player.profile.level}</span>
              </div>
              <div className={styles.accountFact}>
                <span className={styles.accountFactLabel}>Member since</span>
                <span>{new Date(player.profile.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className={styles.actionRow}>
              <button
                className={styles.secondaryButton}
                disabled={isSigningOut}
                onClick={onSignOut}
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Wallet connections</h2>
              <span className={styles.optionalBadge}>Optional</span>
            </div>
            {wallets.length ? (
              <div className={styles.list}>
                {wallets.map((wallet) => (
                  <div
                    className={styles.walletEmpty}
                    key={`${wallet.namespace}:${wallet.address}`}
                  >
                    <div className={styles.walletTitle}>
                      {wallet.label || 'Connected wallet'}
                    </div>
                    <div className={styles.walletAddress}>{wallet.address}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.walletEmpty}>
                <div className={styles.walletTitle}>
                  No wallet connected—and that is okay.
                </div>
                <p className={styles.walletDescription}>
                  Practice, basic cards, decks, quests, player progression, and the
                  basic SkyPass remain available. WalletConnect support will add
                  on-chain inventory later.
                </p>
                <div className={styles.actionRow}>
                  <button className={styles.secondaryButton} disabled>
                    WalletConnect coming soon
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </>
    )
  }
)

AccountPage.displayName = 'CloudAccountPage'
