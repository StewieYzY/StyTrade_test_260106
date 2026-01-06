
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Search, Play, ShieldAlert, BarChart3, MessageSquare, 
  FileText, TrendingUp, TrendingDown, ClipboardCheck, 
  Activity, Loader2, RefreshCw, Calendar, Tag, History, LayoutDashboard, ChevronRight, ArrowLeft, X, Filter, Clock, AlertTriangle, Coffee, Timer, Zap, ShieldCheck, AlertCircle, Info, Settings, Save, RotateCcw, Download, Beaker, Edit3, Check, Ban, Eye, FileOutput, ExternalLink, Gauge, Square, Lock, Key
} from 'lucide-react';
import { DatePicker, Select, ConfigProvider, theme, Switch, Tooltip as AntTooltip, Modal, Button, Tag as AntTag, notification, Progress, Input } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import { AgentRole, AgentAction, HistoryRecord, ModelType, AgentModelSettings, SentimentMetrics } from './types';
import { geminiService } from './services/geminiService';
import { AGENT_SYSTEM_INSTRUCTIONS, getPromptForStep, INTELLIGENCE_SUB_TASKS } from './services/prompts';

const { RangePicker } = DatePicker;

const PRICE_FORECAST_DAYS = 180;
const COOLDOWN_PRO = 65; 
const COOLDOWN_FLASH = 32;

const STAGE_NAMES = [
  { id: 1, name: '分布式收割' },
  { id: 2, name: '多维分析' },
  { id: 3, name: '多空辩论' },
  { id: 4, name: '风险评估' },
  { id: 5, name: '加权决策' }
];

const DEFAULT_MODELS: AgentModelSettings = {
  [AgentRole.INTELLIGENCE_OFFICER]: 'gemini-3-flash-preview',
  [AgentRole.FUND_SECRETARY]: 'gemini-3-flash-preview',
  [AgentRole.FUND_MANAGER]: 'gemini-3-pro-preview',
  [AgentRole.FUNDAMENTAL_ANALYST]: 'gemini-3-flash-preview',
  [AgentRole.SENTIMENT_ANALYST]: 'gemini-3-flash-preview',
  [AgentRole.NEWS_POLICY_ANALYST]: 'gemini-3-flash-preview',
  [AgentRole.TECHNICAL_ANALYST]: 'gemini-3-flash-preview',
  [AgentRole.BULL_RESEARCHER]: 'gemini-3-flash-preview',
  [AgentRole.BEAR_RESEARCHER]: 'gemini-3-flash-preview',
  [AgentRole.TRADER]: 'gemini-3-pro-preview',
  [AgentRole.RISK_MANAGER]: 'gemini-3-pro-preview'
};

const formatDateTime = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const CustomPriceTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl">
        <p className="text-[10px] text-slate-500 font-mono mb-1">{payload[0].payload.date}</p>
        <p className="text-sm font-bold text-blue-400">¥{payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

const GroundingSources = ({ sources }: { sources?: any[] }) => {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-8 pt-6 border-t border-slate-800/50">
      <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2 tracking-tight uppercase">
        <ExternalLink size={14} /> 参考来源 (Fact Check)
      </h3>
      <ul className="space-y-2">
        {sources.map((chunk, idx) => {
          const uri = chunk.web?.uri || chunk.maps?.uri;
          const title = chunk.web?.title || chunk.maps?.title || uri;
          if (!uri) return null;
          return (
            <li key={idx} className="group">
              <a href={uri} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-2 truncate">
                <span className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center text-[8px] font-mono group-hover:bg-blue-500 group-hover:text-white transition-colors">{idx + 1}</span>
                <span className="truncate underline decoration-slate-800 underline-offset-4 group-hover:decoration-blue-500/30">{title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const SentimentMetricsPanel = ({ metrics, isWorking }: { metrics?: SentimentMetrics; isWorking?: boolean }) => {
  if (isWorking) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <span className="text-[10px] font-mono uppercase tracking-widest">量化透视计算中...</span>
      </div>
    );
  }
  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-20">
        <Gauge size={32} />
        <span className="text-[10px] mt-2 font-mono uppercase text-center">等待舆情分析师<br/>下发量化数据</span>
      </div>
    );
  }
  const renderMetric = (label: string, value: number, max: number, min: number, format: (v: number) => string, colorClass: string, showMidLine: boolean = false) => {
    const percent = ((value - min) / (max - min)) * 100;
    const clampedPercent = Math.min(100, Math.max(0, percent));
    return (
      <div className="flex items-center gap-3 w-full group">
        <span className="w-16 text-[9px] font-bold text-slate-500 uppercase tracking-tight truncate shrink-0">{label}</span>
        <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full relative overflow-hidden">
          {showMidLine && <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-700/50 z-10" />}
          <div className={`h-full transition-all duration-1000 ease-out ${colorClass}`} style={{ width: `${clampedPercent}%` }} />
        </div>
        <span className={`w-10 text-right text-[10px] font-mono font-bold shrink-0 ${colorClass.startsWith('bg-') ? colorClass.replace('bg-', 'text-') : 'text-slate-300'}`}>
          {format(value)}
        </span>
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-5 w-full">
      {renderMetric("情绪总分", metrics.score || 0, 1, -1, (v) => v.toFixed(2), (metrics.score || 0) >= 0 ? "bg-emerald-500" : "bg-rose-500", true)}
      {renderMetric("信心指数", metrics.confidence || 0, 1, 0, (v) => `${(v * 100).toFixed(0)}%`, "bg-blue-500")}
      {renderMetric("舆情热度", metrics.intensity || 0, 10, 0, (v) => v.toFixed(1), "bg-amber-500")}
      {renderMetric("分歧度", metrics.disagreement || 0, 1, 0, (v) => `${(v * 100).toFixed(0)}%`, (metrics.disagreement || 0) > 0.6 ? "bg-orange-500" : "bg-slate-500")}
      {renderMetric("衰减系数", metrics.decay || 0, 1, 0, (v) => v.toFixed(2), "bg-purple-500")}
    </div>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState<'analysis' | 'history' | 'history-detail' | 'settings'>('analysis');
  const [symbol, setSymbol] = useState('688608');
  const [stockName, setStockName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [reports, setReports] = useState<Record<string, { text: string; sources?: any[]; score?: number; sentimentMetrics?: SentimentMetrics }>>({});
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorRole, setErrorRole] = useState<AgentRole | null>(null);
  const [errorModel, setErrorModel] = useState<string | null>(null);
  const [isDailyQuotaExceeded, setIsDailyQuotaExceeded] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [priceData, setPriceData] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryRecord | null>(null);
  const [filterCode, setFilterCode] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [agentModels, setAgentModels] = useState<AgentModelSettings>(DEFAULT_MODELS);
  const [isEditingModels, setIsEditingModels] = useState(false);
  const [tempAgentModels, setTempAgentModels] = useState<AgentModelSettings>(DEFAULT_MODELS);

  const scrollRef = useRef<HTMLDivElement>(null);
  const priceDataRef = useRef<any[]>([]);
  const shouldStopRef = useRef(false);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [actions]);
  useEffect(() => { priceDataRef.current = priceData; }, [priceData]);

  const filteredHistory = useMemo(() => {
    return (historyList || []).filter((record) => {
      const searchStr = filterCode.toLowerCase();
      const matchesSearch = record.symbol.toLowerCase().includes(searchStr) || record.stockName.toLowerCase().includes(searchStr);
      if (!dateRange || !dateRange[0] || !dateRange[1]) return matchesSearch;
      const recordDate = dayjs(record.timestamp);
      return matchesSearch && (recordDate.isAfter(dateRange[0].startOf('day')) || recordDate.isSame(dateRange[0], 'day')) && (recordDate.isBefore(dateRange[1].endOf('day')) || recordDate.isSame(dateRange[1], 'day'));
    });
  }, [historyList, filterCode, dateRange]);

  useEffect(() => {
    let timer: number;
    if (cooldownLeft > 0) timer = window.setInterval(() => setCooldownLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldownLeft]);

  const initCharts = useCallback((startPrice: number) => {
    const pData = [], now = new Date();
    for (let i = 0; i <= PRICE_FORECAST_DAYS; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i);
      pData.push({ index: i, date: d.toISOString().split('T')[0], price: startPrice, isFuture: i > 0 });
    }
    setPriceData(pData);
  }, []);

  const evolvePredictions = useCallback((type: 'price', intensity: number) => {
    setPriceData(prev => prev.map((item, i) => item.isFuture ? { ...item, price: item.price + (item.price * (intensity / 100) * (i / PRICE_FORECAST_DAYS)) + (Math.random() - 0.5) * (item.price * 0.01) } : item));
  }, []);

  const waitCooldown = async (seconds: number) => {
    if (seconds <= 0) return;
    setCooldownLeft(seconds);
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  };

  const getCooldownByModel = (modelName: string): number => {
    return modelName.toLowerCase().includes('pro') ? COOLDOWN_PRO : COOLDOWN_FLASH;
  };

  const extractScore = (text: string): number | undefined => {
    const match = text.match(/\[SCORE:\s*(\d+)\]/i);
    return match ? parseInt(match[1]) : undefined;
  };

  const extractSentimentMetrics = (text: string): SentimentMetrics | undefined => {
    try {
      const match = text.match(/\[SENTIMENT_METRICS:\s*(\{[\s\S]*?\})\]/i);
      if (match) return JSON.parse(match[1]);
    } catch (e) { console.warn("Failed to parse sentiment metrics JSON:", e); }
    return undefined;
  };

  const handlePauseAnalysis = () => {
    Modal.confirm({
      title: '确认暂停分析？',
      content: '暂停后将立即停止后续所有尚未开始的智能体任务。',
      okText: '确认暂停',
      okButtonProps: { danger: true },
      onOk: () => {
        shouldStopRef.current = true;
        notification.info({ message: '分析已中断', description: '流水线已熔断。' });
      }
    });
  };

  const runSOP = async () => {
    if (!symbol || isProcessing) return;
    setIsProcessing(true);
    shouldStopRef.current = false;
    setActions([]); setReports({}); setSelectedReportId(null); setErrorMessage(null); setErrorRole(null); setErrorModel(null);
    setStockName('正在建立基准行情 (检索环节)...'); setCurrentStep(1);

    let localActions: AgentAction[] = [];
    let localReports: Record<string, { text: string; sources?: any[]; score?: number; sentimentMetrics?: SentimentMetrics }> = {};

    try {
      const stockInfoModel = 'gemini-3-flash-preview';
      const stockInfo = await geminiService.fetchStockInfo(symbol);
      if (shouldStopRef.current) { setIsProcessing(false); return; }
      setBasePrice(stockInfo.price); setStockName(stockInfo.name); initCharts(stockInfo.price);
      
      setStockName(`配额避让保护中...`);
      await waitCooldown(getCooldownByModel(stockInfoModel)); 
      if (shouldStopRef.current) { setIsProcessing(false); return; }

      const intelSubTasks = [
        { key: 'FINANCE', name: '财务现状检索', prompt: INTELLIGENCE_SUB_TASKS.FINANCE },
        { key: 'SENTIMENT', name: '舆情脉搏检索', prompt: INTELLIGENCE_SUB_TASKS.SENTIMENT },
        { key: 'NEWS', name: '重大新闻检索', prompt: INTELLIGENCE_SUB_TASKS.NEWS },
        { key: 'POLICY', name: '政策环境检索', prompt: INTELLIGENCE_SUB_TASKS.POLICY }
      ];

      // Fix typo here: INTELLIGENCE_OFFICER
      const intelModel = agentModels[AgentRole.INTELLIGENCE_OFFICER] || 'gemini-3-flash-preview';
      let rawIntelFragments = "";
      let allIntelSources: any[] = [];
      const intelActionId = Math.random().toString(36).substr(2, 9);
      localActions = [...localActions, { id: intelActionId, role: AgentRole.INTELLIGENCE_OFFICER, status: 'working', startTime: Date.now() }];
      setActions([...localActions]); setSelectedReportId(intelActionId);

      for (let i = 0; i < intelSubTasks.length; i++) {
        if (shouldStopRef.current) break;
        const sub = intelSubTasks[i];
        setStockName(`情报收割 (${i+1}/${intelSubTasks.length}): ${sub.name}`);
        const { text, sources } = await geminiService.generateAgentResponse(
          AgentRole.INTELLIGENCE_OFFICER,
          getPromptForStep(AgentRole.INTELLIGENCE_OFFICER, `${stockInfo.name} (${symbol})`, "", sub.prompt),
          AGENT_SYSTEM_INSTRUCTIONS[AgentRole.INTELLIGENCE_OFFICER],
          true,
          intelModel
        );
        rawIntelFragments += `\n\n### [${sub.name}]\n${text}\n`;
        if (sources) allIntelSources = [...allIntelSources, ...sources];
        await waitCooldown(getCooldownByModel(intelModel));
        if (shouldStopRef.current) break;
      }
      if (shouldStopRef.current) { setIsProcessing(false); return; }

      const fusionModel = 'gemini-3-flash-preview';
      setStockName('正在熔炼全局情报档案 (SSoT)...');
      const uniqueSourcesMap = new Map();
      allIntelSources.forEach(s => {
        const uri = s.web?.uri || s.maps?.uri;
        if (uri && !uniqueSourcesMap.has(uri)) uniqueSourcesMap.set(uri, s);
      });
      const uniqueSources = Array.from(uniqueSourcesMap.values());
      const sourceReferenceText = uniqueSources.map((s, idx) => `[${idx + 1}] ${s.web?.title || s.web?.uri}`).join('\n');

      const { text: finalDossier } = await geminiService.generateAgentResponse(
        AgentRole.INTELLIGENCE_OFFICER,
        getPromptForStep(AgentRole.INTELLIGENCE_OFFICER, `${stockInfo.name} (${symbol})`, `以下为碎片化情报，请聚合成一份《全局共享情报档案》，并标注引用序号：\n\n${rawIntelFragments}\n\n### 可用来源列表：\n${sourceReferenceText}`),
        AGENT_SYSTEM_INSTRUCTIONS[AgentRole.INTELLIGENCE_OFFICER],
        false,
        fusionModel
      );

      localActions = localActions.map(a => a.id === intelActionId ? { ...a, status: 'completed', output: finalDossier, endTime: Date.now() } : a);
      localReports = { ...localReports, [intelActionId]: { text: finalDossier, sources: uniqueSources } };
      setActions([...localActions]); setReports({ ...localReports });
      await waitCooldown(COOLDOWN_FLASH);
      if (shouldStopRef.current) { setIsProcessing(false); return; }

      const pipeline = [
        { role: AgentRole.FUNDAMENTAL_ANALYST, step: 2, useSearch: false },
        { role: AgentRole.SENTIMENT_ANALYST, step: 2, useSearch: false },
        { role: AgentRole.NEWS_POLICY_ANALYST, step: 2, useSearch: false },
        { role: AgentRole.TECHNICAL_ANALYST, step: 2, useSearch: false },
        { role: AgentRole.BULL_RESEARCHER, step: 3, useSearch: false },
        { role: AgentRole.BEAR_RESEARCHER, step: 3, useSearch: false },
        { role: AgentRole.RISK_MANAGER, step: 4, useSearch: false },
        { role: AgentRole.FUND_MANAGER, step: 5, useSearch: false }
      ];

      let analystReportsText = "";
      for (let i = 0; i < pipeline.length; i++) {
        if (shouldStopRef.current) break;
        const item = pipeline[i];
        const targetModel = agentModels[item.role] || 'gemini-3-flash-preview';
        setCurrentStep(item.step);
        setStockName(`正在执行: ${item.role}`);
        const actionId = Math.random().toString(36).substr(2, 9);
        localActions = [...localActions, { id: actionId, role: item.role, status: 'working', startTime: Date.now() }];
        setActions([...localActions]); setSelectedReportId(actionId);

        try {
          const inputContext = item.step === 2 ? finalDossier : `### [全局情报档案]\n${finalDossier}\n\n### [各维度分析汇总]\n${analystReportsText}`;
          const { text, sources } = await geminiService.generateAgentResponse(
            item.role, getPromptForStep(item.role, `${stockInfo.name} (${symbol})`, inputContext), 
            AGENT_SYSTEM_INSTRUCTIONS[item.role], item.useSearch, targetModel
          );
          if (item.step === 2) analystReportsText += `\n\n--- ${item.role} 研判 ---\n${text}\n`;
          const score = extractScore(text);
          let sentimentMetrics = (item.role === AgentRole.SENTIMENT_ANALYST) ? extractSentimentMetrics(text) : undefined;
          localActions = localActions.map(a => a.id === actionId ? { ...a, status: 'completed', output: text, score, sentimentMetrics, endTime: Date.now() } : a);
          localReports = { ...localReports, [actionId]: { text, sources, score, sentimentMetrics } };
          setActions([...localActions]); setReports({ ...localReports });
          if (score !== undefined && (item.role === AgentRole.TECHNICAL_ANALYST || item.role === AgentRole.FUNDAMENTAL_ANALYST)) evolvePredictions('price', score > 50 ? 4 : -4);
          if (sentimentMetrics) evolvePredictions('price', sentimentMetrics.score * 5);
          if (i < pipeline.length - 1) await waitCooldown(getCooldownByModel(targetModel));
        } catch (err: any) {
          localActions = localActions.map(a => a.id === actionId ? { ...a, status: 'error' } : a);
          setActions([...localActions]); setErrorRole(item.role); setErrorModel(targetModel); throw err;
        }
      }

      if (!shouldStopRef.current) {
        const now = new Date();
        const record: HistoryRecord = {
          id: Math.random().toString(36).substr(2, 9), symbol, stockName, timestamp: formatDateTime(now), taskName: `${symbol}_${now.toISOString().split('T')[0]}`,
          reports: { ...localReports }, actions: [...localActions], priceData: [...priceDataRef.current], sentimentData: [], basePrice
        };
        setHistoryList(prev => [record, ...(prev || [])]);
      }
    } catch (err: any) {
      const errStr = typeof err === 'string' ? err : (err?.message || JSON.stringify(err));
      if (errStr.includes("DAILY_QUOTA_EXHAUSTED")) {
        setIsDailyQuotaExceeded(true);
        setErrorMessage("检测到 Google API 每日配额耗尽。");
      } else { setErrorMessage(errStr || "API 响应异常。"); }
    } finally { setIsProcessing(false); setCurrentStep(6); setCooldownLeft(0); shouldStopRef.current = false; }
  };

  const startEditing = () => { setTempAgentModels({ ...agentModels }); setIsEditingModels(true); };
  const cancelEditing = () => setIsEditingModels(false);
  const saveEditing = () => { setAgentModels(tempAgentModels); setIsEditingModels(false); notification.success({ message: '配置已更新' }); };
  const handleModelChange = (role: AgentRole, model: ModelType) => setTempAgentModels(prev => ({ ...prev, [role]: model }));

  const getRoleIcon = (role: AgentRole) => {
    switch (role) {
      case AgentRole.INTELLIGENCE_OFFICER: return <Eye size={16} className="text-purple-400" />;
      case AgentRole.FUNDAMENTAL_ANALYST: return <BarChart3 size={16} />;
      case AgentRole.SENTIMENT_ANALYST: return <MessageSquare size={16} />;
      case AgentRole.TECHNICAL_ANALYST: return <Activity size={16} />;
      case AgentRole.BULL_RESEARCHER: return <TrendingUp size={16} className="text-emerald-400" />;
      case AgentRole.BEAR_RESEARCHER: return <TrendingDown size={16} className="text-rose-400" />;
      case AgentRole.RISK_MANAGER: return <ShieldAlert size={16} />;
      case AgentRole.FUND_MANAGER: return <ClipboardCheck size={16} className="text-amber-400" />;
      case AgentRole.TRADER: return <FileText size={16} className="text-blue-400" />;
      default: return <FileText size={16} />;
    }
  };

  const lastPrice = useMemo(() => priceData.length > 0 ? priceData[priceData.length - 1].price : 0, [priceData]);
  const priceTrend = useMemo(() => basePrice === 0 ? 0 : ((lastPrice - basePrice) / basePrice) * 100, [lastPrice, basePrice]);
  const currentSentimentMetrics = useMemo(() => {
    const sentimentAction = actions.find(a => a.role === AgentRole.SENTIMENT_ANALYST);
    return sentimentAction ? reports[sentimentAction.id]?.sentimentMetrics : undefined;
  }, [actions, reports]);

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 antialiased font-sans animate-in fade-in duration-1000">
      <nav className="w-20 bg-[#0f172a] border-r border-slate-800 flex flex-col items-center py-8 gap-10">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20 mb-4"><TrendingUp className="w-6 h-6 text-white" /></div>
        <div className="flex flex-col gap-6">
          <button onClick={() => setActiveView('analysis')} className={`p-3 rounded-xl transition-all ${activeView === 'analysis' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}><LayoutDashboard size={24} /></button>
          <button onClick={() => setActiveView('history')} className={`p-3 rounded-xl transition-all ${activeView === 'history' || activeView === 'history-detail' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}><History size={24} /></button>
          <button onClick={() => setActiveView('settings')} className={`p-3 rounded-xl transition-all ${activeView === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}><Settings size={24} /></button>
        </div>
      </nav>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#020617]/90 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
             <div><h1 className="text-xl font-bold text-white leading-none">StGTrade <span className="text-blue-500">AI</span></h1><p className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em] mt-1">Distributed Harvest v3.5.0</p></div>
          </div>
          {activeView === 'analysis' && (
            <div className="flex items-center gap-4">
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="股票代码..." className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono w-40" disabled={isProcessing} />
              {!isProcessing ? (
                <button onClick={runSOP} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 font-bold text-sm transition-all"><Play size={16} fill="currentColor" /> 开始分析</button>
              ) : (
                <button onClick={handlePauseAnalysis} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 font-bold text-sm transition-all animate-pulse">{cooldownLeft > 0 ? <Timer size={16} /> : <Square size={14} fill="currentColor" />} 暂停分析 {cooldownLeft > 0 ? `(${cooldownLeft}s)` : ''}</button>
              )}
            </div>
          )}
          {(activeView === 'history' || activeView === 'history-detail') && (
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-1">
                <Search size={14} className="text-slate-500 mr-2" />
                <input value={filterCode} onChange={(e) => setFilterCode(e.target.value)} placeholder="代码/名称搜索..." className="bg-transparent border-none text-xs text-white focus:outline-none w-32" />
              </div>
              <RangePicker size="small" onChange={(dates) => setDateRange(dates as any)} className="bg-slate-900 border-slate-800" />
            </div>
          )}
        </header>

        <main className="flex flex-1 overflow-hidden">
          {activeView === 'analysis' && (
            <div className="flex-1 flex overflow-hidden p-6 gap-6">
              <aside className="w-[360px] flex flex-col gap-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
                  <h2 className="text-[11px] font-bold text-slate-500 mb-5 flex items-center gap-2 uppercase tracking-widest"><Activity className="w-3 h-3 text-blue-500" /> 分布式分析进度</h2>
                  <div className="flex items-center justify-between px-1">
                    {STAGE_NAMES.map((stage) => (
                      <div key={stage.id} className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep === stage.id ? 'bg-blue-600 text-white ring-4 ring-blue-600/20' : currentStep > stage.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-600'}`}>{currentStep > stage.id ? '✓' : stage.id}</div>
                        <span className={`text-[9px] font-medium whitespace-nowrap ${currentStep === stage.id ? 'text-blue-400' : 'text-slate-600'}`}>{stage.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/20"><span className="text-xs font-bold text-slate-400 uppercase">智能体任务栈</span></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" ref={scrollRef}>
                    {actions.map((action) => (
                      <div key={action.id} onClick={() => setSelectedReportId(action.id)} className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedReportId === action.id ? 'bg-blue-600/10 border-blue-500/40' : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={action.status === 'error' ? 'text-rose-500' : action.status === 'working' ? 'text-blue-400 animate-pulse' : ''}>{getRoleIcon(action.role)}</div>
                            <div className="flex flex-col">
                              <span className={`text-xs font-bold ${action.status === 'error' ? 'text-rose-400' : 'text-slate-200'}`}>{action.role}</span>
                              {action.score !== undefined && <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Score: {action.score}</span>}
                            </div>
                          </div>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold ${action.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-400'}`}>{action.status.toUpperCase()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              <section className="flex-1 flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-6">
                   <div className="col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 h-60 relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2"><TrendingUp size={12} className="text-blue-500"/> 预期股价变化 (180D)</h3>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">预期终值 (较分析基准)</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${priceTrend >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{priceTrend >= 0 ? '+' : ''}{priceTrend.toFixed(2)}%</span>
                            <span className={`text-2xl font-black font-mono leading-none ${priceTrend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>¥{lastPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-40 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={priceData}>
                            <XAxis dataKey="date" hide /><YAxis domain={['auto', 'auto']} hide /><Tooltip content={<CustomPriceTooltip />} />
                            <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="url(#pGrad)" strokeWidth={3} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                   </div>
                   <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 h-60 flex flex-col overflow-hidden">
                      <h3 className="text-[11px] font-bold text-slate-500 uppercase mb-5 flex items-center gap-2"><MessageSquare size={12} className="text-emerald-500"/> 舆情多维透视</h3>
                      <div className="flex-1 flex flex-col justify-center px-1 pb-2"><SentimentMetricsPanel metrics={currentSentimentMetrics} isWorking={actions.find(a=>a.role===AgentRole.SENTIMENT_ANALYST)?.status==='working'} /></div>
                   </div>
                </div>
                <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-md">
                  <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20"><FileText size={20} /></div><h2 className="text-sm font-black text-white uppercase tracking-tight">{selectedReportId ? actions.find(a => a.id === selectedReportId)?.role : '分布式分析系统'}</h2></div>
                    {stockName && <div className="text-[10px] font-mono font-bold text-blue-400 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> {stockName}</div>}
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#020617]/40">
                    {selectedReportId && reports[selectedReportId] ? (
                      <div className="markdown-content max-w-4xl mx-auto">
                        <div className="whitespace-pre-wrap text-slate-300 leading-relaxed text-base">{reports[selectedReportId].text}</div>
                        <GroundingSources sources={reports[selectedReportId].sources} />
                      </div>
                    ) : <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-40"><RefreshCw size={80} strokeWidth={0.5} className="animate-spin-slow" /><p className="text-xl font-bold mt-4 tracking-tighter uppercase">Initializing Dossier Fragments</p></div>}
                  </div>
                </div>
              </section>
            </div>
          )}
          {activeView === 'history' && (
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                   <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3"><History size={32} className="text-blue-500" /> 历史决策档案库</h2>
                   <div className="text-slate-500 text-xs font-mono uppercase tracking-widest">Records: {filteredHistory.length}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredHistory.map((record) => (
                     <div key={record.id} onClick={() => { setSelectedHistory(record); setActiveView('history-detail'); }} className="group relative bg-slate-900/40 border border-slate-800 rounded-2xl p-6 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/40 transition-all shadow-lg hover:shadow-blue-500/10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500"><BarChart3 size={20} /></div>
                          <span className="text-[10px] font-mono text-slate-500">{record.timestamp}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{record.stockName}</h3>
                        <p className="text-xs font-mono text-slate-500 mb-6">{record.symbol}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                           <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-slate-400 uppercase">Analysis Complete</span></div>
                           <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          )}
          {activeView === 'settings' && (
            <div className="flex-1 flex flex-col p-10 overflow-hidden bg-[#020617]">
               <div className="max-w-6xl mx-auto w-full overflow-hidden flex flex-col h-full">
                 <div className="flex justify-between items-center mb-8">
                   <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3"><Settings size={32} className="text-blue-500" /> 智能体算力配置中心</h2>
                   <div className="flex gap-3">
                     {!isEditingModels ? (
                       <button onClick={startEditing} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20"><Edit3 size={18} /> 编辑配置</button>
                     ) : (
                       <div className="flex gap-2">
                         <button onClick={cancelEditing} className="px-6 py-2 rounded-lg bg-slate-800 text-white font-bold">取消</button>
                         <button onClick={saveEditing} className="px-6 py-2 rounded-lg bg-emerald-600 text-white font-bold">保存</button>
                       </div>
                     )}
                   </div>
                 </div>
                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10 custom-scrollbar pr-2">
                    {Object.values(AgentRole).map((role) => (
                      <div key={role} className={`transition-all p-5 rounded-2xl border bg-slate-900/40 h-44 flex flex-col justify-between ${isEditingModels ? 'border-blue-500/40 ring-1 ring-blue-500/10' : 'border-slate-800'}`}>
                        <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-slate-800/50">{getRoleIcon(role)}</div><h4 className="text-slate-200 font-bold text-sm">{role}</h4></div>
                        <div className="space-y-3">
                           <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">模型选型</p>
                           <Select value={isEditingModels ? tempAgentModels[role] : agentModels[role]} onChange={(val) => handleModelChange(role, val as ModelType)} disabled={!isEditingModels} className="w-full" options={[{ value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (高精度)' }, { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (平衡)' }, { value: 'gemini-flash-lite-latest', label: 'Gemini Lite (极速)' }]} />
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
