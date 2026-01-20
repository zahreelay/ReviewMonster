import React, { useState } from 'react'
import apiService from '../services/api'

const EXAMPLE_QUERIES = [
  "What are the top 3 complaints this month?",
  "Why did our rating drop?",
  "What features are users requesting most?",
  "How do users feel about the latest update?",
  "What are the main login issues?",
  "Which features do users love most?",
  "What's causing 1-star reviews?",
  "Are there any recurring crash reports?"
]

function QueryConsole() {
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmitQuery = async (e) => {
    e.preventDefault()
    if (!query.trim() || loading) return

    const userQuery = query.trim()
    setQuery('')
    setLoading(true)
    setError(null)

    // Add user query to history
    setHistory(prev => [...prev, { type: 'query', text: userQuery }])

    try {
      const response = await apiService.query(userQuery)

      // Add AI response to history
      setHistory(prev => [
        ...prev,
        {
          type: 'response',
          text: response.data.answer,
          context: response.data.context
        }
      ])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process query')
      setHistory(prev => [
        ...prev,
        {
          type: 'error',
          text: err.response?.data?.error || 'Failed to process query'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleExampleClick = (example) => {
    setQuery(example)
  }

  return (
    <div className="container page">
      <div className="page-header">
        <h1 className="page-title">Query Console</h1>
        <p className="page-subtitle">Ask questions in natural language</p>
      </div>

      {/* Example Queries */}
      {history.length === 0 && (
        <div className="card mb-6">
          <h2 className="card-title">Example Queries</h2>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '16px' }}>
            Try asking these questions:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {EXAMPLE_QUERIES.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(example)}
                className="btn btn-secondary btn-sm"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query History */}
      {history.length > 0 && (
        <div className="mb-6">
          {history.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '24px' }}>
              {item.type === 'query' && (
                <div style={{
                  background: 'var(--primary)',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  maxWidth: '80%',
                  marginLeft: 'auto',
                  marginBottom: '12px'
                }}>
                  {item.text}
                </div>
              )}

              {item.type === 'response' && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    background: 'white',
                    border: '1px solid var(--gray-200)',
                    padding: '16px',
                    borderRadius: '8px',
                    maxWidth: '80%'
                  }}>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {item.text}
                    </div>
                    {item.context && (
                      <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--gray-200)',
                        fontSize: '13px',
                        color: 'var(--gray-500)'
                      }}>
                        Based on {item.context.reviewsAnalyzed} reviews • Avg rating: ⭐ {item.context.avgRating}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {item.type === 'error' && (
                <div className="alert alert-danger" style={{ maxWidth: '80%' }}>
                  {item.text}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{
              background: 'white',
              border: '1px solid var(--gray-200)',
              padding: '16px',
              borderRadius: '8px',
              maxWidth: '80%'
            }}>
              <div className="loading">
                <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
                <p style={{ fontSize: '14px' }}>Analyzing...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Query Input */}
      <div style={{
        position: 'sticky',
        bottom: '24px',
        background: 'white',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid var(--gray-200)'
      }}>
        <form onSubmit={handleSubmitQuery}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              className="input"
              placeholder="Ask a question about your product reviews..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              autoFocus
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !query.trim()}
            >
              {loading ? 'Asking...' : 'Ask'}
            </button>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setHistory([])}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
            >
              Clear History
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default QueryConsole
