import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { signingDomain } from "./contract";

// A "session key" for gasless engagement: the user signs ONE delegation (one
// wallet popup), authorizing a browser-generated key to sign their reactions for
// 30 days. After that, likes/reposts/follows are signed silently by the delegate
// key — no popup. The delegate key is low-stakes: it can only sign off-chain
// Reaction messages our backend honors for this user; it can't touch funds or
// the chain. See [[bitchan-design-principles]] (defend with structure, not tedium).

const domain = signingDomain;
const DELEGATION_TYPES = {
  Delegation: [
    { name: "delegate", type: "address" },
    { name: "expiry", type: "uint256" },
  ],
} as const;
const TTL = 30 * 24 * 60 * 60; // seconds

export type Session = {
  privateKey: `0x${string}`;
  delegate: `0x${string}`;
  expiry: number;
  delegationSig: `0x${string}`;
};

type DelegationSigner = (args: {
  domain: typeof domain;
  types: typeof DELEGATION_TYPES;
  primaryType: "Delegation";
  message: { delegate: `0x${string}`; expiry: bigint };
}) => Promise<`0x${string}`>;

const storeKey = (user: string) => `bitchan.session.${user.toLowerCase()}`;

function load(user: string): Session | null {
  try {
    const raw = localStorage.getItem(storeKey(user));
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s.expiry <= Math.floor(Date.now() / 1000)) {
      localStorage.removeItem(storeKey(user));
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

/** Get a valid session, creating one (a single wallet popup) if none exists. */
export async function getSession(user: `0x${string}`, sign: DelegationSigner): Promise<Session> {
  const existing = load(user);
  if (existing) return existing;

  const privateKey = generatePrivateKey();
  const delegate = privateKeyToAccount(privateKey).address;
  const expiry = Math.floor(Date.now() / 1000) + TTL;
  const delegationSig = await sign({
    domain,
    types: DELEGATION_TYPES,
    primaryType: "Delegation",
    message: { delegate, expiry: BigInt(expiry) },
  });
  const session: Session = { privateKey, delegate, expiry, delegationSig };
  localStorage.setItem(storeKey(user), JSON.stringify(session));
  return session;
}
