import React from 'react';
import { X, CheckCircle2, FileText, Quote, ArrowRight, Calculator } from 'lucide-react';
import { SourceViewData } from '../types';

interface SourceSidebarProps {
  data: SourceViewData | null;
  isOpen: boolean;
  onClose: () => void;
}

const SourceSidebar: React.FC<SourceSidebarProps> = ({ data, isOpen, onClose }) => {
  // Function to highlight the quote within the context block
  const renderHighlightedContext = (context: string, quote: string) => {
    if (!context || !quote) return context;
    
    // Escape regex special characters in quote
    const escapedQuote = quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = context.split(new RegExp(`(${escapedQuote})`, 'gi'));
    
    return parts.map((part, i) => 
      part.toLowerCase() === quote.toLowerCase() ? (
        <span key={i} className="bg-yellow-300 text-slate-900 font-bold px-1 rounded mx-0.5 border-b-2 border-yellow-600 shadow-sm box-decoration-clone">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 z-[100] ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[650px] bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-out z-[101] flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900 z-10">
           <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                 Source Verification
              </h2>
              <p className="text-sm text-slate-400 mt-1">Authentic grounded context from uploaded document</p>
           </div>
           <button 
             onClick={onClose}
             className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700"
           >
             <X className="w-6 h-6" />
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/30">
           {data ? (
             <>
               {/* Metadata Card */}
               <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex flex-col gap-4 shadow-lg">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-slate-700/50 rounded-xl border border-slate-600/50">
                        <FileText className="w-6 h-6 text-slate-300" />
                     </div>
                     <div className="overflow-hidden">
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-0.5">Verified Source</div>
                        <div className="text-base text-white font-medium truncate" title={data.fileName}>{data.fileName}</div>
                     </div>
                  </div>
                  
                  {data.page && (
                     <div className="flex items-center gap-3 text-sm text-slate-300 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50 w-full">
                        <span className="text-slate-500 uppercase text-xs font-bold tracking-wider">Reference</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="font-mono text-emerald-400">Page {data.page}</span>
                     </div>
                  )}
               </div>

               {/* Calculation Logic (If Present) */}
               {data.rationale && (
                  <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-5 shadow-inner">
                      <div className="flex items-center gap-2 mb-3">
                         <div className="p-1.5 bg-indigo-500/20 rounded-md border border-indigo-500/30">
                            <Calculator className="w-4 h-4 text-indigo-300" />
                         </div>
                         <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wider">Derived Calculation</h3>
                      </div>
                      <div className="text-sm text-indigo-100 font-mono bg-black/20 p-3 rounded-lg border border-white/5">
                         {data.rationale}
                      </div>
                  </div>
               )}

               {/* Document Viewer Simulation */}
               <div className="relative pt-3">
                  <div className="absolute top-0 left-4 bg-emerald-600 px-3 py-1 rounded-t-lg text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5 shadow-sm z-10">
                     <Quote className="w-3 h-3" /> Grounding Segment
                  </div>
                  
                  {/* Paper Container */}
                  <div className="bg-white text-slate-900 rounded-lg shadow-2xl overflow-hidden min-h-[500px] flex flex-col relative">
                     {/* Paper Header / Watermark feel */}
                     <div className="h-2 bg-slate-200 w-full" />
                     <div className="h-1 bg-slate-100 w-full border-b border-slate-100" />
                     
                     <div className="p-10 font-serif leading-loose text-lg text-slate-800">
                        {data.contextBlock ? (
                           <>
                             <div className="w-12 h-1 bg-slate-200 mb-6" /> {/* Decorative text line */}
                             <p className="whitespace-pre-wrap">
                               ... {renderHighlightedContext(data.contextBlock, data.quote)} ...
                             </p>
                             <div className="w-24 h-1 bg-slate-200 mt-6" /> {/* Decorative text line */}
                           </>
                        ) : (
                           <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 italic text-base gap-4">
                              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                 <Quote className="w-8 h-8 opacity-20" />
                              </div>
                              <div className="text-center">
                                 <p>Context block not available.</p>
                                 <p className="text-sm mt-2 max-w-xs mx-auto border-t border-slate-100 pt-2">"{data.quote}"</p>
                              </div>
                           </div>
                        )}
                     </div>
                     
                     {/* Paper Footer */}
                     <div className="mt-auto bg-slate-50 border-t border-slate-100 p-3 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-sans">
                        <span>Original Excerpt</span>
                        <span>FinSight AI Verified</span>
                     </div>
                  </div>
                  
                  <div className="text-center mt-4 text-xs text-slate-500">
                     * Formatting, layout, and page breaks may vary from original PDF.
                  </div>
               </div>
             </>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                <FileText className="w-12 h-12 opacity-20" />
                <p>Select a citation in the dashboard or chat to inspect its source.</p>
             </div>
           )}
        </div>
      </div>
    </>
  );
};

export default SourceSidebar;