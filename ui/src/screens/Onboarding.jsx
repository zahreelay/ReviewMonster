import React, { useState } from 'react'
import apiService from '../services/api'

const STAGES = {
  INPUT: 'input',
  CONFIRM: 'confirm',
  LOADING: 'loading',
  ERROR: 'error',
}

function Onboarding({ onComplete }) {
  const [stage, setStage] = useState(STAGES.INPUT)
  const [appId, setAppId] = useState('')
  const [appMetadata, setAppMetadata] = useState(null)
  const [error, setError] = useState(null)
  const [loadingStage, setLoadingStage] = useState('')

  const handleFetchMetadata = async (e) => {
    e.preventDefault()
    if (!appId.trim()) return

    setStage(STAGES.LOADING)
    setLoadingStage('Fetching app metadata...')

    try {
      const response = await apiService.fetchAppMetadata(appId.trim())
      setAppMetadata(response.data)
      setStage(STAGES.CONFIRM)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch app metadata')
      setStage(STAGES.ERROR)
    }
  }

  const handleConfirm = async () => {
    setStage(STAGES.LOADING)
    setLoadingStage('Downloading reviews...')

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLoadingStage('Analyzing reviews with AI...')

      await apiService.initializeApp(true)

      await new Promise(resolve => setTimeout(resolve, 1000))
      setLoadingStage('Generating insights...')

      await new Promise(resolve => setTimeout(resolve, 1000))

      onComplete(appMetadata)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initialize app')
      setStage(STAGES.ERROR)
    }
  }

  const handleTryAgain = () => {
    setStage(STAGES.INPUT)
    setAppId('')
    setAppMetadata(null)
    setError(null)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ maxWidth: '600px', width: '100%', padding: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🦖</div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: 'var(--gray-900)' }}>
            ReviewMonster
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--gray-600)', marginBottom: '32px' }}>
            Product Intelligence, not just review analytics
          </p>

          {stage === STAGES.INPUT && (
            <form onSubmit={handleFetchMetadata}>
              <div className="input-group">
                <label className="input-label" style={{ textAlign: 'left' }}>
                  Enter App Store ID
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., 1081530898"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  autoFocus
                />
                <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '8px', textAlign: 'left' }}>
                  Find your App Store ID in App Store Connect or in the app's URL
                </p>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Get Started
              </button>
            </form>
          )}

          {stage === STAGES.CONFIRM && appMetadata && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <img
                  src={appMetadata.icon}
                  alt={appMetadata.name}
                  style={{ width: '80px', height: '80px', borderRadius: '16px', margin: '0 auto 16px' }}
                />
                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                  {appMetadata.name}
                </h2>
                <p style={{ color: 'var(--gray-600)', marginBottom: '16px' }}>
                  by {appMetadata.seller}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--gray-900)' }}>
                      ⭐ {appMetadata.rating?.toFixed(1) || 'N/A'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Rating</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--gray-900)' }}>
                      {appMetadata.ratingCount?.toLocaleString() || 'N/A'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Reviews</div>
                  </div>
                </div>
                <div style={{ background: 'var(--gray-50)', padding: '12px', borderRadius: '6px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '4px' }}>
                    {appMetadata.genre}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                    Version {appMetadata.version}
                  </div>
                </div>
              </div>

              <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: '16px' }}>
                <strong>Note:</strong> Once confirmed, this app will be locked and cannot be changed.
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleTryAgain} className="btn btn-secondary" style={{ flex: 1 }}>
                  Try Different App
                </button>
                <button onClick={handleConfirm} className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm & Continue
                </button>
              </div>
            </div>
          )}

          {stage === STAGES.LOADING && (
            <div className="loading">
              <div className="spinner"></div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-900)' }}>
                {loadingStage}
              </p>
              <p style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                This may take a few moments...
              </p>
            </div>
          )}

          {stage === STAGES.ERROR && (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <div className="alert alert-danger" style={{ textAlign: 'left', marginBottom: '16px' }}>
                {error}
              </div>
              <button onClick={handleTryAgain} className="btn btn-primary" style={{ width: '100%' }}>
                Try Again
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'white', fontSize: '14px' }}>
          "We don't show you review data. We tell you what to do about it."
        </p>
      </div>
    </div>
  )
}

export default Onboarding
