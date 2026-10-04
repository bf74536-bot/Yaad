'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload,
  Mic,
  Send,
  Flame,
  MessageCircle,
  X,
  Loader2,
  Volume2,
  Square,
  FileText,
  Sparkles,
} from 'lucide-react';
import { YaadLogo } from '@/components/yaad-logo';
import { SoundWave } from '@/components/sound-wave';
import { type Lang, LANG_LABEL, LANG_CODE, t } from '@/lib/translations';
import { supabase } from '@/lib/supabase';

type Msg = { role: 'user' | 'ai'; text: string; source?: string };
type UploadedFile = { name: string; content: string; size: number };

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [context, setContext] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [streak, setStreak] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionKeyRef = useRef<string>('');

  const tt = t(lang);

  // Initialize session key and load data from database
  useEffect(() => {
    let sk = localStorage.getItem('yaad-session-key');
    if (!sk) {
      sk = `yaad-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('yaad-session-key', sk);
    }
    sessionKeyRef.current = sk;

    (async () => {
      try {
        // Load streak from DB (fallback to localStorage)
        const { data: streakData } = await supabase
          .from('streaks')
          .select('count')
          .eq('session_key', sessionKeyRef.current)
          .maybeSingle();
        if (streakData) {
          setStreak(streakData.count);
          localStorage.setItem('yaad-streak', String(streakData.count));
        } else {
          const saved = localStorage.getItem('yaad-streak');
          if (saved) setStreak(parseInt(saved, 10) || 1);
        }

        // Load chat history from DB
        const { data: chatData } = await supabase
          .from('chat_messages')
          .select('role, question, answer, source, language')
          .order('created_at', { ascending: true })
          .limit(50);
        if (chatData && chatData.length > 0) {
          setMessages(
            chatData.map((m) => ({
              role: m.role as 'user' | 'ai',
              text: m.role === 'user' ? m.question : (m.answer || ''),
              source: m.source || undefined,
            }))
          );
        }

        // Load notes from DB and rebuild context
        const { data: notesData } = await supabase
          .from('notes')
          .select('filename, content, file_size')
          .order('created_at', { ascending: true });
        if (notesData && notesData.length > 0) {
          setFiles(notesData.map((n) => ({ name: n.filename, content: n.content, size: n.file_size || 0 })));
          setContext(notesData.map((n) => `\n--- ${n.filename} ---\n${n.content}`).join('\n'));
        }
      } catch (err) {
        // Fall back to localStorage streak if DB is unreachable
        const saved = localStorage.getItem('yaad-streak');
        if (saved) setStreak(parseInt(saved, 10) || 1);
      }
    })();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Stop speaking when language changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [lang]);

  const saveStreak = useCallback((newVal: number) => {
    setStreak(newVal);
    localStorage.setItem('yaad-streak', String(newVal));
    if (sessionKeyRef.current) {
      supabase
        .from('streaks')
        .upsert({
          session_key: sessionKeyRef.current,
          count: newVal,
          last_active: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => { if (error) console.warn('Failed to save streak:', error.message); });
    }
  }, []);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else if (result instanceof ArrayBuffer) {
          resolve(`[Binary file: ${file.name}, ${file.size} bytes]`);
        } else {
          resolve(`[File: ${file.name}]`);
        }
      };
      reader.onerror = () => resolve(`[File: ${file.name}]`);
      // For text-like files, read as text; for others, read as text anyway (demo)
      const textTypes = ['.txt', '.pdf', '.csv', '.md', '.json', '.xml', '.html'];
      const isText = textTypes.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (isText || file.type.startsWith('text/')) {
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleFiles = useCallback(async (fileList: File[]) => {
    if (fileList.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const allFiles: UploadedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const content = await readFileContent(file);
      allFiles.push({ name: file.name, content, size: file.size });
      setUploadProgress(Math.round(((i + 1) / fileList.length) * 100));
    }

    setFiles((prev) => [...prev, ...allFiles]);
    setContext((prev) => {
      const combined = allFiles.map((f) => `\n--- ${f.name} ---\n${f.content}`).join('\n');
      return prev + combined;
    });

    // Save notes to database
    for (const f of allFiles) {
      supabase.from('notes').insert({
        filename: f.name,
        content: f.content,
        file_size: f.size,
        file_type: f.name.split('.').pop() || '',
        language: lang,
      }).then(({ error }) => { if (error) console.warn('Failed to save note:', error.message); });
    }

    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
    }, 500);
  }, [lang]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const dropped = Array.from(e.dataTransfer.files);
      handleFiles(dropped);
    },
    [handleFiles]
  );

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeFile = (name: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.name !== name);
      setContext(updated.map((f) => `\n--- ${f.name} ---\n${f.content}`).join('\n'));
      return updated;
    });
    supabase.from('notes').delete().eq('filename', name).then(({ error }) => { if (error) console.warn('Failed to delete note:', error.message); });
  };

  const clearAllFiles = () => {
    setFiles([]);
    setContext('');
    supabase.from('notes').delete().neq('id', '00000000-0000-0000-0000-000000000000').then(({ error }) => { if (error) console.warn('Failed to clear notes:', error.message); });
  };

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      // Clean text of citations for cleaner speech
      const cleanText = text.replace(/\[Source:.*?\]/g, '').trim();
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = LANG_CODE[lang];
      utter.rate = 1;
      utter.pitch = 1;

      // Try to find a matching voice
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.lang === LANG_CODE[lang]);
      if (match) utter.voice = match;

      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utter);
    },
    [lang]
  );

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const sendQuestion = useCallback(
    async (question: string) => {
      if (!question.trim() || loading) return;

      setMessages((prev) => [...prev, { role: 'user', text: question }]);
      setInput('');
      setLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, context, lang }),
        });
        const data = await res.json();

        if (data.error) {
          setMessages((prev) => [
            ...prev,
            { role: 'ai', text: tt.notFound },
          ]);
          supabase.from('chat_messages').insert({
            role: 'user', question,
            answer: tt.notFound, language: lang,
          }).then(({ error }) => { if (error) console.warn('Failed to save chat:', error.message); });
        } else {
          // Extract citation
          const citationMatch = data.answer.match(/\[Source:\s*(.+?)\]/);
          const source = citationMatch ? citationMatch[1] : undefined;
          setMessages((prev) => [
            ...prev,
            { role: 'ai', text: data.answer, source },
          ]);
          speak(data.answer);
          supabase.from('chat_messages').insert({
            role: 'user', question,
            answer: data.answer, source: source || null, language: lang,
          }).then(({ error }) => { if (error) console.warn('Failed to save chat:', error.message); });
        }

        // Increment streak
        const newStreak = streak + 1;
        saveStreak(newStreak);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'ai', text: tt.notFound },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [context, lang, loading, streak, saveStreak, speak, tt.notFound]
  );

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = LANG_CODE[lang];
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendQuestion(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, isListening, sendQuestion]);

  const langList: Lang[] = ['en', 'hi', 'te', 'hinglish'];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020A2A', color: '#fff' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 backdrop-blur-xl sticky top-0 z-50" style={{ background: 'rgba(2,10,42,0.85)' }}>
        <YaadLogo size="sm" />
        <div className="flex gap-1.5 flex-wrap justify-end">
          {langList.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                lang === l
                  ? 'text-[#020A2A]'
                  : 'text-white/60 hover:text-white border border-white/15 hover:border-white/30'
              }`}
              style={lang === l ? { background: '#00D1FF' } : {}}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </header>

      {/* Top bar: streak + whatsapp */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card"
          >
            <span className="text-base">🔥</span>
            <span className="text-sm font-bold text-white">{streak}</span>
            <span className="text-xs text-white/50">{tt.streak}</span>
          </div>
          {context && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFEB00]/10 border border-[#FFEB00]/30">
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#FFEB00' }} />
              <span className="text-xs font-medium" style={{ color: '#FFEB00' }}>{tt.contextReady}</span>
            </div>
          )}
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:bg-[#25D366]/10"
          style={{ borderColor: '#25D366', color: '#25D366' }}
        >
          <MessageCircle className="w-4 h-4" />
          {tt.whatsapp}
        </button>
      </div>

      {/* Upload Area */}
      <div className="px-4 sm:px-6 pt-4">
        <div
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${
            dragActive ? 'border-[#00D1FF] bg-[#00D1FF]/5' : 'border-white/15'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.txt,.mp3,.wav,.csv,.md,.json"
            onChange={onFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center cursor-pointer">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 bg-[#00D1FF]/10">
              <Upload className="w-6 h-6" style={{ color: '#00D1FF' }} />
            </div>
            <p className="text-sm text-white/70 font-medium">{tt.upload}</p>
            <p className="text-xs text-white/40 mt-1">PDF, JPG, PNG, TXT, MP3, WAV</p>
          </div>

          {uploading && (
            <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 backdrop-blur-sm" style={{ background: 'rgba(2,10,42,0.9)' }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00D1FF' }} />
              <p className="text-sm font-medium text-white/80">{tt.saving}</p>
              <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #00D1FF, #FFEB00)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Uploaded files pills */}
        {files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-white/40">{tt.uploadedFiles}:</span>
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-white/70"
              >
                <FileText className="w-3 h-3" style={{ color: '#00D1FF' }} />
                {f.name.length > 20 ? f.name.slice(0, 18) + '...' : f.name}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAllFiles}
              className="text-xs text-white/40 hover:text-white/70 underline"
            >
              {tt.clearAll}
            </button>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 pb-32">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 bg-[#00D1FF]/10">
              <Sparkles className="w-8 h-8" style={{ color: '#00D1FF' }} />
            </div>
            <p className="text-lg font-semibold text-white/80">{tt.yaad}</p>
            <p className="text-sm text-white/40 mt-1">{tt.tapMic}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'rounded-br-sm'
                  : 'rounded-bl-sm'
              }`}
              style={
                msg.role === 'user'
                  ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }
                  : { background: 'rgba(0,209,255,0.08)', border: '1px solid rgba(0,209,255,0.2)' }
              }
            >
              <p className="text-xs font-semibold mb-1 opacity-50">
                {msg.role === 'user' ? tt.yourQuestion : tt.yaad}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.source && (
                <p className="text-xs mt-2 pt-2 border-t border-white/10" style={{ color: '#FFEB00' }}>
                  [Source: {msg.source}]
                </p>
              )}
              {msg.role === 'ai' && isSpeaking && i === messages.length - 1 && (
                <div className="flex items-center gap-2 mt-2">
                  <SoundWave color="#00D1FF" />
                  <button
                    onClick={stopSpeaking}
                    className="flex items-center gap-1 text-xs text-white/50 hover:text-white"
                  >
                    <Square className="w-3 h-3" /> {tt.stop}
                  </button>
                </div>
              )}
              {msg.role === 'ai' && !isSpeaking && i === messages.length - 1 && (
                <button
                  onClick={() => speak(msg.text)}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-[#00D1FF] mt-2 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Speak
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-sm px-4 py-3"
              style={{ background: 'rgba(0,209,255,0.08)', border: '1px solid rgba(0,209,255,0.2)' }}
            >
              <p className="text-xs font-semibold mb-1 opacity-50">{tt.yaad}</p>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#00D1FF' }} />
                <span className="text-sm text-white/60">{tt.thinking}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div
          className="px-4 sm:px-6 pb-4 pt-2"
          style={{ background: 'linear-gradient(to top, #020A2A 60%, rgba(2,10,42,0))' }}
        >
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            {/* Mic Button */}
            <button
              onClick={startListening}
              className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isListening
                  ? 'yaad-pulse-red'
                  : 'bg-white/5 border border-white/15 hover:border-white/30'
              }`}
              title={isListening ? tt.listening : tt.mic}
            >
              <Mic
                className="w-5 h-5"
                style={{ color: isListening ? '#fff' : '#00D1FF' }}
              />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendQuestion(input); }}
              placeholder={isListening ? tt.listening : tt.placeholder}
              className="flex-1 h-12 rounded-2xl px-4 text-sm bg-white/5 border border-white/15 focus:border-[#00D1FF] focus:outline-none transition-colors text-white placeholder:text-white/30"
            />

            {/* Send Button */}
            <button
              onClick={() => sendQuestion(input)}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
              style={{ background: '#00D1FF' }}
            >
              <Send className="w-5 h-5" style={{ color: '#020A2A' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-3 border-t border-white/5">
        <p className="text-xs text-white/30">ByteNexa presents Yaad</p>
      </footer>
    </div>
  );
}
