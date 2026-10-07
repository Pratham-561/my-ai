"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
};

const STORAGE_KEY = "my-ai-chats";


export default function Home() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  useEffect(() => {
  bottomRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "end",
  });
}, [chats]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("en-IN");
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  function startListening() {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognitionRef.current = recognition;

  recognition.lang = voiceLanguage;
  recognition.continuous = true;
recognition.interimResults = true;
recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    setListening(true);
  };

  recognition.onresult = (event: any) => {
  let finalTranscript = "";

  for (let i = event.resultIndex; i < event.results.length; i++) {
    if (event.results[i].isFinal) {
      finalTranscript += event.results[i][0].transcript;
    }
  }

  if (finalTranscript.trim()) {
    setMessage((previous) =>
      previous
        ? `${previous} ${finalTranscript.trim()}`
        : finalTranscript.trim()
    );
  }
};
  recognition.onend = () => {
    setListening(false);
  };

  recognition.onerror = () => {
    setListening(false);
  };
  

    recognition.start();
}

const stopListening = () => {
  if (recognitionRef.current) {
    recognitionRef.current.stop();
    recognitionRef.current = null;
  }

  setListening(false);
};

  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("my-ai-theme") || "dark";
});
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
const [appLanguage, setAppLanguage] = useState(() => {
  if (typeof window === "undefined") return "English";
  return localStorage.getItem("my-ai-language") || "English";
});
const t = (english: string, hindi: string) =>
  appLanguage === "Hindi" ? hindi : english;
  useEffect(() => {
  localStorage.setItem("my-ai-theme", theme);

  const applyTheme = () => {
    const isLight =
      theme === "light" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: light)").matches);

    if (isLight) {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  applyTheme();

  if (theme === "system") {
    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: light)"
    );

    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }
}, [theme]);
useEffect(() => {
  localStorage.setItem("my-ai-language", appLanguage);
}, [appLanguage]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed: Chat[] = JSON.parse(saved);

      setChats(parsed);

      if (parsed.length > 0) {
        setActiveChatId(parsed[0].id);
      }
    }
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [chats]);

  const activeChat = chats.find((chat) => chat.id === activeChatId);

  function createNewChat() {
    setActiveChatId(null);
    setMessage("");
  }

  function deleteChat(id: string) {
    const remaining = chats.filter((chat) => chat.id !== id);

    setChats(remaining);

    if (activeChatId === id) {
      setActiveChatId(remaining[0]?.id || null);
    }
  }

  function startRename(chat: Chat) {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  }

  function saveRename(id: string) {
    const newTitle = editingTitle.trim();

    if (!newTitle) {
      setEditingChatId(null);
      return;
    }

    setChats((previous) =>
      previous.map((chat) =>
        chat.id === id
          ? {
              ...chat,
              title: newTitle,
            }
          : chat
      )
    );

    setEditingChatId(null);
  }
async function copyMessage(content: string) {
  try {
    await navigator.clipboard.writeText(content);
    setCopiedMessage(content);

    setTimeout(() => {
      setCopiedMessage(null);
    }, 1500);
  } catch (error) {
    console.error("COPY ERROR:", error);
  }
}
async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
  } catch (error) {
    console.error("CODE COPY ERROR:", error);
  }
}
function stopGeneration() {
  abortControllerRef.current?.abort();
  abortControllerRef.current = null;
  setLoading(false);
}
function regenerateResponse(chatId: string, messageIndex: number) {
  const chat = chats.find((item) => item.id === chatId);

  if (!chat) return;

  const userMessage = chat.messages[messageIndex - 1];

  if (!userMessage || userMessage.role !== "user") return;

  setActiveChatId(chatId);
  sendMessage(userMessage.content);
}


async function sendMessage(messageToSend?: string) {
  if (!(messageToSend ?? message).trim() || loading) return;

  const userMessage = (messageToSend ?? message).trim();

  let chatId = activeChatId;

  if (!chatId) {
    chatId = crypto.randomUUID();

    const newChat: Chat = {
      id: chatId,
      title:
        userMessage.length > 35
          ? userMessage.substring(0, 35) + "..."
          : userMessage,
      messages: [],
    };

    setChats((previous) => [newChat, ...previous]);
    setActiveChatId(chatId);
  }

  setChats((previous) =>
    previous.map((chat) =>
      chat.id === chatId
        ? {
            ...chat,
            messages: [
              ...chat.messages,
              {
                role: "user",
                content: userMessage,
              },
              {
                role: "assistant",
                content: "",
              },
            ],
          }
        : chat
    )
  );

  setMessage("");
  setLoading(true);

  try {
    abortControllerRef.current = new AbortController();

    const response = await fetch("/api/chat", {
  method: "POST",
  signal: abortControllerRef.current.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  messages: [
    ...(activeChat?.messages || []),
    {
      role: "user",
      content: userMessage,
    },
  ],
}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Something went wrong");
    }

    if (!response.body) {
      throw new Error("No response stream received.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);

          const chunk = data.message?.content || "";

          if (!chunk) continue;

          setChats((previous) =>
            previous.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: chat.messages.map((msg, index) =>
                      index === chat.messages.length - 1 &&
                      msg.role === "assistant"
                        ? {
                            ...msg,
                            content: msg.content + chunk,
                          }
                        : msg
                    ),
                  }
                : chat
            )
          );
        } catch (parseError) {
          console.error("STREAM PARSE ERROR:", parseError);
        }
      }
    }
  } catch (error) {
  if (error instanceof DOMException && error.name === "AbortError") {
    setLoading(false);
    return;
  }

  console.error(error);
    console.error(error);

    setChats((previous) =>
      previous.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map((msg, index) =>
                index === chat.messages.length - 1 &&
                msg.role === "assistant"
                  ? {
                      ...msg,
                      content: `Error: ${String(error)}`,
                    }
                  : msg
              ),
            }
          : chat
      )
    );
  } finally {
    setLoading(false);
  }
}
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex h-screen overflow-hidden bg-[#0b0f17] text-white">
      {/* SIDEBAR */}
      <aside
        className={`${
          sidebarOpen ? "w-[270px]" : "w-0"
        } flex-shrink-0 overflow-hidden bg-[#0f1420] transition-all duration-200`}
      >
        <div className="flex h-full w-[270px] flex-col p-3">
          {/* NEW CHAT */}
          <button
            onClick={createNewChat}
            className="group mb-3 flex items-center gap-3 rounded-xl bg-blue-600 px-3 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:bg-blue-500 hover:shadow-blue-500/30"
          ><span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-lg leading-none transition-all duration-200 group-hover:bg-white/25 group-hover:scale-110">
            
              +
            </span>
            <span className="font-medium">{t("New chat", "नई चैट")}</span>
          </button>

          {/* SEARCH */}
          <div className="mb-4">
            <div className="flex items-center gap-2 rounded-xl border border-transparent bg-[#212121] px-3 py-2.5 transition-all duration-200 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20">
              <span className="text-lg text-gray-400">⌕</span>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search chats", "चैट खोजें")}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              />

              <span className="text-xs text-gray-600">Ctrl K</span>
            </div>
          </div>

          {/* CHAT HISTORY */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-gray-500">
                {search
  ? t("No chats found", "कोई चैट नहीं मिली")
  : t("Your chats will appear here", "आपकी चैट यहाँ दिखाई देंगी")}
              </div>
            ) : (
              <>
                {t("Chats", "चैट्स")}

                <div className="space-y-1">
                  {filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group flex items-center rounded-lg ${
                        activeChatId === chat.id
                          ? "bg-[#2a2a2a]"
                          : "hover:bg-[#242424]"
                      }`}
                    >
                      {editingChatId === chat.id ? (
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) =>
                            setEditingTitle(e.target.value)
                          }
                          onBlur={() => saveRename(chat.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              saveRename(chat.id);
                            }
                          }}
                          className="m-1 w-full rounded bg-[#333] px-2 py-2 text-sm outline-none"
                        />
                      ) : (
                        <>
                          <button
                            onClick={() => setActiveChatId(chat.id)}
                            className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm text-gray-300"
                          >
                            {chat.title}
                          </button>

                          <button
                            onClick={() => startRename(chat)}
                            className="hidden px-2 text-xs text-gray-500 hover:text-white group-hover:block"
                            title="Rename"
                          >
                            ✎
                          </button>

                          <button
                            onClick={() => deleteChat(chat.id)}
                            className="hidden px-2 text-xs text-gray-500 hover:text-red-400 group-hover:block"
                            title={t("Delete", "हटाएँ")}
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* PROFILE */}
          <div className="border-t border-[#2f2f2f] pt-3">
            <button
  onClick={() => setProfileOpen(!profileOpen)}
  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#2a2a2a]"
>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-sm font-semibold">
                P
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium">Pratham</p>
                <p className="text-xs text-gray-500">My AI</p>
              </div>

              <span className="text-gray-500">•••</span>
            </button>
                    </div>

          {profileOpen && (
            <div className="mb-2 rounded-xl border border-[#2f2f2f] bg-[#181818] p-2">
              <button
                onClick={() => setProfileOpen(false)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2a2a2a]"
              >
                {t("👤 Profile", "👤 प्रोफ़ाइल")}
              </button>

              <button
              onClick={() => {
  setProfileOpen(false);
  setSettingsOpen(true);
}}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2a2a2a]"
              >
                {t("⚙️ Settings", "⚙️ सेटिंग्स")}
              </button>

              <button
                onClick={() =>
  alert(
    t(
      "Login section coming next",
      "लॉगिन सेक्शन जल्द उपलब्ध होगा"
    )
  )
}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#2a2a2a]"
              >
                {t("🔐 Login", "🔐 लॉगिन")}
              </button>
            </div>
          )}

        </div>
      </aside>

      {/* MAIN */}
      <section className="relative flex min-w-0 flex-1 flex-col">
        {profileOpen && (
  <div className="absolute inset-0 z-50 bg-[#0b0f17]">
    <div className="flex h-14 items-center border-b border-[#2f2f2f] px-4">
      <button
        onClick={() => setProfileOpen(false)}
        className="mr-3 rounded-lg px-3 py-2 text-gray-300 hover:bg-[#2a2a2a]"
      >
        ←
      </button>

      <h2 className="text-lg font-semibold">
  {t("Profile", "प्रोफ़ाइल")}
</h2>
    </div>

    <div className="mx-auto max-w-xl px-6 py-10">
      <div className="flex flex-col items-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-600 text-3xl font-semibold">
          P
        </div>

        <h1 className="mt-4 text-2xl font-semibold">Pratham</h1>
        <p className="mt-1 text-sm text-gray-400">
  {t("My AI", "मेरा AI")}
</p>
      </div>

      <div className="mt-10 space-y-3">
        <div className="rounded-xl border border-[#2f2f2f] bg-[#151b27] p-4">
          <p className="text-xs text-gray-500">
  {t("Name", "नाम")}
</p>
          <p className="mt-1 text-sm">Pratham</p>
        </div>

        <div className="rounded-xl border border-[#2f2f2f] bg-[#151b27] p-4">
          <p className="text-xs text-gray-500">
  {t("AI", "AI")}
</p>
          <p className="mt-1 text-sm">Pratham AI</p>
        </div>
      </div>
    </div>
  </div>
)}

{settingsOpen && (
  <div className="absolute inset-0 z-50 bg-[#0b0f17]">
    <div className="flex h-14 items-center border-b border-[#2f2f2f] px-4">
      <button
        onClick={() => setSettingsOpen(false)}
        className="mr-3 rounded-lg px-3 py-2 text-gray-300 hover:bg-[#2a2a2a]"
      >
        ←
      </button>

      <h2 className="text-lg font-semibold">
  {t("Settings", "सेटिंग्स")}
</h2>
    </div>

    <div className="mx-auto max-w-2xl px-6 py-8">
      <h3 className="mb-3 text-sm font-semibold text-gray-400">
  {t("General", "सामान्य")}
</h3>

      <div className="overflow-hidden rounded-xl border border-[#2f2f2f] bg-[#151b27]">

        <button
  onClick={() => setAppearanceOpen(true)}
  className="flex w-full items-center justify-between border-b border-[#2f2f2f] px-4 py-4 text-left hover:bg-[#202736]"
>
          <div>
            <p className="text-sm font-medium">
  {t("Appearance", "दिखावट")}
</p>
            <p className="mt-1 text-xs text-gray-500">
              {t("Customize how My AI looks", "My AI का रूप बदलें")}
            </p>
          </div>
          <span className="text-gray-500">›</span>
        </button>

        <button onClick={() => setLanguageOpen(true)} className="flex w-full items-center justify-between border-b border-[#2f2f2f] px-4 py-4 text-left hover:bg-[#202736]" > <div> 
          <p className="text-sm font-medium">
  {t("Language", "भाषा")}
</p>
          <p className="mt-1 text-xs text-gray-500"> 
            {t("Choose your preferred language", "अपनी पसंदीदा भाषा चुनें")}
            </p> </div> 
        <span className="text-gray-500">{appLanguage} ›</span> </button>

        <button className="flex w-full items-center justify-between border-b border-[#2f2f2f] px-4 py-4 text-left hover:bg-[#202736]">
          <div>
            <p className="text-sm font-medium">
  {t("Voice", "आवाज़")}
</p>
            <p className="mt-1 text-xs text-gray-500">
              {t("Voice input and language", "आवाज़ इनपुट और भाषा")}
            </p>
          </div>
          <span className="text-gray-500">›</span>
        </button>

        <button className="flex w-full items-center justify-between border-b border-[#2f2f2f] px-4 py-4 text-left hover:bg-[#202736]">
          <div>
            <p className="text-sm font-medium">
  {t("Notifications", "सूचनाएँ")}
</p>
            <p className="mt-1 text-xs text-gray-500">
              {t("Manage notifications", "सूचनाएँ प्रबंधित करें")}
            </p>
          </div>
          <span className="text-gray-500">›</span>
        </button>

        <button className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-[#202736]">
          <div>
            <p className="text-sm font-medium">
  {t("Privacy & Data", "गोपनीयता और डेटा")}
</p>
            <p className="mt-1 text-xs text-gray-500">
              {t("Manage your data and chat history", "अपने डेटा और चैट इतिहास को प्रबंधित करें")}
            </p>
          </div>
          <span className="text-gray-500">›</span>
        </button>

      </div>

      <h3 className="mb-3 mt-8 text-sm font-semibold text-gray-400">
  {t("Account", "खाता")}
</h3>

      <div className="overflow-hidden rounded-xl border border-[#2f2f2f] bg-[#151b27]">
        <button className="flex w-full items-center justify-between border-b border-[#2f2f2f] px-4 py-4 text-left hover:bg-[#202736]">
          <div>
            <p className="text-sm font-medium">
  {t("Account", "खाता")}
</p>
            <p className="mt-1 text-xs text-gray-500">
              {t("Manage your My AI account", "अपने My AI खाते को प्रबंधित करें")}
            </p>
          </div>
          <span className="text-gray-500">›</span>
        </button>

        <button className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-[#202736]">
          <div>
            <p className="text-sm font-medium">
  {t("About My AI", "My AI के बारे में")}
</p>
            <p className="mt-1 text-xs text-gray-500">
              {t("Version and information", "संस्करण और जानकारी")}
            </p>
          </div>
          <span className="text-gray-500">›</span>
        </button>
      </div>
    </div>
  </div>
)}
{appearanceOpen && (
  <div className="absolute inset-0 z-[60] bg-[#0b0f17]">
    <div className="flex h-14 items-center border-b border-[#2f2f2f] px-4">
      <button
        onClick={() => setAppearanceOpen(false)}
        className="mr-3 rounded-lg px-3 py-2 text-gray-300 hover:bg-[#2a2a2a]"
      >
        ←
      </button>

      <h2 className="text-lg font-semibold">
  {t("Appearance", "दिखावट")}
</h2>
    </div>

    <div className="mx-auto max-w-2xl px-6 py-8">
      <h3 className="mb-3 text-sm font-semibold text-gray-400">
  {t("Theme", "थीम")}
</h3>
      <div className="overflow-hidden rounded-xl border border-[#2f2f2f] bg-[#151b27]">

        <button
          onClick={() => setTheme("dark")}
          className="flex w-full items-center justify-between border-b border-[#2f2f2f] px-4 py-4 text-left hover:bg-[#202736]"
        >
          <div>
            <p className="text-sm font-medium">
  {t("Dark", "डार्क")}
</p>
            <p className="mt-1 text-xs text-gray-500">
              {t("Use the dark appearance", "डार्क थीम का उपयोग करें")}
            </p>
          </div>

          <span className="text-lg">
            {theme === "dark" ? "✓" : ""}
          </span>
        </button>

     <button
  onClick={() => setTheme("light")}
  className="flex w-full items-center justify-between border-b border-[#2f2f2f] px-4 py-4 text-left hover:bg-[#202736]"
>
  <div>
    <p className="text-sm font-medium">
      {t("Light", "लाइट")}
    </p>

    <p className="mt-1 text-xs text-gray-500">
      {t("Use the light appearance", "लाइट थीम का उपयोग करें")}
    </p>
  </div>

  <span className="text-lg">
    {theme === "light" ? "✓" : ""}
  </span>
</button>

       <button
  onClick={() => setTheme("system")}
  className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-[#202736]"
>
  <div>
    <p className="text-sm font-medium">
      {t("System", "सिस्टम")}
    </p>

    <p className="mt-1 text-xs text-gray-500">
      {t("Follow your device appearance", "अपने डिवाइस की थीम का पालन करें")}
    </p>
  </div>

  <span className="text-lg">
    {theme === "system" ? "✓" : ""}
  </span>
</button>

      </div>
    </div>
  </div>
)}
{languageOpen && (
  <div className="absolute inset-0 z-[60] bg-[#0b0f17]">
    <div className="flex h-14 items-center border-b border-[#2f2f2f] px-4">
      <button
        onClick={() => setLanguageOpen(false)}
        className="mr-3 rounded-lg px-3 py-2 text-gray-300 hover:bg-[#2a2a2a]"
      >
        ←
      </button>

      <h2 className="text-lg font-semibold">
  {t("Language", "भाषा")}
</h2>
    </div>

    <div className="mx-auto max-w-2xl px-6 py-8">
      <h3 className="mb-3 text-sm font-semibold text-gray-400">
  {t("App Language", "ऐप भाषा")}
</h3>

      <div className="overflow-hidden rounded-xl border border-[#2f2f2f] bg-[#151b27]">
        <button
          onClick={() => setAppLanguage("English")}
          className="flex w-full items-center justify-between border-b border-[#2f2f2f] px-4 py-4 text-left hover:bg-[#202736]"
        >
          <span>{t("English", "अंग्रेज़ी")}</span>
          <span>{appLanguage === "English" ? "✓" : ""}</span>
        </button>

        <button
          onClick={() => setAppLanguage("Hindi")}
                    className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-[#202736]"
        >
          <span>{t("Hindi", "हिंदी")}</span>
          <span>{appLanguage === "Hindi" ? "✓" : ""}</span>
        </button>
      </div>
    </div>
  </div>
)}
        {/* TOP BAR */}
        <header className="flex h-14 items-center border-b border-[#2f2f2f] px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-3 rounded-lg px-2 py-1 text-xl text-gray-300 hover:bg-[#2a2a2a]"
          >
            ☰
          </button>

          <button
            onClick={createNewChat}
            className="font-medium text-gray-100"
          >
            My AI
          </button>

          <span className="ml-2 text-gray-500">⌄</span>
        </header>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center px-4 pb-24">
              <div className="text-center">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#111827] shadow-[0_0_14px_rgba(59,130,246,0.45)]">
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-blue-400"
  >
    <circle
      cx="12"
      cy="12"
      r="8.5"
      stroke="currentColor"
      strokeWidth="1.8"
    />

    <path
      d="M9 16V8H13.2C15 8 16 9 16 10.5C16 12 15 13 13.2 13H9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <path
      d="M13 13L16 16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />

    <circle
      cx="12"
      cy="12"
      r="2"
      fill="currentColor"
      className="opacity-80"
    />
  </svg>
</div>

                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {t("How can I help you?", "मैं आपकी कैसे मदद कर सकता हूँ?")}
                </h1>

                <p className="mt-3 text-sm text-gray-400">
                  {t("Your personal AI assistant", "आपका व्यक्तिगत AI सहायक")}
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-40">
              <div className="space-y-8">
                {activeChat.messages.map((msg, index) => (
                  <div key={index}>
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-3xl bg-[#2f2f2f] px-5 py-3 text-[15px] leading-7">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#111827] shadow-[0_0_14px_rgba(59,130,246,0.45)]">
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-blue-400"
  >
    <circle
      cx="12"
      cy="12"
      r="8.5"
      stroke="currentColor"
      strokeWidth="1.8"
    />

    <path
      d="M9 16V8H13.2C15 8 16 9 16 10.5C16 12 15 13 13.2 13H9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <path
      d="M13 13L16 16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />

    <circle
      cx="12"
      cy="12"
      r="2"
      fill="currentColor"
      className="opacity-80"
    />
  </svg>
</div>
<div className="flex flex-col items-center gap-1">
  {/* your existing logo div stays here */}

  <div className="text-xs font-semibold tracking-wide text-white drop-shadow-[0_0_6px_rgba(59,130,246,0.35)]">
    Pratham AI
  </div>
</div>
                        <div className="min-w-0 flex-1">
<div className="pt-2 text-[15px] leading-7 text-gray-100">   
   <ReactMarkdown
   remarkPlugins={[remarkGfm]}
  components={{
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),

  em: ({ children }) => (
    <em className="italic text-gray-200">{children}</em>
  ),

  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>
  ),

  li: ({ children }) => (
    <li className="pl-1">{children}</li>
  ),

  code: ({ children }) => (
    <code className="rounded-md bg-[#111827] px-1.5 py-0.5 font-mono text-sm text-blue-300">
      {children}
    </code>
  ),

  pre: ({ children, node }) => {
    const codeNode = node?.children?.[0];

    const code =
      codeNode?.type === "element" &&
      codeNode.tagName === "code"
        ? codeNode.children
            .map((child) =>
              child.type === "text" ? child.value : ""
            )
            .join("")
            .replace(/\n$/, "")
        : "";

    return (
      <div className="group relative my-3">
        <button
          onClick={() => copyCode(code)}
          className="absolute right-2 top-2 z-10 rounded-md bg-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-600"
        >
          {copied ? `✓ ${t("Copied", "कॉपी किया गया")}` : t("Copy", "कॉपी करें")}
        </button>

        <pre className="overflow-x-auto rounded-xl border border-gray-700 bg-[#0b1120] p-4 pr-16 text-sm leading-6">
          {children}
        </pre>
      </div>
    );
  },
}}
>
  {msg.content}
</ReactMarkdown>
  </div>

  {msg.role === "assistant" && msg.content && (
  <div className="mt-2 flex items-center">
    <button
      onClick={() => copyMessage(msg.content)}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="8"
          y="8"
          width="11"
          height="11"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M16 8V6C16 4.9 15.1 4 14 4H6C4.9 4 4 4.9 4 6V14C4 15.1 4.9 16 6 16H8"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>

      {copiedMessage === message.content &&
  `✓ ${t("Copied", "कॉपी किया गया")}`}
    </button>

    <button
      onClick={() => regenerateResponse(activeChatId!, index)}
      className="ml-2 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
    >
      {t("🔄 Regenerate", "🔄 फिर से जवाब दें")}
    </button>
  </div>
)}
</div>
                      </div>
                    )}
                  </div>
                ))}

                <div ref={bottomRef} className="h-40" />
                {loading && (
  <div className="flex gap-4">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#111827] shadow-[0_0_18px_rgba(59,130,246,0.55)]">
      <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,1)]" />
    </div>

    <div className="flex items-center gap-1.5 pt-2">
      <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.9)]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.9)] [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.9)] [animation-delay:300ms]" />
    </div>
  </div>
)}


                  
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#111827] shadow-[0_0_14px_rgba(59,130,246,0.45)]">
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-blue-400"
  >
    <circle
      cx="12"
      cy="12"
      r="8.5"
      stroke="currentColor"
      strokeWidth="1.8"
    />

    <path
      d="M9 16V8H13.2C15 8 16 9 16 10.5C16 12 15 13 13.2 13H9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <path
      d="M13 13L16 16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />

    <circle
      cx="12"
      cy="12"
      r="2"
      fill="currentColor"
      className="opacity-80"
    />
  </svg>


                    
                     
                      
                  
                  </div>
                
              </div>
            </div>
          )}
        </div>

        {/* COMPOSER */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/95 to-transparent px-4 pb-4 pt-10">
          <div className="pointer-events-auto mx-auto w-full max-w-3xl">
            <div className="flex items-end rounded-3xl border border-blue-500/30 bg-[#151b27] px-3 py-2 shadow-xl shadow-blue-500/10 transition-all duration-200 focus-within:border-blue-500/60 focus-within:shadow-blue-500/20">
              <button className="mb-1 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-gray-300 hover:bg-[#444]">
                ＋
              </button>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={t("Message My AI...", "My AI को संदेश लिखें...")}
                disabled={loading}
                rows={1}
                className="max-h-32 min-h-10 flex-1 resize-none overflow-y-auto scrollbar-hide bg-transparent px-3 py-2.5 text-[15px] text-white outline-none placeholder:text-gray-400"
              />
<select
  value={voiceLanguage}
  onChange={(e) => setVoiceLanguage(e.target.value)}
  className="mb-1 mr-2 h-10 rounded-lg bg-gray-700 px-2 text-sm text-white"
  title={t("Voice language", "आवाज़ की भाषा")}
>
  <option value="en-IN">
  {t("English", "अंग्रेज़ी")}
</option>

<option value="hi-IN">
  {t("Hindi", "हिंदी")}
</option>
</select>

              <button
  type="button"
  onClick={listening ? stopListening : startListening}
  className={`mb-1 mr-2 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
    listening
      ? "bg-red-500 text-white shadow-lg shadow-red-500/80 animate-pulse scale-110"
      : "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:scale-110"
  }`}
  title={t("Voice input", "आवाज़ इनपुट")}
>
  <Mic size={20} strokeWidth={2.2} />
</button>

              <button
                onClick={loading ? stopGeneration : sendMessage}
                disabled={!loading && !message.trim()}
                className={`mb-1 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 ${
                  loading
                    ? "bg-red-500 shadow-red-500/40 hover:scale-110 hover:bg-red-400"
                    : "bg-blue-500 shadow-blue-500/40 hover:scale-110 hover:bg-blue-400 hover:shadow-blue-400/60 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                }`}
              >
                {loading ? (
                  <div className="h-4 w-4 rounded-sm bg-white" />
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 19V5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M6 11L12 5L18 11"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
                
            </div>

            <p className="mt-2 text-center text-[11px] text-gray-500">
              {t(
  "My AI can make mistakes. Check important information.",
  "My AI से गलतियाँ हो सकती हैं। महत्वपूर्ण जानकारी की जाँच करें।"
)}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}