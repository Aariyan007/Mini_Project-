import React, { useState } from 'react'
import Home from './pages/Home'
import PageLoader from './components/PageLoader'

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <PageLoader onLoadComplete={() => setIsLoading(false)} />
      <Home />
    </>
  )
}

export default App