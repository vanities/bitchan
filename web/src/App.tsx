import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Composer, type ReplyTarget } from "./components/Composer";
import { Feed, Notice } from "./components/Feed";
import { SearchView } from "./components/SearchView";
import { ProfileView } from "./components/ProfileView";
import { RepublicPanel } from "./components/RepublicPanel";
import { useTimeline } from "./lib/useTimeline";
import { useFollowing } from "./lib/engagement";
import type { TimelinePost } from "./lib/graphql";

type View = "home" | "search" | "dispatches" | "citizen";

const NAV: { key: View; label: string; icon: string }[] = [
  { key: "home", label: "The Square", icon: "⌂" },
  { key: "search", label: "Search", icon: "⌕" },
  { key: "dispatches", label: "Dispatches", icon: "✦" },
  { key: "citizen", label: "Citizen", icon: "❖" },
];

const TITLES: Record<View, string> = {
  home: "The Square",
  search: "Search",
  dispatches: "Dispatches",
  citizen: "Citizen",
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [homeFilter, setHomeFilter] = useState<"all" | "following">("all");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const { posts, handles, isLoading, error } = useTimeline();
  const { address } = useAccount();
  const { data: followingArr } = useFollowing(address);

  const topLevel = useMemo(() => posts.filter((p) => p.parentId === "0"), [posts]);
  const followingSet = new Set(followingArr ?? []);
  const homePosts =
    homeFilter === "following"
      ? topLevel.filter((p) => followingSet.has(p.author.toLowerCase()))
      : topLevel;

  function startReply(post: TimelinePost) {
    setReplyTo({ id: post.id, handle: handles.get(post.author.toLowerCase()) ?? null, author: post.author });
    setView("home");
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-x-0 top-0 z-30 h-[3px] bg-gradient-to-r from-seal via-brass to-seal" />

      <div className="mx-auto flex w-full max-w-7xl justify-center">
        <LeftRail view={view} onNav={setView} />

        <div className="flex min-h-screen w-full max-w-[600px] flex-col border-line sm:border-x">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink/85 px-4 py-3 backdrop-blur lg:hidden">
            <Wordmark className="text-2xl" />
            <ConnectButton accountStatus="avatar" chainStatus="none" showBalance={false} />
          </header>

          <div className="sticky top-0 z-20 hidden items-baseline justify-between border-b border-line bg-ink/85 px-5 py-4 backdrop-blur lg:flex">
            <h2 className="text-xl font-bold leading-none tracking-tight">{TITLES[view]}</h2>
            {view === "home" && (
              <span className="label-civic text-[10px] text-bone-dim">live · chronological</span>
            )}
          </div>

          <main className="flex-1 pb-20 lg:pb-0">
            {view === "home" && (
              <>
                <div className="flex border-b border-line text-sm">
                  {(["all", "following"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setHomeFilter(f)}
                      className={`flex-1 py-3 font-semibold transition ${
                        homeFilter === f
                          ? "border-b-2 border-seal text-bone"
                          : "text-bone-dim hover:bg-ink-soft"
                      }`}
                    >
                      {f === "all" ? "For you" : "Following"}
                    </button>
                  ))}
                </div>
                <Composer
                  replyTo={replyTo}
                  onClearReply={() => setReplyTo(null)}
                  onGoProfile={() => setView("citizen")}
                />
                <Feed
                  posts={homePosts}
                  handles={handles}
                  onReply={startReply}
                  loading={isLoading}
                  error={error}
                  empty={
                    homeFilter === "following" ? (
                      <Notice>No posts yet from people you follow. Find someone and hit Follow.</Notice>
                    ) : (
                      <div className="px-5 py-16 text-center">
                        <p className="text-3xl font-bold tracking-tight text-bone">The square is silent.</p>
                        <p className="mt-2 text-sm text-bone-dim">Be the first citizen to speak.</p>
                      </div>
                    )
                  }
                />
              </>
            )}

            {view === "search" && (
              <SearchView posts={posts} handles={handles} onReply={startReply} loading={isLoading} error={error} />
            )}

            {view === "dispatches" && (
              <Feed
                posts={posts}
                handles={handles}
                onReply={startReply}
                loading={isLoading}
                error={error}
                empty={<Notice>No dispatches yet — the republic is quiet.</Notice>}
              />
            )}

            {view === "citizen" && (
              <ProfileView posts={posts} handles={handles} onReply={startReply} loading={isLoading} error={error} />
            )}
          </main>
        </div>

        <aside className="sticky top-0 hidden h-screen w-[350px] shrink-0 overflow-y-auto px-6 py-5 xl:block">
          <RepublicPanel />
        </aside>
      </div>

      <BottomNav view={view} onNav={setView} />
    </div>
  );
}

function Wordmark({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`font-bold leading-none tracking-tight text-bone ${className}`}>
      bitchan<span className="text-seal">.</span>
    </span>
  );
}

function LeftRail({ view, onNav }: { view: View; onNav: (v: View) => void }) {
  return (
    <header className="sticky top-0 hidden h-screen w-[88px] shrink-0 flex-col justify-between px-2 py-5 lg:flex xl:w-[268px] xl:px-4">
      <div className="flex flex-col gap-7">
        <div className="px-2 text-center xl:text-left">
          <Wordmark className="text-2xl xl:text-[28px]" />
          <p className="label-civic mt-1 hidden text-[9px] text-bone-dim xl:block">an on-chain republic</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((t) => (
            <button
              key={t.key}
              title={t.label}
              onClick={() => onNav(t.key)}
              className={`flex items-center justify-center gap-4 rounded-md px-3 py-2.5 transition xl:justify-start ${
                view === t.key ? "bg-ink-soft text-bone" : "text-bone-dim hover:bg-ink-soft hover:text-bone"
              }`}
            >
              <span className={`text-xl leading-none ${view === t.key ? "text-seal" : ""}`}>{t.icon}</span>
              <span className="hidden text-base xl:inline">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="flex justify-center xl:block">
        <ConnectButton accountStatus="avatar" chainStatus="none" showBalance={false} />
      </div>
    </header>
  );
}

function BottomNav({ view, onNav }: { view: View; onNav: (v: View) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-ink/90 backdrop-blur lg:hidden">
      {NAV.map((t) => (
        <button
          key={t.key}
          aria-label={t.label}
          onClick={() => onNav(t.key)}
          className={`flex flex-1 flex-col items-center py-3 text-xl ${
            view === t.key ? "text-seal" : "text-bone-dim"
          }`}
        >
          <span className="leading-none">{t.icon}</span>
        </button>
      ))}
    </nav>
  );
}
