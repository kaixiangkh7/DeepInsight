import React, { useCallback } from 'react';
import { Upload, FileText, Loader2, Files, AlertCircle, Book } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (files: File[]) => void;
  isLoading: boolean;
  maxFiles?: number;
  currentCount?: number;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload, isLoading, maxFiles = 5, currentCount = 0 }) => {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isLoading) return;
    
    // Explicitly cast to File[] to handle TypeScript inference issues with Array.from(FileList)
    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length + currentCount > maxFiles) {
        alert(`You can only upload up to ${maxFiles} files total. You currently have ${currentCount}.`);
        return;
    }
    
    if (pdfFiles.length > 0) {
      onFileUpload(pdfFiles);
    } else if (droppedFiles.length > 0) {
      alert("Please upload PDF files.");
    }
  }, [isLoading, onFileUpload, maxFiles, currentCount]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files) as File[];
      const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
      
      if (pdfFiles.length + currentCount > maxFiles) {
          alert(`You can only upload up to ${maxFiles} files total. You currently have ${currentCount}.`);
          return;
      }

      if (pdfFiles.length > 0) {
        onFileUpload(pdfFiles);
      }
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-3xl p-6 sm:p-12 text-center transition-all duration-300 relative overflow-hidden group ${
        isLoading 
        ? 'border-slate-800 opacity-50 cursor-not-allowed bg-slate-900/30' 
        : 'border-slate-700/50 hover:border-emerald-500/50 hover:bg-slate-900/60 cursor-pointer hover:shadow-2xl hover:shadow-emerald-900/10'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <input 
        type="file" 
        id="fileInput" 
        accept="application/pdf" 
        multiple
        className="hidden" 
        onChange={handleChange}
        disabled={isLoading}
      />
      <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center justify-center gap-6 relative z-10">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-14 h-14 text-emerald-500 animate-spin" />
            <div className="space-y-1">
               <div className="text-white font-medium text-lg">Analyzing Documents...</div>
               <div className="text-sm text-slate-500">Parsing content & preparing knowledge base</div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-slate-800/80 p-5 rounded-2xl relative shadow-xl shadow-black/20 group-hover:scale-110 transition-transform duration-300 border border-white/5">
              <Files className="w-10 h-10 text-emerald-400 relative z-10" />
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">Upload Documents</h3>
              <p className="text-slate-400">Drag & drop PDFs (Research, Contracts, Reports)</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-950/50 px-4 py-1.5 rounded-full border border-slate-800/50 group-hover:border-emerald-500/30 transition-colors">
              <FileText className="w-3 h-3" />
              <span>Max {maxFiles} files allowed</span>
            </div>
          </>
        )}
      </label>
    </div>
  );
};

export default FileUploader;
