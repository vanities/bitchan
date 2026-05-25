import { useEffect } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { bitchanAbi, bitchanAddress, chain, electionAbi, electionAddress } from "../lib/contract";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;
const PHASES = ["Nomination", "Voting", "Closed"] as const;

export function ElectionCard() {
  const { address, isConnected } = useAccount();
  const valid = /^0x[0-9a-fA-F]{40}$/.test(electionAddress);
  const el = { address: electionAddress as `0x${string}`, abi: electionAbi, chainId: chain.id } as const;
  const live = { query: { enabled: valid, refetchInterval: 5000 } };
  const perUser = { query: { enabled: valid && !!address } };

  const phase = useReadContract({ ...el, functionName: "phase", ...live });
  const tally = useReadContract({ ...el, functionName: "tally", ...live });
  const finalized = useReadContract({ ...el, functionName: "finalized", query: { enabled: valid } });
  const winner = useReadContract({ ...el, functionName: "winner", query: { enabled: valid } });
  const hasVoted = useReadContract({ ...el, functionName: "hasVoted", args: [address ?? ZERO_ADDR], ...perUser });
  const canVote = useReadContract({
    address: bitchanAddress, abi: bitchanAbi, functionName: "canVote", args: [address ?? ZERO_ADDR], chainId: chain.id, ...perUser,
  });

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (!isSuccess) return;
    phase.refetch();
    tally.refetch();
    hasVoted.refetch();
    winner.refetch();
    finalized.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  if (!valid) return null;

  const ph = Number(phase.data ?? 0);
  const td = tally.data as readonly [readonly `0x${string}`[], readonly bigint[]] | undefined;
  const addrs = td?.[0] ?? [];
  const votes = td?.[1] ?? [];
  const fin = finalized.data === true;
  const win = winner.data as `0x${string}` | undefined;
  const voted = hasVoted.data === true;
  const eligible = canVote.data === true;
  const busy = isPending || mining;

  let leadIdx = -1;
  let leadV = -1n;
  votes.forEach((v, i) => {
    if (v > leadV) {
      leadV = v;
      leadIdx = i;
    }
  });

  function vote(c: `0x${string}`) {
    writeContract({ ...el, functionName: "castVote", args: [c] });
  }
  function nominate() {
    writeContract({ ...el, functionName: "nominate" });
  }
  function finalizeNow() {
    writeContract({ ...el, functionName: "finalize" });
  }

  return (
    <section className="rounded-lg border border-line bg-panel/60 p-4">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="label-civic text-[10px] text-bone-dim">presidential election</h2>
        <span className={`text-[10px] font-semibold ${ph === 1 ? "text-seal" : "text-bone-dim"}`}>{PHASES[ph]}</span>
      </header>

      {addrs.length === 0 ? (
        <p className="text-sm text-bone-dim">No candidates yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {addrs.map((c, i) => (
            <li key={c} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                  i === leadIdx && leadV > 0n ? "bg-seal text-white" : "bg-ink-soft text-bone-dim"
                }`}
              >
                {Number(votes[i] ?? 0n)}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-bone">
                {short(c)}
                {fin && win === c ? " · elected" : ""}
              </span>
              {ph === 1 && isConnected && eligible && !voted && (
                <button
                  onClick={() => vote(c)}
                  disabled={busy}
                  className="rounded-md bg-seal px-2.5 py-1 text-xs font-bold text-white transition hover:bg-seal-bright disabled:opacity-50"
                >
                  Vote
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2">
        {ph === 0 && isConnected && eligible && (
          <button
            onClick={nominate}
            disabled={busy}
            className="w-full rounded-md border border-brass px-3 py-1.5 text-sm font-semibold text-brass transition hover:bg-brass/10 disabled:opacity-50"
          >
            Run for president
          </button>
        )}
        {ph === 1 && isConnected && voted && <p className="text-center text-xs text-brass">✓ your vote is in</p>}
        {ph === 1 && isConnected && !eligible && <p className="text-center text-xs text-bone-dim">not an eligible voter yet</p>}
        {ph === 2 && !fin && (
          <button
            onClick={finalizeNow}
            disabled={busy}
            className="w-full rounded-md bg-seal px-3 py-1.5 text-sm font-bold text-white transition hover:bg-seal-bright disabled:opacity-50"
          >
            Finalize election
          </button>
        )}
        {fin && win && (
          <p className="text-center text-sm font-semibold text-bone">
            President-elect <span className="font-mono text-brass">{short(win)}</span>
          </p>
        )}
        {!isConnected && <p className="text-center text-xs text-bone-dim">Connect a wallet to vote.</p>}
      </div>

      {error && <p className="mt-2 font-mono text-[11px] text-seal">{error.message.split("\n")[0]}</p>}
    </section>
  );
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
