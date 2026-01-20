import React, { useState, useEffect } from 'react'
import apiService from '../services/api'

function EvidenceModal({ type, item, competitorId = null, onClose }) {
  const [evidence, setEvidence] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEvidence()
  }, [type, item, competitorId])

  const fetchEvidence = async () => {
    try {
      const response = await apiService.getEvidence(type, item, competitorId)
      setEvidence(response.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load evidence')
    } finally {
      setLoading(false)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const renderStars = (rating) => {
    return '⭐'.repeat(rating)
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{item.replace(/_/g, ' ')}</h2>
            <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginTop: '4px' }}>
              {evidence?.count || 0} reviews mentioning this
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading evidence...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          {!loading && !error && evidence && (
            <div>
              {evidence.evidence.length > 0 ? (
                evidence.evidence.map((review, idx) => (
                  <div key={idx} className="review-card">
                    {review.title && (
                      <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                        {review.title}
                      </div>
                    )}
                    <div className="review-header">
                      <span className="review-rating">
                        {renderStars(review.rating)}
                      </span>
                      <span className="review-meta">
                        {review.version && `v${review.version} • `}
                        {new Date(review.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="review-text">{review.text}</div>
                    {review.user && (
                      <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>
                        — {review.user}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-title">No reviews found</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EvidenceModal
