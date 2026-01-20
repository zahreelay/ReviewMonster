import React from 'react'
import { Link, useLocation } from 'react-router-dom'

function Header({ appConfig }) {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path ? 'active' : ''
  }

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/overview" className="logo">
            🦖 ReviewMonster
          </Link>

          {appConfig && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <nav className="nav">
                <Link to="/overview" className={`nav-link ${isActive('/overview')}`}>
                  Overview
                </Link>
                <Link to="/your-product" className={`nav-link ${isActive('/your-product')}`}>
                  Your Product
                </Link>
                <Link to="/release-timeline" className={`nav-link ${isActive('/release-timeline')}`}>
                  Release Timeline
                </Link>
                <Link to="/competitors" className={`nav-link ${isActive('/competitors')}`}>
                  Competitors
                </Link>
                <Link to="/query" className={`nav-link ${isActive('/query')}`}>
                  Query Console
                </Link>
              </nav>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={appConfig.icon}
                  alt={appConfig.name}
                  style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                />
                <div style={{ fontSize: '14px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                    {appConfig.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                    ⭐ {appConfig.rating?.toFixed(1) || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
