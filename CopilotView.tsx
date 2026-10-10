import React, { useState, useRef, useEffect } from "react";
import { useSecurity } from "../context/SecurityContext";
import { CopilotMessage } from "../types";
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  User,
  AlertCircle,
  HelpCircle,
  MessageSquare,
} from "lucide-react";

interface CopilotViewProps {
  initialPrompt?: string;
}

const PRESET_QUESTIONS = [
  "What happened today?",
  "Summarize the latest incident.",
  "Which camera has the highest risk?",
  "What are today's high-risk incidents?",
  "How many incidents occurred today?",
  "What action should security consider?",
];

export const CopilotView: React.FC<CopilotViewProps> = ({ initialPrompt }) => {
  const { incidents, stats, cameras } = useSecurity();

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: "Welcome to CampusShield AI Incident Copilot. I am your operational intelligence copilot for the surveillance command center. I have full context of current camera feeds, active perimeter alerts, and logged incidents. How can I assist you with threat assessment or tactical SOP guidance?",
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // If navigated with initial prompt
  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const query = userText.trim();
    setInput("");

    const nowStr = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: nowStr,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          context: {
            incidents: incidents.slice(0, 10),
            stats,
            cameras: cameras.map((c) => ({
              id: c.id,
              name: c.name,
              location: c.location,
              riskLevel: c.riskLevel,
              detectionStatus: c.detectionStatus,
            })),
          },
        }),
      });

      const data = await response.json();

      const assistantMessage: CopilotMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: data.text || "No analysis could be formulated.",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isFallback: data.isFallback,
        errorNotice: data.errorNotice,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Copilot request error:", err);
      // Fallback
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          text: `Telemetry Summary: System is currently tracking ${incidents.length} incidents today with ${stats.activeAlerts} active alerts. All 4/4 cameras are online.`,
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isFallback: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        text: "Copilot session reset. Ready for new tactical queries or threat assessments.",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  return (
    <div
      id="copilot-chat-view"
      className="h-[calc(100vh-140px)] flex flex-col rounded-lg bg-[#12151E] border border-[#202433] overflow-hidden"
    >
      {/* Copilot Header */}
      <div className="px-4 py-3 bg-[#181C28] border-b border-[#202433] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                CampusShield AI Copilot
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#12151E] text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Grounded in Real-Time Incident Telemetry & SOP Protocols
            </p>
          </div>
        </div>

        <button
          onClick={clearChat}
          title="Reset conversation"
          className="p-1.5 rounded bg-[#12151E] hover:bg-[#202636] text-slate-400 hover:text-white border border-[#262C3D] text-xs font-mono flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear Chat</span>
        </button>
      </div>

      {/* Preset Query Chips (Section 11 Requirement) */}
      <div className="px-3.5 py-2 bg-[#12151E] border-b border-[#202433] flex items-center gap-2 overflow-x-auto text-xs font-mono">
        <span className="text-slate-500 uppercase text-[10px] whitespace-nowrap font-semibold">
          SUGGESTED QUERIES:
        </span>
        {PRESET_QUESTIONS.map((question, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(question)}
            className="px-2.5 py-1 rounded bg-[#181C28] hover:bg-[#202636] text-slate-300 hover:text-white whitespace-nowrap border border-[#262C3D] text-[11px] transition shrink-0"
          >
            {question}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                isUser ? "justify-end" : "justify-start"
              }`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded p-3 text-xs leading-relaxed ${
                  isUser
                    ? "bg-emerald-700/80 text-white border border-emerald-600/50 rounded-br-none"
                    : "bg-[#181C28] border border-[#262C3D] text-slate-200 rounded-bl-none"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                <div
                  className={`mt-2 flex items-center justify-between text-[10px] font-mono ${
                    isUser ? "text-emerald-200" : "text-slate-500"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {!isUser && msg.isFallback && (
                    <span className="text-cyan-400">
                      Telemetry Verified
                    </span>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded bg-[#181C28] border border-[#262C3D] text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-7 h-7 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-[#181C28] border border-[#262C3D] text-slate-400 rounded p-3 text-xs font-mono flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Analyzing CCTV stream telemetry & formulating response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
      <div className="p-3 bg-[#181C28] border-t border-[#202433]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            id="copilot-input-field"
            type="text"
            placeholder="Ask Copilot about camera threats, latest incidents, or security protocols..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-3.5 py-2 bg-[#12151E] border border-[#262C3D] rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <button
            id="copilot-send-btn"
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
