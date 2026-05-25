import { useEffect, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { formatEther, keccak256, stringToBytes } from "viem";
import { ShieldCheck } from "lucide-react";
import { bitchanAbi, bitchanAddress, chain } from "../lib/contract";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

export function CitizenshipCard() {
  const { address, isConnected } = useAccount();
  const qc = useQueryClient();
  const [inviteIn, setInviteIn] = useState("");
  const [mintedCode, setMintedCode] = useState<string | null>(null);

  const gated = { query: { enabled: isConnected && !!address } };
  const base = { address: bitchanAddress, abi: bitchanAbi, chainId: chain.id } as const;

  const cost = useReadContract({ ...base, functionName: "citizenshipCost" });
  const ageThreshold = useReadContract({ ...base, functionName: "ageThreshold" });
  const citizen = useReadContract({ ...base, functionName: "isCitizen", args: [address ?? ZERO_ADDR], ...gated });
  const voter = useReadContract({ ...base, functionName: "canVote", args: [address ?? ZERO_ADDR], ...gated });
  const regAt = useReadContract({ ...base, functionName: "registeredAt", args: [address ?? ZERO_ADDR], ...gated });

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    citizen.refetch();
    voter.refetch();
    regAt.refetch();
    qc.invalidateQueries({ queryKey: ["stats"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  if (!isConnected) {
    return (
      <Shell>
        <p className="text-sm text-bone-dim">Connect a wallet to join the republic. Reading is free; citizenship lets you vote.</p>
      </Shell>
    );
  }

  const isCit = citizen.data === true;
  const canV = voter.data === true;
  const reg = regAt.data ? Number(regAt.data) : 0;
  const thr = ageThreshold.data ? Number(ageThreshold.data) : 0;
  const now = Math.floor(Date.now() / 1000);
  const daysLeft = isCit && !canV && reg ? Math.max(0, Math.ceil((reg + thr - now) / 86400)) : 0;
  const costEth = cost.data !== undefined ? formatEther(cost.data as bigint) : "…";
  const busy = isPending || mining;

  function claim() {
    writeContract({ ...base, functionName: "claimCitizenship", value: (cost.data as bigint | undefined) ?? 0n });
  }
  function mint() {
    const code = keccak256(stringToBytes(`${address}-${Date.now()}-${Math.random()}`));
    setMintedCode(code);
    writeContract({ ...base, functionName: "mintInvite", args: [code] });
  }
  function redeem() {
    const code = inviteIn.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(code)) return;
    writeContract({ ...base, functionName: "redeemInvite", args: [code as `0x${string}`] });
  }

  return (
    <Shell>
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className={isCit ? "text-brass" : "text-bone-dim"} strokeWidth={2.2} />
        <span className="text-sm font-semibold text-bone">
          {isCit ? "Citizen" : "Anonymous"}
        </span>
        <span className="ml-auto text-[11px] text-bone-dim">
          {isCit ? (canV ? "can vote" : `votes in ${daysLeft}d`) : "reading only"}
        </span>
      </div>

      {!isCit && (
        <div className="mt-3 space-y-2">
          <button
            onClick={claim}
            disabled={busy}
            className="w-full rounded-md bg-seal px-3 py-2 text-sm font-bold text-white transition hover:bg-seal-bright disabled:opacity-50"
          >
            {busy ? "confirming…" : `Become a citizen · ${costEth} ETH`}
          </button>
          <div className="flex gap-1.5">
            <input
              value={inviteIn}
              onChange={(e) => setInviteIn(e.target.value)}
              placeholder="paste an invite code"
              className="min-w-0 flex-1 rounded-md border border-line bg-ink-soft px-2 py-1.5 font-mono text-[11px] placeholder:text-bone-dim focus:border-brass focus:outline-none"
            />
            <button
              onClick={redeem}
              disabled={busy || !inviteIn.trim()}
              className="rounded-md border border-brass px-2.5 text-xs font-semibold text-brass transition hover:bg-brass/10 disabled:opacity-40"
            >
              redeem
            </button>
          </div>
        </div>
      )}

      {isCit && (
        <div className="mt-3">
          <button
            onClick={mint}
            disabled={busy}
            className="w-full rounded-md border border-line px-3 py-2 text-sm font-semibold text-bone-dim transition hover:border-brass hover:text-brass disabled:opacity-50"
          >
            {busy ? "minting…" : "Mint an invite"}
          </button>
          {mintedCode && (
            <p className="mt-2 break-all rounded-md bg-ink-soft px-2 py-1.5 font-mono text-[10px] text-bone-dim">
              share this code: <span className="text-bone">{mintedCode}</span>
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-2 font-mono text-[11px] text-seal">{error.message.split("\n")[0]}</p>}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-panel/60 p-4">
      <h2 className="label-civic mb-2 text-[10px] text-bone-dim">citizenship</h2>
      {children}
    </section>
  );
}
