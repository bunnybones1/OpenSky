import { style } from '@vanilla-extract/css'

export const DeckViewerControlsStyle = style({
  width: '60px',
  left: '-60px',
  background: `linear-gradient(-90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,0) 100%)`,
  gridAutoRows: 'min-content',
  gridAutoColumns: 'min-content',
  gridAutoFlow: 'row',
  rowGap: '8px',
  justifyContent: 'end'
})
