import type { FC } from 'react'
import { useEffect } from 'react'
import { useGlobalStore } from '@/store'
const App: FC = () => {
  const phase = useGlobalStore((state) => state.phase)
  const setPhase = useGlobalStore((state) => state.setPhase)

  useEffect(() => {
    console.log(123)
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        left: '0px',
        top: '0px'
      }}
    ></div>
  )
}

export default App
