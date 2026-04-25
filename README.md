# Document Assistant App

A powerful full-stack application designed to transform how you interact with documents. This intelligent assistant uses advanced OCR (Optical Character Recognition) and Google's Gemini AI to help you manage, study, and extract insights from your PDFs, Word documents, and images.

## 🚀 Key Features

### 📄 Document Management
- **Universal Uploads**: Support for PDF (`pdf-parse`), Word (`mammoth`), and Image files.
- **Smart Text Extraction**: Automatic OCR using Tesseract.js for images and parsing libraries for docs.
- **Organization**: Categorize documents by subject, course, or institution.

### 🏪 Digital Marketplace
- **Document Store**: Buy and sell premium academic resources, notes, and exam papers.
- **Micro-Transactions**: Integrated demo payment system for unlocking content.
- **Creator Economy**: Upload your own quality notes and earn recognition (and virtual currency).
- **Verified Contributors**: Special badging for trustworthy uploaders and institutions.

### 🤖 AI-Powered Assistant (Gemini Integration)
- **Context-Aware Chat**: Ask questions directly related to your document's content.
- **Multi-Document Comparison**: Compare distinct documents (e.g., "Compare 2022 vs 2023 exam papers") to find trends and similarities.
- **Formula & Diagram handling**: Extracts mathematical formulas (rendered via KaTeX) and explains diagrams.
- **Pattern Recognition**: Identifies common themes and frequent topics across your library.

### 📚 Smart Study Tools
- **Automated Flashcards**: Generate AI-powered flashcards from your documents for efficient revision.
- **Summaries**: Get concise bullet-point summaries, including key formulas and concepts.
- **Exam Planner**: Schedule exams with automatic countdowns and reminders.
- **Related Content**: Discover connections between different documents in your repository.

### 📊 Analytics & Insights
- **Study Dashboard**: specific analytics to track your study habits and time spent.
- **Weak Topic Identification**: AI analyzes your performance to highlight areas needing improvement.
- **Question Trends**: Visualize frequently asked questions to identify knowledge gaps.

### 🏫 Institutional Support
- **Course Management**: Link documents to specific university courses and semesters.
- **Verified Content**: Special badges for professor-verified solutions and documents.
- **Syllabus Mapping**: Track your coverage against official course syllabi.

---

## 🛠️ Tech Stack

- **Runtime Environment**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose ORM)
- **Frontend**: EJS (Embedded JavaScript templates), Vanilla CSS/JS
- **AI & ML**: 
  - Google Gemini (`@google/generative-ai`)
  - Tesseract.js (OCR)
- **Authentication**: `express-session` with `connect-mongo` storage
- **Math Rendering**: KaTeX

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v14+ recommended)
- MongoDB (installed locally or a cloud URI)

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd document-assistant-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory. You can use `env_template.txt` as a reference.
   
   **Required Variables:**
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/document-assistant
   SESSION_SECRET=your_super_secret_key_here
   GEMINI_API_KEY=your_google_gemini_api_key
   GEMINI_MODEL_NAME=gemini-1.5-flash
   ```

4. **Run the Application**

   *Development Mode (with auto-reload):*
   ```bash
   npm run dev
   ```

   *Production Start:*
   ```bash
   npm start
   ```

5. **Access the App**
   Open your browser and navigate to `http://localhost:3000`.

---

## 📂 Project Structure

```
├── middleware/      # Custom authentication and error handling middleware
├── models/          # Mongoose database schemas (User, Document, Flashcard, etc.)
├── public/          # Static assets (CSS, client-side JS, images)
├── routes/          # Express route definitions
│   ├── api.js       # AI chat and data endpoints
│   ├── auth.js      # User authentication routes
│   └── ...          # Dashboard, Study, and Analytics routes
├── utils/           # Helper scripts (Text extraction, Chatbot logic)
├── views/           # Server-side EJS templates for the UI
├── uploads/         # Directory for storing uploaded document files
├── admin.js         # Admin panel logic
├── server.js        # Main application entry point
└── package.json     # Project dependencies and scripts
```

## 📝 Usage Guide

1. **Sign Up/Login**: Create an account to start your personal workspace.
2. **Upload**: Navigate to the dashboard to upload your lecture notes, textbooks, or past papers.
3. **Parse**: The system automatically extracts text. Check the parsing status if needed.
4. **Chat**: Click on a document to open the AI chat interactively.
5. **Study**: Go to the "Study" section to generate flashcards or view summaries.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.
