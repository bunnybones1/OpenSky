// Warning: These are manually generated,
// so if a sound is removed or added from the fx sprite
// it should also be added here.
export type SpriteKeys =
  | 'BackReturnSwipe'
  | 'CardReward'
  | 'CursorCardClick'
  | 'CursorHover'
  | 'CursorHoverSlip'
  | 'CursorMainClick'
  | 'CursorMainHover'
  | 'CursorUnselectClick'
  | 'JuicyStingerStandalone'
  | 'JuicySwipeStandalone'
  | 'JuicySwipeStingerCombo'
  | 'MatchFound'
  | 'ModalCloseSwipe'
  | 'OpenDialog'
  | 'PlayStinger'
  | 'RewardWindowClose'
  | 'RewardWindowOpen'
  | 'RewardWindowOpenV2'
  | 'SideBarPanLeftInEngine'
  | 'SwipeFadeToSlightBlack'
  | 'Music1A'
  | 'Music1B'
  | 'Music2'
  | 'Music5'

export type MusicKeys = 'Music1A' | 'Music1B' | 'Music2' | 'Music5'
export const MusicKeyArray: MusicKeys[] = ['Music1A', 'Music1B', 'Music2', 'Music5']
export type QueueKeys = 'MatchFound'
export const InterfaceKeyArray: Exclude<SpriteKeys, MusicKeys | QueueKeys>[] = [
  'BackReturnSwipe',
  'CardReward',
  'CursorCardClick',
  'CursorHover',
  'CursorHoverSlip',
  'CursorMainClick',
  'CursorMainHover',
  'CursorUnselectClick',
  'JuicyStingerStandalone',
  'JuicySwipeStandalone',
  'JuicySwipeStingerCombo',
  'ModalCloseSwipe',
  'OpenDialog',
  'PlayStinger',
  'RewardWindowClose',
  'RewardWindowOpen',
  'RewardWindowOpenV2',
  'SideBarPanLeftInEngine',
  'SwipeFadeToSlightBlack'
]

export interface InterfaceSpriteConfig {
  sprite: {
    [key in Exclude<SpriteKeys, QueueKeys | MusicKeys>]:
      | [number, number]
      | [number, number, boolean]
  }
  urls: string[]
}

export interface QueueSpriteConfig {
  sprite: {
    MatchFound: [number, number] | [number, number, boolean]
  }
  urls: string[]
}

export interface MusicSpriteConfig {
  sprite: {
    [key in MusicKeys]: [number, number] | [number, number, boolean]
  }
  urls: string[]
}
