import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";
import AuthPage from "@/components/AuthPage";
import LandingPage from "@/components/LandingPage";
import WebStudioPage from "@/components/WebStudioPage";
import VideoCreatorPage from "@/components/VideoCreatorPage";
import PremiumModal from "@/components/PremiumModal";
import { Page, User, ChatSession, UserPlan } from "./types";
import {
  getAllSessions,
  saveSession,
  deleteSession,
} from "./services/chatHistoryService";
import {
  SYSTEM_INSTRUCTION_GENERAL,
  SYSTEM_INSTRUCTION_EDU,
  SYSTEM_INSTRUCTION_WEBSITE,
} from "./constants";
import SlyntosLogo from "@/components/icons/SlyntosLogo";
import MenuIcon from "@/components/icons/MenuIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import AdjustmentsHorizontalIcon from "@/components/icons/AdjustmentsHorizontalIcon";
import { updateUser } from "./services/dbService";

const SESSION_KEY = "slyntos-user-session";
const LANDING_KEY = "slyntos-landing-seen";

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.General);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLanding, setShowLanding] = useState(
    !localStorage.getItem(LANDING_KEY),
  );
  const [systemStatus, setSystemStatus] = useState<
    "Ready" | "Thinking" | "Generating" | "Listening"
  >("Ready");

  const initialNewChatCreatedRef = useRef(false);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!currentUser) return;

    const now = Date.now();
    let updated = false;
    const userCopy = { ...currentUser };

    if (
      userCopy.plan !== "free" &&
      userCopy.subscriptionEndDate &&
      now > userCopy.subscriptionEndDate
    ) {
      userCopy.plan = "free";
      userCopy.subscriptionEndDate = undefined;
      updated = true;
    }

    const todayStart = new Date().setHours(0, 0, 0, 0);
    if (!userCopy.lastUsageReset || userCopy.lastUsageReset < todayStart) {
      userCopy.lastUsageReset = todayStart;
      userCopy.usageCounts = {
        [Page.Edu]: 0,
        [Page.WebStudio]: 0,
        [Page.Studio]: 0,
        images: 0,
        global: 0,
      };
      updated = true;
    }

    if (updated) {
      setCurrentUser(userCopy);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userCopy));
      updateUser(userCopy);
    }
  }, [currentUser]);

  const createNewChat = useCallback(async () => {
    if (!currentUser) return;
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: "New Mission",
      createdAt: Date.now(),
      messages: [],
    };
    await saveSession(currentUser.id, currentPage, newSession);
    console.log("Created new session:", newSession);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, [currentUser, currentPage]);

  useEffect(() => {
    if (currentUser) {
      const load = async () => {
        const loaded = await getAllSessions(currentUser.id, currentPage);
        setSessions(loaded);

        if (!initialNewChatCreatedRef.current) {
          initialNewChatCreatedRef.current = true;
          createNewChat();
        } else {
          if (loaded.length > 0) setActiveSessionId(loaded[0].id);
          else createNewChat();
        }
      };
      load();
    }
  }, [currentUser, currentPage, createNewChat]);

  const handleAuthSuccess = (user: User) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setCurrentUser(user);
    initialNewChatCreatedRef.current = false;
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    initialNewChatCreatedRef.current = false;
  };

  const handleLandingFinish = () => {
    localStorage.setItem(LANDING_KEY, "true");
    setShowLanding(false);
  };

  const handleSessionUpdate = async (updated: ChatSession) => {
    if (!currentUser) return;
    await saveSession(currentUser.id, currentPage, updated);
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== updated.id);
      return [updated, ...filtered].sort((a, b) => b.createdAt - a.createdAt);
    });
  };

  const handleDeleteSession = async (id: string) => {
    if (!currentUser) return;
    const updated = await deleteSession(currentUser.id, currentPage, id);
    setSessions(updated);
    if (updated.length === 0) createNewChat();
    else if (activeSessionId === id) setActiveSessionId(updated[0].id);
  };

  const handleUsageIncrement = (page: Page) => {
    if (!currentUser) return;
    const userCopy = { ...currentUser };
    userCopy.usageCounts[page] = (userCopy.usageCounts[page] || 0) + 1;
    userCopy.usageCounts.global = (userCopy.usageCounts.global || 0) + 1;
    setCurrentUser(userCopy);
    localStorage.setItem(SESSION_KEY, JSON.stringify(userCopy));
    updateUser(userCopy);
  };

  const handleUpgradeSuccess = (plan: UserPlan, endDate: number) => {
    if (!currentUser) return;
    const userCopy: User = {
      ...currentUser,
      plan,
      subscriptionEndDate: endDate,
    };
    setCurrentUser(userCopy);
    localStorage.setItem(SESSION_KEY, JSON.stringify(userCopy));
    updateUser(userCopy);
    setShowPremiumModal(false);
  };

  if (showLanding) return <LandingPage onFinish={handleLandingFinish} />;
  if (!currentUser) return <AuthPage onAuthSuccess={handleAuthSuccess} />;

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const sidebarWidth = isSidebarCollapsed ? "md:pl-20" : "md:pl-72";

  return (
    <div className="h-screen flex overflow-hidden antialiased bg-gradient-to-br from-gray-950 via-gray-900 to-black relative w-full text-white">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id: string) => {
          setActiveSessionId(id);
          setIsSidebarOpen(false);
        }}
        onNewChat={() => {
          createNewChat();
          setIsSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        currentPage={currentPage}
        onNavigate={(p: Page) => {
          setCurrentPage(p);
          setIsSidebarOpen(false);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        onUpgradeClick={() => setShowPremiumModal(true)}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 ${sidebarWidth} relative h-full transition-all duration-500 w-full`}
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-black/20 backdrop-blur-md z-50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-white bg-white/5 rounded-xl border border-white/10"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <SlyntosLogo className="w-6 h-6" />
              <h1 className="text-xl font-semibold tracking-tight uppercase italic">
                {currentPage}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${
                  systemStatus === "Ready"
                    ? "bg-emerald-500 shadow-emerald-500/50"
                    : systemStatus === "Listening"
                      ? "bg-blue-500 shadow-blue-500/50 animate-pulse"
                      : "bg-amber-500 shadow-amber-500/50 animate-pulse"
                }`}
              />
              <div className="text-sm text-gray-400">
                Secure • Fast • Intelligent
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={createNewChat}
                className="p-2 text-gray-400 hover:text-white transition-all active:scale-95"
                title="New Chat"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative w-full">
          {activeSession ? (
            currentPage === Page.WebStudio ? (
              <WebStudioPage
                currentUser={currentUser}
                onUpgradeClick={() => setShowPremiumModal(true)}
                onUsageIncrement={handleUsageIncrement}
              />
            ) : currentPage === Page.Studio ? (
              <VideoCreatorPage
                session={activeSession}
                onSessionUpdate={handleSessionUpdate}
                currentUser={currentUser}
                onUsageIncrement={handleUsageIncrement}
                isRightSidebarOpen={isRightSidebarOpen}
                setIsRightSidebarOpen={setIsRightSidebarOpen}
              />
            ) : (
              <ChatInterface
                session={activeSession}
                onSessionUpdate={handleSessionUpdate}
                page={currentPage}
                systemInstruction={
                  currentPage === Page.Edu
                    ? SYSTEM_INSTRUCTION_EDU
                    : SYSTEM_INSTRUCTION_GENERAL
                }
                placeholderText="How can I help you today?"
                currentUser={currentUser}
                isRightSidebarOpen={isRightSidebarOpen}
                setIsRightSidebarOpen={setIsRightSidebarOpen}
                onUsageIncrement={handleUsageIncrement}
                onLoadingStateChange={(loading) =>
                  setSystemStatus(loading ? "Generating" : "Ready")
                }
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center opacity-10 w-full h-full">
              <SlyntosLogo className="w-32 h-32" />
            </div>
          )}
        </main>
      </div>

      {showPremiumModal && (
        <PremiumModal
          onClose={() => setShowPremiumModal(false)}
          onSuccess={handleUpgradeSuccess}
          currentUser={currentUser!}
        />
      )}
    </div>
  );
};

export default App;
