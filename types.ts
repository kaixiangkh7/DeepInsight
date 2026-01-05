
export interface KeyInsight {
  title: string;
  description: string;
  citation_quote: string;
  context_block?: string; // The surrounding paragraph(s)
  page_reference?: string;
  category?: string; // e.g., 'Concept', 'Person', 'Stat', 'Date'
}

export interface AnalysisResult {
  source_file: string;
  doc_title: string; // was company_name
  doc_type: string; // was report_period (e.g. "Research Paper", "Contract")
  summary: string;
  key_insights: KeyInsight[];
  topics?: string[]; // New: List of main topics discussed
}

export interface OrchestratorTask {
  file_name: string;
  specific_question: string;
  rationale: string;
}

export interface OrchestratorStep {
  step_title: string;
  description: string;
  tasks: OrchestratorTask[];
}

export interface OrchestratorPlan {
  plan_type: 'SIMPLE_FACT' | 'DEEP_ANALYSIS';
  thought_process: string;
  strategy_explanation: string;
  steps: OrchestratorStep[];
}

export interface CriticVerdict {
  verdict: "APPROVED" | "REJECTED";
  critique_reasoning: string;
  specific_improvements?: string;
}

export interface OutputQualityVerdict {
  verdict: "APPROVED" | "REJECTED";
  quality_assessment: string;
  missing_data_suspicion: boolean; 
  remediation_instructions?: string;
}

export interface CollaborationStep {
  type: 'ORCHESTRATOR' | 'CRITIC' | 'BOARD_REVIEW';
  round: number;
  content: OrchestratorPlan | CriticVerdict | OutputQualityVerdict;
  timestamp: number;
}

export interface ClarificationOption {
  id: string;
  text: string;
  isCustomInput?: boolean;
}

export interface ClarificationQuestion {
  id: string;
  text: string;
  multiple_choice: boolean;
  options: ClarificationOption[];
}

export interface ClarificationRequest {
  requires_clarification: boolean;
  questions: ClarificationQuestion[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text?: string;
  plan?: OrchestratorPlan; // If present, this message is a plan proposal
  clarification?: ClarificationRequest; // If present, we are in HITL mode
  thinking?: string; // For the synthesis phase
  collaborationSteps?: CollaborationStep[]; // The history of plan refinement
  isThinking?: boolean;
}

export interface SourceViewData {
  fileName: string;
  page?: string;
  quote: string;
  contextBlock: string;
  rationale?: string; // For calculated/derived metrics
}
