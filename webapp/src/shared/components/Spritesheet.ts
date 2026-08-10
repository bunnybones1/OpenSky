/**
 * This exists to fix a bug in vite that mis-imports `react-responsive-spritesheet`.
 * Import this instead of that module.
 * See https://github.com/vitejs/vite/issues/12254
 */
import { ComponentProps } from 'react'
import * as s from 'react-responsive-spritesheet'

// Workaround double default bug
export const Spritesheet: typeof s.default =
  'default' in s.default ? (s.default as any).default : s.default

export type SpritesheetProps = ComponentProps<typeof Spritesheet>
