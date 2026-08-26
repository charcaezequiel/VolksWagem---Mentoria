import React from 'react';
import { useTranslation } from '../../context/LanguageContext';

export default function LoadingSpinner({ fullScreen }) {
  const { t } = useTranslation();
  return (
    <div className={`loading-spinner-container ${fullScreen ? 'full-screen' : ''}`}>
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p className="loading-text">{t('common.loading')}</p>
    </div>
  );
}
