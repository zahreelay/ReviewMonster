import React, { useState, useEffect } from 'react'
import apiService from '../services/api'

function ReleaseTimeline() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTimeline()
  }, [])

  const fetchTimeline = async () => {
    try {
      const response = await apiService.getReleaseTimeline()
      setData(response.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load release timeline')
    } finally {
      setLoading(false)
    }
  }

  const getSentimentTrend = (before, after) => {
    const diff = after - before
    if (Math.abs(diff) < 0.1) return { icon: '→', color: 'var(--gray-600)', text: 'Stable' }
    if (diff > 0) return { icon: '↗', color: 'var(--success)', text: 'Improved' }
    return { icon: '↘', color: 'var(--danger)', text: 'Declined' }
  }

  if (loading) {
    return (
      <div className="container page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading release timeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container page">
        <div className="alert alert-danger">{error}</div>
      </div>
    )
  }

  return (
    <div className="container page">
      <div className="page-header">
        <h1 className="page-title">Release Timeline</h1>
        <p className="page-subtitle">Track sentiment impact across versions</p>
      </div>

      {data && data.versions && data.versions.length > 0 ? (
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute',
            left: '24px',
            top: '60px',
            bottom: '60px',
            width: '2px',
            background: 'var(--gray-200)'
          }}></div>

          {data.versions.map((version, idx) => {
            const trend = getSentimentTrend(version.sentimentBefore, version.sentimentAfter)

            return (
              <div key={idx} style={{ position: 'relative', marginBottom: '32px' }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: '16px',
                  top: '24px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: 'white',
                  border: `3px solid ${trend.color}`,
                  zIndex: 1
                }}></div>

                <div style={{ marginLeft: '56px' }}>
                  <div className="card">
                    <div className="flex-between mb-4">
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                          Version {version.version}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                          Released {new Date(version.releaseDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '24px' }}>{trend.icon}</div>
                        <div style={{ fontSize: '14px', color: trend.color, fontWeight: '600' }}>
                          {trend.text}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-3 mb-4">
                      <div>
                        <div className="metric-label">Sentiment Before</div>
                        <div className="metric-value" style={{ fontSize: '24px' }}>
                          ⭐ {version.sentimentBefore.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="metric-label">Sentiment After</div>
                        <div className="metric-value" style={{ fontSize: '24px', color: trend.color }}>
                          ⭐ {version.sentimentAfter.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="metric-label">Reviews</div>
                        <div className="metric-value" style={{ fontSize: '24px' }}>
                          {version.reviewCount}
                        </div>
                      </div>
                    </div>

                    {version.newIssues && version.newIssues.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--danger)' }}>
                          🔴 New Issues
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {version.newIssues.map((issue, i) => (
                            <span key={i} className="badge badge-critical">
                              {issue.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {version.resolvedIssues && version.resolvedIssues.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--success)' }}>
                          ✅ Resolved Issues
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {version.resolvedIssues.map((issue, i) => (
                            <span key={i} className="badge badge-positive">
                              {issue.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">No release data available</div>
            <p>Release timeline will appear here once we have version data</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReleaseTimeline
