import { useEffect, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { keccak256, stringToBytes } from "viem";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { TimelinePost, Handles, Avatars } from "../lib/useTimeline";
import { bitchanAbi, bitchanAddress, chain, explorerAddress } from "../lib/contract";
import { useEnsName } from "../lib/ens";
import { submitReaction, useFollowing, useFollowers, useLikedPosts } from "../lib/engagement";
import { setAvatar } from "../lib/avatar";
import { setProfile } from "../lib/profile";
import { hasMedia, mediaUrl, uploadMedia } from "../lib/media";
import { Feed, Notice } from "./Feed";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ProfileView({
  address,
  posts,
  handles,
  avatars,
  onReply,
  onOpenProfile,
  onOpenPost,
  onOpenTag,
  onQuote,
  loading,
  error,
}: {
  address: string | null;
  posts: TimelinePost[];
  handles: Handles;
  avatars?: Avatars;
  onReply?: (post: TimelinePost) => void;
  onOpenProfile?: (address: `0x${string}`) => void;
  onOpenPost?: (post: TimelinePost) => void;
  onOpenTag?: (tag: string) => void;
  onQuote?: (post: TimelinePost) => void;
  loading?: boolean;
  error?: unknown;
}) {
  const { address: viewerAddr, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [handleInput, setHandleInput] = useState("");
  const [busyFollow, setBusyFollow] = useState(false);

  const { data: hHash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isSuccess, isLoading: settling } = useWaitForTransactionReceipt({ hash: hHash });
  useEffect(() => {
    if (!isSuccess) return;
    setHandleInput("");
  }, [isSuccess]);

  const { data: followingArr } = useFollowing(viewerAddr);
  const { data: ensName } = useEnsName(address);
  const { data: profileFollowing } = useFollowing(address ?? undefined);
  const { data: profileFollowers } = useFollowers(address ?? undefined);
  const [listView, setListView] = useState<"following" | "followers" | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [tab, setTab] = useState<"posts" | "replies" | "media" | "likes">("posts");
  const profile = useQuery(api.accounts.getProfile, address ? { address: address.toLowerCase() } : "skip");
  const { data: likedPostIds } = useLikedPosts(address?.toLowerCase());

  // Pre-check handle availability (debounced) so we error before signing a tx that
  // would revert HandleTaken. Key matches the contract: keccak256(bytes(handle)).
  const [debouncedHandle, setDebouncedHandle] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedHandle(handleInput.trim()), 350);
    return () => clearTimeout(t);
  }, [handleInput]);
  const { data: handleOwner } = useReadContract({
    address: bitchanAddress,
    abi: bitchanAbi,
    functionName: "ownerOfHandle",
    args: [keccak256(stringToBytes(debouncedHandle))],
    chainId: chain.id,
    query: { enabled: debouncedHandle.length > 0 },
  });

  if (!address) return <Notice>No profile selected.</Notice>;

  const addr = address.toLowerCase();
  const explorer = explorerAddress(address);
  const profileAvatar = avatars?.get(addr) ?? null;
  const viewer = viewerAddr?.toLowerCase();
  const isSelf = !!viewer && viewer === addr;
  const handle = handles.get(addr) ?? null;
  const theirPosts = posts.filter((p) => p.author.toLowerCase() === addr);
  const likedSet = new Set(likedPostIds ?? []);
  const tabPosts =
    tab === "replies"
      ? theirPosts.filter((p) => p.parentId !== "0")
      : tab === "media"
        ? theirPosts.filter((p) => p.mediaHash !== `0x${"0".repeat(64)}`)
        : tab === "likes"
          ? posts.filter((p) => likedSet.has(p.id))
          : theirPosts.filter((p) => p.parentId === "0");
  const isFollowing = new Set(followingArr ?? []).has(addr);
  const followingCount = profileFollowing?.length ?? 0;
  const followerCount = profileFollowers?.length ?? 0;
  const handleOwnerLc = typeof handleOwner === "string" ? handleOwner.toLowerCase() : null;
  const handleTaken =
    !!handleOwnerLc &&
    handleOwnerLc !== "0x0000000000000000000000000000000000000000" &&
    handleOwnerLc !== addr;
  const handleFree = debouncedHandle.length > 0 && handleOwner !== undefined && !handleTaken;

  function claim() {
    const h = handleInput.trim();
    if (!h || handleTaken) return;
    writeContract({
      address: bitchanAddress,
      abi: bitchanAbi,
      functionName: "setHandle",
      args: [h],
      chainId: chain.id,
    });
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !viewerAddr) return;
    setAvatarBusy(true);
    try {
      const { hash } = await uploadMedia(file, { address: viewerAddr, signTypedDataAsync });
      await setAvatar({ address: viewerAddr, avatar: hash, signTypedDataAsync });
    } catch (err) {
      console.error("avatar failed", err);
    } finally {
      setAvatarBusy(false);
      if (avatarRef.current) avatarRef.current.value = "";
    }
  }

  async function toggleFollow() {
    if (!viewerAddr || busyFollow) return;
    setBusyFollow(true);
    try {
      await submitReaction({
        signTypedDataAsync,
        address: viewerAddr,
        kind: "follow",
        target: addr,
        active: !isFollowing,
      });
    } catch (e) {
      console.error("follow failed", e);
    } finally {
      setBusyFollow(false);
    }
  }

  return (
    <div>
      <div className="border-b border-line">
        {profile?.banner && hasMedia(profile.banner) ? (
          <img
            src={mediaUrl(profile.banner)}
            alt=""
            className="h-28 w-full bg-ink-soft object-cover sm:h-36"
          />
        ) : (
          <div className="h-16 w-full bg-gradient-to-r from-seal/25 via-ink-soft to-brass/25 sm:h-20" />
        )}
        <div className="px-5 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={isSelf ? () => avatarRef.current?.click() : undefined}
              disabled={!isSelf || avatarBusy}
              title={isSelf ? "change picture" : undefined}
              className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-seal"
            >
              {profileAvatar && hasMedia(profileAvatar) ? (
                <img src={mediaUrl(profileAvatar)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-xl font-bold text-white">
                  {(handle ?? ensName ?? "a")[0]!.toUpperCase()}
                </span>
              )}
              {isSelf && (
                <span className="absolute inset-0 grid place-items-center bg-ink/60 text-[9px] font-semibold text-bone opacity-0 transition group-hover:opacity-100">
                  {avatarBusy ? "…" : "edit"}
                </span>
              )}
            </button>
            <input ref={avatarRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
            <div className="min-w-0">
              <div className="truncate text-xl font-bold tracking-tight text-bone">
                {handle ?? ensName ?? "anonymous"}
              </div>
              {explorer ? (
                <a
                  href={explorer}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-bone-dim transition hover:text-brass hover:underline"
                >
                  {address.slice(0, 10)}…{address.slice(-6)} ↗
                </a>
              ) : (
                <div className="font-mono text-xs text-bone-dim">
                  {address.slice(0, 10)}…{address.slice(-6)}
                </div>
              )}
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="text-right">
                <div className="text-xl font-bold tabular-nums text-bone">{theirPosts.length}</div>
                <div className="label-civic text-[9px] text-bone-dim">dispatches</div>
              </div>
              {!isSelf && isConnected && (
                <Button
                  onClick={toggleFollow}
                  disabled={busyFollow}
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  className={`rounded-full px-4 font-semibold ${isFollowing ? "border-brass text-brass hover:text-brass" : ""}`}
                >
                  {busyFollow ? "…" : isFollowing ? "Following" : "Follow"}
                </Button>
              )}
              {isSelf && (
                <Button
                  onClick={() => setEditingProfile(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 font-semibold"
                >
                  Edit profile
                </Button>
              )}
            </div>
          </div>

          {profile?.bio && <p className="mt-3 whitespace-pre-wrap text-sm text-bone">{profile.bio}</p>}
          {profile?.website && (
            <a
              href={withProtocol(profile.website)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-1 inline-block text-sm text-brass hover:underline"
            >
              {prettyUrl(profile.website)}
            </a>
          )}

          <div className="mt-3 flex gap-4 text-sm">
            <button
              onClick={() => setListView("following")}
              disabled={!followingCount}
              className="transition hover:underline disabled:opacity-50"
            >
              <span className="font-bold text-bone">{followingCount}</span>{" "}
              <span className="text-bone-dim">Following</span>
            </button>
            <button
              onClick={() => setListView("followers")}
              disabled={!followerCount}
              className="transition hover:underline disabled:opacity-50"
            >
              <span className="font-bold text-bone">{followerCount}</span>{" "}
              <span className="text-bone-dim">Followers</span>
            </button>
          </div>

          {isSelf && (
            <div className="mt-4 flex gap-2">
              <input
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder={handle ? "change your handle" : "claim a handle"}
                maxLength={32}
                className="flex-1 rounded-md border border-line bg-ink-soft px-3 py-2 text-sm focus:border-brass focus:outline-none"
              />
              <button
                onClick={claim}
                disabled={!handleInput.trim() || isPending || settling || handleTaken}
                className="rounded-md border border-brass px-4 py-2 text-sm font-semibold text-brass transition hover:bg-brass/10 disabled:opacity-40"
              >
                {isPending ? "confirm…" : settling ? "saving…" : handle ? "change" : "claim"}
              </button>
            </div>
          )}
          {isSelf && handleTaken && (
            <p className="mt-1.5 font-mono text-[11px] text-seal">that handle is taken</p>
          )}
          {isSelf && handleFree && <p className="mt-1.5 font-mono text-[11px] text-brass">available</p>}
          {isSelf && writeError && !/rejected|denied/i.test(writeError.message) && (
            <p className="mt-2 font-mono text-xs text-seal">{writeError.message.split("\n")[0]}</p>
          )}
          {!isConnected && !isSelf && (
            <p className="mt-3 text-xs text-bone-dim">Connect a wallet to follow.</p>
          )}
        </div>
      </div>

      <div className="flex border-b border-line text-sm">
        {(["posts", "replies", "media", "likes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 font-semibold capitalize transition ${
              tab === t ? "border-b-2 border-seal text-bone" : "text-bone-dim hover:bg-ink-soft"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <Feed
        posts={tabPosts}
        handles={handles}
        pinnedId={tab === "posts" ? (profile?.pinnedPostId ?? undefined) : undefined}
        onReply={onReply}
        onOpenProfile={onOpenProfile}
        onOpenPost={onOpenPost}
        onOpenTag={onOpenTag}
        onQuote={onQuote}
        loading={loading}
        error={error}
        empty={
          <Notice>
            {tab === "likes"
              ? "No liked posts yet."
              : tab === "media"
                ? "No media yet."
                : tab === "replies"
                  ? "No replies yet."
                  : isSelf
                    ? "You haven't posted yet — head to The Square."
                    : "No posts yet."}
          </Notice>
        }
      />

      {listView && (
        <FollowList
          title={listView === "following" ? "Following" : "Followers"}
          addresses={listView === "following" ? (profileFollowing ?? []) : (profileFollowers ?? [])}
          handles={handles}
          avatars={avatars}
          onOpenProfile={(a) => {
            setListView(null);
            onOpenProfile?.(a);
          }}
          onClose={() => setListView(null)}
        />
      )}

      {editingProfile && isSelf && viewerAddr && (
        <ProfileEditDialog
          address={viewerAddr}
          current={{
            bio: profile?.bio ?? "",
            banner: profile?.banner ?? "",
            website: profile?.website ?? "",
          }}
          onClose={() => setEditingProfile(false)}
        />
      )}
    </div>
  );
}

function withProtocol(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
function prettyUrl(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function ProfileEditDialog({
  address,
  current,
  onClose,
}: {
  address: `0x${string}`;
  current: { bio: string; banner: string; website: string };
  onClose: () => void;
}) {
  const { signTypedDataAsync } = useSignTypedData();
  const [bio, setBio] = useState(current.bio);
  const [website, setWebsite] = useState(current.website);
  const [banner, setBanner] = useState(current.banner);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  async function pickBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const { hash } = await uploadMedia(file, { address, signTypedDataAsync });
      setBanner(hash);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "upload failed");
    } finally {
      setUploading(false);
      if (bannerRef.current) bannerRef.current.value = "";
    }
  }

  async function save() {
    if (bio.length > 280 || website.length > 200) return;
    setSaving(true);
    setErr(null);
    try {
      await setProfile({ address, bio: bio.trim(), banner, website: website.trim(), signTypedDataAsync });
      onClose();
    } catch (e2) {
      console.error("[profile] save failed", e2);
      setErr(e2 instanceof Error ? e2.message.split("\n")[0] : "save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-line bg-ink p-0">
        <DialogTitle className="border-b border-line px-4 py-3 text-sm font-bold text-bone">
          Edit profile
        </DialogTitle>
        <div className="space-y-3 p-4">
          <div>
            <span className="label-civic text-[10px] text-bone-dim">banner</span>
            <button
              onClick={() => bannerRef.current?.click()}
              disabled={uploading}
              className="mt-1 block h-24 w-full overflow-hidden rounded-lg border border-line bg-ink-soft transition hover:border-brass/50"
            >
              {banner && hasMedia(banner) ? (
                <img src={mediaUrl(banner)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-xs text-bone-dim">
                  {uploading ? "uploading…" : "add a banner"}
                </span>
              )}
            </button>
            <input ref={bannerRef} type="file" accept="image/*" onChange={pickBanner} className="hidden" />
          </div>
          <div>
            <span className="label-civic text-[10px] text-bone-dim">bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Say something about yourself"
              className="mt-1 w-full resize-none rounded-md border border-line bg-ink-soft px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
          <div>
            <span className="label-civic text-[10px] text-bone-dim">website</span>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              maxLength={200}
              placeholder="yoursite.xyz"
              className="mt-1 w-full rounded-md border border-line bg-ink-soft px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
          {err && <p className="font-mono text-xs text-seal">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-3 text-sm text-bone-dim hover:text-bone">
              cancel
            </button>
            <Button onClick={save} disabled={saving || uploading} className="px-5 font-bold">
              {saving ? "sign + save…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FollowList({
  title,
  addresses,
  handles,
  avatars,
  onOpenProfile,
  onClose,
}: {
  title: string;
  addresses: string[];
  handles: Handles;
  avatars?: Avatars;
  onOpenProfile?: (a: `0x${string}`) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm border-line bg-ink p-0">
        <DialogTitle className="border-b border-line px-4 py-3 text-sm font-bold text-bone">
          {title}
        </DialogTitle>
        <ul className="max-h-[60vh] overflow-y-auto">
          {addresses.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-bone-dim">Nobody yet.</li>
          )}
          {addresses.map((a) => (
            <li key={a}>
              <button
                onClick={() => onOpenProfile?.(a as `0x${string}`)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-ink-soft"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-seal text-xs font-bold text-white">
                  {avatars?.get(a.toLowerCase()) && hasMedia(avatars.get(a.toLowerCase())!) ? (
                    <img
                      src={mediaUrl(avatars.get(a.toLowerCase())!)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (handles.get(a.toLowerCase()) ?? "a")[0]!.toUpperCase()
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-bone">
                    {handles.get(a.toLowerCase()) ?? "anon"}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-bone-dim">
                    {a.slice(0, 10)}…{a.slice(-6)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
