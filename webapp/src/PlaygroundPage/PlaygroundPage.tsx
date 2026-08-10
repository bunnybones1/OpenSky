import { memo, useCallback } from 'react'

import { SoundClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

// Put whatever you want here. Wont be deployed to prod.
const PlaygroundPage = memo(() => {
  const onClick = useCallback(() => {
    SoundClient.playSound('BackReturnSwipe')
  }, [])

  return (
    <>
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '120px'
        })}
      >
        <Button
          onClick={onClick}
          text="Sound!"
          frameType="default"
          colorType="default"
        />
      </div>
    </>
  )
})

PlaygroundPage.displayName = 'Playground'

export default PlaygroundPage
