import os

import ollama


# Lightweight model for fast local inference.
# You can change this later with:
# BUDDY_MODEL=qwen2.5:3b
MODEL = os.getenv("BUDDY_MODEL", "qwen2.5:1.5b")


SYSTEM_PROMPT = """
You are Buddy AI, a fast and practical AI assistant.

Answer the user's request directly.

Rules:
- Be accurate and honest.
- Never invent facts.
- If information is missing, say so.
- When the user provides notes or document content, stay grounded in that content.
- Do not repeat the user's question.
- Avoid unnecessary introductions and conclusions.
- Keep simple questions short.
- Use headings, bullets, numbered steps, tables, or code when useful.
- For programming questions, provide practical runnable code.
- Follow the user's requested format.
"""


def create_messages(user_input: str):
    return [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": user_input,
        },
    ]


def stream_analysis(user_input: str):
    """
    Generate and stream Buddy AI's response immediately.
    """

    response = ollama.chat(
        model=MODEL,
        messages=create_messages(user_input),
        stream=True,
        keep_alive="10m",
        options={
            # Lower temperature = more predictable answers.
            "temperature": 0.2,

            # Keep sampling focused.
            "top_p": 0.9,

            # Smaller context improves memory usage and speed.
            "num_ctx": 4096,

            # Limit output so the small local model doesn't
            # spend too long generating unnecessary text.
            "num_predict": 384,

            # CPU-friendly settings.
            "num_thread": 8,
        },
    )

    for chunk in response:
        message = chunk.get("message", {})
        content = message.get("content", "")

        if content:
            yield content