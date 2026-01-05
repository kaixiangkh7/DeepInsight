import React from 'react';
import { AnalysisResult, KeyInsight, SourceViewData } from '../types';
import { BookOpen, Tag, File, Trash2, FileSearch } from 'lucide-react';

interface ComparisonViewProps {
  results: AnalysisResult[];
  onDelete: (fileName: string) => void;
  onViewSource?: (data: SourceViewData) => void;
}

const InsightList = ({ insights, sourceFile, onViewSource }: { insights: KeyInsight[], sourceFile: string, onViewSource?: (data: SourceViewData) => void }) => {
  return (
    <div className="p-4 space-y-3 h-full bg-slate-900/20">
        {insights.slice(0, 4).map((insight, idx) => (
            <div key={idx} className="group bg-slate-800/40 p-3 rounded border border-white/5 hover:bg-slate-800 hover:border-emerald-500/30 transition-all cursor-default">
                <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase truncate pr-1" title={insight.title}>
                        {insight.title}
                    </span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onViewSource) onViewSource({
                                fileName: sourceFile,
                                page: insight.page_reference,
                                quote: insight.citation_quote,
                                contextBlock: insight.context_block || insight.citation_quote
                            });
                        }}
                        className="text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <FileSearch className="w-3 h-3" />
                    </button>
                </div>
                <div className="text-xs text-slate-300 leading-snug line-clamp-3">
                    {insight.description}
                </div>
            </div>
        ))}
        {insights.length === 0 && <span className="text-xs text-slate-500 italic">No specific insights found.</span>}
    </div>
  );
};

const ComparisonView: React.FC<ComparisonViewProps> = ({ results, onDelete, onViewSource }) => {
  return (
    <div className="w-full pb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="rounded-2xl border border-white/5 bg-slate-900/20 shadow-2xl backdrop-blur-sm overflow-hidden">
          <div 
            className="grid gap-px bg-slate-800/50 w-full"
            style={{ gridTemplateColumns: `160px repeat(${results.length}, minmax(0, 1fr))` }}
          >
            {/* --- HEADER ROW --- */}
            <div className="bg-slate-900 p-4 flex flex-col justify-end border-b border-white/5 sticky left-0 z-20 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.5)] border-r border-r-white/5">
                <h2 className="text-xl font-bold text-white tracking-tight leading-none">Deep<br/><span className="text-emerald-400">View</span></h2>
            </div>
            {results.map((r, idx) => (
              <div key={`header-${idx}`} className="bg-slate-900/80 p-4 flex flex-col gap-2 border-b border-white/5 relative group min-w-0">
                  {/* Delete Button - Hover Only */}
                  <button 
                    onClick={() => onDelete(r.source_file)}
                    className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-950/30 border border-white/5 hover:border-rose-900/50 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Remove Report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="p-1.5 bg-emerald-500/10 w-fit rounded-lg mb-0.5 border border-emerald-500/10">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white leading-tight truncate" title={r.doc_title}>{r.doc_title}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 truncate">
                          <Tag className="w-3 h-3 flex-shrink-0" /> {r.doc_type}
                      </div>
                  </div>
                  <div className="text-[9px] font-mono text-emerald-600 flex items-center gap-1 truncate" title={r.source_file}>
                      <File className="w-2.5 h-2.5 flex-shrink-0" /> {r.source_file}
                  </div>
              </div>
            ))}

            {/* --- SUMMARY ROW --- */}
            <div className="bg-slate-800 p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center border-r border-white/5 sticky left-0 z-20 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.5)]">
              Executive Summary
            </div>
            {results.map((r, idx) => (
              <div key={`summary-${idx}`} className="bg-slate-800/40 p-4 text-xs text-slate-300 italic leading-snug border-r border-white/5 last:border-r-0 min-w-0">
                  <div className="line-clamp-4" title={r.summary}>"{r.summary}"</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.topics?.slice(0,3).map(t => (
                        <span key={t} className="text-[9px] bg-slate-900 text-slate-500 px-1 rounded border border-slate-700">#{t}</span>
                    ))}
                  </div>
              </div>
            ))}

            {/* --- SECTION: TOP INSIGHTS --- */}
            <div className="bg-slate-900 p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-white/5 sticky left-0 z-20 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.5)]">
               Key Findings
            </div>

            {results.map((r, resIdx) => (
                <div key={`metrics-${resIdx}`} className="bg-slate-900/20 border-r border-white/5 last:border-r-0 min-w-0">
                    <InsightList 
                        insights={r.key_insights} 
                        sourceFile={r.source_file}
                        onViewSource={onViewSource}
                    />
                </div>
            ))}
          </div>
      </div>
    </div>
  );
};

export default ComparisonView;
