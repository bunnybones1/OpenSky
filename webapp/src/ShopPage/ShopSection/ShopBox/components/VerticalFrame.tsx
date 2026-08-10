import { AnimatePresence, motion } from 'framer-motion'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface VerticalFrameProps {
  price: number
  expiration: string
  isHovered: boolean
}

export const VerticalFrame = memo(
  ({ price, expiration, isHovered }: VerticalFrameProps) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 239 407"
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
          d="M0.8 390.8H376V399.2H0.8z"
          transform="rotate(-90 .8 390.8)"
        />
        <path
          fill="#705BAB"
          d="M3.6 390.8H378.8V392.2H3.6z"
          transform="rotate(-90 3.6 390.8)"
        />
        <path fill="#000" d="M16.2 0.2H223.39999999999998V15.6H16.2z" />
        <path fill="#705BAB" d="M16.2 3H223.39999999999998V4.4H16.2z" />
        <path fill="#4D3C7B" d="M16.2 10.7H223.39999999999998V12.1H16.2z" />
        <path
          fill="#000"
          d="M0 0H207.2V15.4H0z"
          transform="matrix(1 0 0 -1 16.2 406.2)"
        />
        <path
          fill="#705BAB"
          d="M0 0H207.2V1.4H0z"
          transform="matrix(1 0 0 -1 16.2 403.4)"
        />
        <path
          fill="#4D3C7B"
          d="M0 0H207.2V1.4H0z"
          transform="matrix(1 0 0 -1 16.2 395.7)"
        />
        <path
          fill="#000"
          d="M0 0H375.2V8.4H0z"
          transform="matrix(0 -1 -1 0 238.8 390.8)"
        />
        <path
          fill="#705BAB"
          d="M0 0H375.2V1.4H0z"
          transform="matrix(0 -1 -1 0 236 390.8)"
        />
        <path
          fill="#000"
          d="M14.8 40.8l-7.7 7.7L5 50.6V16.3L16.9 4.4h48.3v11.2h-42L14.8 24v16.8z"
        />
        <path fill="#000" d="M5 46.4H9.2V52H5z" />
        <path
          stroke="#4D3C7B"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M21.8 11.4h42.7"
        />
        <path
          stroke="#705BAB"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M28.1 4.4L11.3 21.2v17.5L5 45"
        />
        <path fill="#000" d="M15.5.2h49.7V3H16.9L3.6 16.3V52H.8V14.9L15.5.2z" />
        <path stroke="#705BAB" strokeWidth="1.4" d="M65.2 3.7H16.9L4.3 16.3V52" />
        <path
          fill="#000"
          d="M14.8 365.6l-7.7-7.7-2.1-2.1v34.3L16.9 402h48.3v-11.2h-42l-8.4-8.4v-16.8z"
        />
        <path fill="#000" d="M0 0H4.2V5.6H0z" transform="matrix(1 0 0 -1 5 360)" />
        <path
          stroke="#4D3C7B"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M21.8 395h42.7"
        />
        <path
          stroke="#705BAB"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M28.1 402l-16.8-16.8v-17.5L5 361.4"
        />
        <path
          fill="#000"
          d="M15.5 406.2h49.7v-2.8H16.9L3.6 390.1v-35.7H.8v37.1l14.7 14.7z"
        />
        <path
          stroke="#705BAB"
          strokeWidth="1.4"
          d="M65.2 402.7H16.9L4.3 390.1v-35.7"
        />
        <path
          fill="#000"
          d="M224.8 40.8l7.7 7.7 2.1 2.1V16.3L222.7 4.4h-48.3v11.2h42l8.4 8.4v16.8z"
        />
        <path
          fill="#000"
          d="M0 0H4.2V5.6H0z"
          transform="matrix(-1 0 0 1 234.6 46.4)"
        />
        <path
          stroke="#4D3C7B"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M217.8 11.4h-42.7"
        />
        <path
          stroke="#705BAB"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M211.5 4.4l16.8 16.8v17.5l6.3 6.3"
        />
        <path fill="#000" d="M224.1.2h-49.7V3h48.3L236 16.3V52h2.8V14.9L224.1.2z" />
        <path stroke="#705BAB" strokeWidth="1.4" d="M174.4 3.7h48.3l12.6 12.6V52" />
        <path
          fill="#000"
          d="M224.8 365.6l7.7-7.7 2.1-2.1v34.3L222.7 402h-48.3v-11.2h42l8.4-8.4v-16.8z"
        />
        <path
          fill="#000"
          d="M234.6 360H238.79999999999998V365.6H234.6z"
          transform="rotate(180 234.6 360)"
        />
        <path
          stroke="#4D3C7B"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M217.8 395h-42.7"
        />
        <path
          stroke="#705BAB"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M211.5 402l16.8-16.8v-17.5l6.3-6.3"
        />
        <path
          fill="#000"
          d="M224.1 406.2h-49.7v-2.8h48.3l13.3-13.3v-35.7h2.8v37.1l-14.7 14.7z"
        />
        <path
          stroke="#705BAB"
          strokeWidth="1.4"
          d="M174.4 402.7h48.3l12.6-12.6v-35.7"
        />
        <path
          fill="#000"
          d="M77.8 15.6H75V.2h89.6v15.4h-3.5l-5.6 5.6H83.4l-5.6-5.6z"
        />
        <path
          stroke="#705BAB"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M94.6 4.4l5.6 5.6h38.5l5.6-5.6"
        />
        <path stroke="#705BAB" strokeWidth="1.4" d="M164.6 3.7H75" />
        <path
          stroke="#4D3C7B"
          strokeLinecap="square"
          strokeWidth="1.4"
          d="M163.9 11.4h-4.2l-7 7H85.5l-7-7h-2.8"
        />
        <AnimatePresence>
          {isHovered && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <path fill="#000" d="M15 0H223V16H15z" />
              <path fill="#705BAB" d="M15 2.909H223V4.364H15z" />
              <path fill="#4D3C7B" d="M15 10.909H223V12.364H15z" />
              <path fill="#000" d="M15.602 0H223.602V16H15.602z" />
              <path fill="#AC8FFF" d="M15.602 2.909H223.602V4.364H15.602z" />
              <path
                fill="#5E3EB9"
                d="M15.602 10.909H223.602V12.459000000000001H15.602z"
              />
              <path fill="#3F2588" d="M15.602 4.364H223.602V7.273H15.602z" />
              <path fill="#2A1760" d="M15.602 12.364H223.602V13.819H15.602z" />
              <path
                fill="#000"
                d="M0 391.2H375.2V399.59999999999997H0z"
                transform="rotate(-90 0 391.2)"
              />
              <path
                fill="#AC8FFF"
                d="M2.8 391.2H378V392.59999999999997H2.8z"
                transform="rotate(-90 2.8 391.2)"
              />
              <path
                fill="#3F2588"
                d="M0 0H2.8V375.2H0z"
                transform="matrix(1 0 0 1 4.2 16)"
              />
              <path
                fill="#000"
                d="M0 0H375V8.333H0z"
                transform="matrix(0 -1 -1 0 238 390)"
              />
              <path
                fill="#AC8FFF"
                d="M0 0H375V1.389H0z"
                transform="matrix(0 -1 -1 0 235.222 390)"
              />
              <path
                fill="#3F2588"
                d="M0 0H2.778V375H0z"
                transform="matrix(-1 0 0 1 233.833 15)"
              />
              <path
                fill="#000"
                d="M0 0H208V15.5H0z"
                transform="matrix(1 0 0 -1 15 406)"
              />
              <path
                fill="#AC8FFF"
                d="M0 0H208V1.409H0z"
                transform="matrix(1 0 0 -1 15 403.182)"
              />
              <path
                fill="#5E3EB9"
                d="M0 0H208V1.409H0z"
                transform="matrix(1 0 0 -1 15 395.432)"
              />
              <path
                fill="#3F2588"
                d="M0 0H208V2.818H0z"
                transform="matrix(1 0 0 -1 15 401.773)"
              />
              <path
                fill="#2A1760"
                d="M0 0H208V1.409H0z"
                transform="matrix(1 0 0 -1 15 394.023)"
              />
              <path
                fill="#000"
                d="M14 40.6l-7.7 7.7-2.1 2.1V16.1L16.1 4.2h48.3v11.2h-42L14 23.8v16.8z"
              />
              <path fill="#000" d="M4.2 46.2H8.4V51.800000000000004H4.2z" />
              <path
                stroke="#4D3C7B"
                strokeLinecap="square"
                strokeWidth="1.4"
                d="M20.87 11.46h42.434"
              />
              <path
                stroke="#705BAB"
                strokeLinecap="square"
                strokeWidth="1.4"
                d="M27.13 4.297l-16.695 17.19v17.905l-6.261 6.446"
              />
              <path
                fill="#000"
                d="M14.7 0h49.7v2.8H16.1L2.8 16.1v35.7H0V14.7L14.7 0z"
              />
              <path
                stroke="#705BAB"
                strokeWidth="1.4"
                d="M64.4 3.5H16.1L3.5 16.1v35.7"
              />
              <path
                fill="#000"
                d="M14.043 41.701L6.319 49.61l-2.106 2.157v-35.23L16.149 4.314h48.447v11.504H22.468l-8.425 8.627v17.256z"
              />
              <path
                fill="#2A1760"
                d="M10.532 22.289l10.532-10.785h43.532v2.157h-42.83l-9.127 9.347v17.974l-6.32 6.471v5.752H4.213v-7.19l6.32-6.47V22.288z"
              />
              <path fill="#000" d="M4.213 47.453H8.426V53.205000000000005H4.213z" />
              <path
                fill="#2A1760"
                d="M8.426 20.85L24.575 4.314h5.617L11.234 23.727v15.817l-7.021 7.19V42.42l4.213-4.314V20.85z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                strokeWidth="1.35"
                d="M21.064 11.504h42.83"
              />
              <path
                fill="#3F2588"
                d="M7.021 17.256v35.949H2.81V16.537l13.34-13.661h48.447V7.19H16.851l-9.83 10.066z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                d="M27.383 4.314L10.533 21.57v17.974l-6.32 6.47"
              />
              <path
                fill="#000"
                d="M14.745 0h49.851v2.876H16.15L2.81 16.536v36.669H0V15.099L14.745 0z"
              />
              <path
                stroke="#AC8FFF"
                strokeWidth="1.35"
                d="M64.596 3.595H16.15L3.511 16.536v36.669"
              />
              <path
                fill="#000"
                d="M14 365.4l-7.7-7.7-2.1-2.1v34.3l11.9 11.9h48.3v-11.2h-42l-8.4-8.4v-16.8z"
              />
              <path
                fill="#000"
                d="M0 0H4.2V5.6H0z"
                transform="matrix(1 0 0 -1 4.2 359.8)"
              />
              <path
                stroke="#4D3C7B"
                strokeLinecap="square"
                strokeWidth="1.4"
                d="M21.196 394.757h43.098"
              />
              <path
                stroke="#705BAB"
                strokeLinecap="square"
                strokeWidth="1.4"
                d="M27.555 401.784l-16.957-16.865v-17.568l-6.359-6.324"
              />
              <path
                fill="#000"
                d="M14.7 406h49.7v-2.8H16.1L2.8 389.9v-35.7H0v37.1L14.7 406z"
              />
              <path
                stroke="#705BAB"
                strokeWidth="1.4"
                d="M64.4 402.5H16.1L3.5 389.9v-35.7"
              />
              <path
                fill="#000"
                d="M14.043 365.086l-7.724-7.76-2.106-2.116v34.566l11.936 11.992h48.447v-11.287H22.468l-8.425-8.465v-16.93z"
              />
              <path
                fill="#2A1760"
                d="M10.532 384.132l10.532 10.581h43.532v-2.116h-42.83l-9.127-9.17v-17.636l-6.32-6.348v-5.644H4.213v7.054l6.32 6.349v16.93z"
              />
              <path
                fill="#000"
                d="M0 0H4.213V5.643H0z"
                transform="matrix(1 0 0 -1 4.213 359.442)"
              />
              <path
                fill="#2A1760"
                d="M8.426 385.543l16.149 16.225h5.617l-18.958-19.047v-15.519l-7.021-7.054v4.233l4.213 4.232v16.93z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                strokeWidth="1.35"
                d="M21.064 394.713h43.83"
              />
              <path
                fill="#3F2588"
                d="M7.021 389.07v-35.271H2.81v35.976l13.34 13.403h48.447v-4.232H16.851l-9.83-9.876z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                d="M27.383 401.768l-16.85-16.93v-17.636l-6.32-6.349"
              />
              <path
                fill="#000"
                d="M14.745 406h49.851v-2.822H16.15L2.81 389.775v-35.976H0v37.387L14.745 406z"
              />
              <path
                stroke="#AC8FFF"
                strokeWidth="1.35"
                d="M64.596 402.473H16.15L3.511 389.776v-35.977"
              />
              <path
                fill="#000"
                d="M223.869 42.324l7.772 8.027 2.12 2.19V16.784L221.75 4.378H173v11.676h42.391l8.478 8.757v17.513z"
              />
              <path
                fill="#2A1760"
                d="M227.402 22.622l-10.598-10.946H173v2.189h43.098l9.184 9.487v18.243l6.359 6.567V54h2.12v-7.297l-6.359-6.568V22.622z"
              />
              <path
                fill="#000"
                d="M0 0H4.239V5.838H0z"
                transform="matrix(-1 0 0 1 233.761 48.162)"
              />
              <path
                fill="#2A1760"
                d="M229.522 21.162l-16.25-16.784h-5.653l19.077 19.703v16.054l7.065 7.297v-4.378l-4.239-4.378V21.162z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                strokeWidth="1.35"
                d="M216.804 11.676h-43.098"
              />
              <path
                fill="#3F2588"
                d="M230.935 17.514V54h4.239V16.784L221.75 2.919H173v4.378h48.043l9.892 10.217z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                d="M210.446 4.378l16.956 17.514v18.243l6.359 6.568"
              />
              <path
                fill="#000"
                d="M223.163 0H173v2.919h48.75l13.424 13.865V54H238V15.324L223.163 0z"
              />
              <path
                stroke="#AC8FFF"
                strokeWidth="1.35"
                d="M173 3.648h48.75l12.717 13.136V54"
              />
              <path
                fill="#000"
                d="M77.813 15.813H75V0h90v15.813h-3.516l-5.625 5.75H83.437l-5.624-5.75z"
              />
              <path
                fill="#2A1760"
                d="M75 13.656V11.5h3.516l7.03 7.188h67.501l7.031-7.188H165v2.156h-4.219l-6.328 6.469H84.141l-6.329-6.469H75z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                strokeWidth="1.35"
                d="M164.297 11.5h-4.219l-7.031 7.188h-67.5L78.516 11.5h-2.813"
              />
              <path
                fill="#2A1760"
                d="M98.203 13.656l-6.328-6.469H75V3.595h23.906l3.516 3.594h33.047l3.515-3.594H165v3.594h-18.281l-6.328 6.468H98.203z"
              />
              <path fill="#3F2588" d="M75 4.313H165V7.188H75z" />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                d="M94.688 4.313l5.625 5.75h38.671l5.625-5.75"
              />
              <path stroke="#AC8FFF" strokeWidth="1.35" d="M165 3.594H75" />
              <path
                fill="#000"
                d="M223.869 365.243l7.772-7.73 2.12-2.108v34.433l-12.011 11.946H173V390.54h42.391l8.478-8.432v-16.865z"
              />
              <path
                fill="#2A1760"
                d="M227.402 384.216l-10.598 10.541H173v-2.108h43.098l9.184-9.135v-17.568l6.359-6.324V354h2.12v7.027l-6.359 6.324v16.865z"
              />
              <path
                fill="#000"
                d="M233.761 359.622H238V365.244H233.761z"
                transform="rotate(180 233.761 359.622)"
              />
              <path
                fill="#2A1760"
                d="M229.522 385.622l-16.25 16.162h-5.653l19.077-18.973v-15.46l7.065-7.027v4.216l-4.239 4.217v16.865z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                strokeWidth="1.35"
                d="M216.804 394.757h-43.098"
              />
              <path
                fill="#3F2588"
                d="M230.935 389.135V354h4.239v35.838l-13.424 13.351H173v-4.216h48.043l9.892-9.838z"
              />
              <path
                stroke="#5E3EB9"
                strokeLinecap="square"
                d="M210.446 401.784l16.956-16.865v-17.568l6.359-6.324"
              />
              <path
                fill="#000"
                d="M223.163 406H173v-2.811h48.75l13.424-13.351V354H238v37.243L223.163 406z"
              />
              <path
                stroke="#AC8FFF"
                strokeWidth="1.35"
                d="M173 402.486h48.75l12.717-12.648V354"
              />
            </motion.g>
          )}
        </AnimatePresence>
        {/*------------- TOP LEFT COUNTDOWN -------------*/}
        {expiration && (
          <>
            <path
              fill="url(#paint0_linear_207_22042)"
              d="M14.8 40.8l-7.7 7.7L5 50.6V16.3L18.3 3h56v11.9H23.2l-8.4 8.4v17.5z"
            />
            <path
              fill="url(#paint1_linear_207_22042)"
              d="M5 68.1V48.5l8.4-8.4V21.9l8.4-8.4h53.9l7.7 7.7h25.2v30.1H21.8L5 68.1z"
            />
            <path fill="#000" d="M5 46.4H9.2V52H5z" />
            <path
              stroke="url(#paint2_linear_207_22042)"
              strokeWidth="1.4"
              d="M21.1 11.4h41.3"
            />
            <path
              stroke="#BC4918"
              strokeLinecap="square"
              strokeWidth="1.4"
              d="M28.1 4.4L11.3 21.2v17.5L5 45"
            />
            <path
              fill="url(#paint3_linear_207_22042)"
              d="M14.8 23.3l8.4-8.4h54.6v31.5H19.7L9.2 56.9V46.4l5.6-5.6V23.3z"
            />
            <path
              fill="url(#paint4_linear_207_22042)"
              d="M15.5.2h58.8V3H16.9L3.6 16.3V52H.8V14.9L15.5.2z"
            />
            <path
              stroke="url(#paint5_linear_207_22042)"
              strokeWidth="1.4"
              d="M62.4 3.7H16.9L4.3 16.3v46.9"
            />
            <path
              stroke="url(#paint6_linear_207_22042)"
              strokeWidth="1.4"
              d="M4.3 16.3v77"
            />
            <path
              stroke="url(#paint7_linear_207_22042)"
              strokeWidth="1.4"
              d="M4.3 63.2l15.4-15.4h40.6"
            />
          </>
        )}
        {/*------------- BOTTOM RIGHT PRICE -------------*/}
        {price && (
          <>
            <path
              fill="#000"
              d="M222.35 402H114.9l61.6-61.6h27.3l30.8-30.1v79.527L222.35 402z"
              opacity="0.9"
            />
            <path
              fill="url(#paint8_linear_207_22042)"
              fillOpacity="0.7"
              fillRule="evenodd"
              d="M179.59 343.9l-58.1 58.101h-1.98l58.1-58.101h1.98z"
              clipRule="evenodd"
            />
            <path
              fill="url(#paint9_linear_207_22042)"
              fillRule="evenodd"
              d="M234.6 315.49l-29.81 29.81h-26.584l1.4-1.4h24.604l30.39-30.39v1.98z"
              clipRule="evenodd"
              opacity="0.5"
            />
            <path
              stroke="url(#paint10_radial_207_22042)"
              strokeWidth="1.4"
              d="M86.2 402.7h136.5l12.6-12.6v-97.3"
            />
            <path
              fill="#AC8FFF"
              fillRule="evenodd"
              d="M234.6 328.09l-23.8 23.8-.99-.99 24.79-24.79v1.98z"
              clipRule="evenodd"
              opacity="0.6"
            />
            <path
              fill="#AC8FFF"
              fillRule="evenodd"
              d="M141.5 381.7v13.59l-6.71 6.71h-1.98l7.29-7.29V381.7h1.4z"
              clipRule="evenodd"
              opacity="0.5"
            />
          </>
        )}
        <defs>
          <linearGradient
            id="paint0_linear_207_22042"
            x1="24.6"
            x2="58.2"
            y1="14.595"
            y2="14.595"
            gradientUnits="userSpaceOnUse"
          >
            <stop />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint1_linear_207_22042"
            x1="54.7"
            x2="108.6"
            y1="26.8"
            y2="26.8"
            gradientUnits="userSpaceOnUse"
          >
            <stop />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint2_linear_207_22042"
            x1="35.1"
            x2="61.7"
            y1="12.4"
            y2="12.4"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#BC4918" />
            <stop offset="1" stopColor="#BC4918" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint3_linear_207_22042"
            x1="15.5"
            x2="33.7"
            y1="15.6"
            y2="43.6"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#4E0405" />
            <stop offset="1" stopColor="#4E0405" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint4_linear_207_22042"
            x1="54.997"
            x2="74.3"
            y1="12.818"
            y2="12.818"
            gradientUnits="userSpaceOnUse"
          >
            <stop />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint5_linear_207_22042"
            x1="23.995"
            x2="61.415"
            y1="63.9"
            y2="63.9"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#BC4918" />
            <stop offset="1" stopColor="#BC4918" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint6_linear_207_22042"
            x1="4.8"
            x2="4.8"
            y1="63.899"
            y2="92.6"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#BC4918" />
            <stop offset="1" stopColor="#BC4918" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint7_linear_207_22042"
            x1="23.283"
            x2="59.351"
            y1="63.2"
            y2="63.2"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#BC4918" />
            <stop offset="1" stopColor="#BC4918" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint8_linear_207_22042"
            x1="142.9"
            x2="189.8"
            y1="382.401"
            y2="335.501"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.692" stopColor="#AC8FFF" />
            <stop offset="1" stopColor="#AC8FFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint9_linear_207_22042"
            x1="217.1"
            x2="147.8"
            y1="310.3"
            y2="371.9"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#AC8FFF" />
            <stop offset="1" stopColor="#AC8FFF" stopOpacity="0" />
          </linearGradient>
          <radialGradient
            id="paint10_radial_207_22042"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(0 -101.5 132.236 0 222.7 404.1)"
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

VerticalFrame.displayName = 'VerticalFrame'
