"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Send, Sparkles } from "lucide-react";

type ChatEntry = {
  role: "user" | "assistant";
  content: string;
  mode?: "openai" | "offline";
};

const GREETING: ChatEntry = {
  role: "assistant",
  content:
    "Tashi delek! I am the BI Tree guide. Ask me about temples, valleys, restaurants, heritage sites or Bhutanese folktales — for example: “Where should I eat in Thimphu?” or “Tell me the tale of the takin.”",
};

const QUICK_PROMPTS = [
  "Where should I eat in Thimphu?",
  "Which temples are worth visiting in Paro?",
  "Tell me a Bhutanese folktale",
  "What is good to see in Punakha?",
];

export function GuideChat() {
  const [messages, setMessages] = useState<ChatEntry[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  async function send(raw: string) {
    const message = raw.trim();
    if (!message || pending) return;
    const next = [...messages, { role: "user" as const, content: message }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: next.slice(-8).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        reply?: string;
        mode?: "openai" | "offline";
        error?: string;
      } | null;
      if (!response.ok || !data?.reply) {
        setError(data?.error || "The guide could not answer right now. Please try again.");
      } else {
        setMessages((current) => [
          ...current,
          { role: "assistant", content: data.reply as string, mode: data.mode },
        ]);
      }
    } catch {
      setError("The guide could not be reached. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="guide-card explore-guide" aria-label="Ask the BI Tree guide">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="guide-badge explore-guide-badge">
            <Sparkles size={20} strokeWidth={1.6} />
          </span>
          <div>
            <h2 className="text-xl leading-tight">Ask the BI Tree guide</h2>
            <p className="mt-1 text-xs text-foreground/60">
              Agentic AI over real, sourced Bhutan places and stories
            </p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-foreground/65">
          Stateless · no account needed
        </span>
      </div>
      <div
        ref={listRef}
        aria-live="polite"
        className="mt-4 flex max-h-72 min-h-36 flex-col gap-3 overflow-y-auto rounded-2xl bg-muted/60 p-4 explore-guide-list"
      >
        {messages.map((entry, index) => (
          <div
            key={index}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              entry.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-card text-foreground"
            }`}
          >
            <p>{entry.content}</p>
            {entry.mode === "offline" && (
              <p className="mt-1 text-[10px] font-medium opacity-60">
                Offline guide · curated picks
              </p>
            )}
          </div>
        ))}
        {pending && (
          <p className="self-start text-xs text-foreground/55">
            The guide is checking the Bhutan guidebook…
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <input
          className="visitor-input explore-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about places, food or stories…"
          aria-label="Your question for the BI Tree guide"
          maxLength={1000}
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label="Send question"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground disabled:opacity-50 explore-send"
        >
          {pending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void send(prompt)}
            disabled={pending}
            className="rounded-full bg-muted/60 px-3 py-1.5 text-[11px] text-foreground/70 transition hover:bg-muted disabled:opacity-50 explore-prompt"
          >
            {prompt}
          </button>
        ))}
      </div>
    </section>
  );
}
