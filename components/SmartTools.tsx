import React, { useState, useRef, useEffect } from 'react';
import { Camera, Brain, Search, MapPin, Zap, Play, Loader2, StopCircle, Upload, X, ArrowUp, Sparkles, AlertTriangle, History, Clock, ChevronRight, Trash2, Calendar, CheckSquare, Plus, Save, MessageCircle, Mic } from 'lucide-react';
import { ToolType } from '../types';
import { 
  analyzeImage, 
  runDeepThinking, 
  runSearchQuery, 
  runMapsQuery, 
  runFastQuery, 
  runPlannerQuery,
  runChatQuery,
  transcribeAudio, 
  generateSpeech
} from '../utils/genai';
import { decodeBase64, decodeAudioData, OUTPUT_SAMPLE_RATE } from '../utils/audio';

const TOOLS = [
  { id: ToolType.FAST, name: 'Flash', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-400' },
  { id: ToolType.CHAT, name: 'Chat', icon: MessageCircle, color: 'text-indigo-400', bg: 'bg-indigo-400', border: 'border-indigo-400' },
  { id: ToolType.THINKING, name: 'Think', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-400' },
  { id: ToolType.VISION, name: 'Vision', icon: Camera, color: 'text-pink-400', bg: 'bg-pink-400', border: 'border-pink-400' },
  { id: ToolType.PLANNER, name: 'Plan', icon: Calendar, color: 'text-teal-400', bg: 'bg-teal-400', border: 'border-teal-400' },
  { id: ToolType.SEARCH, name: 'Search', icon: Search, color: 'text-blue-400', bg: 'bg-blue-400', border: 'border-blue-400' },
  { id: ToolType.MAPS, name: 'Maps', icon: MapPin, color: 'text-emerald-400', bg: 'bg-emerald-400', border: 'border-emerald-400' },
];

interface HistoryItem {
  id: string;
  tool: ToolType;
  query: string;
  result: string;
  grounding?: any[];
  timestamp: number;
}

// --- Interactive Table Component ---
const InteractiveTable: React.FC<{ 
  rawMarkdown: string, 
  onUpdate: (newMarkdown: string) => void 
}> = ({ rawMarkdown, onUpdate }) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);

  useEffect(() => {
    const lines = rawMarkdown.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return;

    const splitRow = (line: string) => {
      return line.split('|').map(c => c.trim()).filter((c, i, arr) => {
        if (i === 0 && c === '') return false;
        if (i === arr.length - 1 && c === '') return false;
        return true;
      });
    };

    const headerRow = splitRow(lines[0]);
    const bodyRows = lines.slice(2).map(splitRow).filter(r => r.length > 0);

    setHeaders(headerRow);
    setRows(bodyRows);
  }, [rawMarkdown]);

  const serializeTable = (currentHeaders: string[], currentRows: string[][]) => {
    const headerLine = `| ${currentHeaders.join(' | ')} |`;
    const separatorLine = `| ${currentHeaders.map(() => '---').join(' | ')} |`;
    const bodyLines = currentRows.map(row => `| ${row.join(' | ')} |`).join('\n');
    return `${headerLine}\n${separatorLine}\n${bodyLines}`;
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex][colIndex] = value;
    setRows(newRows);
    onUpdate(serializeTable(headers, newRows));
  };

  const toggleCheckbox = (rowIndex: number, colIndex: number, currentVal: string) => {
    let newVal = currentVal;
    if (/\[\s*\]/.test(currentVal)) {
      newVal = currentVal.replace(/\[\s*\]/, '[x]');
    } else if (/\[x\]/i.test(currentVal)) {
      newVal = currentVal.replace(/\[x\]/i, '[ ]');
    }
    updateCell(rowIndex, colIndex, newVal);
  };

  const addRow = () => {
    const newRow = new Array(headers.length).fill('');
    headers.forEach((h, i) => {
      if (h.toLowerCase().includes('status')) newRow[i] = '[ ]';
    });
    const newRows = [...rows, newRow];
    setRows(newRows);
    onUpdate(serializeTable(headers, newRows));
  };
  
  const deleteRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    onUpdate(serializeTable(headers, newRows));
  };

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-[#0f1219]/60 backdrop-blur-md ring-1 ring-white/5">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {headers.map((h, i) => (
                <th key={`head-${i}`} className="px-5 py-4 font-semibold text-teal-400 uppercase tracking-widest text-[10px] whitespace-nowrap min-w-[100px]">
                  {h}
                </th>
              ))}
              <th className="px-2 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row, rI) => (
              <tr key={`row-${rI}`} className="hover:bg-white/[0.03] transition-colors group">
                {row.map((cell, cI) => {
                  const isCheckbox = /\[\s*\]|\[x\]/i.test(cell);
                  return (
                    <td key={`cell-${rI}-${cI}`} className="px-4 py-3 text-slate-300 relative min-w-[120px]">
                      {isCheckbox ? (
                        <button 
                          onClick={() => toggleCheckbox(rI, cI, cell)}
                          className="flex items-center gap-3 w-full px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left group/check"
                        >
                          {/\[x\]/i.test(cell) ? (
                             <div className="w-5 h-5 rounded-md bg-teal-500/20 border border-teal-500 flex items-center justify-center text-teal-400 shrink-0 shadow-[0_0_10px_rgba(45,212,191,0.2)]">
                               <CheckSquare className="w-3.5 h-3.5" />
                             </div>
                          ) : (
                             <div className="w-5 h-5 rounded-md border border-slate-500/30 group-hover/check:border-teal-500/50 shrink-0 transition-colors bg-white/[0.02]" />
                          )}
                          <span className={`truncate text-sm ${/\[x\]/i.test(cell) ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {cell.replace(/\[.\]/, '').trim() || 'Done'}
                          </span>
                        </button>
                      ) : (
                        <input 
                          type="text" 
                          value={cell}
                          onChange={(e) => updateCell(rI, cI, e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 focus:border-b focus:border-teal-500/50 rounded-none px-2 py-1 text-slate-300 placeholder-slate-600 transition-all font-light"
                        />
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right">
                  <button 
                    onClick={() => deleteRow(rI)}
                    className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete Row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button 
        onClick={addRow}
        className="w-full py-3 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-teal-400 hover:bg-white/5 transition-colors border-t border-white/5 uppercase tracking-wide"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Row
      </button>
    </div>
  );
};

// --- Custom Renderer ---
const SmartContentRenderer: React.FC<{ 
  content: string, 
  onContentChange: (newContent: string) => void 
}> = ({ content, onContentChange }) => {
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let currentTextBuffer: string[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushText = (keyPrefix: string) => {
    if (currentTextBuffer.length > 0) {
      renderedElements.push(
        <div key={`${keyPrefix}-text`} className="whitespace-pre-wrap leading-relaxed mb-6 text-slate-200 font-light text-base md:text-lg tracking-wide">
          {currentTextBuffer.join('\n')}
        </div>
      );
      currentTextBuffer = [];
    }
  };

  const flushTable = (keyPrefix: string) => {
    if (tableBuffer.length > 0) {
      const tableMarkdown = tableBuffer.join('\n');
      renderedElements.push(
        <InteractiveTable 
          key={`${keyPrefix}-table`} 
          rawMarkdown={tableMarkdown} 
          onUpdate={(newTableMd) => {
             const newFullContent = content.replace(tableMarkdown, newTableMd);
             onContentChange(newFullContent);
          }}
        />
      );
      tableBuffer = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) {
        flushText(`block-${index}`);
        inTable = true;
      }
      tableBuffer.push(line);
    } else {
      if (inTable) {
        flushTable(`block-${index}`);
        inTable = false;
      }
      currentTextBuffer.push(line);
    }
  });

  flushText('final');
  flushTable('final');

  return <div>{renderedElements}</div>;
};

const SmartTools: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.FAST);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultText, setResultText] = useState('');
  const [groundingInfo, setGroundingInfo] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('velocity_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  const saveToHistory = (tool: ToolType, query: string, result: string, grounding: any[]) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      tool,
      query,
      result,
      grounding,
      timestamp: Date.now()
    };
    const updated = [newItem, ...history].slice(50);
    setHistory(updated);
    localStorage.setItem('velocity_history', JSON.stringify(updated));
    setCurrentHistoryId(newItem.id);
  };

  const handleContentUpdate = (newContent: string) => {
    setResultText(newContent);
    if (currentHistoryId) {
      const updatedHistory = history.map(h => 
        h.id === currentHistoryId ? { ...h, result: newContent } : h
      );
      setHistory(updatedHistory);
      localStorage.setItem('velocity_history', JSON.stringify(updatedHistory));
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('velocity_history');
    setCurrentHistoryId(null);
  };

  const restoreHistoryItem = (item: HistoryItem) => {
    setActiveTool(item.tool);
    setInputText(item.query);
    setResultText(item.result);
    setGroundingInfo(item.grounding || []);
    setCurrentHistoryId(item.id);
    setShowHistory(false);
    setError(null);
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (resultText || isProcessing) {
       setTimeout(scrollToBottom, 100);
    }
  }, [resultText, isProcessing]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const type = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          try {
            const text = await transcribeAudio(base64Audio);
            if (text) {
              setInputText(prev => prev + (prev ? ' ' : '') + text);
              executeTool(text); 
            }
          } catch (e: any) {
            setError("Transcription failed: " + e.message);
            setIsProcessing(false);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setError("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const executeTool = async (overrideInput?: string) => {
    const query = overrideInput || inputText;
    if ((!query && !selectedImage) || (isProcessing && !overrideInput)) return;
    
    if (!overrideInput) {
        setInputText('');
        clearImage();
    }
    
    setIsProcessing(true);
    setResultText('');
    setGroundingInfo([]);
    setError(null);

    const currentTool = activeTool;

    try {
      let text = '';
      let chunks: any[] = [];

      switch (activeTool) {
        case ToolType.FAST: text = await runFastQuery(query); break;
        case ToolType.CHAT: text = await runChatQuery(query); break;
        case ToolType.THINKING: text = await runDeepThinking(query); break;
        case ToolType.PLANNER: text = await runPlannerQuery(query); break;
        case ToolType.VISION:
          if (selectedImage) text = await analyzeImage(selectedImage, query || "Describe this image.");
          else throw new Error("Please upload an image.");
          break;
        case ToolType.SEARCH:
          const searchRes = await runSearchQuery(query);
          text = searchRes.text;
          chunks = searchRes.chunks;
          break;
        case ToolType.MAPS:
          let coords: GeolocationCoordinates | undefined;
          try {
             const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
               const id = setTimeout(() => reject(new Error("Timeout")), 3000);
               navigator.geolocation.getCurrentPosition((p) => { clearTimeout(id); resolve(p); }, 
               (e) => { clearTimeout(id); reject(e); }, { timeout: 3000 });
             });
             coords = pos.coords;
          } catch (e) { /* ignore */ }
          const mapsRes = await runMapsQuery(query, coords);
          text = mapsRes.text;
          chunks = mapsRes.chunks;
          break;
      }

      setResultText(text);
      setGroundingInfo(chunks);
      saveToHistory(currentTool, query, text, chunks);

      if (text && text.length < 150 && activeTool !== ToolType.PLANNER) {
        generateSpeech(text).then(b => b && playAudio(b)).catch(() => {});
      }
    } catch (error: any) {
      let msg = error.message || "An unexpected error occurred.";
      if (msg.includes("404")) msg = "Tool unavailable. Try another.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = async (base64: string) => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });
      }
      const ctx = audioContextRef.current;
      if(ctx.state === 'suspended') await ctx.resume();
      const buffer = await decodeAudioData(decodeBase64(base64), ctx, OUTPUT_SAMPLE_RATE);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) { console.error(e); }
  };

  const activeToolData = TOOLS.find(t => t.id === activeTool) || TOOLS[0];

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto relative">
      
      {/* Top Bar - Tool Selector */}
      <div className="flex items-center justify-between gap-4 pb-4 px-4 pt-4 shrink-0 z-10">
        <div className="flex p-1.5 bg-slate-900/60 backdrop-blur-xl rounded-full border border-white/5 shadow-2xl overflow-x-auto no-scrollbar scroll-smooth">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                    setActiveTool(tool.id);
                    setResultText('');
                    setGroundingInfo([]);
                    setError(null);
                    setShowHistory(false);
                    setCurrentHistoryId(null);
                }}
                className={`
                  relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap z-10 
                  ${isActive 
                    ? `bg-slate-800/90 ${tool.border} text-white shadow-lg ring-1 ring-white/10 scale-105` 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {isActive && (
                   <div className={`absolute inset-0 rounded-full opacity-20 blur-lg -z-10 ${tool.bg}`} />
                )}
                <Icon className={`w-4 h-4 ${isActive ? tool.color : ''}`} />
                <span>{tool.name}</span>
              </button>
            );
          })}
        </div>
        
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`p-3.5 rounded-full transition-all border shadow-lg ${showHistory ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800/80 hover:border-white/10'}`}
          title="History"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden rounded-[2.5rem] mx-2 sm:mx-0 bg-gradient-to-br from-slate-900/30 to-slate-950/30 backdrop-blur-sm border border-white/5 shadow-inner">
        
        {/* History Sidebar */}
        <div className={`absolute inset-y-0 right-0 w-full sm:w-96 z-30 bg-[#0b0f19]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
             <div className="flex items-center justify-between p-6 border-b border-white/5">
               <div className="flex items-center gap-3">
                 <Clock className="w-5 h-5 text-cyan-400" />
                 <h3 className="font-semibold text-white tracking-wide text-lg">History</h3>
               </div>
               <div className="flex items-center gap-2">
                 {history.length > 0 && (
                   <button onClick={clearHistory} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Clear All">
                     <Trash2 className="w-5 h-5" />
                   </button>
                 )}
                 <button onClick={() => setShowHistory(false)} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                   <ChevronRight className="w-5 h-5" />
                 </button>
               </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
               {history.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4">
                   <div className="w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center">
                      <History className="w-8 h-8 opacity-40" />
                   </div>
                   <p className="text-sm font-medium">No recent queries</p>
                 </div>
               ) : (
                 history.map((item) => {
                   const toolConfig = TOOLS.find(t => t.id === item.tool) || TOOLS[0];
                   const ToolIcon = toolConfig.icon;
                   return (
                     <button 
                       key={item.id}
                       onClick={() => restoreHistoryItem(item)}
                       className="w-full text-left p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-cyan-500/30 transition-all group active:scale-[0.98]"
                     >
                       <div className="flex items-center justify-between mb-3">
                         <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border ${toolConfig.border} border-opacity-20`}>
                           <ToolIcon className={`w-3.5 h-3.5 ${toolConfig.color}`} />
                           <span className={`text-[10px] font-bold uppercase tracking-wider ${toolConfig.color}`}>
                             {toolConfig.name}
                           </span>
                         </div>
                         <span className="text-[10px] text-slate-500 font-medium">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                       <p className="text-sm text-slate-200 font-medium line-clamp-1 mb-1.5">{item.query || "Image Analysis"}</p>
                       <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-light">{item.result}</p>
                     </button>
                   );
                 })
               )}
             </div>
        </div>

        <div 
          className="absolute inset-0 overflow-y-auto px-4 md:px-8 py-8 scroll-smooth pb-48 custom-scrollbar"
        >
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start justify-between gap-3 text-red-200 animate-in fade-in slide-in-from-top-2 backdrop-blur-md shadow-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                <div className="text-sm leading-relaxed font-light">{error}</div>
              </div>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>
          )}

          {!resultText && !isProcessing ? (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
              <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white/5 border ${activeToolData.border} border-opacity-30 backdrop-blur-xl ring-1 ring-white/10 group`}>
                <activeToolData.icon className={`w-12 h-12 ${activeToolData.color} drop-shadow-lg group-hover:scale-110 transition-transform duration-300`} />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">
                {activeToolData.name} Mode
              </h3>
              <p className="text-slate-400 max-w-md leading-relaxed text-base font-light px-6 mb-12">
                {activeTool === ToolType.VISION && "Upload images to get detailed analysis and answers."}
                {activeTool === ToolType.THINKING && "Deep reasoning for complex logic, code, and math."}
                {activeTool === ToolType.SEARCH && "Real-time, fact-checked answers from the web."}
                {activeTool === ToolType.MAPS && "Find places, restaurants, and routes nearby."}
                {activeTool === ToolType.PLANNER && "Generate structured Notion-style study plans."}
                {activeTool === ToolType.FAST && "Lightning fast answers for everyday questions."}
                {activeTool === ToolType.CHAT && "Engage in deep conversation with Gemini 3 Pro."}
              </p>

              {/* Suggestion Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  "Create a study plan for History",
                  "Explain quantum entanglement",
                  "What's the news on Mars?",
                  "Analyze this photo"
                ].map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => { setInputText(s); }}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs text-slate-400 hover:text-white transition-all text-left"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8 max-w-4xl mx-auto">
              {(inputText || selectedImage) && (
                 <div className="flex justify-end">
                   <div className="bg-slate-800/80 backdrop-blur-xl border border-white/10 text-slate-100 px-6 py-4 rounded-[2rem] rounded-tr-sm max-w-[90%] sm:max-w-[80%] shadow-2xl">
                      {imagePreview && (
                        <div className="mb-4 relative group">
                          <img src={imagePreview} alt="User upload" className="w-full max-w-xs object-cover rounded-2xl border border-white/10 shadow-lg" />
                        </div>
                      )}
                      <p className="text-base leading-relaxed font-light">{inputText}</p>
                   </div>
                 </div>
              )}

              <div className="flex items-start gap-5 animate-in fade-in slide-in-from-bottom-8 duration-500">
                 <div className={`hidden sm:flex w-10 h-10 rounded-2xl items-center justify-center shrink-0 mt-1 shadow-lg bg-slate-900 border border-white/10 ${activeToolData.color}`}>
                   <Sparkles className="w-5 h-5" />
                 </div>
                 <div className="flex-1 min-w-0">
                    {isProcessing ? (
                      <div className="flex items-center gap-4 bg-white/5 border border-white/5 px-6 py-4 rounded-2xl w-fit backdrop-blur-sm">
                        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                        <span className="text-sm font-medium text-slate-300 animate-pulse tracking-wide">
                          Gemini is thinking...
                        </span>
                      </div>
                    ) : (
                      <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] rounded-tl-sm p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50" />
                        
                        <SmartContentRenderer content={resultText} onContentChange={handleContentUpdate} />
                        
                        <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-white/5">
                           <button 
                             onClick={() => generateSpeech(resultText).then(b => b && playAudio(b))}
                             className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-cyan-400 transition-colors bg-white/5 px-4 py-2 rounded-xl hover:bg-white/10 ring-1 ring-transparent hover:ring-cyan-500/30"
                           >
                             <Play className="w-3 h-3 fill-current" />
                             Read Aloud
                           </button>
                           {currentHistoryId && (
                             <div className="flex items-center gap-1.5 text-xs font-medium text-teal-400/80 ml-auto bg-teal-500/10 px-3 py-1.5 rounded-full border border-teal-500/20">
                               <Save className="w-3 h-3" />
                               <span>Saved</span>
                             </div>
                           )}
                        </div>

                        {groundingInfo.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-6">
                            {groundingInfo.map((chunk, i) => {
                              const uri = chunk.web?.uri || chunk.maps?.uri;
                              const title = chunk.web?.title || chunk.maps?.title || "Source";
                              if (!uri) return null;
                              return (
                                <a 
                                  key={i} 
                                  href={uri} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-slate-950/50 border border-white/10 rounded-xl text-xs text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all truncate max-w-[220px]"
                                >
                                  {activeTool === ToolType.MAPS ? <MapPin className="w-3 h-3 flex-shrink-0" /> : <Search className="w-3 h-3 flex-shrink-0" />}
                                  <span className="truncate font-medium">{title}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                 </div>
              </div>
              <div ref={messagesEndRef} className="h-8" />
            </div>
          )}
        </div>
      </div>

      {/* Floating Input Area */}
      <div className="absolute bottom-6 left-2 right-2 sm:left-6 sm:right-6 z-20">
        <div className="bg-slate-900/90 backdrop-blur-2xl p-2.5 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-end gap-3 transition-all ring-1 ring-white/5 hover:ring-white/10 focus-within:ring-cyan-500/30 focus-within:border-cyan-500/30">
          
          {activeTool === ToolType.VISION && (
             <div className="shrink-0 mb-1.5 ml-1.5">
               <input 
                 type="file" 
                 accept="image/*" 
                 onChange={handleImageSelect} 
                 className="hidden" 
                 id="img-upload-input"
               />
               <label 
                 htmlFor="img-upload-input" 
                 className={`w-11 h-11 flex items-center justify-center rounded-full cursor-pointer transition-all ${selectedImage ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
               >
                 {selectedImage ? <Camera className="w-5 h-5"/> : <Upload className="w-5 h-5" />}
               </label>
               {selectedImage && (
                 <div className="absolute bottom-full left-0 mb-6 ml-2 p-2 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                   <img src={imagePreview!} alt="Preview" className="w-24 h-24 object-cover rounded-xl" />
                   <button onClick={clearImage} className="p-1.5 text-slate-400 hover:text-white hover:bg-red-500 rounded-full transition-colors"><X className="w-4 h-4" /></button>
                 </div>
               )}
             </div>
          )}

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if(e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                executeTool();
              }
            }}
            placeholder={activeTool === ToolType.VISION && !selectedImage ? "Upload an image to start..." : activeTool === ToolType.PLANNER ? "Describe your goals (e.g. Study Physics finals)..." : "Ask anything..."}
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 px-2 py-4 min-h-[3.5rem] max-h-32 resize-none text-base font-light tracking-wide"
            disabled={isProcessing}
            rows={1}
          />

          <div className="flex items-center gap-2 mb-1.5 mr-1.5">
            {inputText || (activeTool === ToolType.VISION && selectedImage) ? (
              <button
                onClick={() => executeTool()}
                disabled={isProcessing}
                className={`w-11 h-11 flex items-center justify-center rounded-full text-white shadow-lg hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${activeToolData.bg}`}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-6 h-6" />}
              </button>
            ) : (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse' 
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default SmartTools;