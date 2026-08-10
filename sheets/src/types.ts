import { sheets } from './sheets'

export type LayoutComponent =
  | {
      component: 'sheet_picker'
    }
  | { component: 'tools' }
  | { component: 'problems' }
  | { component: 'console' }
  | {
      component: 'sheet'
      config: {
        sheet: keyof typeof sheets
        scrollTo?: { id: string; column?: string }
        ctrlFJustPressed: boolean
      }
    }

export type FindByType<Union, Type> = Union extends { type: Type } ? Union : never
export type Writeable<T> = { -readonly [P in keyof T]: T[P] }
