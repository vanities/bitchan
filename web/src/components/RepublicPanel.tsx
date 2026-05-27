import { useQuery as useConvexQuery } from "convex/react";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { api } from "../../convex/_generated/api";
import { bitchanAbi, bitchanAddress, chain, explorerAddress } from "../lib/contract";
import { CitizenshipCard } from "./CitizenshipCard";
import { ElectionCard } from "./ElectionCard";
import type { Handles } from "../lib/useTimeline";

export function RepublicPanel({
  onOpenProfile,
  handles,
}: {
  onOpenProfile?: (address: `0x${string}`) => void;
  handles?: Handles;
}) {
  const stats = useConvexQuery(api.stats.stats, {});
  const activity = useConvexQuery(api.governance.recent, { limit: 8 });
  const { data: treasury } = useReadContract({
    address: bitchanAddress,
    abi: bitchanAbi,
    functionName: "treasury",
    chainId: chain.id,
    query: { refetchInterval: 8000 },
  });
  const { data: postFee } = useReadContract({
    address: bitchanAddress,
    abi: bitchanAbi,
    functionName: "postFee",
    chainId: chain.id,
  });
  const { data: citizenCountRaw } = useReadContract({
    address: bitchanAddress,
    abi: bitchanAbi,
    functionName: "citizenCount",
    chainId: chain.id,
    query: { refetchInterval: 8000 },
  });
  const { data: founding } = useReadContract({
    address: bitchanAddress,
    abi: bitchanAbi,
    functionName: "foundingPhase",
    chainId: chain.id,
    query: { refetchInterval: 8000 },
  });
  const { data: targetT } = useReadContract({
    address: bitchanAddress,
    abi: bitchanAbi,
    functionName: "T",
    chainId: chain.id,
  });

  const posts = stats?.posts ?? 0;
  const citizens = citizenCountRaw !== undefined ? Number(citizenCountRaw) : (stats?.accounts ?? 0);
  const Tn = targetT !== undefined ? Number(targetT) : 0;
  const pct = Tn > 0 ? Math.min(100, Math.round((citizens / Tn) * 100)) : 0;
  const treasuryEth = treasury !== undefined ? trim(formatEther(treasury as bigint)) : "—";
  const feeEth = postFee !== undefined ? trim(formatEther(postFee as bigint)) : "—";
  const contractUrl = explorerAddress(bitchanAddress);

  return (
    <div className="flex flex-col gap-5">
      <input
        placeholder="Search the republic"
        className="w-full rounded-md border border-line bg-ink-soft px-4 py-2.5 text-sm placeholder:text-bone-dim focus:border-brass focus:outline-none"
      />

      <CitizenshipCard />

      <ElectionCard onOpenProfile={onOpenProfile} handles={handles} />

      <section className="overflow-hidden rounded-lg border border-line bg-panel/60">
        <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="label-civic text-[10px] text-bone-dim">state of the republic</h2>
          <span className="flex items-center gap-1.5 text-[10px] text-bone-dim">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-seal" />
            live
          </span>
        </header>
        <dl className="grid grid-cols-2 gap-px bg-line">
          <Stat label="dispatches" value={posts.toLocaleString()} />
          <Stat label="citizens" value={citizens.toLocaleString()} />
          <Stat label="treasury" value={`${treasuryEth} Ξ`} />
          <Stat label="fee to post" value={`${feeEth} Ξ`} />
        </dl>
        {founding === true && Tn > 0 && (
          <div className="border-t border-line px-4 py-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="label-civic text-[9px] text-bone-dim">founding phase</span>
              <span className="font-mono text-[10px] text-bone-dim">
                {citizens}/{Tn} to elections
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-seal transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </section>

      {activity && activity.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-line bg-panel/60">
          <header className="border-b border-line px-4 py-2.5">
            <h2 className="label-civic text-[10px] text-bone-dim">republic activity</h2>
          </header>
          <ul className="divide-y divide-line">
            {activity.map((e, i) => (
              <li key={i} className="flex items-start gap-2.5 px-4 py-2.5">
                <span className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${kindColor(e.kind)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug text-bone">{e.summary}</p>
                  <p className="label-civic mt-0.5 text-[9px] text-bone-dim">
                    {e.kind} · {ago(e.at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-line p-4">
        <h2 className="text-lg font-bold text-bone">The republic</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-bone-dim">
          A censorship-resistant timeline on Ethereum. Every post is written to the
          chain — <span className="text-bone">immutable</span>, owned by no platform.
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-bone-dim">
          <li>
            <span className="text-brass">✓</span> Custodians can hide, never delete.
          </li>
          <li>
            <span className="text-brass">✓</span> Moderation is public — no shadowbans.
          </li>
          <li>
            <span className="text-brass">✓</span> The feed algorithm is yours to swap.
          </li>
        </ul>
        {contractUrl && (
          <a
            href={contractUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-mono text-[11px] text-brass transition hover:underline"
          >
            view contract on-chain ↗
          </a>
        )}
      </section>

      <p className="label-civic px-1 text-[9px] text-bone-dim/70">on-chain · no ads · no masters</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel px-4 py-3">
      <div className="text-2xl font-bold leading-none text-bone tabular-nums">{value}</div>
      <div className="label-civic mt-1.5 text-[9px] text-bone-dim">{label}</div>
    </div>
  );
}

function kindColor(kind: string): string {
  if (kind === "treasury" || kind === "moderation" || kind === "slash") return "bg-seal";
  if (kind === "citizen" || kind === "president" || kind === "founding") return "bg-brass";
  return "bg-bone-dim";
}

function ago(at: number): string {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function trim(s: string) {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return (Math.round(n * 10000) / 10000).toString();
}
