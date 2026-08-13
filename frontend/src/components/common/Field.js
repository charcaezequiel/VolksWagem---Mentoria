import React from 'react';

export default function Field({ label, icon, hint, required, error, children, className = '' }) {
  return (
    <div className={`field ${error ? 'field-error' : ''} ${className}`}>
      {label && (
        <label className="field-label">
          {icon && <span className="field-label-icon">{icon}</span>}
          <span>{label}</span>
          {required && <span className="field-required">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <small className="field-hint">{hint}</small>}
      {error && <small className="field-error-text">{error}</small>}
    </div>
  );
}
