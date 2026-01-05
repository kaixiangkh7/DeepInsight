# Insight - Deep Research AI Agent Swarm

**Insight** is a sophisticated document analysis platform powered by the Google Gemini API. It uses a **Multi-Agent Swarm Architecture** to perform deep research on financial reports, legal contracts, and scientific papers. Unlike standard RAG (Retrieval-Augmented Generation) applications, Insight employs a team of specialized agents that plan, critique, execute, and review research tasks autonomously.

---

## 🚀 Key Features

### 1. **Multi-Agent Swarm Architecture**
The application does not rely on a single prompt. Instead, it instantiates specific personas:
*   **Document Experts:** One agent per file. They know *only* their specific document and provide strict citations.
*   **Lead Researcher (Orchestrator):** Breaks down complex user queries into a step-by-step research plan.
*   **Peer Review Board (Critic):** A "ruthless editor" agent that reviews plans and final outputs. It rejects lazy strategies or hallucinated answers.

### 2. **Grounding & Citations**
*   **Zero-Trust Retrieval:** Every claim made by the AI includes a clickable citation chip (`<claim source="..." page="..." quote="...">`).
*   **Source Verification Sidebar:** Clicking a citation opens a sidebar showing the *exact* excerpt from the PDF with the quoted text highlighted, proving the AI isn't hallucinating.

### 3. **Human-in-the-Loop Clarification**
*   If a user's query is vague (e.g., "Compare revenue"), the Research Lead pauses execution.
*   It generates **Clarification Questions** (Single-choice or Multi-select) to narrow down intent.
*   The user can select options or type custom context before the research begins.

### 4. **Self-Correcting Workflows**
*   **Planning Loop:** If the Lead Researcher creates a weak plan (e.g., single-step logic for a complex comparison), the Review Board rejects it. The Lead must revise the strategy before running it.
*   **Output Audit:** After synthesizing the answer, the Review Board audits the final report. If data is missing or logic is flawed, it forces a re-run with specific remediation instructions.

---

## 🔄 The Research Flow

### Phase 1: Ingestion & Structural Analysis
1.  **Upload:** User uploads PDFs.
2.  **Dashboard Parsing:** A lightweight Gemini model (`gemini-3-flash`) scans each document to extract metadata: Title, Summary, Topics, and Key Insights.
3.  **Visualization:** This data populates the **Dashboard** and **Comparison View**.

### Phase 2: Swarm Initialization
1.  For every file uploaded, a dedicated `ChatSession` is created in memory.
2.  Each session is "briefed" with a system instruction to act as the sole expert on that specific file.

### Phase 3: The Query Loop (Orchestration)
When a user asks a question:

1.  **Clarification Check:**
    *   The model analyzes if the query is ambiguous.
    *   *If Ambiguous:* UI displays clarification buttons. Research pauses until user responds.
    *   *If Clear:* Proceed to Step 2.

2.  **Strategic Planning:**
    *   The **Lead Researcher** generates a JSON `OrchestratorPlan`.
    *   This plan contains specific steps and tasks (e.g., "Step 1: Extract 2023 Revenue from Doc A. Step 2: Extract 2024 Revenue from Doc B.").

3.  **Peer Review (Planning):**
    *   The **Review Board** analyzes the plan.
    *   *Verdict:* APPROVED or REJECTED.
    *   *If Rejected:* The Lead Researcher receives feedback and generates a superior plan (up to 5 retries).

4.  **Execution (Fan-Out):**
    *   Approved tasks are executed in parallel.
    *   The Orchestrator sends specific questions to the specific **Document Expert** agents.
    *   Experts return answers with `[[Page: X | Quote: "..."]]` citations.

5.  **Synthesis:**
    *   The Lead Researcher compiles all expert reports into a final answer.
    *   It uses `<thinking>` tags for logic and `<claim>` tags for facts.

6.  **Peer Review (Output Audit):**
    *   The **Review Board** reads the final synthesized report.
    *   It checks for "Not found" lazy answers or hallucinations.
    *   *If Rejected:* The workflow loops back to planning with "Remediation Instructions".

---

## 🛠 Technical Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **Icons:** Lucide React
*   **AI Service:** Google GenAI SDK (`@google/genai`)
    *   **Models:**
        *   `gemini-3-pro-preview`: Used for complex reasoning (Orchestration, Synthesis).
        *   `gemini-3-flash-preview`: Used for high-speed tasks (Document Experts, Board Reviews, Clarification).
*   **State Management:** React `useState` / `useRef` (No external store required due to contained logic).

## 📂 Project Structure

*   `services/geminiService.ts`: The core brain. Contains all Prompts, Schemas, and the Agent Loop logic.
*   `components/Chat.tsx`: Handles the chat interface, clarification UI, and renders the "War Room" logs (Collaboration Steps).
*   `components/SourceSidebar.tsx`: The UI for viewing citations.
*   `components/ComparisonView.tsx`: A grid view for comparing extracted insights side-by-side.
