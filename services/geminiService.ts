import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { AnalysisResult, OrchestratorPlan, ChatMessage, CollaborationStep, CriticVerdict, OutputQualityVerdict, ClarificationRequest } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

// --- ABORT CONTROLLER LOGIC ---
let activeController: AbortController | null = null;

export const cancelRunningAgent = () => {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
};

const initController = () => {
  cancelRunningAgent();
  activeController = new AbortController();
};

const checkAbort = () => {
  if (activeController?.signal.aborted) {
     throw new Error("USER_ABORTED");
  }
};

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Robustly balances a truncated JSON string.
 */
function balanceJSON(jsonString: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  
  let processedString = jsonString.trim();

  for (let i = 0; i < processedString.length; i++) {
    const char = processedString[i];
    
    if (inString) {
      if (char === '\\') escaped = !escaped;
      else if (char === '"' && !escaped) inString = false;
      else escaped = false;
    } else {
      if (char === '"') inString = true;
      else if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '}') stack.pop();
      }
      else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === ']') stack.pop();
      }
    }
  }
  
  if (inString) processedString += '"';
  while (stack.length > 0) {
    processedString += stack.pop();
  }
  
  return processedString;
}

/**
 * Tries multiple strategies to parse a potentially dirty or markdown-wrapped JSON string.
 */
function cleanAndParseJSON(text: string): any {
  if (!text) throw new Error("Empty response text");

  // Strategy 1: Direct Parse
  try {
    return JSON.parse(text);
  } catch (e) {
    // continue
  }

  // Strategy 2: Remove Markdown Code Blocks
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // continue
  }

  // Strategy 3: Extract JSON object substring
  const firstOpen = cleaned.indexOf('{');
  const lastClose = cleaned.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
     const substring = cleaned.substring(firstOpen, lastClose + 1);
     try {
       return JSON.parse(substring);
     } catch (e) {
       // continue
     }
  }

  // Strategy 4: Balance the cleaned string (for truncation)
  try {
    const balanced = balanceJSON(cleaned);
    return JSON.parse(balanced);
  } catch (e) {
    // continue
  }
  
  throw new Error("Unable to parse JSON structure from response.");
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- ROBUST API WRAPPER FOR 429 HANDLING ---
async function callGeminiWithRetry<T>(
  apiCall: () => Promise<T>, 
  retries = 3, 
  baseDelay = 2000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    checkAbort();
    try {
      return await apiCall();
    } catch (error: any) {
      if (activeController?.signal.aborted || error.message === 'USER_ABORTED') {
        throw new Error('USER_ABORTED');
      }

      const status = error.status || error.response?.status;
      const msg = error.message || '';
      const isRateLimit = status === 429 || msg.includes('429') || msg.includes('quota');
      const isOverloaded = status === 503 || msg.includes('503') || msg.includes('overloaded');

      if ((isRateLimit || isOverloaded) && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i) + (Math.random() * 1000);
        console.warn(`Gemini API busy/limited (Attempt ${i+1}/${retries}). Waiting ${Math.round(delay)}ms...`);
        await wait(delay);
        continue;
      }
      
      throw error;
    }
  }
  throw new Error("API call failed after max retries");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// --- 1. DASHBOARD PARSER (Structure Extraction) ---

const ANALYSIS_SYSTEM_INSTRUCTION = `
You are a Lead Researcher. 
Your goal is to extract the TITLE, TYPE, SUMMARY, TOPICS and 4-6 KEY INSIGHTS from the document.

CRITICAL RULES:
- **SPEED**: Focus on high-level understanding.
- **GROUNDING**: Every key insight must have a \`citation_quote\` and \`context_block\` (surrounding paragraph) from the PDF.
- **Summary**: 2-3 sentences describing the core purpose of the document.
`;

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    doc_title: { type: Type.STRING, description: "Official title of the document or main subject" },
    doc_type: { type: Type.STRING, description: "e.g. 'Scientific Paper', 'Financial Report', 'Legal Contract', 'Slide Deck'" },
    summary: { type: Type.STRING, description: "Concise summary of content." },
    topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3-5 main topics/tags" },
    key_insights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Short label for this insight (e.g. 'Revenue Growth', 'Key Hypothesis', 'Deadline')" },
          description: { type: Type.STRING, description: "The actual fact, number, or finding." },
          citation_quote: { type: Type.STRING, description: "Exact short phrase from doc." },
          context_block: { type: Type.STRING, description: "Extended text surrounding the quote." },
          page_reference: { type: Type.STRING },
          category: { type: Type.STRING, description: "e.g. 'Stat', 'Person', 'Date', 'Concept'" }
        },
        required: ["title", "description", "citation_quote", "context_block"]
      },
      description: "4-6 most important findings or facts."
    }
  },
  required: ["doc_title", "doc_type", "key_insights", "summary", "topics"]
};

const analyzeSingleReport = async (file: File): Promise<AnalysisResult> => {
  try {
    checkAbort();
    const filePart = await fileToGenerativePart(file);
    
    // Use the wrapper
    const response = await callGeminiWithRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          role: "user",
          parts: [
            filePart,
            { text: "Analyze this document. Extract title, type, summary, and key insights." }
          ]
        },
        config: {
          systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
          temperature: 0.1,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 2048 }
        }
      });
    }, 5, 3000); 

    if (!response || !response.text) throw new Error("No response");
    
    let result: any;
    try {
        result = cleanAndParseJSON(response.text);
    } catch (parseError) {
        throw new Error("Failed to parse AI response.");
    }

    return {
      source_file: file.name,
      doc_title: result.doc_title || "Untitled Document",
      doc_type: result.doc_type || "Document",
      summary: result.summary || "No summary available.",
      key_insights: Array.isArray(result.key_insights) ? result.key_insights : [],
      topics: Array.isArray(result.topics) ? result.topics : []
    };
    
  } catch (error: any) {
    if (error.message === "USER_ABORTED") throw error;
    console.error(`Analysis failed for ${file.name}:`, error);
    return {
      source_file: file.name,
      doc_title: "Analysis Failed",
      doc_type: "Error",
      summary: `Could not analyze file: ${error.message || 'Unknown error'}`,
      key_insights: [],
      topics: []
    };
  }
};

export const analyzeFinancialReport = async (
  files: File[],
  onProgress?: (idx: number, total: number, message: string) => void
): Promise<AnalysisResult[]> => {
  initController(); 
  const results: AnalysisResult[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    checkAbort();
    if (onProgress) onProgress(i, files.length, `Analyzing structure: ${file.name}...`);
    const result = await analyzeSingleReport(file);
    results.push(result);
  }
  return results;
};


// --- 2. EXPERT PANEL SYSTEM (Multi-Session Chat) ---

interface AgentSession {
  fileName: string;
  chat: Chat;
  isReady: boolean;
}

let agentSwarm: Map<string, AgentSession> = new Map();

export const initializeAgentSwarm = async (
  files: File[], 
  onProgress?: (idx: number, total: number, status: string) => void
) => {
  initController(); 
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    checkAbort();
    if (onProgress) onProgress(i, files.length, `Briefing Document Expert for ${file.name}...`);
    
    const filePart = await fileToGenerativePart(file);
    
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 24576 },
        systemInstruction: `
          You are a specialized Document Expert dedicated ONLY to the file: "${file.name}".
          YOUR JOB: Answer questions strictly based on the provided document.
          
          CITATION PROTOCOL:
          Every single claim, number, or fact you output MUST be immediately followed by a citation tag in this EXACT format:
          [[Page: X | Quote: "exact text match"]]
          
          Example: "The project deadline is Q4 [[Page: 5 | Quote: 'completion expected by Q4']]"
          
          If the information is not in the document, state "Not found in document".
        `
      }
    });

    try {
      checkAbort();
      await callGeminiWithRetry(async () => {
          await chat.sendMessage({
            message: [
            filePart, 
            { text: "Confirm you have reviewed the document and are ready." }
            ]
        });
      }, 3, 3000);
      
      agentSwarm.set(file.name, {
        fileName: file.name,
        chat: chat,
        isReady: true
      });
    } catch (e) {
      if ((e as Error).message === "USER_ABORTED") throw e;
      console.error(`Failed to init expert for ${file.name}`, e);
    }
  }

  if (onProgress) onProgress(files.length, files.length, "Research Team Ready.");
};

export const getSwarmStatus = () => {
  return Array.from(agentSwarm.keys());
};

export const removeAgent = (fileName: string) => {
  agentSwarm.delete(fileName);
};


// --- 3. LEAD RESEARCHER & PEER REVIEW BOARD SYSTEM ---

// HUMAN-IN-THE-LOOP CLARIFICATION SCHEMA
const clarificationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    requires_clarification: { type: Type.BOOLEAN, description: "True if the query is vague or could be interpreted in multiple ways. False if simple greeting." },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING, description: "The clarification question itself." },
          multiple_choice: { type: Type.BOOLEAN, description: "True if user can select multiple options. False for single choice." },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING, description: "The text of the option." },
                isCustomInput: { type: Type.BOOLEAN, description: "Set to TRUE for the last option to allow user typing." }
              },
              required: ["id", "text"]
            },
            description: "3 to 5 options. Last one can be custom."
          }
        },
        required: ["id", "text", "multiple_choice", "options"]
      },
      description: "List of 3 to 4 distinct clarification questions."
    }
  },
  required: ["requires_clarification", "questions"]
};

const orchestratorSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    plan_type: { 
      type: Type.STRING, 
      enum: ["SIMPLE_FACT", "DEEP_ANALYSIS"],
      description: "SIMPLE_FACT = retrieval, summarization. DEEP_ANALYSIS = complex reasoning, cross-document synthesis, thematic analysis."
    },
    thought_process: { type: Type.STRING },
    strategy_explanation: { type: Type.STRING },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step_title: { type: Type.STRING },
          description: { type: Type.STRING },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                 file_name: { type: Type.STRING },
                 specific_question: { type: Type.STRING },
                 rationale: { type: Type.STRING }
              },
              required: ["file_name", "specific_question", "rationale"]
            }
          }
        },
        required: ["step_title", "description", "tasks"]
      }
    }
  },
  required: ["plan_type", "thought_process", "strategy_explanation", "steps"]
};

// PEER REVIEW BOARD SCHEMA (Planning Phase)
const executiveBoardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verdict: { 
      type: Type.STRING, 
      enum: ["APPROVED", "REJECTED"],
      description: "Approve if the plan is strategic and comprehensive. Reject if it is too basic or misses key aspects of the user's query."
    },
    critique_reasoning: { type: Type.STRING, description: "Explain rejection reasoning." },
    specific_improvements: { type: Type.STRING, description: "Directives for the Lead Researcher." }
  },
  required: ["verdict", "critique_reasoning"]
};

// PEER REVIEW BOARD SCHEMA (Output Audit Phase)
const outputQualitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verdict: { 
      type: Type.STRING, 
      enum: ["APPROVED", "REJECTED"],
      description: "REJECT if data is missing or the synthesis is hallucinated. APPROVE if high quality."
    },
    quality_assessment: { type: Type.STRING, description: "Review of the final output quality." },
    missing_data_suspicion: { type: Type.BOOLEAN, description: "True if the answer claims 'Not Found' but it likely exists." },
    remediation_instructions: { type: Type.STRING, description: "How to fix the answer." }
  },
  required: ["verdict", "quality_assessment", "missing_data_suspicion"]
};

export const generateClarificationQuestions = async (
  userMessage: string, 
  activeFiles: string[]
): Promise<ClarificationRequest> => {
  initController();
  checkAbort();

  const prompt = `
    You are a Research Lead preparing to analyze these documents: ${JSON.stringify(activeFiles)}.
    User Query: "${userMessage}"
    
    TASK: Determine if you need to clarify the user's intent to provide a better answer.
    
    1. If the query is vague (e.g., "summarize", "what's important", "compare them"), generate 3 to 4 distinct clarification questions.
       - Decide if each question should be SINGLE-choice (e.g. "Which specific year?") or MULTIPLE-choice (e.g. "Which departments should be included?").
       - Each question must have 3 to 5 options.
       - Include an "Other/Custom" option where relevant.
    2. If the query is already very specific (e.g., "What is the revenue in 2023 for Company X?"), set requires_clarification = false.

    OUTPUT JSON.
  `;

  return await callGeminiWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: clarificationSchema,
        temperature: 0.3
      }
    });
    if (!response.text) return { requires_clarification: false, questions: [] };
    return cleanAndParseJSON(response.text) as ClarificationRequest;
  }, 3, 2000);
};

export const createCollaborativePlan = async (
  userMessage: string,
  activeFiles: string[] = [],
  chatHistory: ChatMessage[] = [],
  onStatusUpdate?: (status: string) => void,
  onStepUpdate?: (step: CollaborationStep) => void,
  previousFailureContext?: { feedback: string; previousPlan: OrchestratorPlan }
): Promise<OrchestratorPlan> => {
  initController(); 
  
  if (agentSwarm.size === 0) throw new Error("Expert Panel not initialized");

  const targets = activeFiles.length > 0 
    ? activeFiles.filter(name => agentSwarm.has(name))
    : Array.from(agentSwarm.keys());

  const historyText = chatHistory.slice(-10).map(msg => {
     const content = msg.text || (msg.plan ? "(Plan Generated)" : "(Thinking)");
     return `${msg.role.toUpperCase()}: ${content}`;
  }).join('\n');

  checkAbort();
  if (onStatusUpdate) {
      if (previousFailureContext) onStatusUpdate("Research Lead: Recalibrating strategy based on Peer Review...");
      else onStatusUpdate("Research Lead: Drafting research strategy...");
  }

  let basePrompt = `
    You are the "Lead Researcher" managing a team of Document Experts.
    AVAILABLE DOCS: ${targets.map(f => `- ${f}`).join('\n')}
    HISTORY: ${historyText}
    USER QUERY: "${userMessage}"
  `;

  if (previousFailureContext) {
      basePrompt += `
      CRITICAL ALERT: Your previous strategy FAILED the Peer Review.
      REASON: ${previousFailureContext.feedback}
      YOUR TASK: Create a REMEDIATION PLAN.
      `;
  }

  basePrompt += `
    GOAL: Create a structured execution plan for your experts.
    
    DECISION RULES:
    1. **SIMPLE_FACT**: For retrieval, summarization, or simple questions.
    2. **DEEP_ANALYSIS**: For comparison, thematic analysis, or complex reasoning.
    3. **NO_OP RULE**: If answer is in history, return empty steps.

    OUTPUT: JSON.
  `;

  let currentPlan = await generateOrchestratorPlan(basePrompt);
  
  if (onStepUpdate) {
    onStepUpdate({
      type: 'ORCHESTRATOR',
      round: previousFailureContext ? 99 : 0, 
      content: currentPlan,
      timestamp: Date.now()
    });
  }

  return currentPlan;
};

export const improvePlanWithCritic = async (
    userMessage: string,
    initialPlan: OrchestratorPlan,
    activeFiles: string[] = [],
    onStatusUpdate?: (status: string) => void,
    onStepUpdate?: (step: CollaborationStep) => void
): Promise<OrchestratorPlan> => {
    initController();

    const targets = activeFiles.length > 0 
        ? activeFiles.filter(name => agentSwarm.has(name))
        : Array.from(agentSwarm.keys());

    const basePrompt = `
        You are the "Research Lead".
        AVAILABLE DOCS: ${targets.map(f => `- ${f}`).join('\n')}
        QUERY: "${userMessage}"
        GOAL: Create a structured plan.
    `;

    let currentPlan = initialPlan;

    const MAX_ROUNDS = 5;
    for (let i = 1; i <= MAX_ROUNDS; i++) {
        checkAbort();
        if (onStatusUpdate) onStatusUpdate(`Peer Review (Round ${i}/${MAX_ROUNDS})...`);
        
        const critiqueResult = await runExecutiveBoard(userMessage, currentPlan, targets);

        if (onStepUpdate) {
            onStepUpdate({
                type: 'CRITIC',
                round: i,
                content: critiqueResult,
                timestamp: Date.now()
            });
        }

        if (critiqueResult.verdict === 'APPROVED') {
            if (onStatusUpdate) onStatusUpdate("Peer Review: Approved. Proceeding.");
            break;
        }

        if (onStatusUpdate) onStatusUpdate(`Research Lead (Round ${i}): Improving strategy...`);
        
        const refinementPrompt = `
        ${basePrompt}
        
        PREVIOUS PLAN: ${JSON.stringify(currentPlan)}
        REVIEW BOARD VERDICT: REJECTED
        FEEDBACK: ${critiqueResult.critique_reasoning}
        DIRECTIVES: ${critiqueResult.specific_improvements}
        
        TASK: Generate a SUPERIOR plan.
        `;

        currentPlan = await generateOrchestratorPlan(refinementPrompt);

        if (onStepUpdate) {
            onStepUpdate({
                type: 'ORCHESTRATOR',
                round: i,
                content: currentPlan,
                timestamp: Date.now()
            });
        }
    }

    return currentPlan;
}

async function generateOrchestratorPlan(prompt: string): Promise<OrchestratorPlan> {
  checkAbort();
  return await callGeminiWithRetry(async () => {
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
        responseMimeType: "application/json",
        responseSchema: orchestratorSchema,
        thinkingConfig: { thinkingBudget: 16384 }
        }
    });
    if (!response.text) throw new Error("Orchestrator failed.");
    return cleanAndParseJSON(response.text) as OrchestratorPlan;
  }, 4, 3000);
}

async function runExecutiveBoard(userQuery: string, plan: OrchestratorPlan, availableFiles: string[]): Promise<CriticVerdict> {
  checkAbort();
  const boardPrompt = `
    You are the **Peer Review Board** (Ruthless Senior Editors).
    Review this Research Plan.
    
    QUERY: "${userQuery}"
    RESOURCES: ${JSON.stringify(availableFiles)}
    PLAN: ${JSON.stringify(plan)}
    
    ROLE: Enforce strict research standards. You hate superficial work.
    
    AUTOMATIC REJECTION CRITERIA:
    1. **Single-Step Logic for Complex Queries**: If the user asks for a comparison or deep analysis, and the plan has only 1 step -> REJECT.
    2. **Missing Cross-Referencing**: If multiple files are available and relevant, but the plan only queries one -> REJECT.
    3. **Vague Questions**: If tasks ask "tell me about this" instead of specific questions -> REJECT.
    4. **Shallow Strategy**: If the explanation is generic -> REJECT.
    
    VERDICT RULES:
    - **REJECT** if *any* criteria above are met.
    - **APPROVE** only if the plan is detailed, multi-step, and logically sound.

    Output JSON verdict.
  `;

  return await callGeminiWithRetry(async () => {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: boardPrompt,
        config: {
        responseMimeType: "application/json",
        responseSchema: executiveBoardSchema,
        temperature: 0.1,
        }
    });
    if (!response.text) return { verdict: 'APPROVED', critique_reasoning: 'Auto-approved on error' };
    return cleanAndParseJSON(response.text) as CriticVerdict;
  }, 3, 2000);
}

export const reviewOutputWithBoard = async (
    userQuery: string,
    synthesizedOutput: string,
    originalPlan: OrchestratorPlan
): Promise<OutputQualityVerdict> => {
    checkAbort();
    const auditPrompt = `
      You are the **Peer Review Board**.
      AUDIT the Final Research Report.
      
      QUERY: "${userQuery}"
      REPORT: 
      ${synthesizedOutput}
      
      GOAL: **DETECT HALLUCINATION & MISSING CONTEXT**.
      
      1. **Missing Info**: Did the report fail to answer the core question?
      2. **Logic Check**: Does the conclusion follow the data?
      
      Output JSON.
    `;

    return await callGeminiWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: auditPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: outputQualitySchema,
                temperature: 0.1,
            }
        });
        
        if (!response.text) return { verdict: 'APPROVED', quality_assessment: 'Auto-approved on error', missing_data_suspicion: false };
        return cleanAndParseJSON(response.text) as OutputQualityVerdict;
    }, 3, 2000);
}

export const executeOrchestratorPlan = async (
  plan: OrchestratorPlan,
  chatHistory: ChatMessage[] = [],
  onStatusUpdate?: (status: string) => void
): Promise<{ thinking: string; content: string }> => {
  initController(); 
  
  const allTasks = plan.steps.flatMap(step => step.tasks);
  let results: { file: string, question: string, response: string }[] = [];
  
  if (allTasks.length > 0) {
    if (onStatusUpdate) onStatusUpdate(`Execution: Deploying ${allTasks.length} tasks...`);
    
    const taskPromises = allTasks.map(async (task) => {
      checkAbort();
      const session = agentSwarm.get(task.file_name);
      if (!session) return { file: task.file_name, question: task.specific_question, response: "Error: Expert not assigned." };
      try {
        const text = await callGeminiWithRetry(async () => {
             const response = await session.chat.sendMessage({ message: task.specific_question });
             return response.text;
        }, 3, 2000);
        
        checkAbort();
        return { file: task.file_name, question: task.specific_question, response: text };
      } catch (e) {
        if ((e as Error).message === "USER_ABORTED") throw e;
        return { file: task.file_name, question: task.specific_question, response: "Error: Retrieval failed." };
      }
    });

    results = await Promise.all(taskPromises);
    checkAbort();
    if (onStatusUpdate) onStatusUpdate(`Synthesizing ${results.length} expert findings...`);
  }

  const historyText = chatHistory.slice(-10).map(msg => {
     const content = msg.text || ""; 
     return `${msg.role.toUpperCase()}: ${content}`;
  }).join('\n');

  const isDeep = plan.plan_type === 'DEEP_ANALYSIS';
  
  const synthesisPrompt = `
    You are the Research Lead.
    MODE: ${isDeep ? "DEEP ANALYSIS" : "PRECISE ANSWER"}
    STRATEGY: "${plan.strategy_explanation}"
    HISTORY: ${historyText}
    
    EXPERT REPORTS:
    ${results.map(r => `SOURCE: "${r.file}"\nCONTENT: ${r.response}`).join("\n\n")}

    STRICT OUTPUT FORMAT RULES:
    1. First line: <thinking>Explain synthesis logic here...</thinking>
    2. Then, the detailed response.
    3. **CITATION RULE**: EVERY fact/claim MUST be wrapped in a <claim> tag.
       - Attributes: source="filename", page="X", quote="exact substring".
       - **LOGIC RULE**: If the conclusion is derived, ADD logic="Reasoning used".
       
    Example:
    <claim source="Doc.pdf" page="10" quote="Project starts June" logic="Inferred from Q2 timeline">Start Date: June</claim>
    
    4. **TABLES**: When generating Markdown tables, ensure the VALUES inside the table cells are wrapped in <claim> tags.
  `;

  return await callGeminiWithRetry(async () => {
    const coordinator = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: synthesisPrompt,
        config: { thinkingConfig: { thinkingBudget: isDeep ? 32768 : 4096 } }
    });
    
    const rawText = coordinator.text || "Synthesis failed.";
    const thinkingMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/);
    const thinking = thinkingMatch ? thinkingMatch[1].trim() : "";
    const content = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/, "").trim();

    return { thinking, content };
  }, 3, 5000); 
};