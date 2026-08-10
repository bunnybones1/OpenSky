import { ImageIconTypes } from '~/shared/components/ImageIcon/ImageIconConfig'

export type CardIconInfoTypes = Extract<
  ImageIconTypes,
  | 'trait-armor'
  | 'trait-banner'
  | 'trait-dash'
  | 'trait-guard'
  | 'trait-lifesteal'
  | 'trait-stealth'
  | 'trait-wither'
  | 'trigger-continuous'
  | 'trigger-death'
  | 'trigger-generic'
  | 'trigger-glory'
  | 'trigger-inspire'
  | 'trigger-play'
  | 'trigger-slay'
  | 'trigger-sunrise'
  | 'trigger-sunset'
>
