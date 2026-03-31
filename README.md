# NextHire AI 🚀

> **Production-grade AI Hiring Platform** — Resume Screening · Coding IDE · AI Interviews · Candidate Ranking · Recruiter Dashboard

Built with **100% free-tier** services: Groq LLM, Pinecone, MongoDB Atlas, Judge0, Render & Vercel.

---

## ✨ Features

| Module | Description |
|---|---|
| 🧠 **Resume AI** | Upload PDF/DOC → Groq LLM screens & scores → Pinecone vector matching |
| 💻 **Coding IDE** | Monaco Editor + Judge0 execution in 13+ languages + AI code review |
| 🎙️ **AI Interview** | "Alex" AI interviewer generates adaptive questions, evaluates answers |
| 🏆 **Ranking Engine** | Composite score: Resume 40% + Code 30% + Interview 30% |
| 📊 **Dashboard** | Live pipeline analytics, recent activity, quick actions |

---

## 🏗️ Tech Stack

**Frontend:** React 18 · Vite · Tailwind CSS · Framer Motion · Monaco Editor · Zustand · React Router v6

**Backend:** Node.js · Express · MongoDB Atlas · Mongoose · Socket.IO · JWT · Multer

**AI/ML:** Groq (Llama3-8b) · LangChain · Pinecone Vector DB · pdf-parse

**Code Execution:** Judge0 CE via RapidAPI

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/nexthire-ai
cd nexthire-ai
npm run install:all
```

### 2. Configure Environment

```bash
cp server/.env.example server/.env
# Edit server/.env with your API keys (see below)
```

**Required API Keys (all free):**

| Service | Sign Up | Key |
|---|---|---|
| MongoDB Atlas | [cloud.mongodb.com](https://cloud.mongodb.com) | `MONGODB_URI` |
| Groq LLM | [console.groq.com](https://console.groq.com) | `GROQ_API_KEY` |
| Pinecone | [app.pinecone.io](https://app.pinecone.io) | `PINECONE_API_KEY` |
| Judge0 (RapidAPI) | [rapidapi.com/judge0-official](https://rapidapi.com/judge0-official/api/judge0-ce) | `JUDGE0_API_KEY` |

### 3. Seed the Database

```bash
cd server
node seed.js   # Adds 4 coding problems
```

### 4. Run Dev Servers

```bash
# From project root – runs both client and server concurrently
npm run dev

# Or run separately:
# Terminal 1 (backend):  cd server && npm run dev  → http://localhost:5000
# Terminal 2 (frontend): cd client && npm run dev  → http://localhost:5173
```

---

## 📁 Project Structure

```
nexthire-ai/
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── dashboard/       # Dashboard with analytics
│   │   │   ├── jobs/            # Job CRUD with modal
│   │   │   ├── candidates/      # Pipeline table with scores
│   │   │   ├── resume/          # AI resume screener
│   │   │   ├── coding/          # Monaco IDE + Judge0
│   │   │   ├── interview/       # AI chat interview
│   │   │   └── ranking/         # Podium + sortable table
│   │   ├── components/          # Sidebar, Navbar
│   │   ├── layouts/             # MainLayout, AuthLayout
│   │   ├── services/api.js      # Axios + JWT interceptor
│   │   └── store/authStore.js   # Zustand auth store
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── server/                      # Node + Express backend
    ├── config/
    │   ├── db.js                # MongoDB connection
    │   └── multer.js            # File upload config
    ├── models/
    │   ├── User.js
    │   ├── Job.js
    │   ├── Candidate.js
    │   ├── Problem.js
    │   └── InterviewSession.js
    ├── controllers/             # auth, job, candidate, resume, code, interview
    ├── routes/                  # REST API routes
    ├── services/
    │   ├── ai.service.js        # Groq LLM (screen, interview, code eval)
    │   ├── vector.service.js    # Pinecone upsert/match/delete
    │   ├── parser.service.js    # PDF text extraction
    │   ├── judge0.service.js    # Code execution + polling
    │   └── interview.service.js # AI interviewer logic
    ├── middlewares/
    │   └── auth.middleware.js   # JWT protect + authorize
    ├── seed.js                  # DB seeder (4 coding problems)
    ├── render.yaml              # Render.com deployment config
    └── index.js                 # Express + Socket.IO server
```

---

## 🌐 Deployment (Free Tier)

### Backend → Render.com

1. Push the `server/` folder to a GitHub repo
2. New Web Service in Render → connect repo
3. Build: `npm install` · Start: `node index.js`
4. Add environment variables from `.env.example`

### Frontend → Vercel

```bash
cd client
npm run build
# Deploy dist/ to Vercel — or use Vercel CLI:
npx vercel --prod
```

Set `VITE_API_URL` = your Render backend URL in Vercel environment settings.

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register recruiter |
| POST | `/api/auth/login` | Login |
| GET/POST | `/api/jobs` | List / create jobs |
| GET/POST | `/api/candidates` | List / create candidates |
| PATCH | `/api/candidates/:id/status` | Move pipeline stage |
| POST | `/api/resume/screen` | AI resume screening (multipart) |
| POST | `/api/resume/match` | Vector match resumes to job |
| POST | `/api/code/run` | Execute code (Judge0) |
| POST | `/api/code/submit` | Submit against test cases |
| POST | `/api/interview/sessions` | Start AI interview |
| POST | `/api/interview/sessions/:id/message` | Send candidate reply |

---

## 🤝 License

MIT — Free to use, fork, and build upon.
