import React from 'react';
import { AnalysisResult, SourceViewData } from '../types';
import InsightCard from './MetricCard'; // Using the updated file content
import { Building2, Calendar, File, Trash2, Tag, BookOpen } from 'lucide-react';

interface DashboardProps {
  data: AnalysisResult;
  className?: string;
  onDelete?: (fileName: string) => void;
  onViewSource?: (data: SourceViewData) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, className = "", onDelete, onViewSource }) => {
  return (
    <div className={`space-y-6 animate-in slide-in-from-bottom-5 duration-500 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 ${className}`}>
      {/* Header Info */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
            <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <BookOpen className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">{data.doc_title}</h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400 ml-1">
                <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" /> {data.doc_type}
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/50">
                    <File className="w-3 h-3" /> {data.source_file}
                </span>
            </div>
            </div>
            
            {onDelete && (
                <button 
                   onClick={() => onDelete(data.source_file)}
                   className="text-slate-500 hover:text-rose-400 bg-slate-800/50 hover:bg-rose-950/30 border border-slate-700 hover:border-rose-900/50 p-2.5 rounded-lg transition-all self-end md:self-auto"
                   title="Remove Document"
                >
                   <Trash2 className="w-5 h-5" />
                </button>
            )}
        </div>
        <div className="text-sm text-slate-300 border-l-2 border-slate-600 pl-4 italic leading-relaxed">
            "{data.summary}"
        </div>
        
        {/* Topics List */}
        {data.topics && data.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
                {data.topics.map((topic, i) => (
                    <span key={i} className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-1 rounded-md">
                        # {topic}
                    </span>
                ))}
            </div>
        )}
      </div>

      {/* Insights Grid */}
      <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Key Insights & Findings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.key_insights.map((insight, idx) => (
              <InsightCard 
                key={idx} 
                metric={insight} 
                sourceFile={data.source_file}
                onViewSource={onViewSource}
              />
            ))}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
