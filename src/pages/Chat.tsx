import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Stethoscope, AlertCircle, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import clsx from 'clsx';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยแพทย์และเภสัชกรส่วนตัวของคุณ ผมได้อ่านข้อมูลสุขภาพ ผลตรวจเลือด และรายการยาปัจจุบันของคุณเรียบร้อยแล้ว วันนี้มีอาการอะไรให้ผมช่วยดูแล หรืออยากให้ผมวิเคราะห์ผลตรวจสุขภาพให้ฟังไหมครับ?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/chat/history');
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error('Failed to fetch chat history', err);
      } finally {
        setIsFetchingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    
    // Add user message to UI
    const newMessages: Message[] = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Format messages for Gemini API, limit to last 20 messages to save tokens
      const apiMessages = newMessages.slice(-20).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model: selectedModel })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to get response');
      }

      const data = await res.json();
      
      // Add model response to UI
      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (err: any) {
      setError(err.message || 'An error occurred while communicating with the AI.');
      // Remove the user message if it failed, or just show error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[500px] max-h-[800px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-indigo-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">AI Medical & Pharmacy Assistant</h2>
            <p className="text-xs text-slate-500">Expert analysis based on your personal health data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMessages([
                { 
                  role: 'model', 
                  text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยแพทย์และเภสัชกรส่วนตัวของคุณ ผมได้อ่านข้อมูลสุขภาพ ผลตรวจเลือด และรายการยาปัจจุบันของคุณเรียบร้อยแล้ว วันนี้มีอาการอะไรให้ผมช่วยดูแล หรืออยากให้ผมวิเคราะห์ผลตรวจสุขภาพให้ฟังไหมครับ?' 
                }
              ]);
              setError('');
            }}
            disabled={isLoading}
            className="px-3 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            เริ่มแชตใหม่
          </button>
          <label className="text-xs font-medium text-slate-700 whitespace-nowrap ml-2">AI Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isLoading}
            className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
          >
<option value="gemini-3-flash-preview">Gemini 3 Flash Preview  (Default)</option>
<option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
<option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</option>
<option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview</option>
<option value="gemini-flash-latest">Gemini Flash Latest</option>
<option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
<option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
<option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
<option value="gemini-pro-latest">Gemini Pro (Latest Stable)</option>
          </select>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 min-h-[300px]">
        {isFetchingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-sm">กำลังโหลดประวัติการแชต...</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={clsx(
                  "flex gap-4 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                  msg.role === 'user' ? "bg-slate-200 text-slate-600" : "bg-indigo-600 text-white"
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className={clsx(
                  "p-4 rounded-2xl",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-sm" 
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
                )}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                  ) : (
                    <div className="markdown-body text-sm prose prose-slate prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:text-slate-800 max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 rounded-tl-sm shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-sm text-slate-500">Analyzing your health data...</span>
                </div>
              </div>
            )}
          </>
        )}
        
        {error && (
          <div className="mx-auto max-w-md p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your lab results, medications, or health trends..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-3">
          AI can make mistakes. Always consult your doctor for medical advice.
        </p>
      </div>
    </div>
  );
}
