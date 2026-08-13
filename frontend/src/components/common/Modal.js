import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, icon, subtitle, onClose, children, footer, size = 'md' }) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className={`modal modal-${size}`} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-header-titles">
            {icon && <div className="modal-header-icon">{icon}</div>}
            <div>
              <h2>{title}</h2>
              {subtitle && <p className="modal-header-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
