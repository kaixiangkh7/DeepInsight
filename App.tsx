import React, { useState, useRef } from 'react';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';
import ComparisonView from './components/ComparisonView';
import SourceSidebar from './components/SourceSidebar';
import LandingPage from './components/LandingPage';
import { AnalysisResult, SourceViewData } from './types';
import { analyzeFinancialReport, initializeAgentSwarm, removeAgent } from './services/geminiService';
import { LayoutDashboard, MessageSquareText, ShieldCheck, Columns, Loader2, Plus, FileUp, Sparkles, BrainCircuit, Network } from 'lucide-react';

const MAX_FILES = 5;

const App: React.FC = () => {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Processing...");
  const [loadingProgress, setLoadingProgress] = useState(0); // 0 to 100
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('chat');
  const [swarmReadyTimestamp, setSwarmReadyTimestamp] = useState<number>(0);
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarData, setSidebarData] = useState<SourceViewData | null>(null);
  
  const additionalFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: File[]) => {
    const currentCount = analysisResults ? analysisResults.length : 0;
    if (currentCount + files.length > MAX_FILES) {
      alert(`Limit reached. You can analyze a maximum of ${MAX_FILES} documents at a time.`);
      return;
    }

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStatus("Analyzing Documents (Structure Extraction)...");
    
    // Total steps = Analysis steps + Swarm steps = files.length * 2
    const totalSteps = files.length * 2;
    
    try {
      // Phase 1: Dashboard Parser
      const structuralResults = await analyzeFinancialReport(files, (idx, total, msg) => {
          setLoadingStatus(msg);
          // Analysis covers 0% -> 50%
          const completedSteps = idx; 
          const percentage = Math.round((completedSteps / totalSteps) * 100);
          setLoadingProgress(percentage);
      });
      
      // Update progress after phase 1 is done
      setLoadingProgress(50);
      
      // Phase 2: Agent Swarm Initialization
      setLoadingStatus("Briefing Research Team (Context Loading)...");
      await initializeAgentSwarm(files, (idx, total, msg) => {
        setLoadingStatus(msg);
        // Swarm Init covers 50% -> 100%
        const completedSteps = files.length + idx; 
        const percentage = Math.round((completedSteps / totalSteps) * 100);
        setLoadingProgress(Math.min(percentage, 99)); // Don't hit 100 until fully done
      });
      
      setLoadingProgress(100);
      setLoadingStatus("Research Team Ready!");
      
      // Signal that the swarm is fully ready
      setSwarmReadyTimestamp(Date.now());
      
      // DELAYED STATE UPDATE: Only update results AFTER swarm is ready.
      // This keeps the user on the Landing Page (which handles the loading UI) 
      // until the entire process is finished.
      setAnalysisResults(prev => {
        if (!prev) return structuralResults;
        const existingNames = new Set(structuralResults.map(r => r.source_file));
        const keptPrev = prev.filter(p => !existingNames.has(p.source_file));
        return [...keptPrev, ...structuralResults];
      });

    } catch (error) {
      console.error("Error processing file:", error);
      alert("Failed to analyze the documents.");
    } finally {
      // Add a small delay so user sees 100%
      setTimeout(() => {
          setIsLoading(false);
          setLoadingProgress(0);
      }, 500);
    }
  };
  
  const handleRemoveFile = (fileName: string) => {
    if (window.confirm(`Are you sure you want to remove ${fileName}?`)) {
      // 1. Remove from backend swarm
      removeAgent(fileName);

      // 2. Remove from frontend state
      setAnalysisResults(prev => {
        if (!prev) return null;
        const updated = prev.filter(r => r.source_file !== fileName);
        return updated.length > 0 ? updated : null;
      });
    }
  };
  
  const onAdditionalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files) as File[];
      const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
      
      if (pdfFiles.length > 0) {
        handleFileUpload(pdfFiles);
      } else {
        alert("Only PDF files are supported.");
      }
    }
    // Reset input
    if (additionalFileInputRef.current) {
      additionalFileInputRef.current.value = '';
    }
  };
  
  const handleViewSource = (data: SourceViewData) => {
    setSidebarData(data);
    setIsSidebarOpen(true);
  };

  const isMultiView = analysisResults && analysisResults.length > 1;
  const currentFileCount = analysisResults ? analysisResults.length : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 relative overflow-x-hidden flex flex-col">
      {/* --- Ambient Background --- */}
      
      {/* 1. Base Grid Pattern */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
        }}
      />
      
      {/* 2. Top-Left Vibrant Glow */}
      <div className="fixed top-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
      
      {/* 3. Bottom-Right Cool Glow */}
      <div className="fixed bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none mix-blend-screen" />
      
      {/* 4. Center-Right Accent */}
      <div className="fixed top-[30%] right-[15%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />


      {/* Hidden Input for Additional Uploads */}
      <input 
        type="file"
        ref={additionalFileInputRef}
        onChange={onAdditionalFileChange}
        className="hidden"
        multiple
        accept="application/pdf"
      />

      {/* Navbar */}
      <nav className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/5 rounded-2xl shadow-lg shadow-black/10 h-16 flex items-center justify-between px-6 transition-all hover:border-white/10">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setAnalysisResults(null)}>
            <div className="bg-gradient-to-tr from-emerald-500 to-emerald-600 p-1.5 rounded-lg shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Jarvis</span>
          </div>
          <div className="flex items-center gap-4">
             {analysisResults && !isLoading && (
               <button 
                 onClick={() => {
                   if (currentFileCount >= MAX_FILES) {
                     alert(`Maximum ${MAX_FILES} reports allowed.`);
                     return;
                   }
                   additionalFileInputRef.current?.click();
                 }}
                 disabled={currentFileCount >= MAX_FILES}
                 className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all hover:scale-105 ${
                   currentFileCount >= MAX_FILES 
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'text-emerald-300 hover:text-white bg-emerald-950/40 border-emerald-500/30 hover:bg-emerald-500/20'
                 }`}
               >
                 <Plus className="w-3 h-3" />
                 Add Doc {currentFileCount}/{MAX_FILES}
               </button>
             )}
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-bold tracking-wider text-slate-300 uppercase">
                   Gemini 3.0
                </span>
             </div>
          </div>
        </div>
      </nav>
      
      {/* Global Loader Overlay - ONLY SHOWS FOR APPEND ACTIONS (When analysisResults exists) */}
      {/* The initial load is handled by the LandingPage component itself */}
      {isLoading && analysisResults && (
         <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center relative overflow-hidden w-full mx-4">
               <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent" />
               <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4 relative z-10" />
               <h3 className="text-lg font-semibold text-white relative z-10 mb-2">Expanding Research Team</h3>
               
               <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4 overflow-hidden border border-slate-700/50 relative z-10">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                    style={{ width: `${loadingProgress}%` }} 
                  />
               </div>
               
               <p className="text-sm text-slate-400 relative z-10 animate-pulse">{loadingStatus}</p>
            </div>
         </div>
      )}

      {/* Source Viewer Sidebar */}
      <SourceSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        data={sidebarData}
      />

      <main className="max-w-[95%] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 flex-grow flex flex-col">
        {!analysisResults ? (
          <LandingPage 
            onFileUpload={handleFileUpload} 
            isLoading={isLoading} 
            loadingProgress={loadingProgress}
            loadingStatus={loadingStatus}
          />
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-white/5 pb-1 gap-4">
               <div className="flex items-center gap-2 p-1 bg-slate-900/50 rounded-lg border border-white/5">
                   <button 
                      onClick={() => setActiveTab('chat')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md ${
                        activeTab === 'chat' 
                          ? 'bg-slate-800 text-emerald-400 shadow-lg shadow-black/20' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                   >
                      <Network className="w-4 h-4" />
                      Agent Swarm
                   </button>
                   <button 
                      onClick={() => setActiveTab('dashboard')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md ${
                        activeTab === 'dashboard' 
                          ? 'bg-slate-800 text-emerald-400 shadow-lg shadow-black/20' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                   >
                      {isMultiView ? <Columns className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                      Knowledge Base
                   </button>
               </div>
            </div>

            <div className="min-h-[600px]">
               {/* Chat View */}
               <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                     <div className="lg:col-span-2">
                        <Chat 
                           analysisResults={analysisResults} 
                           swarmReadyTimestamp={swarmReadyTimestamp}
                           onViewSource={handleViewSource}
                        />
                     </div>
                     <div className="space-y-4">
                        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-white">Research Team</h3>
                                <button 
                                   onClick={() => {
                                      if (currentFileCount >= MAX_FILES) {
                                         alert(`Maximum ${MAX_FILES} reports allowed.`);
                                      } else {
                                         additionalFileInputRef.current?.click();
                                      }
                                   }}
                                   disabled={currentFileCount >= MAX_FILES}
                                   className={`text-xs flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
                                      currentFileCount >= MAX_FILES
                                      ? 'text-slate-500 border-slate-700 cursor-not-allowed'
                                      : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 border-emerald-900/50'
                                   }`}
                                >
                                   <FileUp className="w-3 h-3" /> Add {currentFileCount}/{MAX_FILES}
                                </button>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                You are working with a panel of <strong className="text-white">{analysisResults.length} Document Experts</strong>.
                            </p>
                            <div className="mt-4 space-y-3">
                                <div className="flex gap-3 text-xs text-slate-400">
                                   <div className="w-6 h-6 rounded bg-slate-800 border border-white/5 flex items-center justify-center shrink-0">1</div>
                                   <div>
                                      <strong className="text-slate-200 block">Document Experts</strong> 
                                      Dedicated specialist per file.
                                   </div>
                                </div>
                                <div className="flex gap-3 text-xs text-slate-400">
                                   <div className="w-6 h-6 rounded bg-slate-800 border border-white/5 flex items-center justify-center shrink-0">2</div>
                                   <div>
                                      <strong className="text-slate-200 block">Research Lead</strong> 
                                      Strategic synthesis & planning.
                                   </div>
                                </div>
                                <div className="flex gap-3 text-xs text-slate-400">
                                   <div className="w-6 h-6 rounded bg-slate-800 border border-white/5 flex items-center justify-center shrink-0">3</div>
                                   <div>
                                      <strong className="text-slate-200 block">Review Board</strong> 
                                      Quality control & auditing.
                                   </div>
                                </div>
                            </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Dashboard View */}
               <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
                  {isMultiView ? (
                     <ComparisonView 
                        results={analysisResults} 
                        onDelete={handleRemoveFile}
                        onViewSource={handleViewSource} 
                     />
                  ) : (
                     <div className="w-full max-w-5xl mx-auto">
                        <Dashboard 
                          data={analysisResults[0]} 
                          onDelete={handleRemoveFile} 
                          onViewSource={handleViewSource}
                        />
                     </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;