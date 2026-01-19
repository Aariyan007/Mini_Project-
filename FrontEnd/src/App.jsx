import React, { useState } from 'react'
import Home from './pages/Home'
import PageLoader from './components/PageLoader'
import Navbar from './components/Navbar'

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <Navbar />
      <PageLoader onLoadComplete={() => setIsLoading(false)} />
      <Home />
    </>
  )
}

export default App