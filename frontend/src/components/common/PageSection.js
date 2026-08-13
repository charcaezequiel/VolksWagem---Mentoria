import React from 'react';

export default function PageSection({ icon, title, subtitle, actions, children, className = '', style }) {
  return (
    <section className={`page-section ${className}`} style={style}>
      <div className="page-section-header">
        {icon && <div className="page-section-icon">{icon}</div>}
        <div className="page-section-titles">
          <h3 className="page-section-title">{title}</h3>
          {subtitle && <p className="page-section-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-section-actions">{actions}</div>}
      </div>
      <div className="page-section-body">{children}</div>
    </section>
  );
}
