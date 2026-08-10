import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface ProfileLinkFrameProps {
  hideFirstCorner?: boolean
}

export const ProfileLinkFrame = memo(({ hideFirstCorner }: ProfileLinkFrameProps) => {
  return (
    <svg
      viewBox="0 0 32 54"
      version="1.1"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <g stroke="none" fill="none" fillRule="evenodd">
        <g transform="translate(0.000000, 0.000000)">
          <g>
            <g transform="translate(0.000000, 0.000000)">
              <g
                className={Sprinkles({ display: hideFirstCorner ? 'none' : 'block' })}
              >
                <polygon
                  fill="#231445"
                  points="2.84217094e-14 0 2.84217094e-14 54 20.5681818 54 0.791992187 0"
                />
                <rect fill="#705BAB" x="0" y="53" width="20" height="1" />
              </g>
              <polygon fill="#231445" points="11 0 31 0 31 54" />
              <polygon
                fill="#231445"
                points="1 0 16.2861774 42.7734375 30.0750966 53 10.3072476 0"
              />
              <g>
                <polygon points="0.5 0 31 0 31 54 20 54" />
                <rect
                  fill="#705BAB"
                  transform={`translate(10.756511, 27.18) scale(1, -1) rotate(20) translate(-10.756511, -${
                    !!hideFirstCorner ? '11' : '27'
                  }.180867)`}
                  x="10.256511"
                  y="-5.81913344"
                  width="1"
                  height={!!hideFirstCorner ? '45.5' : '66'}
                />
                <rect
                  fill="#705BAB"
                  transform="translate(20.756511, 27.18) scale(1, -1) rotate(20) translate(-20.756511, -27.180867)"
                  x="20.256511"
                  y="-5.81913344"
                  width="1"
                  height="66"
                />
              </g>
              <rect fill="#705BAB" x="30" y="53" width="1" height="1" />
              <g transform="translate(14.000000, 42.000000)" fill="#705BAB">
                <polygon
                  transform="translate(9.412062, 6.066987) scale(-1, 1) rotate(60) translate(-9.412062, -6.066987)"
                  points="7.56789117 -2.60484091 8.66296566 -1.76951475 11.2562324 14.7388155 10.140207 14.6718282"
                />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
})

ProfileLinkFrame.displayName = 'ProfileLinkFrame'
