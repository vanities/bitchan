import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowLeft, CircleUser, Landmark, Newspaper, Search } from "lucide-react";
import { Composer, type ReplyTarget } from "./components/Composer";
import { Feed, Notice } from "./components/Feed";
import { SearchView } from "./components/SearchView";
import { ProfileView } from "./components/ProfileView";
import { RepublicPanel } from "./components/RepublicPanel";
import { useTimeline } from "./lib/useTimeline";
import { useFollowing } from "./lib/engagement";
import type { TimelinePost } from "./lib/graphql";

type View = "home" | "search" | "dispatches" | "profile";

const NAV = [
  { key: "home", label: "The Square", Icon: Landmark },
  { key: "search", label: "Search", Icon: Search },
  { key: "dispatches", label: "Dispatches", Icon: Newspaper },
  { key: "citizen", label: "Citizen", Icon: CircleUser },
] as const;
type NavKey = (typeof NAV)[number]["key"];

const TITLES: Record<View, string> = {
  home: "The Square",
  search: "Search",
  dispatches: "Dispatches",
  profile: "Profile",
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [homeFilter, setHomeFilter] = useState<"all" | "following">("all");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [profileAddress, setProfileAddress] = useState<string | null>(null);
  const { posts, handles, isLoading, error } = useTimeline();
  const { address } = useAccount();
  const { data: followingArr } = useFollowing(address);

  const topLevel = useMemo(() => posts.filter((p) => p.parentId === "0"), [posts]);
  const followingSet = new Set(followingArr ?? []);
  const homePosts =
    homeFilter === "following"
      ? topLevel.filter((p) => followingSet.has(p.author.toLowerCase()))
      : topLevel;

  // Drive navigation through the History API so trackpad swipe-back and the
  // browser back/forward buttons work (state-only nav leaves no history entry).
  useEffect(() => {
    history.replaceState({ view: "home", profileAddress: null }, "");
    function onPop(e: PopStateEvent) {
      const s = (e.state ?? null) as { view?: View; profileAddress?: string | null } | null;
      setView(s?.view ?? "home");
      setProfileAddress(s?.profileAddress ?? null);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function go(next: { view: View; profileAddress?: string | null }) {
    const entry = { view: next.view, profileAddress: next.profileAddress ?? null };
    history.pushState(entry, "");
    setView(entry.view);
    setProfileAddress(entry.profileAddress);
  }
  function openProfile(a: string) {
    go({ view: "profile", profileAddress: a });
  }
  function nav(key: NavKey) {
    if (key === "citizen") go({ view: "profile", profileAddress: address ?? null });
    else go({ view: key });
  }
  function startReply(post: TimelinePost) {
    setReplyTo({ id: post.id, handle: handles.get(post.author.toLowerCase()) ?? null, author: post.author });
    go({ view: "home" });
  }

  const profileHandle = profileAddress ? handles.get(profileAddress.toLowerCase()) : null;
  const headerTitle = view === "profile" ? profileHandle ?? "Profile" : TITLES[view];

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-x-0 top-0 z-30 h-[3px] bg-gradient-to-r from-seal via-brass to-seal" />

      <div className="mx-auto flex w-full max-w-7xl justify-center">
        <LeftRail view={view} onNav={nav} />

        <div className="flex min-h-screen w-full max-w-[600px] flex-col border-line sm:border-x">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink/85 px-4 py-3 backdrop-blur lg:hidden">
            <Wordmark className="text-2xl" />
            <ConnectButton accountStatus="avatar" chainStatus="none" showBalance={false} />
          </header>

          <div className="sticky top-0 z-20 hidden items-center gap-3 border-b border-line bg-ink/85 px-5 py-4 backdrop-blur lg:flex">
            {view === "profile" && (
              <button onClick={() => history.back()} className="text-bone-dim transition hover:text-bone" aria-label="back">
                <ArrowLeft size={20} strokeWidth={2.2} />
              </button>
            )}
            <h2 className="text-xl font-bold leading-none tracking-tight">{headerTitle}</h2>
            {view === "home" && <span className="label-civic ml-auto text-[10px] text-bone-dim">live · chronological</span>}
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
                        homeFilter === f ? "border-b-2 border-seal text-bone" : "text-bone-dim hover:bg-ink-soft"
                      }`}
                    >
                      {f === "all" ? "For you" : "Following"}
                    </button>
                  ))}
                </div>
                <Composer replyTo={replyTo} onClearReply={() => setReplyTo(null)} onGoProfile={() => nav("citizen")} />
                <Feed
                  posts={homePosts}
                  handles={handles}
                  onReply={startReply}
                  onOpenProfile={openProfile}
                  loading={isLoading}
                  error={error}
                  empty={
                    homeFilter === "following" ? (
                      <Notice>No posts yet from people you follow. Open someone's profile and hit Follow.</Notice>
                    ) : (
                      <div className="px-5 py-16 text-center">
                        <p className="font-display text-3xl font-extrabold tracking-tight text-bone">The square is silent.</p>
                        <p className="mt-2 text-sm text-bone-dim">Be the first citizen to speak.</p>
                      </div>
                    )
                  }
                />
              </>
            )}

            {view === "search" && (
              <SearchView posts={posts} handles={handles} onReply={startReply} onOpenProfile={openProfile} loading={isLoading} error={error} />
            )}

            {view === "dispatches" && (
              <Feed posts={posts} handles={handles} onReply={startReply} onOpenProfile={openProfile} loading={isLoading} error={error} empty={<Notice>No dispatches yet — the republic is quiet.</Notice>} />
            )}

            {view === "profile" && (
              <ProfileView address={profileAddress} posts={posts} handles={handles} onReply={startReply} onOpenProfile={openProfile} loading={isLoading} error={error} />
            )}
          </main>
        </div>

        <aside className="sticky top-0 hidden h-screen w-[350px] shrink-0 overflow-y-auto px-6 py-5 xl:block">
          <RepublicPanel onOpenProfile={openProfile} handles={handles} />
        </aside>
      </div>

      <BottomNav view={view} onNav={nav} />
    </div>
  );
}

function Wordmark({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold leading-none tracking-tight text-bone ${className}`}>
      bitchan<span className="text-seal">.</span>
    </span>
  );
}

function isActive(key: NavKey, view: View) {
  return key === "citizen" ? view === "profile" : view === key;
}

function LeftRail({ view, onNav }: { view: View; onNav: (k: NavKey) => void }) {
  return (
    <header className="sticky top-0 hidden h-screen w-[88px] shrink-0 flex-col justify-between px-2 py-5 lg:flex xl:w-[268px] xl:px-4">
      <div className="flex flex-col gap-7">
        <div className="px-2 text-center xl:text-left">
          <Wordmark className="text-2xl xl:text-[28px]" />
          <p className="label-civic mt-1 hidden text-[9px] text-bone-dim xl:block">an on-chain republic</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((t) => {
            const active = isActive(t.key, view);
            return (
              <button
                key={t.key}
                title={t.label}
                onClick={() => onNav(t.key)}
                className={`flex items-center justify-center gap-4 rounded-md px-3 py-2.5 transition xl:justify-start ${
                  active ? "bg-ink-soft text-bone" : "text-bone-dim hover:bg-ink-soft hover:text-bone"
                }`}
              >
                <t.Icon size={22} strokeWidth={active ? 2.4 : 1.9} className={active ? "text-seal" : ""} />
                <span className="hidden text-base xl:inline">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex justify-center xl:block">
        <ConnectButton accountStatus="avatar" chainStatus="none" showBalance={false} />
      </div>
    </header>
  );
}

function BottomNav({ view, onNav }: { view: View; onNav: (k: NavKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-ink/90 backdrop-blur lg:hidden">
      {NAV.map((t) => (
        <button
          key={t.key}
          aria-label={t.label}
          onClick={() => onNav(t.key)}
          className={`flex flex-1 flex-col items-center py-3 ${isActive(t.key, view) ? "text-seal" : "text-bone-dim"}`}
        >
          <t.Icon size={23} strokeWidth={isActive(t.key, view) ? 2.4 : 1.9} />
        </button>
      ))}
    </nav>
  );
}
