import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Sparkles, Dna, Search, Zap, RotateCcw,
  ChevronDown, Loader2, User, Copy, Check,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { nanoid } from "nanoid";
import { trpc } from "@/lib/trpc";

const CV_PEPFIND_LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663763297463/mPgk7G7EdaQz8qRWJqERFD/cv-pepfind-logo-hvWmhPWZsRMWVNLhDabEVd.webp';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { icon: Search, label: "查询抗菌肽", prompt: "请列举5种常见的抗菌肽序列及其作用机制" },
  { icon: Dna, label: "分析序列", prompt: "分析序列 LLGDFFRKSKEKIGKEFKRI 的物化性质和生物活性" },
  { icon: Zap, label: "优化建议", prompt: "如何通过氨基酸替换来提高多肽的细胞穿透能力？" },
  { icon: Sparkles, label: "靶向设计", prompt: "设计一条能与ACE2受体结合的多肽序列，并解释设计原理" },
];

const GREETING = `你好！我是 **CV-PepFind**，您的专业多肽筛选智能体。

我可以帮您：
- 🧬 **查询多肽功能与结构信息**
- 🔍 **从数据库召回相关功能多肽**
- 💡 **分析序列-活性关系（SAR）**
- 🎯 **提供多肽优化改造建议**

请告诉我您的研究需求，或使用下方快捷指令开始！`;

export default function CVPepFindPanel() {
  // Fresh session on every login (clean workspace)
  const [sessionId, setSessionId] = useState<string>(() => nanoid());

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'greeting',
      role: 'assistant',
      content: GREETING,
      timestamp: new Date(),
    }
  ]);
  const [aiState, setAiState] = useState<'idle' | 'processing'>('idle');
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Clean workspace: do NOT load historical sessions by default
  // Users get a fresh start every time they open the app
  const { data: recentSessions } = trpc.agent.sessions.useQuery(undefined, {
    staleTime: 30_000,
    enabled: false, // Disabled by default for clean UX
  });

  const switchSession = useCallback(async (sid: string) => {
    setShowSessions(false);
    setSessionId(sid);
    setHistoryLoaded(false);
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: GREETING,
      timestamp: new Date(),
    }]);
  }, []);

  // Load persisted chat history for this session on mount
  const { data: chatHistory } = trpc.agent.history.useQuery(
    { sessionId },
    { enabled: !!sessionId, staleTime: 30_000 }
  );

  useEffect(() => {
    if (historyLoaded || !chatHistory || chatHistory.length === 0) return;
    setHistoryLoaded(true);
    const restored: Message[] = chatHistory.map(m => ({
      id: `hist-${m.id}`,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: new Date(m.createdAt),
    }));
    setMessages(prev => [
      prev[0], // keep greeting
      ...restored,
    ]);
  }, [chatHistory, historyLoaded]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = {
      id: nanoid(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setAiState('processing');

    const assistantId = nanoid();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
      timestamp: new Date(),
    }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text.trim() }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const jsonStr = line.slice(6).trim();
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'delta' && parsed.content) {
                accumulated += parsed.content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: accumulated } : m
                ));
              } else if (parsed.type === 'done' || parsed.type === 'error') {
                break;
              }
            } catch { /* skip */ }
          }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ));
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: '抱歉，请求出现错误，请稍后重试。', streaming: false }
          : m
      ));
    } finally {
      setIsStreaming(false);
      setAiState('idle');
    }
  }, [isStreaming, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    // Generate a new session for the fresh conversation
    const newSessionId = nanoid();
    setSessionId(newSessionId);
    setHistoryLoaded(false);
    setAiState('idle');
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: GREETING,
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2.5">
        <div
          ref={avatarRef}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            aiState === 'processing'
              ? 'ai-processing'
              : 'ai-breathing'
          }`}
        >
          <img
            src={CV_PEPFIND_LOGO}
            alt="CV-PepFind"
            className="w-6 h-6 object-contain"
          />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            CV-PepFind
            <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">AI</span>
          </h2>
          <p className="text-[10px] text-muted-foreground">多肽筛选智能体</p>
        </div>
        <div className="ml-auto flex items-center gap-1 relative">
          {/* Session history dropdown */}
          <button
            onClick={() => setShowSessions(v => !v)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center gap-1"
            title="历史会话"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSessions ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title="新建对话"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Sessions dropdown panel */}
          {showSessions && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">历史会话</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {(!recentSessions || recentSessions.length === 0) ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground text-center">暂无历史会话</p>
                ) : (
                  recentSessions.filter(s => !!s.sessionId).map(s => (
                    <button
                      key={s.sessionId || `session-${s.updatedAt}`}
                      onClick={() => switchSession(s.sessionId)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                        s.sessionId === sessionId ? 'text-primary bg-primary/5' : 'text-foreground'
                      }`}
                    >
                      <div className="font-medium truncate">{s.title ?? '未命名会话'}</div>
                      <div className="text-muted-foreground text-[10px] mt-0.5">
                        {new Date(s.updatedAt).toLocaleString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 ${
                msg.role === 'assistant'
                  ? 'bg-primary/15 border border-primary/25'
                  : 'bg-accent/15 border border-accent/25'
              }`}>
                {msg.role === 'assistant'
                  ? <Bot className="w-3.5 h-3.5 text-primary" />
                  : <User className="w-3.5 h-3.5 text-accent" />}
              </div>

              {/* Bubble */}
              <div className={`group max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`relative rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent/20 text-foreground border border-accent/20 rounded-tr-sm'
                    : 'bg-card border border-border rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="streamdown-content">
                      <Streamdown>{msg.content}</Streamdown>
                      {msg.streaming && (
                        <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-blink" />
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}

                  {/* Copy button */}
                  {!msg.streaming && msg.content && (
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === msg.id
                        ? <Check className="w-2.5 h-2.5 text-primary" />
                        : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground/50 px-1">
                  {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming indicator */}
        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2.5"
          >
            <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2.5">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-2 border-t border-border/50">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.label}
              onClick={() => sendMessage(qp.prompt)}
              disabled={isStreaming}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-[10px] font-medium transition-all disabled:opacity-50 border border-transparent hover:border-border"
            >
              <qp.icon className="w-3 h-3" />
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="relative flex items-end gap-2 bg-input border border-border rounded-xl p-2.5 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入生物学指令或多肽查询... (Enter发送)"
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none min-h-[20px] max-h-[100px] leading-5"
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 100) + 'px';
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStreaming
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground/40 text-center mt-1.5">
          CV-PepFind · 由大语言模型驱动 · 结果仅供参考
        </p>
      </div>
    </div>
  );
}
