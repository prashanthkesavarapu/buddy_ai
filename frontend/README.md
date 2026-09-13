# 🤖 Buddy AI

### Turn raw information into structured knowledge.

Buddy AI is a lightweight AI knowledge assistant that helps analyze **raw text and PDF documents** and turn them into clear, useful responses.

It runs with a **local LLM using Ollama**, so the project doesn't depend on paid AI APIs.

---

## ✨ Features

* 🧠 **Local AI processing** using Ollama
* 💬 **Real-time streaming responses**
* 📄 **PDF document analysis**
* ⚡ Fast and lightweight architecture
* 🔒 Local AI — no paid API required
* 🌐 React-based web interface
* 🚀 FastAPI backend

---

## 🖥️ Preview

> Buddy AI provides a simple interface where you can enter information, upload a PDF, and receive an AI-generated response.

<!-- Add your screenshot here -->

<!-- Example:
![Buddy AI Screenshot](frontend/src/assets/buddy-ai-preview.png)
-->

---

## 🧩 How It Works

```text
             ┌─────────────────┐
             │    User Input   │
             │  Text / PDF     │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │  React Frontend │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ FastAPI Backend │
             └────────┬────────┘
                      │
              ┌───────┴────────┐
              ▼                ▼
        ┌──────────┐     ┌────────────┐
        │ PDF Text │     │ Raw Text   │
        │ Extract  │     │ Processing │
        └─────┬────┘     └──────┬─────┘
              └──────────┬───────┘
                         ▼
                 ┌─────────────┐
                 │   Ollama    │
                 │ Local LLM   │
                 └──────┬──────┘
                        │
                        ▼
                 ┌─────────────┐
                 │ Buddy AI    │
                 │ Response    │
                 └─────────────┘
```

---

## 🛠️ Tech Stack

| Technology  | Purpose              |
| ----------- | -------------------- |
| ⚛️ React    | Frontend             |
| ⚡ Vite      | Frontend development |
| 🐍 Python   | Backend              |
| 🚀 FastAPI  | API server           |
| 🦙 Ollama   | Local LLM runtime    |
| 🧠 Qwen 2.5 | Local AI model       |
| 📄 pypdf    | PDF text extraction  |

---

## 🧠 AI Model

Buddy AI currently uses:

```text
qwen2.5:1.5b
```

through Ollama.

The model runs locally on the user's machine, making the application suitable for experimenting with local LLM applications without relying on paid cloud AI APIs.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/prashanthkesavarapu/buddy_ai.git
cd buddy_ai
```

### 2. Install Ollama

Install Ollama for your operating system and make sure it is running.

Then download the model:

```bash
ollama pull qwen2.5:1.5b
```

---

## 🐍 Backend Setup

Open a terminal:

```bash
cd backend
```

Create a virtual environment:

### Windows

```powershell
python -m venv venv
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will run at:

```text
http://127.0.0.1:8000
```

---

## ⚛️ Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

---

## 📄 PDF Analysis

Buddy AI accepts PDF files and extracts their readable text before sending the content to the local AI model.

The current backend limits PDF uploads to:

```text
15 MB
```

and limits extracted input for fast analysis to approximately:

```text
12,000 characters
```

---

## 🔐 Privacy

Buddy AI is designed around local AI processing.

The current setup uses:

```text
Your Computer
      ↓
FastAPI
      ↓
Ollama
      ↓
Local LLM
```

No paid AI API is required for the current implementation.

---

## 📁 Project Structure

```text
buddy_ai/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── routes/
│   │   │   └── analysis.py
│   │   │
│   │   └── services/
│   │       ├── analyzer.py
│   │       └── pdf_reader.py
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── assets/
│   │
│   ├── package.json
│   └── vite.config.js
│
└── .gitignore
```

---

## 🗺️ Roadmap

### ✅ Completed

* [x] React frontend
* [x] FastAPI backend
* [x] Local Ollama integration
* [x] Streaming AI responses
* [x] PDF text extraction
* [x] PDF analysis
* [x] Dark AI-style interface

### 🚧 Coming Next

* [ ] Better document understanding
* [ ] Support for more document formats
* [ ] Improved AI accuracy
* [ ] Conversation history
* [ ] Knowledge organization
* [ ] Better source-based responses
* [ ] Public deployment
* [ ] Production optimization

---

## 🎯 Why I Built This

I built Buddy AI as a practical project to understand how **local LLMs, document processing, frontend development and backend APIs** can work together in a real application.

Instead of simply calling an AI API, the goal was to understand what actually happens behind the application.

---

## 👨‍💻 Author

**Prashanth Kesavarapu**

Software Engineering | AI | Full-Stack Development

🔗 [LinkedIn](https://www.linkedin.com/in/prashanth-kesavarapu-276078384)

---

## ⭐ Support

If you find Buddy AI interesting, consider giving the repository a ⭐ on GitHub.

More improvements coming soon. 🚀

---

<p align="center">
  Built with ❤️, React, FastAPI and local AI.
</p>
