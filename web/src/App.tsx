import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowLeft, Bell, CircleUser, Landmark, Scale, Search } from "lucide-react";
import { Composer, type ReplyTarget } from "./components/Composer";
import { Feed, Notice } from "./components/Feed";
import { SearchView } from "./components/SearchView";
import { ProfileView } from "./components/ProfileView";
import { RepublicPanel } from "./components/RepublicPanel";
import { NotificationsView } from "./components/NotificationsView";
import { useTimeline, type TimelinePost } from "./lib/useTimeline";
import { useFollowing, useNotifications } from "./lib/engagement";

type View = "home" | "search" | "republic" | "profile" | "post" | "notifications";

const NAV = [
  { key: "home", label: "The Square", Icon: Landmark },
  { key: "search", label: "Search", Icon: Search },
  { key: "republic", label: "Republic", Icon: Scale },
  { key: "notifications", label: "Notifications", Icon: Bell },
  { key: "citizen", label: "Citizen", Icon: CircleUser },
] as const;
type NavKey = (typeof NAV)[number]["key"];

const TITLES: Record<View, string> = {
  home: "The Square",
  search: "Search",
  republic: "The Republic",
  profile: "Profile",
  post: "Thread",
  notifications: "Notifications",
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [homeFilter, setHomeFilter] = useState<"all" | "following">("all");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [quoteTo, setQuoteTo] = useState<ReplyTarget | null>(null);
  const [profileAddress, setProfileAddress] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const { posts, handles, avatars, isLoading, error } = useTimeline();
  const { address } = useAccount();
  const { data: followingArr } = useFollowing(address);
  const notifs = useNotifications(address, address ? handles.get(address.toLowerCase()) : undefined);
  const [seenNotifAt, setSeenNotifAt] = useState<number>(() =>
    Number(localStorage.getItem("bitchan.notif.seen") || 0),
  );
  const latestNotifAt = notifs?.[0]?.at ?? 0;
  const hasUnread = !!address && latestNotifAt > seenNotifAt;

  const topLevel = useMemo(() => posts.filter((p) => p.parentId === "0"), [posts]);
  const followingSet = new Set(followingArr ?? []);
  const homePosts =
    homeFilter === "following" ? topLevel.filter((p) => followingSet.has(p.author.toLowerCase())) : topLevel;

  const threadRoot = view === "post" && postId ? (posts.find((p) => p.id === postId) ?? null) : null;
  const threadReplies = threadRoot
    ? posts
        .filter((p) => p.parentId === threadRoot.id)
        .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
    : [];

  // Drive navigation through the History API so trackpad swipe-back and the
  // browser back/forward buttons work (state-only nav leaves no history entry).
  useEffect(() => {
    history.replaceState({ view: "home", profileAddress: null, postId: null }, "");
    function onPop(e: PopStateEvent) {
      const s = (e.state ?? null) as {
        view?: View;
        profileAddress?: string | null;
        postId?: string | null;
      } | null;
      setView(s?.view ?? "home");
      setProfileAddress(s?.profileAddress ?? null);
      setPostId(s?.postId ?? null);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function go(next: { view: View; profileAddress?: string | null; postId?: string | null }) {
    const entry = {
      view: next.view,
      profileAddress: next.profileAddress ?? null,
      postId: next.postId ?? null,
    };
    history.pushState(entry, "");
    setView(entry.view);
    setProfileAddress(entry.profileAddress);
    setPostId(entry.postId);
  }
  function openProfile(a: string) {
    go({ view: "profile", profileAddress: a });
  }
  function openPost(post: TimelinePost) {
    go({ view: "post", postId: post.id });
  }
  function openPostId(id: string) {
    go({ view: "post", postId: id });
  }
  function nav(key: NavKey) {
    if (key === "citizen") go({ view: "profile", profileAddress: address ?? null });
    else if (key === "notifications") {
      setSeenNotifAt(latestNotifAt);
      localStorage.setItem("bitchan.notif.seen", String(latestNotifAt));
      go({ view: "notifications" });
    } else go({ view: key });
  }
  function startReply(post: TimelinePost) {
    setQuoteTo(null);
    setReplyTo({ id: post.id, handle: handles.get(post.author.toLowerCase()) ?? null, author: post.author });
    go({ view: "home" });
  }
  function startQuote(post: TimelinePost) {
    setReplyTo(null);
    setQuoteTo({ id: post.id, handle: handles.get(post.author.toLowerCase()) ?? null, author: post.author });
    go({ view: "home" });
  }

  const profileHandle = profileAddress ? handles.get(profileAddress.toLowerCase()) : null;
  const headerTitle = view === "profile" ? (profileHandle ?? "Profile") : TITLES[view];

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-x-0 top-0 z-30 h-[3px] bg-gradient-to-r from-seal via-brass to-seal" />

      <div className="mx-auto flex w-full max-w-7xl justify-center">
        <LeftRail view={view} onNav={nav} unread={hasUnread} />

        <div className="flex min-h-screen w-full max-w-[600px] flex-col border-line sm:border-x">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink/85 px-4 py-3 backdrop-blur lg:hidden">
            <Wordmark className="text-2xl" />
            <ConnectButton accountStatus="avatar" chainStatus="none" showBalance={false} />
          </header>

          <div className="sticky top-0 z-20 hidden items-center gap-3 border-b border-line bg-ink/85 px-5 py-4 backdrop-blur lg:flex">
            {(view === "profile" || view === "post") && (
              <button
                onClick={() => history.back()}
                className="text-bone-dim transition hover:text-bone"
                aria-label="back"
              >
                <ArrowLeft size={20} strokeWidth={2.2} />
              </button>
            )}
            <h2 className="text-xl font-bold leading-none tracking-tight">{headerTitle}</h2>
            {view === "home" && (
              <span className="label-civic ml-auto text-[10px] text-bone-dim">live · chronological</span>
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
                  quoteTo={quoteTo}
                  onClearQuote={() => setQuoteTo(null)}
                  onGoProfile={() => nav("citizen")}
                />
                <Feed
                  posts={homePosts}
                  handles={handles}
                  onReply={startReply}
                  onOpenProfile={openProfile}
                  onOpenPost={openPost}
                  onQuote={startQuote}
                  loading={isLoading}
                  error={error}
                  empty={
                    homeFilter === "following" ? (
                      <Notice>
                        No posts yet from people you follow. Open someone's profile and hit Follow.
                      </Notice>
                    ) : (
                      <div className="px-5 py-16 text-center">
                        <p className="font-display text-3xl font-extrabold tracking-tight text-bone">
                          The square is silent.
                        </p>
                        <p className="mt-2 text-sm text-bone-dim">Be the first citizen to speak.</p>
                      </div>
                    )
                  }
                />
              </>
            )}

            {view === "search" && (
              <SearchView
                posts={posts}
                handles={handles}
                onReply={startReply}
                onOpenProfile={openProfile}
                onOpenPost={openPost}
                onQuote={startQuote}
                loading={isLoading}
                error={error}
              />
            )}

            {view === "republic" && (
              <div className="px-4 py-5">
                <RepublicPanel onOpenProfile={openProfile} handles={handles} />
              </div>
            )}

            {view === "profile" && (
              <ProfileView
                address={profileAddress}
                posts={posts}
                handles={handles}
                avatars={avatars}
                onReply={startReply}
                onOpenProfile={openProfile}
                onOpenPost={openPost}
                onQuote={startQuote}
                loading={isLoading}
                error={error}
              />
            )}

            {view === "post" &&
              (threadRoot ? (
                <Feed
                  posts={[threadRoot, ...threadReplies]}
                  handles={handles}
                  onReply={startReply}
                  onOpenProfile={openProfile}
                  onOpenPost={openPost}
                  onQuote={startQuote}
                  loading={isLoading}
                  error={error}
                  empty={<Notice>Nothing here.</Notice>}
                />
              ) : (
                <Notice>{isLoading ? "loading…" : "Post not found."}</Notice>
              ))}

            {view === "notifications" && (
              <NotificationsView
                items={notifs}
                handles={handles}
                onOpenProfile={openProfile}
                onOpenPostId={openPostId}
                loading={isLoading}
              />
            )}
          </main>
        </div>

        {/* Always render the rail (reserve its width) so navigating to Republic doesn't shift the layout. */}
        <aside className="sticky top-0 hidden h-screen w-[350px] shrink-0 overflow-y-auto px-6 py-5 xl:block">
          {view !== "republic" && <RepublicPanel onOpenProfile={openProfile} handles={handles} />}
        </aside>
      </div>

      <BottomNav view={view} onNav={nav} unread={hasUnread} />
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

function LeftRail({ view, onNav, unread }: { view: View; onNav: (k: NavKey) => void; unread?: boolean }) {
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
                <span className="relative">
                  <t.Icon size={22} strokeWidth={active ? 2.4 : 1.9} className={active ? "text-seal" : ""} />
                  {t.key === "notifications" && unread && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-seal" />
                  )}
                </span>
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

function BottomNav({ view, onNav, unread }: { view: View; onNav: (k: NavKey) => void; unread?: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-ink/90 backdrop-blur lg:hidden">
      {NAV.map((t) => (
        <button
          key={t.key}
          aria-label={t.label}
          onClick={() => onNav(t.key)}
          className={`flex flex-1 flex-col items-center py-3 ${isActive(t.key, view) ? "text-seal" : "text-bone-dim"}`}
        >
          <span className="relative">
            <t.Icon size={23} strokeWidth={isActive(t.key, view) ? 2.4 : 1.9} />
            {t.key === "notifications" && unread && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-seal" />
            )}
          </span>
        </button>
      ))}
    </nav>
  );
}
