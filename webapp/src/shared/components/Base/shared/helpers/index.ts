import { css } from '@emotion/react'

// Transform css helper
export const transform = (props) => {
  if (props.transform) {
    return css`
      transform: ${props.transform};
    `
  }
  return
}

export const transitionTheme = (props) => {
  if (props.transitionTheme) {
    return css`
      transition: ${typeof props.transition === 'string'
        ? props.transition
        : props.theme.transition};
    `
  }
  return
}

// Add base flex styles with one line
export const flexBoxType = (props) => {
  switch (props.type) {
    case 'centered-column': {
      return css`
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `
    }
    case 'centered-row': {
      return css`
        flex-direction: row;
        align-items: center;
        justify-content: center;
      `
    }
    case 'start-column': {
      return css`
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
      `
    }
    case 'start-row': {
      return css`
        flex-direction: row;
        align-items: flex-start;
        justify-content: flex-start;
      `
    }
    case 'end-row': {
      return css`
        flex-direction: row;
        align-items: flex-end;
        justify-content: flex-end;
      `
    }
    case 'end-column': {
      return css`
        flex-direction: column;
        align-items: flex-end;
        justify-content: flex-end;
      `
    }
    case 'centered-start-column': {
      return css`
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
      `
    }
    case 'centered-start-row': {
      return css`
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
      `
    }
    case 'centered-between-row': {
      return css`
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      `
    }
    case 'centered-end-column': {
      return css`
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
      `
    }
    case 'centered-end-row': {
      return css`
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
      `
    }
    // ...more
    default:
      return
  }
}

export const textType = (props) => {
  switch (props.type) {
    case 'description': {
      return css`
        color: ${props.theme.colors.white};
        font-family: ${props.theme.fontFamilies.condensed};
        font-size: 25px;
        font-weight: 500;
        text-align: center;
        text-shadow: 0 2px 16px rgba(0, 0, 0, 0.5);
      `
    }
    case 'body': {
      return css`
        color: ${props.theme.colors.white};
        font-family: ${props.theme.fontFamilies.condensed};
        font-size: 16px;
      `
    }
    // ...more
    default:
      return
  }
}
