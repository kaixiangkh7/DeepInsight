import React from 'react';
import { FileSearch, Lightbulb, User, Calendar, Hash, Tag } from 'lucide-react';
import { KeyInsight, SourceViewData } from '../types';

interface InsightCardProps {
  metric: KeyInsight;
  sourceFile: string;
  onViewSource?: (data: SourceViewData) => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ metric, sourceFile, onViewSource }) => {
  // Category icon mapping
  const getCategoryIcon = (cat?: string) => {
    switch(cat?.toLowerCase()) {
      case 'person': return <User className="w-3 h-3 text-blue-400" />;
      case 'date': return <Calendar className="w-3 h-3 text-orange-400" />;
      case 'stat': return <Hash className="w-3 h-3 text-emerald-400" />;
      default: return <Lightbulb className="w-3 h-3 text-yellow-400" />;
    }
  };

  const handleSourceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewSource) {
      onViewSource({
        fileName: sourceFile,
        page: metric.page_reference,
        quote: metric.citation_quote,
        contextBlock: metric.context_block || metric.citation_quote 
      });
    }
  };

  return (
    <div className={`
      relative group p-4 rounded-xl border transition-all duration-300
      bg-slate-900/60 backdrop-blur-sm border-white/5 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-900/10 flex flex-col h-full
    `}>
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-slate-800 border border-slate-700">
               {getCategoryIcon(metric.category)}
            </div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider truncate max-w-[150px]" title={metric.title}>
              {metric.title}
            </h4>
        </div>
        
        <button 
          className="transition-all p-1.5 rounded-md text-slate-600 hover:text-emerald-400 hover:bg-emerald-950/30 cursor-pointer"
          onClick={handleSourceClick}
          title="View Source Context"
        >
          <FileSearch className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="relative z-10 flex-grow">
        <p className="text-sm font-medium text-slate-100 leading-snug line-clamp-4">
            {metric.description}
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            {metric.page_reference ? `Page ${metric.page_reference}` : 'Cached'}
        </div>
        {metric.category && (
           <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
             {metric.category}
           </span>
        )}
      </div>

      <div 
        onClick={handleSourceClick}
        className="absolute inset-0 bg-transparent cursor-pointer z-0"
        title="Click card to view source"
      />
    </div>
  );
};

export default InsightCard;
