import React from 'react';
import FileUploader from './FileUploader';
import { Bot, BrainCircuit, Scale, FileText, Zap, CheckCircle2, FileSearch, Sparkles, Fingerprint, History, MousePointerClick, Users, Network, GitMerge, ShieldAlert, Microscope, ArrowDown } from 'lucide-react';

interface LandingPageProps {
  onFileUpload: (files: File[]) => void;
  isLoading: boolean;
  loadingProgress: number;
  loadingStatus: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  onFileUpload, 
  isLoading, 
  loadingProgress, 
  loadingStatus 
}) => {
  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-32 py-12 px-4 relative z-10">
      
      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-16 pt-10">
        
        {/* Left: Text Content */}
        <div className="flex-1 space-y-8 text-center lg:text-left relative">
           {/* Decorative Glow behind text */}
           <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

           <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-emerald-500/20 text-emerald-300 text-xs font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-md shadow-lg shadow-emerald-900/10">
             <Network className="w-3.5 h-3.5" />
             <span className="tracking-wide">Multi-Agent Swarm Architecture</span>
           </div>

           <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 drop-shadow-sm">
             Command a <br/>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
               Research Team
             </span>
             <br />
             for your file.
           </h1>

           <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
             Don't just chat with an AI. Orchestrate a <strong>swarm of specialized agents</strong> that read, debate, and verify facts for you.
             <span className="block mt-4 text-slate-300 text-sm font-medium flex items-center justify-center lg:justify-start gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-500" />
                <span>Zero-trust architecture: Every claim is audited and cited.</span>
             </span>
           </p>

           {!isLoading && (
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-3 text-sm text-slate-500 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500/80" />
                    <span>Complex Reasoning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500/80" />
                    <span>Cross-Doc Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500/80" />
                    <span>Self-Correcting</span>
                  </div>
              </div>
           )}
        </div>

        {/* Right: Upload Card */}
        <div className="flex-1 w-full max-w-xl animate-in fade-in zoom-in-95 duration-700 delay-200 relative">
           {/* Card Glow */}
           <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
           
           <div className="relative bg-slate-950/80 backdrop-blur-xl ring-1 ring-white/10 rounded-[2.4rem] p-2 shadow-2xl">
                 <FileUploader 
                    onFileUpload={onFileUpload} 
                    isLoading={isLoading} 
                    progress={loadingProgress}
                    status={loadingStatus}
                    maxFiles={5} 
                 />
           </div>
           
           {/* Upload subtext */}
           {!isLoading && (
               <div className="flex justify-center mt-8 gap-6 opacity-60">
                   <div className="flex flex-col items-center gap-1 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                      <FileText className="w-4 h-4 mb-1" /> PDF Format
                   </div>
                   <div className="w-px h-8 bg-slate-800" />
                   <div className="flex flex-col items-center gap-1 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                      <History className="w-4 h-4 mb-1" /> 1M+ Context
                   </div>
                   <div className="w-px h-8 bg-slate-800" />
                   <div className="flex flex-col items-center gap-1 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                      <MousePointerClick className="w-4 h-4 mb-1" /> Click-to-Verify
                   </div>
               </div>
           )}
        </div>
      </div>

      {/* Architecture Visualization Section */}
      {!isLoading && (
        <div className="relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            <div className="text-center mb-16 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest">
                    <Zap className="w-3 h-3" /> Under the hood
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                    Not a Chatbot. <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        An Intelligent Swarm.
                    </span>
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
                    Most AI tools talk <em>at</em> you. Jarvis creates a virtual war room where specialized agents debate, plan, and verify facts before they ever answer.
                </p>
            </div>

            {/* The Network Grid Layout */}
            <div className="relative max-w-5xl mx-auto">
                
                {/* Visual Connection Lines (Desktop) */}
                <div className="hidden md:block absolute top-[140px] left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-indigo-500/50 to-transparent z-0"></div>
                <div className="hidden md:block absolute top-[140px] left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent z-0"></div>
                <div className="hidden md:block absolute top-[140px] left-[20%] w-px h-20 bg-gradient-to-b from-indigo-500/30 to-transparent z-0"></div>
                <div className="hidden md:block absolute top-[140px] right-[20%] w-px h-20 bg-gradient-to-b from-indigo-500/30 to-transparent z-0"></div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 gap-y-12">
                
                    {/* Central Coordinator (Top) */}
                    <div className="md:col-span-3 flex justify-center z-10">
                        <div className="bg-slate-900 border border-indigo-500/50 p-8 rounded-2xl max-w-md w-full shadow-[0_0_40px_rgba(99,102,241,0.1)] flex flex-col items-center text-center transform hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/30">
                                <BrainCircuit className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Lead Researcher</h3>
                            <div className="text-xs font-mono text-indigo-400 mb-3 bg-indigo-950/30 px-2 py-0.5 rounded">Role: Strategy & Orchestration</div>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Does not hallucinate answers. Instead, it breaks complex queries into execution plans and delegates tasks to the experts.
                            </p>
                        </div>
                    </div>

                    {/* Left: Experts */}
                    <div className="bg-slate-900/60 border border-emerald-500/20 p-6 rounded-2xl relative group hover:bg-slate-900 transition-colors z-10 flex flex-col items-center text-center md:items-start md:text-left">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 mb-4 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Document Experts</h3>
                        <div className="text-[10px] font-mono text-emerald-500 uppercase mb-3">One Agent Per File</div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            A dedicated specialist is spun up for every PDF you upload. They have tunnel vision on their specific document to ensure high-fidelity retrieval.
                        </p>
                    </div>

                    {/* Middle: Loop Visual */}
                    <div className="hidden md:flex flex-col items-center justify-center opacity-40 space-y-3 pt-8">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-500 animate-[spin_10s_linear_infinite]"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <GitMerge className="w-6 h-6 text-slate-400 rotate-90" />
                            </div>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold text-center">Feedback<br/>Loop</span>
                    </div>

                    {/* Right: Critic */}
                    <div className="bg-slate-900/60 border border-rose-500/20 p-6 rounded-2xl relative group hover:bg-slate-900 transition-colors z-10 flex flex-col items-center text-center md:items-start md:text-left">
                        <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20 mb-4 group-hover:scale-110 transition-transform">
                            <Scale className="w-6 h-6 text-rose-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">The Review Board</h3>
                        <div className="text-[10px] font-mono text-rose-500 uppercase mb-3">Quality Assurance</div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            A "Ruthless Editor" agent that audits plans and final answers. It rejects lazy reasoning and forces the team to cite sources properly.
                        </p>
                    </div>

                </div>
            </div>
        </div>
      )}

      {/* Workflow Section */}
       {!isLoading && (
         <div className="border-t border-white/5 pt-20 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
            <h2 className="text-2xl font-bold text-white text-center mb-16 tracking-tight">The Autonomous Workflow</h2>
            <div className="relative max-w-5xl mx-auto">
               {/* Connecting Line (Desktop) */}
               <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent -translate-y-1/2 z-0 opacity-50" />
               
               <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                  {/* Step 1 */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center hover:border-emerald-500/30 transition-colors group">
                     <div className="w-12 h-12 mx-auto bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 mb-5 text-emerald-500 font-bold group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-emerald-900/20 shadow-black/50">1</div>
                     <h4 className="text-white font-semibold mb-2">Ingestion</h4>
                     <p className="text-xs text-slate-500 leading-relaxed">Multimodal parsing extracts structure, key metrics, and summaries from your PDFs.</p>
                  </div>
                  
                  {/* Step 2 */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center hover:border-emerald-500/30 transition-colors group">
                     <div className="w-12 h-12 mx-auto bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 mb-5 text-emerald-500 font-bold group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-emerald-900/20 shadow-black/50">2</div>
                     <h4 className="text-white font-semibold mb-2">Planning</h4>
                     <p className="text-xs text-slate-500 leading-relaxed">The Lead Researcher designs a multi-step execution strategy, verified by the Critic.</p>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center hover:border-emerald-500/30 transition-colors group">
                     <div className="w-12 h-12 mx-auto bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 mb-5 text-emerald-500 font-bold group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-emerald-900/20 shadow-black/50">3</div>
                     <h4 className="text-white font-semibold mb-2">Execution</h4>
                     <p className="text-xs text-slate-500 leading-relaxed">Experts query documents in parallel. The swarm synthesizes findings into a coherent report.</p>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center hover:border-emerald-500/30 transition-colors group">
                     <div className="w-12 h-12 mx-auto bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 mb-5 text-emerald-500 font-bold group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-emerald-900/20 shadow-black/50">4</div>
                     <h4 className="text-white font-semibold mb-2">Audit</h4>
                     <p className="text-xs text-slate-500 leading-relaxed">Final output is cross-referenced against sources. Every claim gets a clickable citation.</p>
                  </div>
               </div>
            </div>
         </div>
       )}

      {/* Footer / Badges */}
      {!isLoading && (
        <div className="flex flex-col md:flex-row items-center justify-between border-t border-white/5 pt-10 pb-4 text-xs font-medium text-slate-500 uppercase tracking-widest">
           <div className="flex items-center gap-2 hover:text-emerald-400 transition-colors cursor-default">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Built with Google Gemini API</span>
           </div>
           <div className="flex gap-8 mt-6 md:mt-0">
              <span className="hover:text-slate-300 transition-colors cursor-default">Enterprise Grade Security</span>
              <span className="hover:text-slate-300 transition-colors cursor-default">Context Window 1M+</span>
              <span className="hover:text-slate-300 transition-colors cursor-default">Multimodal Native</span>
           </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;