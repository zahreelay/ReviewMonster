import React, { useState, useEffect } from 'react'
import apiService from '../services/api'
import EvidenceModal from '../components/EvidenceModal'

function Overview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedEvidence, setSelectedEvidence] = useState(null)

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async () => {
    try {
      const response = await apiService.getOverview()
      setData(response.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load overview')
    } finally {
      setLoading(false)
    }
  }

  const handleViewEvidence = (type, item) => {
    setSelectedEvidence({ type, item })
  }

  if (loading) {
    return (
      <div className="container page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading overview...</p>
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
        <h1 className="page-title">Overview</h1>
        <p className="page-subtitle">Executive summary and critical insights</p>
      </div>

      {/* Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="mb-6">
          {data.alerts.map((alert, idx) => (
            <div key={idx} className={`alert alert-${alert.severity === 'high' ? 'danger' : 'warning'}`}>
              <strong>⚠️ Alert:</strong> {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="card mb-6">
        <h2 className="card-title">Key Metrics</h2>
        <div className="metrics">
          <div className="metric">
            <div className="metric-label">Total Reviews</div>
            <div className="metric-value">{data.metrics.totalReviews.toLocaleString()}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Average Rating</div>
            <div className="metric-value">⭐ {data.metrics.avgRating.toFixed(2)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Positive Sentiment</div>
            <div className="metric-value" style={{ color: 'var(--success)' }}>
              {data.metrics.sentiment.positive}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Negative Sentiment</div>
            <div className="metric-value" style={{ color: 'var(--danger)' }}>
              {data.metrics.sentiment.negative}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-3">
        {/* Top Issues */}
        <div className="card">
          <h2 className="card-title">🔴 Top Issues</h2>
          {data.topIssues && data.topIssues.length > 0 ? (
            <div>
              {data.topIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className="list-item"
                  onClick={() => handleViewEvidence('issue', issue.text)}
                >
                  <div className="flex-between">
                    <span>{issue.text.replace(/_/g, ' ')}</span>
                    <span className="badge badge-critical">{issue.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">✓</div>
              <p>No critical issues detected</p>
            </div>
          )}
        </div>

        {/* Top Requests */}
        <div className="card">
          <h2 className="card-title">💡 Top Feature Requests</h2>
          {data.topRequests && data.topRequests.length > 0 ? (
            <div>
              {data.topRequests.map((request, idx) => (
                <div
                  key={idx}
                  className="list-item"
                  onClick={() => handleViewEvidence('request', request.text)}
                >
                  <div className="flex-between">
                    <span>{request.text.replace(/_/g, ' ')}</span>
                    <span className="badge badge-neutral">{request.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No feature requests</p>
            </div>
          )}
        </div>

        {/* What's Working */}
        <div className="card">
          <h2 className="card-title">✅ What's Working</h2>
          {data.whatsWorking && data.whatsWorking.length > 0 ? (
            <div>
              {data.whatsWorking.map((praise, idx) => (
                <div
                  key={idx}
                  className="list-item"
                  onClick={() => handleViewEvidence('praise', praise.text)}
                >
                  <div className="flex-between">
                    <span>{praise.text.replace(/_/g, ' ')}</span>
                    <span className="badge badge-positive">{praise.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No notable strengths</p>
            </div>
          )}
        </div>
      </div>

      {/* Executive Memo */}
      <div className="card mt-6">
        <h2 className="card-title">📋 Executive Summary</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.6' }}>
          {data.summary}
        </pre>
      </div>

      {selectedEvidence && (
        <EvidenceModal
          type={selectedEvidence.type}
          item={selectedEvidence.item}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </div>
  )
}

export default Overview
