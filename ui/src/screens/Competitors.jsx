import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiService from '../services/api'

function Competitors({ appConfig }) {
  const [competitors, setCompetitors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [discovering, setDiscovering] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Try to load cached competitors
    const cached = localStorage.getItem('competitors')
    if (cached) {
      setCompetitors(JSON.parse(cached))
    }
  }, [])

  const handleDiscoverCompetitors = async () => {
    setDiscovering(true)
    setError(null)

    try {
      const response = await apiService.discoverCompetitors(appConfig.appId)
      const discovered = response.data.competitors
      setCompetitors(discovered)
      localStorage.setItem('competitors', JSON.stringify(discovered))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to discover competitors')
    } finally {
      setDiscovering(false)
    }
  }

  const handleViewSwot = async (competitor) => {
    setLoading(true)
    setError(null)

    try {
      // Check if we have data for this competitor
      const datasetCached = localStorage.getItem('competitorDataset')

      if (!datasetCached) {
        // Need to fetch competitor data first
        await apiService.fetchCompetitorData(
          { appId: appConfig.appId, name: appConfig.name },
          [competitor.appId],
          90
        )
      }

      navigate(`/swot/${competitor.appId}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load competitor data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1 className="page-title">Competitors</h1>
            <p className="page-subtitle">Discover and analyze your competition</p>
          </div>
          <button
            onClick={handleDiscoverCompetitors}
            className="btn btn-primary"
            disabled={discovering}
          >
            {discovering ? 'Discovering...' : 'Discover Competitors'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {discovering && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analyzing your app and discovering competitors...</p>
        </div>
      )}

      {!discovering && competitors.length > 0 && (
        <div className="grid grid-3">
          {competitors.map((competitor) => (
            <div key={competitor.appId} className="card">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  {competitor.name}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '12px' }}>
                  {competitor.seller}
                </p>
                <div style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                  {competitor.genre}
                </div>
              </div>

              <div className="flex-between" style={{ marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Rating</div>
                  <div style={{ fontSize: '20px', fontWeight: '600' }}>
                    ⭐ {competitor.rating?.toFixed(1) || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Match Score</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--primary)' }}>
                    {(competitor.score * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleViewSwot(competitor)}
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
                disabled={loading}
              >
                View SWOT Analysis
              </button>
            </div>
          ))}
        </div>
      )}

      {!discovering && competitors.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">No competitors discovered yet</div>
            <p>Click "Discover Competitors" to find apps similar to yours</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Competitors
