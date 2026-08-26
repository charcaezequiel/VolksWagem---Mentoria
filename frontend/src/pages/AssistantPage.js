import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, User, Cpu, Wifi, WifiOff } from 'lucide-react';
import { api } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTranslation } from '../context/LanguageContext';

export default function AssistantPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const messagesEndRef = useRef(null);

  const suggestionChips = [
    t('assistant.chip1') || '¿Cuánto voy a pagar el mes que viene?',
    t('assistant.chip2') || '¿Cómo puedo ahorrar energía?',
    t('assistant.chip3') || '¿Qué dispositivo consume más?',
    t('assistant.chip4') || '¿Cuál es mi consumo del mes?',
  ];

  useEffect(() => {
    api.ai.getStatus()
      .then((res) => setAiStatus(res.data))
      .catch(() => setAiStatus(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (text) => {
    const message = (text || input).trim();
    if (!message || sending) return;

    const userMsg = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await api.ai.chat({ message, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply, provider: res.data.provider }]);
    } catch (err) {
      toast.error(err.response?.data?.error || t('assistant.error'));
    }
    setSending(false);
  };

  const formatContent = (content) => {
    const parts = content.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="assistant-page">
      <div className="page-header">
        <div className="page-header-text">
          <h2><Bot size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />{t('assistant.title')}</h2>
          <p className="page-header-subtitle">{t('assistant.subtitle')}</p>
        </div>
        {aiStatus && (
          <span className={`badge ${aiStatus.configured ? 'badge-success' : 'badge-warning'}`}>
            {aiStatus.configured ? <Wifi size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : <WifiOff size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
            {aiStatus.configured ? t('assistant.gemini_connected', { model: aiStatus.model }) : t('assistant.local_mode')}
          </span>
        )}
      </div>

      <div className="chat-container card">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="chat-welcome-icon"><Bot size={40} /></div>
              <h3>{t('assistant.welcome_title')}</h3>
              <p>
                {t('assistant.welcome_desc')}
              </p>
              <div className="chat-suggestions">
                {suggestionChips.map((chip) => (
                  <button key={chip} className="chat-chip" onClick={() => sendMessage(chip)}>
                    <Sparkles size={14} /> {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role === 'user' ? 'chat-user' : 'chat-assistant'}`}>
              <div className="chat-avatar">
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="chat-bubble">
                <div className="chat-bubble-text">{formatContent(m.content)}</div>
                {m.provider && (
                  <div className="chat-provider">
                    {m.provider === 'gemini' ? <Cpu size={12} /> : <Sparkles size={12} />} {m.provider === 'gemini' ? 'Gemini' : t('assistant.local_engine')}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="chat-msg chat-assistant">
              <div className="chat-avatar"><Bot size={16} /></div>
              <div className="chat-bubble">
                <span className="typing-dots"><span></span><span></span><span></span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-bar" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
          <input
            className="form-input"
            placeholder={t('assistant.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button className="btn btn-primary" type="submit" disabled={sending || !input.trim()}>
            <Send size={16} /> {t('assistant.send')}
          </button>
        </form>
      </div>
    </div>
  );
}
