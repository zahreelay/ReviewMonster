import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Onboarding from './screens/Onboarding'
import Overview from './screens/Overview'
import YourProduct from './screens/YourProduct'
import ReleaseTimeline from './screens/ReleaseTimeline'
import Competitors from './screens/Competitors'
import SwotComparison from './screens/SwotComparison'
import QueryConsole from './screens/QueryConsole'

function App() {
  const [appConfig, setAppConfig] = useState(() => {
    const saved = localStorage.getItem('appConfig')
    return saved ? JSON.parse(saved) : null
  })

  const [isOnboarded, setIsOnboarded] = useState(!!appConfig)

  useEffect(() => {
    if (appConfig) {
      localStorage.setItem('appConfig', JSON.stringify(appConfig))
      setIsOnboarded(true)
    }
  }, [appConfig])

  const handleOnboardingComplete = (config) => {
    setAppConfig(config)
  }

  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Header appConfig={appConfig} />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/your-product" element={<YourProduct />} />
            <Route path="/release-timeline" element={<ReleaseTimeline />} />
            <Route path="/competitors" element={<Competitors appConfig={appConfig} />} />
            <Route path="/swot/:competitorId" element={<SwotComparison appConfig={appConfig} />} />
            <Route path="/query" element={<QueryConsole />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
