# Veni, Vidi, Discere — Technical Learning & Interview Master Guide

This guide is structured to help you understand every single part of this project. It will prepare you to explain the architecture, database design, API lifecycles, AI features, and technical trade-offs confidently in a senior engineering or technical architect interview.

---

## 📂 Table of Contents
1. [Phase 1: Project Objective & High-Level Overview](#phase-1-project-objective--high-level-overview)
2. [Phase 2: Tech Stack & System Trade-Offs](#phase-2-tech-stack--system-trade-offs)
3. [Phase 3: System Architecture & Execution Flows](#phase-3-system-architecture--execution-flows)
4. [Phase 4: Folder Structure & Code Map](#phase-4-folder-structure--code-map)
5. [Phase 5: Frontend Systems & Rendering Process](#phase-5-frontend-systems--rendering-process)
6. [Phase 6: Backend Core & Request Lifecycles](#phase-6-backend-core--request-lifecycles)
7. [Phase 7: Database Architecture & Indexing Strategy](#phase-7-database-architecture--indexing-strategy)
8. [Phase 8: Complete API Specification](#phase-8-complete-api-specification)
9. [Phase 9: AI/ML Module & RAG Implementation](#phase-9-aiml-module--rag-implementation)
10. [Phase 10: Authentication, Session Management & Security](#phase-10-authentication-session-management--security)
11. [Phase 11: Network & Connection Architecture](#phase-11-network--connection-architecture)
12. [Phase 12: Step-by-Step Scenario Execution Flows](#phase-12-step-by-step-scenario-execution-flows)
13. [Phase 13: Recruiter Value & Architecture Decisions Defense](#phase-13-recruiter-value--architecture-decisions-defense)
14. [Phase 14: Recommended Project Enhancements](#phase-14-recommended-project-enhancements)
15. [Phase 15: 30 Curated Mock Interview Questions & Answers](#phase-15-30-curated-mock-interview-questions--answers)
16. [Phase 16: Active Resume Defense Drill](#phase-16-active-resume-defense-drill)
17. [Phase 17: System Design & Scaling to 100M Users](#phase-17-system-design--scaling-to-100m-users)
18. [Phase 18: Ultimate Interview Cheat Sheet](#phase-18-ultimate-interview-cheat-sheet)

---

## Phase 1: Project Objective & High-Level Overview

### Simple Explanation
Think of **Veni, Vidi, Discere** (Latin for *"I came, I saw, I learned"*) as a highly interactive alternative to platforms like Studocu or Course Hero. It is an online educational marketplace where students can upload study guides, lecture slides, and past exam sheets.
Once uploaded, the system reads through the document (using text parsers or optical character recognition for scans) and connects it to an interactive AI assistant. Students can chat with their documents, extract formulas, generate flashcards, take practice quizzes, track study habits, and unlock premium documents using a simulated wallet balance.

### Technical Explanation
**Veni, Vidi, Discere** is a three-tier, multi-tenant learning management system (LMS) and marketplace built on a monolithic Node.js and Express architecture. It uses a server-side rendering (SSR) approach with Embedded JavaScript (EJS) templates, powered by a document-based MongoDB storage layer.
The core system is an active RAG (Retrieval-Augmented Generation) pipeline that parses raw files (PDFs, images, DOCX documents) using `pdf-parse`, `mammoth`, and `Tesseract.js`. The extracted text is then indexed and used to construct context-aware prompts for Google's Gemini models (`gemini-2.5-flash`).

### Target Audience & Real-World Use Case
* **Primary Users:** University students preparing for exams who need an easy way to study past papers, summarize lecture slides, and practice concepts.
* **Secondary Users:** Student content creators who want to monetize their study notes, and educators (professors/teachers) who verify the accuracy of academic resources.
* **Real-World Scenario:** A computer science student uploads a scanned PDF of a handwritten database cheatsheet. The system runs OCR in the background, extracts the text, and allows the student to:
  1. Ask the chatbot to explain database normalization rules from the notes.
  2. Generate 10 flashcards to review using spaced repetition.
  3. Extract all SQL queries into a clean summary list.

---

## Phase 2: Tech Stack & System Trade-Offs

| Technology | Role | Advantages | Limitations | Why Chosen Over Alternatives |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | Runtime Environment | High concurrency via non-blocking, event-driven I/O model; shared language (JS) across stack. | Single-threaded CPU execution can block the event loop during heavy computations (e.g., file compression or OCR processing). | Better suited than Python or Java for fast, lightweight I/O operations and handling concurrent file streaming. |
| **Express.js** | Backend Web Framework | Minimalist, unopinionated, and highly customizable middleware pipelines. | Lack of built-in structure can lead to code organization issues in large teams. | Selected over NestJS for simpler setup, faster routing development, and lower boilerplate. |
| **MongoDB & Mongoose** | Database & ODM | Dynamic schemas allow storing unstructured documents, nested chat histories, and arrays without complex joins. | Lack of ACID transactions across multiple collections (pre-v4.0) and higher memory overhead due to denormalization. | Chosen over PostgreSQL because document-based JSON maps directly to our EJS templates and AI responses. |
| **EJS** | Templating Engine | Server-side rendering (SSR) provides fast initial page loads and simplifies state management. | Mixing HTML and logic can make templates difficult to maintain as the UI grows. | Chosen over React/Next.js to avoid complex build setups, client-side hydration issues, and state sync code. |
| **Tesseract.js** | OCR Processing Engine | Runs locally in the Node environment (using WebAssembly) to extract text without external API costs. | Slower execution speeds and higher CPU usage than cloud APIs (e.g., Google Cloud Vision). | Avoids per-image cloud processing costs, making the text extraction pipeline free to run. |
| **Google Gemini API** | Large Language Model | Massive context window (up to 2M tokens) and native support for JSON schema responses. | API rate limits and network latency during peak study hours. | Chosen over OpenAI GPT models for its generous free tier and fast response times with flash models. |

---

## Phase 3: System Architecture & Execution Flows

### High-Level System Architecture
```
┌────────────────────────────────────────────────────────┐
│                    Presentation Layer                  │
│             Browser Clients (EJS + CSS + JS)           │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP Request (AJAX / POST)
                           ▼
┌────────────────────────────────────────────────────────┐
│                    Application Layer                   │
│        Node.js / Express Web Server (server.js)        │
└──────────────┬───────────────────────────┬─────────────┘
               │ Database Queries          │ HTTPS Requests
               ▼                           ▼
┌──────────────────────────┐    ┌────────────────────────┐
│     Data Storage Layer   │    │     AI Engine Layer    │
│      MongoDB Database    │    │   Google Gemini API    │
└──────────────────────────┘    └────────────────────────┘
```

---

### End-to-End Execution Flows

#### 1. RAG Query Flow (User Chats with a Document)
```
Browser Client              Express Routes              Mongoose Model             Gemini API
      │                           │                           │                         │
      │──(POST /api/chat)────────►│                           │                         │
      │   Payload: docId, query   │                           │                         │
      │                           │──(Find document)─────────►│                         │
      │                           │◄─(Return extracted text)──│                         │
      │                           │                                                     │
      │                           │──(Build context prompt)────────────────────────────►│
      │                           │◄─(Return text response)─────────────────────────────│
      │                           │                                                     │
      │                           │──(Push chat log to DB)───►│                         │
      │◄─(Return JSON response)───│                           │                         │
```

#### 2. Asynchronous Document Upload & Text Extraction Flow
```
1. User uploads file (PDF/Image/DOCX) -> POST /documents/upload
2. Multer interceptor saves file to disk (/uploads) and validates mime-type.
3. Database creates a Document record with { isParsed: false, filePath: "..." }
4. Server immediately responds with: { success: true, documentId: "..." }
5. Background worker is kicked off:
   │
   └──► Case Image/Scanned PDF: Run Tesseract.js OCR
   └──► Case PDF: Run pdf-parse text extraction
   └──► Case DOCX: Run mammoth extraction
   │
6. Worker saves output text and sets { isParsed: true, parsedAt: Date.now() }
7. Frontend client polls GET /api/parse-status/:id every 2 seconds to update the UI.
```

---

## Phase 4: Folder Structure & Code Map

### 1. Database Schemas (`/models`)
* **[User.js](file:///c:/Projects/Idea/models/User.js):** Contains username, email, hashed password, role definitions (`user`, `admin`, `professor`, `teacher`), wallet balance, reward points, and an array of unlocked documents (`purchasedDocuments`).
* **[Document.js](file:///c:/Projects/Idea/models/Document.js):** Stores file metadata (name, size, type, path), category, course/institution relationships, verification flags, page view counters, full extracted text (`extractedText`), and chat log histories (`chatHistory`).
* **[Transaction.js](file:///c:/Projects/Idea/models/Transaction.js):** Logs purchases of premium notes, showing the buyer, uploader, price breakdown (base price, GST, platform fee), and transaction status.
* **[Analytics.js](file:///c:/Projects/Idea/models/Analytics.js):** Tracks daily metrics per user, including study duration, files viewed, questions asked, and topic-specific difficulty levels.
* **[StudySession.js](file:///c:/Projects/Idea/models/StudySession.js):** Logs study sessions with start/end times and durations to generate analytics charts.
* **[Flashcard.js](file:///c:/Projects/Idea/models/Flashcard.js):** Stores Q&A flashcards, tracking user mastery ratings and next review dates for spaced repetition scheduling.
* **[Summary.js](file:///c:/Projects/Idea/models/Summary.js):** Caches structured summaries, key concepts, formulas (with LaTeX notation), and descriptions of diagrams.

### 2. Express Controllers (`/routes`)
* **[auth.js](file:///c:/Projects/Idea/routes/auth.js):** Handles user registration, logins, and session timeouts. Re-creates session IDs during logins to protect against session fixation attacks.
* **[documents.js](file:///c:/Projects/Idea/routes/documents.js):** Manages file uploads using Multer, coordinates file deletions (removing both DB records and disk files), and controls parsing logic.
* **[api.js](file:///c:/Projects/Idea/routes/api.js):** Handles AI queries, provides parse status updates, and handles text downloads.
* **[marketplace.js](file:///c:/Projects/Idea/routes/marketplace.js):** Serves the marketplace feed and handles document purchases.
* **[browse.js](file:///c:/Projects/Idea/routes/browse.js):** Guides users through selecting school notes by category (Institution -> Course -> Year -> Exam Type).
* **[admin.js](file:///c:/Projects/Idea/routes/admin.js):** Provides administrators with user management controls, document deletion tools, and system status metrics.

### 3. Business Logic Utilities (`/utils`)
* **[textExtraction.js](file:///c:/Projects/Idea/utils/textExtraction.js):** Runs files through appropriate extraction tools. Caps output text at 500,000 characters to prevent database bloating.
* **[getGeminiModel.js](file:///c:/Projects/Idea/utils/getGeminiModel.js):** Configures the Gemini AI connection. Automatically falls back to older model versions if the requested model fails to initialize.
* **[enhancedChatbot.js](file:///c:/Projects/Idea/utils/enhancedChatbot.js):** Analyzes user chat inputs using regular expressions to trigger specialized prompts for comparing documents, listing formulas, or showing solved examples.
* **[studyFeatures.js](file:///c:/Projects/Idea/utils/studyFeatures.js):** Handles AI requests for generating flashcards and summaries, and updates spaced repetition schedules.
* **[analytics.js](file:///c:/Projects/Idea/utils/analytics.js):** Calculates study consistency scores and helps identify topics the user finds challenging.

---

## Phase 5: Frontend Systems & Rendering Process

### User Interface Architecture
The application uses a server-side rendered frontend styled with custom Bootstrap templates and `portal.css`.
* **State Syncing:** Uses native browser session cookies to maintain the user's login state across page reloads.
* **Client JavaScript:** Dynamic features (such as flashcard flip animations, study timers, and AJAX search queries) are implemented using vanilla JavaScript scripts located in the `/public/js` directory.
* **Math Equations:** Uses the KaTeX library to render mathematical equations and LaTeX notations in study guides and summaries.

---

## Phase 6: Backend Core & Request Lifecycles

### Express Middleware Pipeline
For every incoming request, the server executes the following pipeline:
```
1. Client Connection
      │
      ▼
2. Security Headers (X-Content-Type-Options: nosniff, X-Frame-Options: DENY)
      │
      ▼
3. Body Parser (Parses JSON payloads and URL-encoded forms, limit: 10mb)
      │
      ▼
4. Static Asset Server (Serves assets from /public with client caching enabled in production)
      │
      ▼
5. Session Management (Retrieves the user's session from MongoStore using the session cookie)
      │
      ▼
6. Custom Router Matching (Directs the request to the matching controller endpoint, e.g., /api/chat)
      │
      ▼
7. Authentication Guards (requireAuth verifies the user is logged in, requireAdmin verifies user role)
      │
      ▼
8. Controller Execution (Performs business logic, runs database operations, and calls external APIs)
```

---

## Phase 7: Database Architecture & Indexing Strategy

### Schema Design Relationships
* **One-to-Many Relationships:** A single `User` can upload many `Document` records and create many `Flashcard` entries. Courses are linked to specific Institutions.
* **Embedded Sub-documents:** Chat history messages are saved directly within their parent `Document` records. This design optimizes the database by eliminating the need to perform slow queries across multiple collections.
* **Database Indexes:**
  * `userSchema.index({ email: 1 })` and `userSchema.index({ username: 1 })` speed up credential checks.
  * `documentSchema.index({ userId: 1, uploadDate: -1 })` optimizes dashboard loading.
  * `documentSchema.index({ originalName: 'text', extractedText: 'text', description: 'text' })` supports fast search queries.

---

## Phase 8: Complete API Specification

### 1. Send Chat Message
* **Endpoint:** `POST /api/chat`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "message": "Explain the quicksort algorithm in detail.",
    "documentIds": ["647a8b9c10c123456789abcd"]
  }
  ```
* **Processing Logic:** Finds the document, ensures it has been parsed, retrieves the text, inserts it into the AI prompt template, updates the chat history, and returns the response.
* **Response Body:**
  ```json
  {
    "success": true,
    "response": "Quicksort is a divide-and-conquer algorithm...",
    "enhancedFeatures": []
  }
  ```

### 2. Generate Study Flashcards
* **Endpoint:** `POST /study/flashcards/generate/:documentId`
* **Headers:** `Content-Type: application/json`
* **Processing Logic:** Reads the parsed text, constructs a prompt requesting flashcards formatted as a JSON array, parses the response, and saves the flashcards to the database.
* **Response Body:**
  ```json
  {
    "success": true,
    "message": "Flashcard generation started"
  }
  ```

---

## Phase 9: AI/ML Module & RAG Implementation

```
┌─────────────────┐      ┌───────────────────────────┐      ┌──────────────────┐
│ Upload Document │ ────►│ Text Extraction Utility   │ ────►│ MongoDB Database │
└─────────────────┘      │ (pdf-parse/Tesseract OCR) │      │ (extractedText)  │
                         └───────────────────────────┘      └─────────┬────────┘
                                                                      │
                                                                      ▼
┌─────────────────┐      ┌───────────────────────────┐      ┌──────────────────┐
│ Gemini Response │ ◄────│ Google Gemini API Model   │ ◄────│ Context Prompt   │
└─────────────────┘      └───────────────────────────┘      └──────────────────┘
```

* **Prompt Engineering Strategy:** Prompt templates guide the model to extract and organize information. For example, the system prompts the model to structure summaries with key concepts, important formulas in LaTeX, and descriptions of any diagrams mentioned in the text.
* **Context Size Limits:** Extracted text is capped at 500,000 characters to fit within the database limits and prevent sending excessively large payloads to the LLM.

---

## Phase 10: Authentication, Session Management & Security

### Security Implementation
* **Session Security:** Sets security flags on cookies (`HttpOnly`, `secure`, `sameSite: Lax`) to prevent cross-site scripting (XSS) and request forgery (CSRF) attacks.
* **Password Encryption:** Uses `bcryptjs` to hash and verify passwords, protecting user credentials in case of a database leak.
* **Access Control:** Middleware guards routes based on user roles (`admin` or `professor`), protecting system resources.
* **Session Fixation Prevention:** Regenerates session IDs when users log in to protect against session hijacking.

---

## Phase 11: Network & Connection Architecture

### Integration Topology
```
[Browser Client] ──(AJAX/JSON Calls)──► [Express API Gateway] ──(Mongoose)──► [MongoDB Store]
                                                │
                                                └──(Official SDK)──► [Gemini AI Service]
```
The Express server acts as an API gateway. It authenticates client requests, retrieves text context from MongoDB, sends the payload to the Gemini API, saves the response in the database, and returns the output to the client.

---

## Phase 12: Step-by-Step Scenario Execution Flows

### Scenario: A User Logs In, Purchases a Note, Chats with It, and Logs Out

1. **User Login:**
   * User posts credentials to `/login`. The system verifies the password using `bcryptjs`, updates the login timestamp, generates a new session ID, saves the session in MongoDB, and sets the session cookie in the user's browser.
2. **Note Purchase:**
   * User clicks **Purchase** on a premium document.
   * The transaction controller checks the buyer's balance, deducts the price, credits the uploader's wallet, creates a transaction record, and adds the document ID to the user's purchased list.
3. **Conversational Query:**
   * User asks a question about the purchased note.
   * The chat API retrieves the note's text, sends the question and text to the Gemini API, saves the interaction to the chat history, and returns the response to the user.
4. **Log Out:**
   * User logs out. The logout route destroys the session on the server and clears the session cookie in the user's browser.

---

## Phase 13: Recruiter Value & Architecture Decisions Defense

### Key Selling Points for Technical Interviews

#### 1. Optimization of Generative AI Calls
* **Question:** *"How did you handle large files when sending context to the LLM?"*
* **Defense:** *"To avoid API timeout errors and high token usage, I set a text extraction limit of 500,000 characters. In a production environment, I would replace this with a vector search system using embeddings to retrieve only the most relevant document chunks."*

#### 2. Robust Document Parsing Pipeline
* **Question:** *"How did you handle scanned documents that contained no selectable text?"*
* **Defense:** *"I built a parsing fallback mechanism. If the initial text extraction returns less than 50 characters, the system runs OCR on the document images using Tesseract.js to extract the text."*

---

## Phase 14: Recommended Project Enhancements

1. **Vector Embedding Search (RAG Upgrade):** Replace the current text-matching system with vector embeddings stored in a vector database (e.g., Pinecone or pgvector) to improve search accuracy and reduce API token costs.
2. **Serverless Background Workers:** Offload file uploads and heavy OCR parsing tasks to a serverless background worker system (using tools like BullMQ and Redis) to prevent CPU blockage on the main web server.
3. **Advanced Security Headers:** Implement a strict Content Security Policy (CSP) to mitigate cross-site scripting (XSS) risks and prevent unauthorized script executions.

---

## Phase 15: 30 Curated Mock Interview Questions & Answers

### Level 1 (Basic)
1. **Explain the overall purpose of the application.**
   * *Answer:* It is an academic platform where students can upload study notes, search for past exams, purchase resources using a simulated wallet, and interact with their study materials using an AI-powered assistant.
2. **Why was MongoDB chosen instead of SQL?**
   * *Answer:* Its flexible schemas allowed us to store unstructured text and nested data like chat histories in a single document without requiring complex join operations.
3. **What is the purpose of EJS templates?**
   * *Answer:* EJS allows the server to compile dynamic variables into HTML layouts, delivering fast initial page loads to the client.
4. **Explain how the AI fallback mechanism works in `getGeminiModel.js`.**
   * *Answer:* The loader loops through a prioritized list of model versions. If a model fails to initialize, the system catches the error and tries the next version in the list.
5. **How are passwords stored securely in the database?**
   * *Answer:* Before saving user records, a pre-save hook hashes the password using `bcryptjs` with 12 salt rounds.
6. **What is the function of the `requireAuth` middleware?**
   * *Answer:* It checks if an active session exists for the user. If missing, it saves the current URL in the session and redirects the user to the login page.
7. **How does the system extract text from uploaded PDF files?**
   * *Answer:* It reads the uploaded file's binary data and extracts the text using the `pdf-parse` library.
8. **What does the project use for OCR, and when does it run?**
   * *Answer:* It uses `Tesseract.js`. If the text extracted from a PDF is minimal (less than 50 characters), the system flags it as a scanned file and runs OCR.
9. **Explain the role of the `connect-mongo` package.**
   * *Answer:* It stores session data in MongoDB, ensuring that user login sessions persist even if the Node server restarts.
10. **What role-based access levels exist in the database schema?**
    * *Answer:* The user schema supports four access roles: `user`, `admin`, `professor`, and `teacher`.

### Level 2 (Intermediate)
11. **Why does the login route regenerate the session ID?**
    * *Answer:* Session regeneration prevents session fixation attacks. It ensures that any session IDs obtained before login are invalidated.
12. **How does the application manage asynchronous file uploads and parsing?**
    * *Answer:* The upload endpoint saves the file and immediately returns a success status. The parsing task runs in the background, and the frontend client polls the status API to monitor progress.
13. **Explain the compound indexes used on the Document schema.**
    * *Answer:* We index `{ userId: 1, uploadDate: -1 }` to speed up dashboard queries, and have a weighted text index across text fields to support fast searches.
14. **How are transaction payouts calculated when a user buys a document?**
    * *Answer:* The transaction controller splits the payment: 70% of the price is credited to the uploader's wallet, and the platform retains the remainder.
15. **What happens to files on disk if the database save operation fails?**
    * *Answer:* The upload route uses a Try-Catch block. If the database save fails, the server runs a cleanup script using `fs.unlinkSync()` to delete the file from the server.
16. **Why is `select: false` defined on the User password property?**
    * *Answer:* It prevents the hashed password from being returned in queries by default, protecting user credentials from accidental exposure.
17. **How are exam countdown reminders scheduled?**
    * *Answer:* When an exam is created, the system calculates and stores reminder dates (e.g., 7 days, 1 day, and 1 hour before the exam) in the database.
18. **Explain the spaced repetition logic used in `updateFlashcardMastery`.**
    * *Answer:* Based on whether the user answers correctly, the system updates the flashcard's mastery score and calculates the next review date using a spaced interval formula.
19. **What security vulnerability does validating file types with mime-types solve?**
    * *Answer:* It prevents malicious users from uploading harmful files (such as executable scripts) and disguised files to the server.
20. **How does the server handle database connection drops?**
    * *Answer:* The server uses connection listeners. If a disconnection event is detected, it logs a warning and attempts to reconnect using retry logic.

### Level 3 (Advanced)
21. **How would you scale this monolithic application to support 1 million active users?**
    * *Answer:* I would split the monolithic service into microservices, host the application inside Docker containers orchestrated by Kubernetes, place a load balancer in front of the services, and use Redis to cache popular documents.
22. **Explain how you would handle race conditions on wallet updates during peak transaction times.**
    * *Answer:* I would use MongoDB transactional sessions (`runTransaction`) or use Mongoose's `$inc` operator, which runs as an atomic operation at the database level.
23. **How would you optimize the current RAG architecture to support very large books?**
    * *Answer:* Instead of sending whole documents to the LLM, I would implement a chunking strategy. I would split documents into smaller text chunks, convert them to vector embeddings, store them in a vector database, and perform vector searches to send only the most relevant sections to the LLM.
24. **Why is the single-threaded event loop in Node.js vulnerable to OCR operations?**
    * *Answer:* OCR processing requires intensive CPU computations. Running OCR on the main thread blocks the event loop, preventing the server from handling other incoming requests.
25. **How would you secure the session-cookie storage against Cross-Site Scripting (XSS) attacks?**
    * *Answer:* By configuring cookies with `httpOnly: true`, which blocks client-side scripts from reading session cookies.
26. **What is database sharding, and how would you apply it to the Transaction collection?**
    * *Answer:* Sharding splits large database collections across multiple servers. I would shard the Transaction collection using the buyer's ID as the shard key to distribute database load evenly.
27. **How would you implement a zero-downtime deployment pipeline for this project?**
    * *Answer:* I would build a CI/CD pipeline using GitHub Actions, run tests automatically, push container images to a registry, and perform rolling updates in Kubernetes to deploy new versions without service interruptions.
28. **Explain how you would implement a cache invalidation strategy for document views.**
    * *Answer:* I would cache document metadata in Redis. If a document is updated or deleted, the server would send an invalidation command to clear the matching keys from the cache.
29. **What are the security trade-offs of using local disk storage vs. cloud object stores (like AWS S3)?**
    * *Answer:* Local disk storage is simple to set up but lacks high availability and can lead to data loss if the server crashes. AWS S3 provides built-in replication, encryption, and scalability, making it much more reliable for production environments.
30. **How does a Content Delivery Network (CDN) optimize asset delivery?**
    * *Answer:* CDNs cache static files (like CSS, JS, and logos) on edge servers located close to users, reducing network latency and server load.

---

## Phase 16: Active Resume Defense Drill

### 1. The Local Disk Storage Issue
* **Challenge:** *"You wrote that files are saved to the server's local disk. What happens if the server crashes or scales horizontally?"*
* **Defense:** *"Using local disk storage was a design choice for development simplicity. In a production environment, I would configure Multer to upload files directly to a cloud object store like AWS S3 or Google Cloud Storage, ensuring high availability and horizontal scaling."*

### 2. Event Loop Blocking Issue
* **Challenge:** *"You run CPU-intensive OCR tasks inside the same Node.js process that handles user requests. Doesn't this block the event loop?"*
* **Defense:** *"Yes. In our development environment, running OCR on the main thread can block other requests. To solve this in production, I would offload file processing tasks to a serverless worker queue managed by BullMQ and Redis, keeping the main web server responsive."*

---

## Phase 17: System Design & Scaling to 100M Users

### Architecture Blueprint for 100 Million Users
```
                           [ CDN Edge Cache ]
                                   │
                           [ Cloud Load Balancer ]
                                   │
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
    [ Web Service 1 ]      [ Web Service 2 ]      [ Web Service 3 ]
            │                      │                      │
            └───────────┬──────────┴───────────┬──────────┘
                        │                      │
                        ▼                      ▼
                 [ Redis Cache ]       [ Message Queue ]
                        │                      │
                        ▼                      ▼
                 [ MongoDB Shards ]    [ Worker Services ]
```

* **Content Delivery Network (CDN):** Caches static assets and files close to users to reduce latency.
* **Horizontal Scaling:** Places a load balancer in front of multiple stateless web servers to distribute user traffic.
* **Message Queues:** Offloads long-running tasks (like PDF parsing and OCR) to worker services using a queue system.
* **Database Sharding:** Splits the MongoDB database into shards to handle high write volumes.
* **Caching Layer:** Uses Redis to cache frequently accessed data, reducing database query times.

---

## Phase 18: Ultimate Interview Cheat Sheet

### Core Concepts to Memorize
* **RAG Pipeline:** The process of retrieving text from documents, injecting it as context into an LLM prompt, and returning the generated response.
* **Bcrypt Rounds:** We use 12 hashing rounds, which provides a good balance between hashing security and server processing speed.
* **Session Fixation Prevention:** Invalidate and regenerate session IDs during user logins.
* **KaTeX Rendering:** Compile and display LaTeX formulas directly in EJS templates.
* **Full-Text Search Weights:** We prioritize document titles over text content when running database searches.

### Elevator Pitch (30 Seconds)
*"Veni, Vidi, Discere is an educational marketplace where students can upload study materials, search for past exams, purchase premium notes, and study using an AI assistant. The app parses files using PDF parsers and OCR fallback, uses Google Gemini to generate context-aware summaries and flashcards, and provides study analytics to help students prepare for exams."*
