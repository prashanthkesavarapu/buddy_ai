import { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getResponseError = async (response, fallbackMessage) => {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText)?.detail || fallbackMessage;
  } catch {
    return responseText.trim() || fallbackMessage;
  }
};

const readTextStream = async (response, fallbackMessage, onChunk) => {
  if (!response.ok) {
    throw new Error(
      await getResponseError(response, fallbackMessage)
    );
  }

  if (!response.body) {
    throw new Error("Buddy AI did not return a readable response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    const chunk = decoder.decode(value, { stream: true });

    if (chunk) {
      fullResponse += chunk;
      onChunk(chunk);
    }
  }

  const finalChunk = decoder.decode();

  if (finalChunk) {
    fullResponse += finalChunk;
    onChunk(finalChunk);
  }

  return fullResponse;
};

function BuddyLogo({ small = false }) {
  const logoId = useId().replace(/:/g, "");
  const gradientId = `buddyGradient-${logoId}`;
  const glowId = `buddyGlow-${logoId}`;

  return (
    <div className={`buddy-logo ${small ? "small" : ""}`}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#172554" />
            <stop offset="52%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient
            id={glowId}
            x1="25%"
            y1="0%"
            x2="75%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <rect
          x="7"
          y="7"
          width="86"
          height="86"
          rx="25"
          fill={`url(#${gradientId})`}
        />

        <rect
          x="8"
          y="8"
          width="84"
          height="84"
          rx="24"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.18"
        />

        <path
          d="M34 28V72M34 50H54C63 50 69 45.5 69 39C69 32.5 63 28 54 28H34M34 50H56C65 50 71 55.5 71 62C71 68.5 65 72 56 72H34"
          fill="none"
          stroke={`url(#${glowId})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx="71" cy="25" r="6" fill="#67e8f9" />
        <circle cx="71" cy="25" r="2.5" fill="#ffffff" />
        <path
          d="M67.5 29.5L62 35"
          fill="none"
          stroke="#a5f3fc"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function App() {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth > 800
  );

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const requestControllerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: loading ? "auto" : "smooth",
    });
  }, [messages, loading]);

  useEffect(() => () => {
    requestControllerRef.current?.abort();
  }, []);

  const addMessage = (message) => {
    setMessages((current) => [
      ...current,
      { id: createMessageId(), ...message },
    ]);
  };

  const resizeTextarea = () => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      220
    )}px`;
  };

  /*
   * ============================
   * TEXT ANALYSIS
   * ============================
   */

  const analyzeText = async (userText, onChunk, signal) => {
    const response = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: userText,
      }),
      signal,
    });

    return readTextStream(
      response,
      "Failed to analyze the information.",
      onChunk
    );
  };

  /*
   * ============================
   * PDF ANALYSIS
   * ============================
   */

  const analyzePDF = async (file, onChunk, signal) => {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(
      `${API_URL}/analyze-pdf`,
      {
        method: "POST",
        body: formData,
        signal,
      }
    );

    return readTextStream(
      response,
      "Failed to analyze the PDF.",
      onChunk
    );
  };

  /*
   * ============================
   * SEND MESSAGE
   * ============================
   */

  const sendMessage = async () => {
    if (loading) return;

    const cleanText = text.trim();

    if (!cleanText && !selectedFile) {
      setError(
        "Please enter a message or attach a PDF."
      );

      return;
    }

    setError("");
    setLoading(true);
    setStreaming(false);
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    requestControllerRef.current = controller;

    const currentText = cleanText;
    const currentFile = selectedFile;

    /*
     * Clear composer immediately
     */

    setText("");
    setSelectedFile(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    /*
     * Add user message
     */

    if (currentFile) {
      addMessage({
        role: "user",
        type: "file",
        content:
          currentText || "Analyze this PDF",
        fileName: currentFile.name,
      });
    } else {
      addMessage({
        role: "user",
        type: "text",
        content: currentText,
      });
    }

    try {
      const assistantMessageId = createMessageId();
      let bufferedContent = "";
      let animationFrameId = null;
      let assistantMessageStarted = false;

      const flushAssistantMessage = () => {
        if (requestId !== requestIdRef.current) return;

        const nextContent = bufferedContent;
        bufferedContent = "";

        if (!nextContent) return;

        if (!assistantMessageStarted) {
          assistantMessageStarted = true;

          setMessages((current) => [
            ...current,
            {
              id: assistantMessageId,
              role: "assistant",
              type: "text",
              content: nextContent,
            },
          ]);

          return;
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: message.content + nextContent,
                }
              : message
          )
        );
      };

      const queueAssistantChunk = (chunk) => {
        if (requestId !== requestIdRef.current) return;

        bufferedContent += chunk;
        setStreaming(true);

        if (animationFrameId !== null) return;

        animationFrameId = window.requestAnimationFrame(() => {
          animationFrameId = null;
          flushAssistantMessage();
        });
      };

      const analysis = currentFile
        ? await analyzePDF(
            currentFile,
            queueAssistantChunk,
            controller.signal
          )
        : await analyzeText(
            currentText,
            queueAssistantChunk,
            controller.signal
          );

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        flushAssistantMessage();
      }

      if (!analysis.trim()) {
        throw new Error(
          "Buddy AI returned an empty response. Please try again."
        );
      }
    } catch (err) {
      if (
        err.name === "AbortError" ||
        requestId !== requestIdRef.current
      ) return;

      setError(
        err.message ||
          "Could not connect to Buddy AI. Make sure the AI server is running."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        requestControllerRef.current = null;
        setLoading(false);
        setStreaming(false);
      }
    }
  };

  /*
   * ============================
   * KEYBOARD
   * ============================
   */

  const handleKeyDown = (event) => {
    /*
     * Enter = Send
     * Shift + Enter = New line
     */

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  /*
   * ============================
   * TEXT CHANGE
   * ============================
   */

  const handleTextChange = (event) => {
    setText(event.target.value);

    setError("");

    resizeTextarea();
  };

  /*
   * ============================
   * FILE SELECT
   * ============================
   */

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPDF) {
      setError("Please select a PDF file.");

      event.target.value = "";

      return;
    }

    setSelectedFile(file);

    setError("");
  };

  /*
   * ============================
   * REMOVE FILE
   * ============================
   */

  const removeFile = () => {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /*
   * ============================
   * NEW CHAT
   * ============================
   */

  const newChat = () => {
    requestIdRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    setMessages([]);

    setText("");

    setSelectedFile(null);

    setError("");
    setLoading(false);
    setStreaming(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";

      textareaRef.current.focus();
    }
  };

  /*
   * ============================
   * CHAT TITLE
   * ============================
   */

  const getChatTitle = () => {
    const firstUserMessage =
      messages.find(
        (message) =>
          message.role === "user"
      );

    if (!firstUserMessage) {
      return "New chat";
    }

    if (firstUserMessage.fileName) {
      return firstUserMessage.fileName;
    }

    return firstUserMessage.content.length > 28
      ? `${firstUserMessage.content.slice(
          0,
          28
        )}...`
      : firstUserMessage.content;
  };

  /*
   * ============================
   * UI
   * ============================
   */

  return (
    <div className="app-shell">

      {/* ========================
          SIDEBAR
      ======================== */}

      <aside
        className={`sidebar ${
          sidebarOpen ? "open" : "closed"
        }`}
      >

        <div className="sidebar-top">

          <div className="sidebar-brand">

            <BuddyLogo small />

            {sidebarOpen && (
              <div className="sidebar-brand-text">

                <strong>Buddy AI</strong>

                <span>
                  Knowledge companion
                </span>

              </div>
            )}

          </div>

          <button
            className="collapse-button"
            onClick={() =>
              setSidebarOpen(!sidebarOpen)
            }
            title={
              sidebarOpen
                ? "Close sidebar"
                : "Open sidebar"
            }
          >
            {sidebarOpen ? "‹" : "›"}
          </button>

        </div>


        {/* NEW CHAT */}

        <button
          className="new-chat-button"
          onClick={newChat}
        >
          <span className="plus-icon">
            ＋
          </span>

          {sidebarOpen && (
            <span>New chat</span>
          )}
        </button>


        {/* HISTORY */}

        {sidebarOpen && (
          <div className="chat-history">

            <div className="history-title">
              Chats
            </div>

            {messages.length > 0 ? (
              <div className="history-item active">

                <span>💬</span>

                <span className="history-text">
                  {getChatTitle()}
                </span>

              </div>
            ) : (
              <div className="empty-history">
                Your conversations will
                appear here.
              </div>
            )}

          </div>
        )}


        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">

          {sidebarOpen && (
            <>
              <div className="local-ai-card">

                <span className="local-ai-dot"></span>

                <div>

                  <strong>
                    Local AI
                  </strong>

                  <span>
                    Running on your device
                  </span>

                </div>

              </div>

              <div className="sidebar-footer">

                <BuddyLogo small />

                <span>
                  Buddy AI
                </span>

              </div>
            </>
          )}

        </div>

      </aside>


      {/* ========================
          MAIN AREA
      ======================== */}

      <main className="main-area">

        {/* TOP BAR */}

        <header className="topbar">

          <div className="topbar-left">

            {!sidebarOpen && (
              <button
                className="mobile-menu-button"
                onClick={() =>
                  setSidebarOpen(true)
                }
              >
                ☰
              </button>
            )}

            <div className="mobile-brand">

              <BuddyLogo small />

              <strong>
                Buddy AI
              </strong>

            </div>

          </div>


          <div className="topbar-status">

            <span></span>

            Local AI

          </div>

        </header>


        {/* ========================
            CHAT AREA
        ======================== */}

        <div className="chat-area">

          {messages.length === 0 ? (

            /* WELCOME */

            <div className="welcome">

              <div className="welcome-logo">

                <BuddyLogo />

              </div>

              <h1>
                How can I help you?
              </h1>

              <p>
                Paste your information or
                upload a PDF, and Buddy AI
                will turn it into structured
                knowledge.
              </p>


              {/* SUGGESTIONS */}

              <div className="suggestions">

                <button
                  onClick={() =>
                    setText(
                      "Explain the following information and organize it into clear knowledge."
                    )
                  }
                >

                  <span>🧠</span>

                  <div>

                    <strong>
                      Structure information
                    </strong>

                    <small>
                      Turn raw notes into
                      organized knowledge
                    </small>

                  </div>

                </button>


                <button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >

                  <span>📄</span>

                  <div>

                    <strong>
                      Analyze a PDF
                    </strong>

                    <small>
                      Upload a document for
                      analysis
                    </small>

                  </div>

                </button>


                <button
                  onClick={() =>
                    setText(
                      "Summarize the following information into important points."
                    )
                  }
                >

                  <span>✨</span>

                  <div>

                    <strong>
                      Create a summary
                    </strong>

                    <small>
                      Extract the most important
                      information
                    </small>

                  </div>

                </button>

              </div>

            </div>

          ) : (

            /* MESSAGES */

            <div className="messages-container">

              {messages.map(
                (message) => (

                  <div
                    className={`message-row ${message.role}`}
                    key={message.id}
                  >

                    {/* AVATAR */}

                    <div className="message-avatar">

                      {message.role ===
                      "user" ? (

                        <span className="user-avatar">
                          P
                        </span>

                      ) : (

                        <BuddyLogo small />

                      )}

                    </div>


                    {/* MESSAGE */}

                    <div className="message-content">

                      <div className="message-name">

                        {message.role ===
                        "user"
                          ? "You"
                          : "Buddy AI"}

                      </div>


                      {/* FILE */}

                      {message.fileName && (

                        <div className="message-file">

                          <span>
                            📄
                          </span>

                          <div>

                            <strong>
                              {message.fileName}
                            </strong>

                            <small>
                              PDF document
                            </small>

                          </div>

                        </div>

                      )}


                      {/* TEXT */}

                      {message.content && (

                        <div className="message-text">

                          {message.role ===
                          "assistant" ? (

                            <ReactMarkdown>
                              {
                                message.content
                              }
                            </ReactMarkdown>

                          ) : (

                            <p>
                              {
                                message.content
                              }
                            </p>

                          )}

                        </div>

                      )}

                    </div>

                  </div>

                )
              )}


              {/* THINKING */}

              {loading && !streaming && (

                <div className="message-row assistant">

                  <div className="message-avatar">

                    <BuddyLogo small />

                  </div>

                  <div className="message-content">

                    <div className="message-name">
                      Buddy AI
                    </div>

                    <div className="thinking">

                      <span></span>
                      <span></span>
                      <span></span>

                    </div>

                  </div>

                </div>

              )}

              <div ref={messagesEndRef} />

            </div>

          )}

        </div>


        {/* ========================
            ERROR
        ======================== */}

        {error && (

          <div className="error-bar">

            ⚠️ {error}

          </div>

        )}


        {/* ========================
            BOTTOM PROMPT
        ======================== */}

        <div className="composer-area">

          <div className="composer">

            {/* ATTACHED PDF */}

            {selectedFile && (

              <div className="attached-file">

                <div className="attached-file-left">

                  <div className="attached-icon">
                    📕
                  </div>

                  <div>

                    <strong>
                      {selectedFile.name}
                    </strong>

                    <span>
                      {(
                        selectedFile.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                    </span>

                  </div>

                </div>


                <button
                  onClick={removeFile}
                  disabled={loading}
                  title="Remove PDF"
                >
                  ×
                </button>

              </div>

            )}


            {/* INPUT */}

            <div className="composer-input-row">

              <button
                className="attach-button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={loading}
                title="Attach PDF"
              >
                ＋
              </button>


              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                hidden
              />


              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedFile
                    ? "Add a message about this PDF..."
                    : "Message Buddy AI..."
                }
                rows="1"
                disabled={loading}
              />


              <button
                className={`send-button ${
                  text.trim() ||
                  selectedFile
                    ? "active"
                    : ""
                }`}
                onClick={sendMessage}
                disabled={
                  loading ||
                  (!text.trim() &&
                    !selectedFile)
                }
                title="Send"
              >

                {loading ? (

                  <span className="send-spinner"></span>

                ) : (

                  "↑"

                )}

              </button>

            </div>

          </div>


          <div className="composer-note">

            Buddy AI uses a local AI model.
            AI-generated information may
            contain mistakes.

          </div>


          <footer className="app-footer">
            <span>by prashanth_kesavarapu</span>

            <span className="footer-separator">
              •
            </span>

            <a
              href="https://www.linkedin.com/in/prashanth-kesavarapu-276078384"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </footer>
        </div>

      </main>

    </div>
  );
}

export default App;
