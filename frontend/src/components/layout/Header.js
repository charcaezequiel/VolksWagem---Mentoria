import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Moon, Sun, Wifi, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { useTranslation } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';

export default function Header() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const { connected } = useSocket();
  const { lang, toggleLang, t } = useTranslation();
  const { unread } = useNotifications();
  const location = useLocation();

  const titles = {
    '/dashboard': t('nav.dashboard'),
    '/devices': t('nav.devices'),
    '/consumption': t('nav.consumption'),
    '/invoices': t('nav.invoices'),
    '/alerts': t('nav.alerts'),
    '/predictions': t('nav.predictions'),
    '/tariffs': t('nav.tariffs'),
    '/profile': t('nav.profile'),
    '/assistant': t('nav.assistant'),
    '/recommendations': t('nav.recommendations'),
  };
  const title = titles[location.pathname] || 'ControlAR';

  return (
    <header className="main-header">
      <h1 className="header-title">{title}</h1>
      <div className="header-actions">
        {connected && (
          <span className="header-realtime" title={t('header.realtime')}>
            <Wifi size={14} />
          </span>
        )}
        <button className="header-theme" onClick={toggleLang} title={t('header.toggle_lang')}>
          <Globe size={20} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, marginLeft: 2 }}>{lang.toUpperCase()}</span>
        </button>
        <button className="header-theme" onClick={toggle} title={dark ? t('header.theme_light') : t('header.theme_dark')}>
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <Link to="/alerts" className="header-notification">
          <Bell size={20} />
          {unread > 0 && <span className="notification-badge">{unread > 99 ? '99+' : unread}</span>}
        </Link>
        <div className="header-user">
          <div className="header-avatar">{user?.name?.charAt(0) || 'U'}</div>
          <span className="header-username">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
