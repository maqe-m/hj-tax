'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: number;
  title: string;
  company_name: string | null;
  updated_at: string;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Загрузка...</div>}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, [companyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  async function loadSessions() {
    const url = companyId
      ? `/api/chat/sessions?companyId=${companyId}`
      : '/api/chat/sessions';
    const res = await fetch(url);
    const data = await res.json();
    setSessions(data.sessions || []);
  }

  async function loadSession(sessionId: number) {
    setActiveSessionId(sessionId);
    const res = await fetch(`/api/chat/sessions/${sessionId}`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  function startNewChat() {
    setActiveSessionId(null);
    setMessages([]);
    setStreamingText('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setStreamingText('');

    // Add user message to UI immediately
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          companyId: companyId ? parseInt(companyId) : undefined,
          message: userMessage,
        }),
      });

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Ошибка при обработке запроса. Попробуйте ещё раз.' },
        ]);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.sessionId && !activeSessionId) {
                setActiveSessionId(data.sessionId);
              }

              if (data.text) {
                accumulated += data.text;
                setStreamingText(accumulated);
              }

              if (data.done) {
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: accumulated },
                ]);
                setStreamingText('');
                loadSessions();
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Ошибка сети. Проверьте подключение.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSession(sessionId: number) {
    await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
    if (activeSessionId === sessionId) {
      startNewChat();
    }
    loadSessions();
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4">
          <button
            onClick={startNewChat}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Новый чат
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center px-4 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 ${
                activeSessionId === session.id ? 'bg-blue-50' : ''
              }`}
            >
              <div
                className="flex-1 min-w-0"
                onClick={() => loadSession(session.id)}
              >
                <p className="text-sm font-medium truncate">{session.title}</p>
                {session.company_name && (
                  <p className="text-xs text-gray-400">{session.company_name}</p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-2 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !streamingText && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">KZ Tax Advisor AI</p>
                <p className="text-sm">Задайте вопрос по налоговому законодательству РК</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-xl px-4 py-3 bg-gray-100 text-gray-800">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingText}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {loading && !streamingText && (
            <div className="flex justify-start">
              <div className="rounded-xl px-4 py-3 bg-gray-100 text-gray-400">
                Думаю...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Введите вопрос по налогам..."
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Отправить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
