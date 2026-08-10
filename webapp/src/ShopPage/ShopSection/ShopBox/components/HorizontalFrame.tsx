import { AnimatePresence, motion } from 'framer-motion'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface HorizontalFrameProps {
  price: number
  expiration: string
  isHovered: boolean
}

export const HorizontalFrame = memo(
  ({ price, expiration, isHovered }: HorizontalFrameProps) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 737 407"
        className={Sprinkles({
          width: 'full',
          height: 'full',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 5,
          pointerEvents: 'none'
        })}
      >
        {/*------------- FRAME -------------*/}
        <path
          fill="#000"
          d="M0.6 391H375.8V399.4H0.6z"
          transform="rotate(-90 .6 391)"
        />
        <path
          fill="#705BAB"
          d="M3.4 391H378.59999999999997V392.4H3.4z"
          transform="rotate(-90 3.4 391)"
        />
        <path fill="#000" d="M16 0.4H721.2V15.8H16z" />
        <path fill="#705BAB" d="M16 3.2H721.2V4.6H16z" />
        <path fill="#4D3C7B" d="M16 10.9H721.2V12.3H16z" />
        <path
          fill="#000"
          d="M0 0H705.2V15.4H0z"
          transform="matrix(1 0 0 -1 16 406.4)"
        />
        <path
          fill="#705BAB"
          d="M0 0H705.2V1.4H0z"
          transform="matrix(1 0 0 -1 16 403.6)"
        />
        <path
          fill="#4D3C7B"
          d="M0 0H705.2V1.4H0z"
          transform="matrix(1 0 0 -1 16 395.9)"
        />
        <path
          fill="#000"
          d="M0 0H375.2V8.4H0z"
          transform="matrix(0 -1 -1 0 736.6 391)"
        />
        <path
          fill="#705BAB"
          d="M0 0H375.2V1.4H0z"
          transform="matrix(0 -1 -1 0 733.8 391)"
        />
        <path
          fill="#000"
          d="M14.6 41l-7.7 7.7-2.1 2.1V16.5L16.7 4.6H65v11.2H23l-8.4 8.4V41z"
        />
        <path fill="#000" d="M4.8 46.6H9V52.2H4.8z" />
        <path
          stroke="#4D3C7B"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M21.6 11.6h42.7"
        />
        <path
          stroke="#705BAB"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M27.9 4.6L11.1 21.4v17.5l-6.3 6.3"
        />
        <path fill="#000" d="M15.3.4H65v2.8H16.7L3.4 16.5v35.7H.6V15.1L15.3.4z" />
        <path stroke="#705BAB" strokeWidth="1.4" d="M65 3.9H16.7L4.1 16.5v35.7" />
        <path
          fill="#000"
          d="M14.6 365.8l-7.7-7.7-2.1-2.1v34.3l11.9 11.9H65V391H23l-8.4-8.4v-16.8z"
        />
        <path
          fill="#000"
          d="M0 0H4.2V5.6H0z"
          transform="matrix(1 0 0 -1 4.8 360.2)"
        />
        <path
          stroke="#4D3C7B"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M21.6 395.2h42.7"
        />
        <path
          stroke="#705BAB"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M27.9 402.2l-16.8-16.8v-17.5l-6.3-6.3"
        />
        <path
          fill="#000"
          d="M15.3 406.4H65v-2.8H16.7L3.4 390.3v-35.7H.6v37.1l14.7 14.7z"
        />
        <path stroke="#705BAB" strokeWidth="1.4" d="M65 402.9H16.7L4.1 390.3v-35.7" />
        <path
          fill="#000"
          d="M722.6 41l7.7 7.7 2.1 2.1V16.5L720.5 4.6h-48.3v11.2h42l8.4 8.4V41z"
        />
        <path
          fill="#000"
          d="M0 0H4.2V5.6H0z"
          transform="matrix(-1 0 0 1 732.4 46.6)"
        />
        <path
          stroke="#4D3C7B"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M715.6 11.6h-42.7"
        />
        <path
          stroke="#705BAB"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M709.3 4.6l16.8 16.8v17.5l6.3 6.3"
        />
        <path
          fill="#000"
          d="M721.9.4h-49.7v2.8h48.3l13.3 13.3v35.7h2.8V15.1L721.9.4z"
        />
        <path stroke="#705BAB" strokeWidth="1.4" d="M672.2 3.9h48.3l12.6 12.6v35.7" />
        <path
          fill="#000"
          d="M722.6 365.8l7.7-7.7 2.1-2.1v34.3l-11.9 11.9h-48.3V391h42l8.4-8.4v-16.8z"
        />
        <path
          fill="#000"
          d="M732.4 360.2H736.6V365.8H732.4z"
          transform="rotate(180 732.4 360.2)"
        />
        <path
          stroke="#4D3C7B"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M715.6 395.2h-42.7"
        />
        <path
          stroke="#705BAB"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M709.3 402.2l16.8-16.8v-17.5l6.3-6.3"
        />
        <path
          fill="#000"
          d="M721.9 406.4h-49.7v-2.8h48.3l13.3-13.3v-35.7h2.8v37.1l-14.7 14.7z"
        />
        <path
          stroke="#705BAB"
          strokeWidth="1.4"
          d="M672.2 402.9h48.3l12.6-12.6v-35.7"
        />
        <path
          fill="#000"
          d="M326.6 15.8h-2.8V.4h89.6v15.4h-3.5l-5.6 5.6h-72.1l-5.6-5.6z"
        />
        <path
          stroke="#705BAB"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M343.4 4.6l5.6 5.6h38.5l5.6-5.6"
        />
        <path stroke="#705BAB" strokeWidth="1.4" d="M413.4 3.9h-89.6" />
        <path
          stroke="#4D3C7B"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M412.7 11.6h-4.2l-7 7h-67.2l-7-7h-2.8"
        />
        <AnimatePresence>
          {isHovered && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <path
                fill="#000"
                d="M0 391.963H376.926V400.30800000000005H0z"
                transform="rotate(-90 0 391.963)"
              />
              <path
                fill="#AC8FFF"
                d="M2.782 391.963H379.70799999999997V393.353H2.782z"
                transform="rotate(-90 2.782 391.963)"
              />
              <path
                fill="#3F2588"
                d="M0 0H2.782V376.926H0z"
                transform="matrix(1 0 0 1 4.172 15.037)"
              />
              <path
                fill="#000"
                d="M0 0H706.959V15.538H0z"
                transform="matrix(1 0 0 -1 15.02 407)"
              />
              <path
                fill="#AC8FFF"
                d="M0 0H706.959V1.413H0z"
                transform="matrix(1 0 0 -1 15.02 404.175)"
              />
              <path
                fill="#5E3EB9"
                d="M0 0H706.959V1.413H0z"
                transform="matrix(1 0 0 -1 15.02 396.406)"
              />
              <path
                fill="#3F2588"
                d="M0 0H706.959V2.825H0z"
                transform="matrix(1 0 0 -1 15.02 402.762)"
              />
              <path
                fill="#2A1760"
                d="M0 0H706.959V1.413H0z"
                transform="matrix(1 0 0 -1 15.02 394.993)"
              />
              <path fill="#000" d="M15.021 0H721.9799999999999V15.212H15.021z" />
              <path
                fill="#AC8FFF"
                d="M15.021 2.766H721.9799999999999V4.147H15.021z"
              />
              <path
                fill="#5E3EB9"
                d="M15.021 10.372H721.9799999999999V11.753H15.021z"
              />
              <path
                fill="#3F2588"
                d="M15.021 4.149H721.9799999999999V6.914H15.021z"
              />
              <path
                fill="#2A1760"
                d="M15.021 11.755H721.9799999999999V13.136000000000001H15.021z"
              />
              <path
                fill="#000"
                d="M0 0H376.926V8.345H0z"
                transform="matrix(0 -1 -1 0 737 391.963)"
              />
              <path
                fill="#AC8FFF"
                d="M0 0H376.926V1.39H0z"
                transform="matrix(0 -1 -1 0 734.218 391.963)"
              />
              <path
                fill="#3F2588"
                d="M0 0H2.782V376.926H0z"
                transform="matrix(-1 0 0 1 732.828 15.037)"
              />
              <path
                fill="#000"
                d="M326.255 15.197h-2.816V0h90.122v15.197h-3.52l-5.633 5.526h-72.52l-5.633-5.526z"
              />
              <path
                fill="#2A1760"
                d="M323.439 13.124v-2.072h3.52L334 17.96h67.592l7.041-6.908h4.928v2.072h-4.224L403 19.341h-70.408l-6.337-6.217h-2.816z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                strokeWidth="1.35"
                d="M412.857 11.052h-4.225l-7.04 6.908H334l-7.041-6.908h-2.816"
              />
              <path
                fill="#2A1760"
                d="M346.674 13.124l-6.337-6.216h-16.898V3.454h23.939l3.52 3.454h33.092l3.52-3.454h26.051v3.454h-18.306l-6.337 6.216h-42.244z"
              />
              <path
                fill="#3F2588"
                d="M323.439 4.145H413.56100000000004V6.9079999999999995H323.439z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                d="M343.153 4.145l5.633 5.526h38.724l5.633-5.526"
              />
              <path stroke="#AC8FFF" strokeWidth="1.4" d="M413.561 3.454h-90.122" />
              <path
                fill="#000"
                d="M723.068 366.143l7.663-7.749 2.089-2.113v34.517l-11.842 11.975h-48.065v-11.27h41.796l8.359-8.454v-16.906z"
              />
              <path
                fill="#2A1760"
                d="M726.551 385.163l-10.449 10.566h-43.189v-2.113h42.492l9.056-9.158v-17.611l6.27-6.34v-5.635h2.089v7.044l-6.269 6.34v16.907z"
              />
              <path
                fill="#000"
                d="M732.82 360.507H737V366.142H732.82z"
                transform="rotate(180 732.82 360.507)"
              />
              <path
                fill="#2A1760"
                d="M728.641 386.571l-16.022 16.202h-5.573l18.808-19.019v-15.498l6.966-7.044v4.226l-4.179 4.227v16.906z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                strokeWidth="1.35"
                d="M716.102 395.729H673.61"
              />
              <path
                fill="#3F2588"
                d="M730.034 390.093v-35.221h4.179v35.926l-13.235 13.384h-48.065v-4.226h47.368l9.753-9.863z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                d="M709.833 402.773l16.718-16.906v-17.611l6.269-6.34"
              />
              <path
                fill="#000"
                d="M722.371 407h-49.458v-2.818h48.065l13.236-13.384v-35.926H737v37.335L722.371 407z"
              />
              <path
                stroke="#AC8FFF"
                strokeWidth="1.4"
                d="M672.913 403.478h48.065l12.539-12.68v-35.926"
              />
              <path
                fill="#000"
                d="M723.068 40.071l7.663 7.6 2.089 2.073V15.89L720.978 4.145h-48.065V15.2h41.796l8.359 8.291v16.581z"
              />
              <path
                fill="#2A1760"
                d="M726.551 21.418l-10.449-10.364h-43.189v2.073h42.492l9.056 8.981v17.273l6.27 6.218v5.527h2.089v-6.91L726.551 38V21.417z"
              />
              <path
                fill="#000"
                d="M0 0H4.18V5.527H0z"
                transform="matrix(-1 0 0 1 732.82 45.599)"
              />
              <path
                fill="#2A1760"
                d="M728.641 20.036l-16.022-15.89h-5.573l18.808 18.653V38l6.966 6.909v-4.146l-4.179-4.145V20.036z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                strokeWidth="1.35"
                d="M716.102 11.054H673.61"
              />
              <path
                fill="#3F2588"
                d="M730.034 16.581v34.545h4.179V15.89L720.978 2.763h-48.065V6.91h47.368l9.753 9.672z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                d="M709.833 4.145l16.718 16.582v17.272l6.269 6.218"
              />
              <path
                fill="#000"
                d="M722.371 0h-49.458v2.764h48.065l13.236 13.126v35.236H737V14.509L722.371 0z"
              />
              <path
                stroke="#AC8FFF"
                strokeWidth="1.4"
                d="M672.913 3.454h48.065l12.539 12.436v35.236"
              />
              <path
                fill="#000"
                d="M13.932 366.143l-7.663-7.749-2.09-2.113v34.517l11.843 11.975h48.065v-11.27H22.291l-8.359-8.454v-16.906z"
              />
              <path
                fill="#2A1760"
                d="M10.45 385.163l10.448 10.566h43.19v-2.113H21.594l-9.056-9.158v-17.611l-6.27-6.34v-5.635H4.18v7.044l6.27 6.34v16.907z"
              />
              <path
                fill="#000"
                d="M0 0H4.18V5.635H0z"
                transform="matrix(1 0 0 -1 4.18 360.507)"
              />
              <path
                fill="#2A1760"
                d="M8.36 386.571l16.021 16.202h5.573l-18.808-19.019v-15.498l-6.966-7.044v4.226l4.18 4.227v16.906z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                strokeWidth="1.35"
                d="M20.898 395.729H63.39"
              />
              <path
                fill="#3F2588"
                d="M6.966 390.093v-35.221h-4.18v35.926l13.236 13.384h48.065v-4.226H16.72l-9.753-9.863z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                d="M27.167 402.773L10.45 385.867v-17.611l-6.27-6.34"
              />
              <path
                fill="#000"
                d="M14.629 407h49.458v-2.818H16.022L2.786 390.798v-35.926H0v37.335L14.629 407z"
              />
              <path
                stroke="#AC8FFF"
                strokeWidth="1.4"
                d="M64.087 403.478H16.022l-12.54-12.68v-35.926"
              />
              <path
                fill="#000"
                d="M13.932 40.071l-7.663 7.6-2.09 2.073V15.89L16.023 4.145h48.065V15.2H22.291l-8.359 8.291v16.581z"
              />
              <path
                fill="#2A1760"
                d="M10.45 21.418l10.448-10.364h43.19v2.073H21.594l-9.056 8.981v17.273l-6.27 6.218v5.527H4.18v-6.91L10.45 38V21.417z"
              />
              <path fill="#000" d="M4.18 45.599H8.36V51.126H4.18z" />
              <path
                fill="#2A1760"
                d="M8.36 20.036L24.38 4.146h5.573L11.146 22.798V38L4.18 44.908v-4.146l4.18-4.145V20.036z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                strokeWidth="1.35"
                d="M20.898 11.054H63.39"
              />
              <path
                fill="#3F2588"
                d="M6.966 16.581v34.545h-4.18V15.89L16.023 2.763h48.065V6.91H16.72L6.966 16.58z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                d="M27.167 4.145L10.45 20.727v17.272l-6.27 6.218"
              />
              <path
                fill="#000"
                d="M14.629 0h49.458v2.764H16.022L2.786 15.89v35.236H0V14.509L14.629 0z"
              />
              <path
                stroke="#AC8FFF"
                strokeWidth="1.35"
                d="M64.087 3.454H16.022L3.482 15.89v35.236"
              />
            </motion.g>
          )}
        </AnimatePresence>
        {/*------------- TOP LEFT COUNTDOWN -------------*/}
        {expiration && (
          <>
            <path
              fill="url(#paint0_linear_210_20962)"
              d="M14.6 41l-7.7 7.7-2.1 2.1V16.5L18.1 3.2h56v11.9H23l-8.4 8.4V41z"
            />
            <path
              fill="url(#paint1_linear_210_20962)"
              d="M4.8 68.3V48.7l8.4-8.4V22.1l8.4-8.4h53.9l7.7 7.7h25.2v30.1H21.6L4.8 68.3z"
            />
            <path fill="#000" d="M4.8 46.6H9V52.2H4.8z" />
            <path
              stroke="url(#paint2_linear_210_20962)"
              strokeWidth="1.4"
              d="M20.9 11.6h41.3"
            />
            <path
              stroke="#BC4918"
              strokeLinecap="square"
              strokeWidth="1.4"
              d="M27.9 4.6L11.1 21.4v17.5l-6.3 6.3"
            />
            <path
              fill="url(#paint3_linear_210_20962)"
              d="M14.6 23.5l8.4-8.4h54.6v31.5H19.5L9 57.1V46.6l5.6-5.6V23.5z"
            />
            <path
              fill="url(#paint4_linear_210_20962)"
              d="M15.3.4h58.8v2.8H16.7L3.4 16.5v35.7H.6V15.1L15.3.4z"
            />
            <path
              stroke="url(#paint5_linear_210_20962)"
              strokeWidth="1.4"
              d="M62.2 3.9H16.7L4.1 16.5v46.9"
            />
            <path
              stroke="url(#paint6_linear_210_20962)"
              strokeWidth="1.4"
              d="M4.1 16.5v77"
            />
            <path
              stroke="url(#paint7_linear_210_20962)"
              strokeWidth="1.4"
              d="M4.1 63.4L19.5 48h40.6"
            />
          </>
        )}
        {/*------------- BOTTOM RIGHT PRICE -------------*/}
        {price && (
          <>
            <path
              fill="#000"
              d="M720.15 402.2H612.7l61.6-61.6h27.3l30.8-30.1v79.527L720.15 402.2z"
              opacity="0.9"
            />
            <path
              fill="url(#paint8_linear_210_20962)"
              fillOpacity="0.7"
              fillRule="evenodd"
              d="M677.39 344.1l-58.1 58.1h-1.98l58.1-58.1h1.98z"
              clipRule="evenodd"
            />
            <path
              fill="url(#paint9_linear_210_20962)"
              fillRule="evenodd"
              d="M732.4 315.69l-29.81 29.81h-26.584l1.4-1.4h24.604l30.39-30.39v1.98z"
              clipRule="evenodd"
              opacity="0.5"
            />
            <path
              stroke="url(#paint10_radial_210_20962)"
              strokeWidth="1.4"
              d="M584 402.9h136.5l12.6-12.6V293"
            />
            <path
              fill="#AC8FFF"
              fillRule="evenodd"
              d="M732.4 328.29l-23.8 23.8-.99-.99 24.79-24.79v1.98z"
              clipRule="evenodd"
              opacity="0.6"
            />
            <path
              fill="#AC8FFF"
              fillRule="evenodd"
              d="M639.3 381.9v13.59l-6.71 6.71h-1.98l7.29-7.29V381.9h1.4z"
              clipRule="evenodd"
              opacity="0.5"
            />
          </>
        )}
        <defs>
          <linearGradient
            id="paint0_linear_210_20962"
            x1="24.4"
            x2="58"
            y1="14.795"
            y2="14.795"
            gradientUnits="userSpaceOnUse"
          >
            <stop />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint1_linear_210_20962"
            x1="54.5"
            x2="108.4"
            y1="27"
            y2="27"
            gradientUnits="userSpaceOnUse"
          >
            <stop />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint2_linear_210_20962"
            x1="34.9"
            x2="61.5"
            y1="12.6"
            y2="12.6"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#BC4918" />
            <stop offset="1" stopColor="#BC4918" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint3_linear_210_20962"
            x1="15.3"
            x2="33.5"
            y1="15.8"
            y2="43.8"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#4E0405" />
            <stop offset="1" stopColor="#4E0405" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint4_linear_210_20962"
            x1="54.797"
            x2="74.1"
            y1="13.018"
            y2="13.018"
            gradientUnits="userSpaceOnUse"
          >
            <stop />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint5_linear_210_20962"
            x1="23.795"
            x2="61.215"
            y1="64.1"
            y2="64.1"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#BC4918" />
            <stop offset="1" stopColor="#BC4918" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint6_linear_210_20962"
            x1="4.6"
            x2="4.6"
            y1="64.099"
            y2="92.8"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#BC4918" />
            <stop offset="1" stopColor="#BC4918" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint7_linear_210_20962"
            x1="23.083"
            x2="59.151"
            y1="63.4"
            y2="63.4"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#BC4918" />
            <stop offset="1" stopColor="#BC4918" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint8_linear_210_20962"
            x1="640.7"
            x2="687.6"
            y1="382.6"
            y2="335.7"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.692" stopColor="#AC8FFF" />
            <stop offset="1" stopColor="#AC8FFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint9_linear_210_20962"
            x1="714.9"
            x2="645.6"
            y1="310.5"
            y2="372.1"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#AC8FFF" />
            <stop offset="1" stopColor="#AC8FFF" stopOpacity="0" />
          </linearGradient>
          <radialGradient
            id="paint10_radial_210_20962"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(0 -101.5 132.236 0 720.5 404.3)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#AC8FFF" />
            <stop offset="0.503" stopColor="#AC8FFF" />
            <stop offset="1" stopColor="#AC8FFF" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    )
  }
)

HorizontalFrame.displayName = 'HorizontalFrame'
