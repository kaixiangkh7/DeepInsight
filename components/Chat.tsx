import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Network, CheckCircle2, Circle, Layers, BrainCircuit, ChevronDown, ChevronRight, Play, FileText, ListTodo, MessageSquare, FileSearch, Zap, Search, MessageSquarePlus, Sparkles, Scale, AlertTriangle, ShieldCheck, XCircle, Square, Briefcase, Users, RefreshCcw, ArrowRight } from 'lucide-react';
import { ChatMessage, AnalysisResult, OrchestratorPlan, SourceViewData, CollaborationStep, CriticVerdict, OutputQualityVerdict, ClarificationRequest } from '../types';
import { createCollaborativePlan, executeOrchestratorPlan, getSwarmStatus, improvePlanWithCritic, cancelRunningAgent, reviewOutputWithBoard, generateClarificationQuestions } from '../services/geminiService';

interface ChatProps {
  analysisResults?: AnalysisResult[];
  swarmReadyTimestamp: number;
  onViewSource?: (data: SourceViewData) => void;
}

const getAllTasks = (plan: OrchestratorPlan) => {
  return plan.steps.flatMap(step => step.tasks);
};

interface CitationChipProps {
  source: string;
  quote: string;
  page: string;
  context?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const CitationChip: React.FC<CitationChipProps> = ({ source, quote, page, context, onClick, children }) => {
  return (
    <span 
      className="relative inline-block group cursor-pointer"
      onClick={onClick}
    >
      <span className="border-b border-dashed border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/20 hover:text-white transition-colors rounded px-0.5 mx-0.5 inline-flex items-center gap-1 font-medium">
        {children}
        <FileSearch className="w-3 h-3 opacity-50 group-hover:opacity-100" />
      </span>
    </span>
  );
};

// Helper to parse text and render citation chips with robust attribute handling
const parseAndRenderClaims = (text: string, onViewSource?: (data: SourceViewData) => void) => {
  if (!text) return null;
  
  const claimTagRegex = /<claim([\s\S]*?)>([\s\S]*?)<\/claim>/g;
  
  type Part = 
    | { type: 'text'; content: string }
    | { type: 'claim'; source: string; quote: string; page: string; context: string; logic: string; content: string };

  const parts: Part[] = [];
  let lastIndex = 0;
  let match;

  while ((match = claimTagRegex.exec(text)) !== null) {
    const [fullMatch, attributesString, content] = match;
    const startIndex = match.index;

    if (startIndex > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, startIndex) });
    }

    const attrRegex = /(\w+)="([^"]*)"/g;
    const attrs: Record<string, string> = {};
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attributesString)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    parts.push({
      type: 'claim',
      source: attrs.source || 'Unknown Source',
      quote: attrs.quote || '',
      page: attrs.page || '',
      context: attrs.context || '', 
      logic: attrs.logic || '',
      content: content
    });

    lastIndex = claimTagRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'text') {
           return <span key={i}>{part.content}</span>;
        } else {
           return (
             <CitationChip 
               key={i} 
               source={part.source} 
               quote={part.quote} 
               page={part.page}
               context={part.context}
               onClick={() => onViewSource && onViewSource({
                 fileName: part.source,
                 page: part.page,
                 quote: part.quote,
                 contextBlock: part.context || part.quote,
                 rationale: part.logic 
               })}
             >
               {part.content}
             </CitationChip>
           );
        }
      })}
    </>
  );
};

interface MarkdownTableProps {
  content: string;
  onViewSource?: (data: SourceViewData) => void;
}

const MarkdownTable: React.FC<MarkdownTableProps> = ({ content, onViewSource }) => {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return null;

  const parseRow = (row: string) => {
    return row.split('|').filter((cell, idx, arr) => {
      if (idx === 0 && cell.trim() === '') return false;
      if (idx === arr.length - 1 && cell.trim() === '') return false;
      return true;
    });
  };

  const headers = parseRow(lines[0]);
  const bodyRows = lines.slice(2).map(line => parseRow(line));

  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-slate-700 shadow-sm">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs uppercase bg-slate-800 text-slate-400">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-3 border-b border-slate-700 whitespace-nowrap font-bold">
                 {parseAndRenderClaims(h, onViewSource)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {bodyRows.map((row, i) => (
            <tr key={i} className="bg-slate-900/30 hover:bg-slate-800/50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-6 py-4">
                  {parseAndRenderClaims(cell, onViewSource)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const FormattedMessage = ({ text, onViewSource }: { text: string, onViewSource?: (data: SourceViewData) => void }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks: { type: 'text' | 'table', content: string[] }[] = [];
  
  let currentBlock: { type: 'text' | 'table', content: string[] } = { type: 'text', content: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|');
    
    if (isTableLine) {
        const nextLine = lines[i+1]?.trim();
        const isNextSeparator = nextLine?.startsWith('|') && nextLine?.includes('---');
        
        if (currentBlock.type === 'text') {
           if (isNextSeparator || (currentBlock.content.length === 0 && trimmed.includes('|'))) {
               if (currentBlock.content.length > 0) blocks.push({ ...currentBlock });
               currentBlock = { type: 'table', content: [] };
           }
        }
    } else if (currentBlock.type === 'table') {
        blocks.push({ ...currentBlock });
        currentBlock = { type: 'text', content: [] };
    }

    currentBlock.content.push(line);
  }
  
  if (currentBlock.content.length > 0) blocks.push({ ...currentBlock });

  return (
    <div>
      {blocks.map((block, idx) => {
        if (block.type === 'table') {
            const content = block.content.join('\n');
            if (block.content.length >= 2 && block.content[1].includes('---')) {
               return <MarkdownTable key={idx} content={content} onViewSource={onViewSource} />;
            } else {
               return <div key={idx} className="whitespace-pre-wrap mb-2">{parseAndRenderClaims(content, onViewSource)}</div>;
            }
        } else {
            return (
              <div key={idx} className="whitespace-pre-wrap mb-2">
                 {block.content.map((line, lIdx) => (
                    <React.Fragment key={lIdx}>
                       {parseAndRenderClaims(line, onViewSource)}
                       {lIdx < block.content.length - 1 && <br />}
                    </React.Fragment>
                 ))}
              </div>
            );
        }
      })}
    </div>
  );
};

// Component to visualize the "War Room" dialogue between Orchestrator and Critic
const CollaborationLog = ({ steps }: { steps: CollaborationStep[] }) => {
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to latest step
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/50 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-slate-800/80 hover:bg-slate-800 transition-colors border-b border-slate-700/50"
      >
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Research Log</span>
          <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 rounded-full">{steps.length} entries</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>

      {isOpen && (
        <div ref={scrollRef} className="p-4 space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar scroll-smooth">
          {steps.map((step, idx) => {
            const isOrchestrator = step.type === 'ORCHESTRATOR';
            const isBoardReview = step.type === 'BOARD_REVIEW';
            const isRemediation = step.round === 99;
            const content = step.content;
            
            const roundLabel = isBoardReview 
                ? (step.round > 1 ? `Peer Review (Retry ${step.round - 1})` : 'Peer Review')
                : isRemediation 
                    ? 'Strategic Correction' 
                    : (step.round === 0 ? 'Initial Strategy' : `Round ${step.round}`);

            const getIconStyles = () => {
                if (isOrchestrator) return 'bg-emerald-950/50 border-emerald-500/20 text-emerald-400';
                if (isBoardReview) return 'bg-amber-950/50 border-amber-500/20 text-amber-400';
                return 'bg-purple-950/50 border-purple-500/20 text-purple-400';
            };
            
            return (
              <div key={idx} className={`flex gap-3 text-sm animate-in fade-in slide-in-from-left-2 duration-300`}>
                <div className={`
                   flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm mt-0.5
                   ${getIconStyles()}
                `}>
                   {isOrchestrator ? <Bot className="w-4 h-4" /> : isBoardReview ? <Scale className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
                   <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${
                          isOrchestrator ? 'text-emerald-400' : isBoardReview ? 'text-amber-400' : 'text-purple-400'
                      }`}>
                        {isOrchestrator ? 'Research Lead' : 'Review Board'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {roundLabel}
                      </span>
                   </div>
                   
                   <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                      {isOrchestrator ? (
                         <div className="space-y-2">
                            <div className="text-slate-400 text-xs italic border-l-2 border-emerald-500/30 pl-2">
                               "{(content as OrchestratorPlan).thought_process}"
                            </div>
                            <div className="text-slate-200 text-xs">
                               <span className="font-semibold text-emerald-500/80">Proposed Plan:</span> {(content as OrchestratorPlan).strategy_explanation}
                            </div>
                         </div>
                      ) : isBoardReview ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                {(content as OutputQualityVerdict).verdict === 'APPROVED' ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3" /> REPORT ACCEPTED
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                                        <RefreshCcw className="w-3 h-3" /> REVIEW FAILED - REJECTED
                                    </span>
                                )}
                            </div>
                            <div className="text-slate-300 text-xs leading-relaxed">
                                {(content as OutputQualityVerdict).quality_assessment}
                            </div>
                            {(content as OutputQualityVerdict).remediation_instructions && (
                                <div className="text-amber-300/80 text-xs mt-2 border-t border-white/5 pt-2">
                                    <span className="font-semibold">Correction Order:</span> {(content as OutputQualityVerdict).remediation_instructions}
                                </div>
                            )}
                          </div>
                      ) : (
                         <div className="space-y-2">
                            <div className="flex items-center gap-2">
                               {(content as CriticVerdict).verdict === 'APPROVED' ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                                     <CheckCircle2 className="w-3 h-3" /> APPROVED
                                  </span>
                               ) : (
                                  <span className="flex items-center gap-1 text-[10px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">
                                     <XCircle className="w-3 h-3" /> STRATEGY PIVOT REQUIRED
                                  </span>
                               )}
                            </div>
                            <div className="text-slate-300 text-xs">
                               {(content as CriticVerdict).critique_reasoning}
                            </div>
                            {(content as CriticVerdict).specific_improvements && (
                               <div className="text-purple-300/80 text-xs mt-1 border-t border-white/5 pt-1">
                                  <span className="font-semibold">Board Directive:</span> {(content as CriticVerdict).specific_improvements}
                               </div>
                            )}
                         </div>
                      )}
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Chat: React.FC<ChatProps> = ({ analysisResults, swarmReadyTimestamp, onViewSource }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [expandedThinking, setExpandedThinking] = useState<number | null>(null);
  
  // Clarification state: Now mapping QuestionID -> Array of selected option texts
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string[]>>({});
  const [customInputMap, setCustomInputMap] = useState<Record<string, string>>({});
  
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const agents = getSwarmStatus();
    setAvailableAgents(agents);
    setActiveAgents(agents); 
  }, [analysisResults, swarmReadyTimestamp]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, expandedThinking, loadingStatus]);

  const handleToggleAgent = (agentName: string) => {
    if (activeAgents.includes(agentName)) {
      setActiveAgents(prev => prev.filter(a => a !== agentName));
    } else {
      setActiveAgents(prev => [...prev, agentName]);
    }
  };

  const handleSelectAll = () => setActiveAgents(availableAgents);
  const handleSelectNone = () => setActiveAgents([]);
  
  const toggleThinking = (idx: number) => {
    setExpandedThinking(expandedThinking === idx ? null : idx);
  };

  const handleStop = () => {
      cancelRunningAgent();
      setIsProcessing(false);
      setLoadingStatus('Stopped by user.');
      setMessages(prev => {
         const lastMsg = prev[prev.length - 1];
         // Remove placeholder if active
         if (lastMsg.role === 'model' && !lastMsg.text && !lastMsg.plan && !lastMsg.clarification) {
            return prev.slice(0, -1);
         }
         return prev;
      });
  };

  const updateMessagePlan = (idx: number, plan: OrchestratorPlan) => {
      setMessages(prev => {
          const newMsgs = [...prev];
          if (newMsgs[idx]) {
              newMsgs[idx] = { ...newMsgs[idx], plan };
          }
          return newMsgs;
      });
  };

  const appendCollaborationStep = (idx: number, step: CollaborationStep) => {
      setMessages(prev => {
          const newMsgs = [...prev];
          if (newMsgs[idx]) {
              const existingSteps = newMsgs[idx].collaborationSteps || [];
              newMsgs[idx] = {
                  ...newMsgs[idx],
                  collaborationSteps: [...existingSteps, step]
              };
          }
          return newMsgs;
      });
  };

  const startResearchExecution = async (initialQuery: string, currentHistory: ChatMessage[]) => {
    const placeholderIndex = currentHistory.length; 
    setMessages(prev => [...prev, { role: 'model', collaborationSteps: [] }]);

    try {
        setLoadingStatus("Research Lead is evaluating strategy...");
        
        // 1. Initial Plan
        const plan = await createCollaborativePlan(
            initialQuery, 
            activeAgents, 
            currentHistory,
            (status) => setLoadingStatus(status),
            (step) => appendCollaborationStep(placeholderIndex, step)
        );

        updateMessagePlan(placeholderIndex, plan);

        // 2. Pre-Execution Board Review
        let finalExecutionPlan = plan;
        const allTasks = getAllTasks(plan);
        
        if (plan.plan_type === 'DEEP_ANALYSIS' && allTasks.length > 0) {
            setLoadingStatus("Review Board convening...");
            
            finalExecutionPlan = await improvePlanWithCritic(
                initialQuery,
                plan,
                activeAgents,
                (status) => setLoadingStatus(status),
                (step) => appendCollaborationStep(placeholderIndex, step)
            );
            
            updateMessagePlan(placeholderIndex, finalExecutionPlan);
        }

        // 3. Execution
        await handleExecuteWithQualityControl(finalExecutionPlan, placeholderIndex, currentHistory, initialQuery);

    } catch (error: any) {
        if (error.message === 'USER_ABORTED') {
            setMessages(prev => {
                const newMsgs = [...prev];
                if (newMsgs[placeholderIndex]) {
                    newMsgs[placeholderIndex] = { ...newMsgs[placeholderIndex], text: "🛑 Execution stopped by user." };
                }
                return newMsgs;
            });
        } else {
            console.error(error);
            setMessages(prev => {
                const clean = prev.slice(0, prev.length - 1);
                return [...clean, { role: 'model', text: "Sorry, the Research Team encountered an error." }];
            });
        }
    } finally {
        setIsProcessing(false);
        setLoadingStatus('');
    }
  };


  // --- EXECUTION WITH QUALITY LOOP ---
  const handleExecuteWithQualityControl = async (
      initialPlan: OrchestratorPlan,
      msgIndex: number,
      historyContext: ChatMessage[],
      userQuery: string
  ) => {
      let currentPlan = initialPlan;
      let attempt = 0;
      const MAX_RETRYS = 1;

      while (true) {
          // 1. Execute
          setLoadingStatus(
            attempt > 0 
                ? `Remediating Strategy (Attempt ${attempt + 1})...` 
                : currentPlan.plan_type === 'DEEP_ANALYSIS' ? 'Executing Strategic Audit...' : 'Consulting Experts...'
          );

          try {
              const { thinking, content } = await executeOrchestratorPlan(currentPlan, historyContext, (status) => setLoadingStatus(status));
              
              // 2. Audit (Only for Deep Analysis or if re-running)
              if (currentPlan.plan_type === 'DEEP_ANALYSIS' || attempt > 0) {
                  setLoadingStatus("Peer Board reviewing final report...");
                  
                  const audit = await reviewOutputWithBoard(userQuery, content, currentPlan);
                  
                  appendCollaborationStep(msgIndex, {
                      type: 'BOARD_REVIEW',
                      round: attempt + 1,
                      content: audit,
                      timestamp: Date.now()
                  });

                  if (audit.verdict === 'REJECTED' && attempt < MAX_RETRYS) {
                      setLoadingStatus("Board Rejected Report. Research Lead re-calibrating...");
                      
                      const newPlan = await createCollaborativePlan(
                          userQuery,
                          activeAgents,
                          historyContext,
                          (status) => setLoadingStatus(status),
                          (step) => appendCollaborationStep(msgIndex, step),
                          { feedback: audit.remediation_instructions || "Missing Data detected.", previousPlan: currentPlan }
                      );
                      
                      currentPlan = newPlan;
                      updateMessagePlan(msgIndex, newPlan);
                      attempt++;
                      continue;
                  }
              }

              setMessages(prev => {
                  const newMsgs = [...prev];
                  if (newMsgs[msgIndex]) {
                      newMsgs[msgIndex] = {
                          ...newMsgs[msgIndex],
                          text: content,
                          thinking: thinking
                      };
                  }
                  return newMsgs;
              });
              
              if (thinking) setTimeout(() => setExpandedThinking(msgIndex), 50);
              break;

          } catch (error: any) {
             if (error.message === 'USER_ABORTED') throw error;
             throw error; 
          }
      }
  };

  const submitClarificationAnswers = async (clarification: ClarificationRequest) => {
      // 1. Build the response string from the state
      const answers: string[] = [];
      
      clarification.questions.forEach(q => {
          const selectedOptions = clarificationAnswers[q.id] || [];
          if (selectedOptions.length > 0) {
             const finalAnswers = selectedOptions.map(sel => {
                 const opt = q.options.find(o => o.text === sel);
                 if (opt?.isCustomInput) {
                     const customVal = customInputMap[q.id];
                     return customVal ? `Custom: "${customVal}"` : sel;
                 }
                 return sel;
             });
             answers.push(`Question: "${q.text}"\nAnswer(s): ${finalAnswers.join(', ')}`);
          }
      });
      
      const combinedResponse = answers.join('\n\n');
      
      // 2. Update UI with user response
      const userMsg: ChatMessage = { role: 'user', text: combinedResponse };
      const currentMessages = [...messages, userMsg];
      setMessages(currentMessages);
      setIsProcessing(true);
      
      // 3. Reset State
      setClarificationAnswers({});
      setCustomInputMap({});
      
      // 4. Resume
      const originalQuery = messages[messages.length - 2]?.role === 'user' ? messages[messages.length - 2].text : "";
      const fullContextQuery = `${originalQuery}\n\n[USER CLARIFICATIONS]:\n${combinedResponse}`;
      
      await startResearchExecution(fullContextQuery, currentMessages);
  };

  const handleOptionToggle = (qId: string, text: string, multipleChoice: boolean, isCustom: boolean) => {
    setClarificationAnswers(prev => {
      const existing = prev[qId] || [];
      if (multipleChoice) {
        if (existing.includes(text)) {
           // Remove
           return { ...prev, [qId]: existing.filter(t => t !== text) };
        } else {
           // Add
           return { ...prev, [qId]: [...existing, text] };
        }
      } else {
        // Single choice - Replace
        return { ...prev, [qId]: [text] };
      }
    });

    // Handle Custom Input Cleaning
    if (!multipleChoice && !isCustom) {
        setCustomInputMap(prev => {
             const newState = {...prev};
             delete newState[qId];
             return newState;
        });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing || activeAgents.length === 0) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    const currentMessages = [...messages, userMsg]; 
    setMessages(currentMessages);
    setInput('');
    setIsProcessing(true);
    setLoadingStatus('Research Lead assessing inquiry...');

    try {
        // Step 0: Check if clarification is needed (Human-in-the-Loop)
        const clarification = await generateClarificationQuestions(userMsg.text || "", activeAgents);
        
        if (clarification.requires_clarification && clarification.questions.length > 0) {
            setMessages(prev => [...prev, { role: 'model', clarification: clarification }]);
            setIsProcessing(false); // Stop processing to wait for user input
            setLoadingStatus('');
            return;
        }

        // If no clarification needed, proceed directly
        await startResearchExecution(userMsg.text || "", currentMessages);

    } catch (error: any) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'model', text: "Error initializing request." }]);
        setIsProcessing(false);
        setLoadingStatus('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] min-h-[500px] bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-slate-900/90 border-b border-slate-800 flex flex-col z-20">
        <div className="p-4 flex items-center justify-between border-b border-slate-800/50">
           <div className="flex items-center gap-2">
              <div className="bg-emerald-500/10 p-1.5 rounded-md border border-emerald-500/20">
                <Network className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white">Research Team</h3>
              <span className="text-[10px] bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 shadow-sm">
                <Layers className="w-3 h-3" /> {activeAgents.length} Active Experts
              </span>
           </div>
           
           <div className="flex items-center gap-4">
               <div className="flex gap-3 text-[10px]">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-white transition-colors">Select All</button>
                  <button onClick={handleSelectNone} className="text-slate-400 hover:text-white transition-colors">Clear</button>
               </div>
           </div>
        </div>
        
        {/* Agent Selector Chips */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto bg-slate-950/20 no-scrollbar items-center shadow-inner">
           {availableAgents.length === 0 ? (
             <span className="text-xs text-slate-500 italic flex items-center gap-2">
               <Sparkles className="w-3 h-3" /> No documents active.
             </span>
           ) : (
             availableAgents.map((agent) => {
               const isActive = activeAgents.includes(agent);
               return (
                 <button
                   key={agent}
                   onClick={() => handleToggleAgent(agent)}
                   className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border font-medium whitespace-nowrap
                      ${isActive 
                         ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                         : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:border-slate-600 grayscale'
                      }
                   `}
                 >
                   {isActive ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                   <span className="truncate max-w-[150px]">{agent}</span>
                 </button>
               );
             })
           )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-900/30">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-24">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center">
               <Bot className="w-8 h-8 text-emerald-500/50" />
            </div>
            <p className="text-lg text-slate-300 font-semibold">Research Team Ready</p>
            <p className="text-sm mt-2 opacity-60 max-w-md mx-auto leading-relaxed">
              Ask about specific details, summaries, or cross-document comparisons. The team will cite sources for every claim.
            </p>
          </div>
        )}
        
        {messages.map((msg, idx) => {
            return (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/50 flex items-center justify-center flex-shrink-0 border border-emerald-500/20 mt-1 shadow-sm">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                )}
                
                <div className={`max-w-[85%] flex flex-col gap-2`}>
                    
                    {/* --- CLARIFICATION UI (MULTI-QUESTION) --- */}
                    {msg.clarification && (
                       <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-6 shadow-xl w-full max-w-xl animate-in slide-in-from-left-4 fade-in duration-300">
                          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2 pb-3 border-b border-slate-700">
                             <Sparkles className="w-4 h-4 text-emerald-400" />
                             Refine Research Focus
                             <span className="ml-auto text-xs font-normal text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded">
                                {Object.keys(clarificationAnswers).filter(k => clarificationAnswers[k]?.length > 0).length} / {msg.clarification.questions.length} Answered
                             </span>
                          </h4>
                          
                          <div className="space-y-6">
                            {msg.clarification.questions.map((q, qIdx) => (
                                <div key={q.id} className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <p className="text-slate-200 text-sm font-medium leading-relaxed">
                                            <span className="text-emerald-500 mr-2">{qIdx + 1}.</span>
                                            {q.text}
                                        </p>
                                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                            {q.multiple_choice ? 'Multi-Select' : 'Single Choice'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {q.options.map((opt) => {
                                            const currentAnswers = clarificationAnswers[q.id] || [];
                                            const isSelected = currentAnswers.includes(opt.text);
                                            return (
                                                <button 
                                                    key={opt.id}
                                                    onClick={() => handleOptionToggle(q.id, opt.text, q.multiple_choice, !!opt.isCustomInput)}
                                                    className={`
                                                        w-full text-left p-3 rounded-lg border transition-all text-xs flex items-start gap-2 h-auto whitespace-normal break-words
                                                        ${isSelected 
                                                            ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                                            : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                                                        }
                                                    `}
                                                >
                                                    <div className={`mt-0.5 w-4 h-4 rounded ${q.multiple_choice ? 'rounded-md' : 'rounded-full'} border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-emerald-400' : 'border-slate-600'}`}>
                                                        {isSelected && <div className={`w-2 h-2 bg-emerald-400 ${q.multiple_choice ? 'rounded-sm' : 'rounded-full'}`} />}
                                                    </div>
                                                    <span className="leading-snug">{opt.text}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Custom Input Field logic */}
                                    {(() => {
                                        const currentAnswers = clarificationAnswers[q.id] || [];
                                        const hasCustomSelected = q.options.some(o => o.isCustomInput && currentAnswers.includes(o.text));
                                        
                                        if (hasCustomSelected) {
                                            return (
                                                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                                                    <input 
                                                        type="text"
                                                        value={customInputMap[q.id] || ''}
                                                        onChange={(e) => setCustomInputMap(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                        placeholder="Please specify details..."
                                                        className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                        autoFocus
                                                    />
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            ))}
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-slate-700 flex justify-end">
                              <button
                                 disabled={Object.keys(clarificationAnswers).filter(k => clarificationAnswers[k]?.length > 0).length < msg.clarification.questions.length}
                                 onClick={() => msg.clarification && submitClarificationAnswers(msg.clarification)}
                                 className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                              >
                                 Start Research <ArrowRight className="w-4 h-4" />
                              </button>
                          </div>
                       </div>
                    )}

                    {msg.collaborationSteps && msg.collaborationSteps.length > 0 && (
                        <CollaborationLog steps={msg.collaborationSteps} />
                    )}

                    {msg.plan && msg.plan.plan_type === 'DEEP_ANALYSIS' ? (
                      <div className="bg-slate-950/80 border border-emerald-500/20 rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-left-5 ring-1 ring-white/5">
                        <div className="bg-emerald-950/20 p-4 border-b border-emerald-500/10 flex items-center justify-between relative overflow-hidden">
                           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                          <div className="flex items-center gap-2 relative z-10">
                             <ListTodo className="w-4 h-4 text-emerald-400" />
                             <span className="font-bold text-emerald-100 text-sm tracking-wide">RESEARCH PLAN</span>
                          </div>
                          <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-widest font-mono relative z-10">
                            {msg.plan.steps.length} Phases
                          </div>
                        </div>
                        
                        <div className="p-5 space-y-5">
                          <div className="text-sm text-slate-400 italic pl-3 border-l-2 border-slate-700">
                            "{msg.plan.thought_process}"
                          </div>
                          
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Objective</h4>
                            <p className="text-sm text-slate-200 font-medium leading-relaxed">{msg.plan.strategy_explanation}</p>
                          </div>

                          <div className="mt-4 bg-slate-900/50 rounded-lg p-4 border border-white/5">
                               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Roadmap</h4>
                               <div className="space-y-4 relative">
                                  {msg.plan.steps.length > 1 && (
                                    <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-slate-800 -z-10" />
                                  )}
                                  
                                  {msg.plan.steps.map((step, sIdx) => (
                                    <div key={sIdx} className="relative pl-0">
                                       <div className="flex items-center gap-3 mb-2">
                                          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 z-10 shadow-sm">
                                             {sIdx + 1}
                                          </div>
                                          <div className="flex-1">
                                              <div className="text-sm font-semibold text-slate-200">{step.step_title}</div>
                                              <div className="text-[10px] text-slate-500">{step.description}</div>
                                          </div>
                                       </div>
                                       
                                       <div className="pl-11 space-y-2">
                                          {step.tasks.map((task, tIdx) => (
                                            <div key={tIdx} className="flex gap-3 bg-black/20 p-2.5 rounded border border-white/5 text-xs">
                                              <div className="flex-shrink-0 mt-0.5">
                                                <FileText className="w-3 h-3 text-emerald-500/70" />
                                              </div>
                                              <div className="space-y-0.5">
                                                  <div className="font-mono text-[10px] text-emerald-500/80">{task.file_name}</div>
                                                  <div className="text-slate-400">"{task.specific_question}"</div>
                                              </div>
                                            </div>
                                          ))}
                                       </div>
                                    </div>
                                  ))}
                               </div>
                            </div>
                            
                            {(!msg.text) && (
                                <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium animate-pulse">
                                    <BrainCircuit className="w-4 h-4" />
                                    <span>Research Lead coordinating with experts...</span>
                                </div>
                            )}

                        </div>
                      </div>
                    ) : null }

                    {msg.text && (
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user' 
                              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-br-none shadow-lg shadow-emerald-900/20' 
                              : 'bg-slate-800/80 backdrop-blur-sm text-slate-200 rounded-tl-none border border-slate-700/50'
                          }`}>
                          
                          {msg.thinking && (
                              <div className="mb-4">
                                  <button 
                                      onClick={() => toggleThinking(idx)}
                                      className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors w-full p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 hover:bg-emerald-950/50"
                                  >
                                      <BrainCircuit className="w-3.5 h-3.5" />
                                      <span>Synthesis Logic</span>
                                      {expandedThinking === idx ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
                                  </button>
                                  
                                  {expandedThinking === idx && (
                                      <div className="mt-2 p-3 bg-black/40 rounded-lg border border-white/5 animate-in slide-in-from-top-2 duration-200 shadow-inner">
                                          <div className="text-xs font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
                                              {msg.thinking}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}

                          {msg.text && (
                              <div className="prose prose-invert prose-p:leading-relaxed prose-sm max-w-none">
                                <FormattedMessage text={msg.text} onViewSource={onViewSource} />
                              </div>
                          )}
                      </div>
                    )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0 mt-1 border border-white/5">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>
            );
        })}
        
        {isProcessing && (
           <div className="flex gap-4 justify-start animate-pulse">
             <div className="w-8 h-8 rounded-lg bg-emerald-950/50 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="bg-slate-800/80 p-4 rounded-2xl rounded-tl-none border border-slate-700/50">
                 <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                       {loadingStatus.includes('Review') || loadingStatus.includes('Board') ? (
                          <Scale className="w-3 h-3 text-purple-400 animate-pulse" />
                       ) : loadingStatus.includes('Improving') || loadingStatus.includes('Remediating') ? (
                          <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                       ) : (
                          <Search className="w-3 h-3 text-emerald-400 animate-bounce" />
                       )}
                       <span className="text-xs text-slate-400 font-mono transition-all duration-300">{loadingStatus}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                 </div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-5 bg-slate-900 border-t border-slate-800 z-20">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing || activeAgents.length === 0}
            placeholder={
              activeAgents.length === 0 ? "Select a document expert above to start" 
              : "Ask for a summary, fact, or comparison..."
            }
            className="w-full bg-slate-950 text-white rounded-full pl-6 pr-14 py-4 focus:outline-none focus:ring-2 border shadow-inner transition-all disabled:opacity-50 disabled:cursor-not-allowed border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          />
          
          {isProcessing ? (
             <button 
               onClick={handleStop}
               className="absolute right-2 top-2 bottom-2 aspect-square bg-rose-600 text-white rounded-full hover:bg-rose-500 transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg animate-in zoom-in duration-200"
               title="Stop Generation"
             >
               <Square className="w-4 h-4 fill-white" />
             </button>
          ) : (
             <button 
               onClick={handleSend}
               disabled={!input.trim() || activeAgents.length === 0}
               className="absolute right-2 top-2 bottom-2 aspect-square bg-emerald-600 text-white rounded-full hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg"
             >
               <Send className="w-5 h-5" />
             </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;