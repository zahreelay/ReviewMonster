import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiService from '../services/api'
import EvidenceModal from '../components/EvidenceModal'

function SwotComparison({ appConfig }) {
  const { competitorId } = useParams()
  const navigate = useNavigate()
  const [swotData, setSwotData] = useState(null)
  const [competitorName, setCompetitorName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedEvidence, setSelectedEvidence] = useState(null)

  useEffect(() => {
    loadSwotData()
  }, [competitorId])

  const loadSwotData = async () => {
    try {
      // Load competitor info
      const competitors = JSON.parse(localStorage.getItem('competitors') || '[]')
      const competitor = competitors.find(c => c.appId === competitorId)

      if (competitor) {
        setCompetitorName(competitor.name)
      }

      // Fetch SWOT comparison
      const response = await apiService.compareCompetitors(
        { appId: appConfig.appId },
        [competitorId],
        90
      )

      const swot = response.data[competitor?.name || competitorId]
      setSwotData(swot)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load SWOT analysis')
    } finally {
      setLoading(false)
    }
  }

  const handleViewEvidence = (type, item) => {
    setSelectedEvidence({ type, item, competitorId })
  }

  if (loading) {
    return (
      <div className="container page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading SWOT analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container page">
        <div className="alert alert-danger">{error}</div>
        <button onClick={() => navigate('/competitors')} className="btn btn-secondary">
          Back to Competitors
        </button>
      </div>
    )
  }

  return (
    <div className="container page">
      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => navigate('/competitors')} className="btn btn-secondary btn-sm" style={{ marginBottom: '16px' }}>
          ← Back to Competitors
        </button>
        <h1 className="page-title">SWOT Analysis: {competitorName}</h1>
        <p className="page-subtitle">Competitive intelligence with evidence</p>
      </div>

      {swotData && (
        <div className="grid grid-2">
          {/* Strengths */}
          <div className="card">
            <h2 className="card-title" style={{ color: 'var(--success)' }}>
              💪 Strengths
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '16px' }}>
              What they do well
            </p>
            {swotData.strengths && swotData.strengths.length > 0 ? (
              <div>
                {swotData.strengths.map((item, idx) => (
                  <div
                    key={idx}
                    className="list-item"
                    onClick={() => handleViewEvidence('praise', item.text)}
                  >
                    <div className="flex-between">
                      <span>{item.text.replace(/_/g, ' ')}</span>
                      <span className="badge badge-positive">{item.count}</span>
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

          {/* Weaknesses */}
          <div className="card">
            <h2 className="card-title" style={{ color: 'var(--danger)' }}>
              ⚠️ Weaknesses
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '16px' }}>
              Where they struggle
            </p>
            {swotData.weaknesses && swotData.weaknesses.length > 0 ? (
              <div>
                {swotData.weaknesses.map((item, idx) => (
                  <div
                    key={idx}
                    className="list-item"
                    onClick={() => handleViewEvidence('weakness', item.text)}
                  >
                    <div className="flex-between">
                      <span>{item.text.replace(/_/g, ' ')}</span>
                      <span className="badge badge-critical">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No notable weaknesses</p>
              </div>
            )}
          </div>

          {/* Opportunities */}
          <div className="card">
            <h2 className="card-title" style={{ color: 'var(--primary)' }}>
              💡 Opportunities
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '16px' }}>
              Feature gaps you can exploit
            </p>
            {swotData.opportunities && swotData.opportunities.length > 0 ? (
              <div>
                {swotData.opportunities.map((item, idx) => (
                  <div
                    key={idx}
                    className="list-item"
                    onClick={() => handleViewEvidence('opportunity', item.text)}
                  >
                    <div className="flex-between">
                      <span>{item.text.replace(/_/g, ' ')}</span>
                      <span className="badge badge-neutral">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No notable opportunities</p>
              </div>
            )}
          </div>

          {/* Threats */}
          <div className="card">
            <h2 className="card-title" style={{ color: 'var(--warning)' }}>
              🛡️ Threats
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '16px' }}>
              Your strengths they lack
            </p>
            {swotData.threats && swotData.threats.length > 0 ? (
              <div>
                {swotData.threats.map((item, idx) => (
                  <div key={idx} className="list-item">
                    <div className="flex-between">
                      <span>{item.text.replace(/_/g, ' ')}</span>
                      <span className="badge badge-medium">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No notable threats</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedEvidence && (
        <EvidenceModal
          type={selectedEvidence.type}
          item={selectedEvidence.item}
          competitorId={selectedEvidence.competitorId}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </div>
  )
}

export default SwotComparison
