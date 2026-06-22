import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Sparkles, Dna, Search, Zap, RotateCcw,
  ChevronDown, Loader2, User, Copy, Check, Trash2, Download,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { nanoid } from "nanoid";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/contexts/I18nContext";
import { useAgent } from "@/contexts/AgentContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const CV_PEPFIND_LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663763297463/mPgk7G7EdaQz8qRWJqERFD/cv-pepfind-logo-hvWmhPWZsRMWVNLhDabEVd.webp';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  timestamp: Date;
}

export default function CVPepFindPanel() {
  const { t, language } = useI18n();
  const { handleToolCall } = useAgent();
  
  // Fresh session on every login (clean workspace)
  const [sessionId, setSessionId] = useState<string>(() => nanoid());

  // Generate greeting based on current language
  const getGreeting = useCallback(() => {
    return t('rightPanel.aiGreeting');
  }, [t]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'greeting',
      role: 'assistant',
      content: getGreeting(),
      timestamp: new Date(),
    }
  ]);

  // Update greeting when language changes
  useEffect(() => {
    setMessages(prev => {
      if (prev[0]?.id === 'greeting') {
        return [
          { ...prev[0], content: getGreeting() },
          ...prev.slice(1)
        ];
      }
      return prev;
    });
  }, [language, getGreeting]);

  const [aiState, setAiState] = useState<'idle' | 'processing'>('idle');
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrievalCount, setRetrievalCount] = useState<number | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ sessionId: string; title: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load sessions - always enabled so data is ready when dropdown opens
  const { data: recentSessions, refetch: refetchSessions } = trpc.agent.sessions.useQuery(undefined, {
    staleTime: 30_000,
    // Always fetch so data is ready on first open; staleTime prevents excessive refetching
  });

  const switchSession = useCallback(async (sid: string) => {
    setShowSessions(false);
    setSessionId(sid);
    setHistoryLoaded(false);
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: getGreeting(),
      timestamp: new Date(),
    }]);
  }, [getGreeting]);

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
    setIsWaitingForResponse(true);

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
        body: JSON.stringify({ sessionId, message: text.trim(), language }),
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
                // P0 修复：过滤掉 tool_call JSON 块，不插入 DOM
                const filtered = parsed.content
                  .replace(/\{\s*"tool"\s*:\s*"[^"]*"[^}]*\}/g, '')
                  .trim();
                if (filtered) {
                  accumulated += filtered;
                  setMessages(prev => prev.map(m =>
                    m.id === assistantId ? { ...m, content: accumulated } : m
                  ));
                }
              } else if (parsed.type === 'tool_call' && parsed.tool) {
                // AI 触发系统控制指令 → 更新可视化面板
                handleToolCall(parsed.tool, parsed.args || {});
              } else if (parsed.type === 'retrieval_start') {
                // Real database retrieval in progress
                setIsRetrieving(true);
                setRetrievalCount(null);
              } else if (parsed.type === 'retrieval_done') {
                // Retrieval completed
                setIsRetrieving(false);
                setRetrievalCount(parsed.count ?? null);
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
          ? { ...m, content: t('common.error'), streaming: false }
          : m
      ));
    } finally {
      setIsStreaming(false);
      setAiState('idle');
      setIsWaitingForResponse(false);
      setIsRetrieving(false);
    }
  }, [isStreaming, sessionId, language, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success(t('rightPanel.messageCopied') || '已复制到剪贴板', { duration: 1500 });
    } catch {
      toast.error(t('rightPanel.copyFailed') || '复制失败，请重试');
    }
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
      content: getGreeting(),
      timestamp: new Date(),
    }]);
  };

  const deleteSessionMutation = trpc.agent.deleteSession.useMutation();

  const deleteSession = async (sid: string) => {
    try {
      await deleteSessionMutation.mutateAsync({ sessionId: sid });
      setDeleteConfirm(null);
      // Refresh sessions list
      await refetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const exportConversation = () => {
    const lines: string[] = [
      `# CV-PepFind 对话导出`,
      `> 导出时间：${new Date().toLocaleString()}`,
      '',
    ];
    messages.forEach(msg => {
      const role = msg.role === 'assistant' ? '**CV-PepFind**' : '**用户**';
      const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(msg.timestamp);
      lines.push(`### ${role} \`${time}\``);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv-pepfind-conversation-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('rightPanel.exportSuccess') || '对话已导出为 Markdown', { duration: 2000 });
  };

  // Quick prompts with i18n
  const QUICK_PROMPTS = [
    { icon: Search, labelKey: 'quickPrompts.queryAntimicrobial', promptKey: 'quickPrompts.queryAntimicrobialPrompt' },
    { icon: Dna, labelKey: 'quickPrompts.analyzeSequence', promptKey: 'quickPrompts.analyzeSequencePrompt' },
    { icon: Zap, labelKey: 'quickPrompts.optimizationTips', promptKey: 'quickPrompts.optimizationTipsPrompt' },
    { icon: Sparkles, labelKey: 'quickPrompts.targetedDesign', promptKey: 'quickPrompts.targetedDesignPrompt' },
  ];

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
          <p className="text-[10px] text-muted-foreground">{t('rightPanel.subtitle')}</p>
        </div>
        <div className="ml-auto flex items-center gap-1 relative">
          {/* Session history dropdown */}
          <button
            onClick={() => setShowSessions(v => !v)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center gap-1"
            title={t('rightPanel.sessionHistory')}
            aria-label="Session History"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSessions ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={clearChat}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title={t('rightPanel.newSession')}
            aria-label="New Session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={exportConversation}
            disabled={messages.length <= 1}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('rightPanel.exportConversation') || '导出对话'}
            aria-label="Export conversation as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Sessions dropdown panel */}
          {showSessions && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('rightPanel.sessionHistory')}</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {recentSessions === undefined ? (
                  // Loading skeleton
                  <div className="px-3 py-3 space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                        <div className="h-3 bg-muted rounded w-24"></div>
                      </div>
                    ))}
                  </div>
                ) : (!recentSessions || recentSessions.length === 0) ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground text-center">{t('rightPanel.noSessions')}</p>
                ) : (
                  recentSessions.filter(s => !!s.sessionId).map(s => (
                    <div
                      key={s.sessionId || `session-${s.updatedAt}`}
                      className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted transition-colors group"
                    >
                      <button
                        onClick={() => switchSession(s.sessionId)}
                        className={`flex-1 text-left ${
                          s.sessionId === sessionId ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        <div className="font-medium truncate">{s.title ?? 'Untitled Session'}</div>
                        <div className="text-muted-foreground text-[10px] mt-0.5">
                          {new Date(s.updatedAt).toLocaleString()}
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          const newTitle = prompt('Rename session:', s.title ?? 'Untitled Session');
                          if (newTitle && newTitle.trim()) {
                            // TODO: Call API to update session title
                            console.log('Rename session:', s.sessionId, newTitle);
                          }
                        }}
                        className="p-1 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all ml-1"
                        title="Rename session"
                        aria-label="Rename session"
                      >
                        <Sparkles className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ sessionId: s.sessionId, title: s.title ?? 'Untitled' })}
                        className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        title={t('rightPanel.deleteSession')}
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Loading indicator when waiting for response */}
        {isWaitingForResponse && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex gap-2.5"
          >
            <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 bg-primary/15 border border-primary/25">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            </div>
            <div className="flex-1 py-2 px-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-2">
                {isRetrieving ? (
                  <>
                    <Search className="w-3 h-3 text-primary animate-pulse" />
                    <span className="text-xs text-primary">{t('rightPanel.retrievingDatabase') || 'Querying UniProt database...'}</span>
                  </>
                ) : retrievalCount !== null ? (
                  <>
                    <Dna className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400">{t('rightPanel.retrievalDone')?.replace('{count}', String(retrievalCount)) || `Found ${retrievalCount} peptides from UniProt`}</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">{t('rightPanel.aiProcessing') || 'Processing...'}</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
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
                    <div className="streamdown-content" role="article" aria-label="AI assistant response">
                      <Streamdown>{msg.content}</Streamdown>
                      {msg.streaming && (
                        <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-blink" aria-hidden="true" />
                      )}
                    </div>
                  ) : (
                    <p
                      className={`text-sm break-all ${
                        /^[ACDEFGHIKLMNPQRSTVWY]{4,}$/i.test(msg.content.trim())
                          ? 'font-mono tracking-wider text-accent'
                          : ''
                      }`}
                      role="article"
                      aria-label="Your message"
                    >
                      {msg.content}
                    </p>
                  )}

                  {/* Copy button */}
                  {!msg.streaming && msg.content && (
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 text-muted-foreground hover:text-foreground"
                      aria-label="Copy message"
                    >
                      {copiedId === msg.id
                        ? <Check className="w-2.5 h-2.5 text-primary" />
                        : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground/50 px-1">
                  {new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : language, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }).format(msg.timestamp)}
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
              key={qp.labelKey}
              onClick={() => sendMessage(t(qp.promptKey))}
              disabled={isStreaming}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-[10px] font-medium transition-all disabled:opacity-50 border border-transparent hover:border-border"
            >
              <qp.icon className="w-3 h-3" />
              {t(qp.labelKey)}
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
            placeholder={t('rightPanel.inputPlaceholder')}
            rows={1}
            disabled={isStreaming}
            aria-label="Enter biological instructions or peptide query"
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
            aria-label="Send message"
          >
            {isStreaming
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('rightPanel.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('rightPanel.deleteConfirmMessage')}
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>{t('rightPanel.deleteCancelButton')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteSession(deleteConfirm.sessionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('rightPanel.deleteConfirmButton')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
