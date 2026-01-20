import React, { useState, useEffect } from 'react'
import apiService from '../services/api'
import EvidenceModal from '../components/EvidenceModal'

function YourProduct() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedEvidence, setSelectedEvidence] = useState(null)
  const [activeTab, setActiveTab] = useState('issues')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await apiService.getYourProduct()
      setData(response.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load product data')
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
          <p>Loading product analysis...</p>
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
        <h1 className="page-title">Your Product</h1>
        <p className="page-subtitle">Deep dive into issues, requests, and strengths</p>
      </div>

      {/* Sentiment Overview */}
      <div className="card mb-6">
        <h2 className="card-title">Sentiment Distribution</h2>
        <div className="metrics">
          <div className="metric">
            <div className="metric-label">Positive</div>
            <div className="metric-value" style={{ color: 'var(--success)' }}>
              {data.sentiment.positive}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
              {((data.sentiment.positive / data.totalReviews) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Neutral</div>
            <div className="metric-value" style={{ color: 'var(--gray-600)' }}>
              {data.sentiment.neutral}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
              {((data.sentiment.neutral / data.totalReviews) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Negative</div>
            <div className="metric-value" style={{ color: 'var(--danger)' }}>
              {data.sentiment.negative}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
              {((data.sentiment.negative / data.totalReviews) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Total Reviews</div>
            <div className="metric-value">{data.totalReviews}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--gray-200)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('issues')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'issues' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'issues' ? 'var(--primary)' : 'var(--gray-600)',
              fontWeight: activeTab === 'issues' ? '600' : '400',
            }}
          >
            Issues ({data.issues.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'requests' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'requests' ? 'var(--primary)' : 'var(--gray-600)',
              fontWeight: activeTab === 'requests' ? '600' : '400',
            }}
          >
            Feature Requests ({data.featureRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('strengths')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'strengths' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'strengths' ? 'var(--primary)' : 'var(--gray-600)',
              fontWeight: activeTab === 'strengths' ? '600' : '400',
            }}
          >
            Strengths ({data.strengths.length})
          </button>
        </div>
      </div>

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <div className="grid grid-2">
          {data.issues.length > 0 ? (
            data.issues.map((issue, idx) => (
              <div key={idx} className="card" style={{ cursor: 'pointer' }} onClick={() => handleViewEvidence('issue', issue.text)}>
                <div className="flex-between mb-4">
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                    {issue.text.replace(/_/g, ' ')}
                  </h3>
                  <span className={`badge badge-${issue.severity}`}>
                    {issue.severity}
                  </span>
                </div>
                <div className="flex-between text-sm text-muted">
                  <span>Mentions: {issue.count}</span>
                  <span>Avg Rating: ⭐ {issue.avgRating}</span>
                </div>
                <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--gray-600)' }}>
                  Click to see evidence from {issue.evidence.length} reviews
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">✓</div>
              <div className="empty-state-title">No issues detected</div>
            </div>
          )}
        </div>
      )}

      {/* Feature Requests Tab */}
      {activeTab === 'requests' && (
        <div className="grid grid-2">
          {data.featureRequests.length > 0 ? (
            data.featureRequests.map((request, idx) => (
              <div key={idx} className="card" style={{ cursor: 'pointer' }} onClick={() => handleViewEvidence('request', request.text)}>
                <div className="flex-between mb-4">
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                    {request.text.replace(/_/g, ' ')}
                  </h3>
                  <span className={`badge ${request.demand === 'high' ? 'badge-critical' : request.demand === 'medium' ? 'badge-medium' : 'badge-low'}`}>
                    {request.demand} demand
                  </span>
                </div>
                <div className="text-sm text-muted">
                  Requested by {request.count} users
                </div>
                <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--gray-600)' }}>
                  Click to see evidence from {request.evidence.length} reviews
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💡</div>
              <div className="empty-state-title">No feature requests</div>
            </div>
          )}
        </div>
      )}

      {/* Strengths Tab */}
      {activeTab === 'strengths' && (
        <div className="grid grid-2">
          {data.strengths.length > 0 ? (
            data.strengths.map((strength, idx) => (
              <div key={idx} className="card" style={{ cursor: 'pointer' }} onClick={() => handleViewEvidence('strength', strength.text)}>
                <div className="flex-between mb-4">
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                    ✨ {strength.text.replace(/_/g, ' ')}
                  </h3>
                  <span className="badge badge-positive">
                    {strength.count}
                  </span>
                </div>
                <div className="text-sm text-muted">
                  Praised by {strength.count} users
                </div>
                <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--gray-600)' }}>
                  Click to see evidence from {strength.evidence.length} reviews
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">⭐</div>
              <div className="empty-state-title">No notable strengths</div>
            </div>
          )}
        </div>
      )}

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

export default YourProduct
