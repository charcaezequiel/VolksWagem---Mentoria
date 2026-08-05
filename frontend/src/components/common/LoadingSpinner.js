import React from 'react';

export default function LoadingSpinner({ fullScreen }) {
  return (
    <div className={`loading-spinner-container ${fullScreen ? 'full-screen' : ''}`}>
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p className="loading-text">Cargando...</p>
    </div>
  );
}
