import { verifyTypedData, type Hex, type TypedDataDomain } from "viem";

// Shared EIP-712 verification for the Node-runtime actions that gate writes on a
// wallet signature (reactions, profile, avatar, galleries, media). Lives in a
// Node-only module because viem's verifyTypedData dynamically imports secp256k1,
// which the default Convex runtime forbids.
//
// The domain is bound to the chain (chainId) AND the deployment (verifyingContract
// = the BitchanRepublic address), so a signature can't be replayed across chains or
// across sibling/forked deployments. Every signer (client + server) must build the
// identical domain — see web/src/lib/contract.ts `signingDomain`.
export function bitchanDomain(): TypedDataDomain {
  const verifyingContract = process.env.BITCHAN_ADDRESS as Hex | undefined;
  if (!verifyingContract) {
    console.warn(
      "[eip712] BITCHAN_ADDRESS unset — domain has no verifyingContract; signatures will not verify",
    );
  }
  return {
    name: "bitchan",
    version: "1",
    chainId: Number(process.env.CHAIN_ID ?? "31337"),
    ...(verifyingContract ? { verifyingContract } : {}),
  };
}

const DELEGATION_TYPES = {
  Delegation: [
    { name: "delegate", type: "address" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

// Optional session-delegation: the author authorized a browser key (`delegate`) to
// sign on their behalf until `expiry` (see web/src/lib/session.ts).
export type Delegation = {
  delegate?: string;
  expiry?: string;
  delegationSig?: string;
};

type VerifyTypedDataArgs = Parameters<typeof verifyTypedData>[0];

/**
 * Verify that `address` authorized `message`, by one of two paths:
 *  - direct: `address` itself signed `message`.
 *  - delegated: `address` signed a Delegation authorizing `delegate`, and `delegate`
 *    then signed `message` (the gasless, popup-free session-key path).
 *
 * The signed `message` MUST include a `deadline` (unix seconds) and the caller must
 * pass that same value as `deadline` — expired signatures are refused, so a captured
 * signature can't be replayed indefinitely. Returns the lowercased actor address on
 * success, or `null` on any failure (each rejection logged with `label`).
 */
export async function verifyActor(opts: {
  label: string;
  address: string;
  types: Record<string, readonly { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
  signature: string;
  deadline: number | string;
  delegation?: Delegation;
}): Promise<string | null> {
  const { label, address, types, primaryType, message, signature, deadline, delegation } = opts;

  const dl = Number(deadline);
  if (!Number.isFinite(dl) || dl < Math.floor(Date.now() / 1000)) {
    console.warn(`[${label}] reject: signature expired (deadline ${deadline}) for ${address}`);
    return null;
  }

  const domain = bitchanDomain();
  const delegated = !!(delegation?.delegate && delegation?.delegationSig && delegation?.expiry);
  try {
    if (delegated) {
      const expirySec = Number(delegation!.expiry);
      if (!Number.isFinite(expirySec) || expirySec <= Math.floor(Date.now() / 1000)) {
        console.warn(`[${label}] reject: session expired or bad expiry for ${address}`);
        return null;
      }
      const authedDelegate = await verifyTypedData({
        address: address as Hex,
        domain,
        types: DELEGATION_TYPES,
        primaryType: "Delegation",
        message: { delegate: delegation!.delegate as Hex, expiry: BigInt(delegation!.expiry!) },
        signature: delegation!.delegationSig as Hex,
      });
      if (!authedDelegate) {
        console.warn(`[${label}] reject: delegation not signed by ${address}`);
        return null;
      }
      const signedByDelegate = await verifyTypedData({
        address: delegation!.delegate as Hex,
        domain,
        types,
        primaryType,
        message,
        signature: signature as Hex,
      } as VerifyTypedDataArgs);
      if (!signedByDelegate) {
        console.warn(`[${label}] reject: payload not signed by delegate for ${address}`);
        return null;
      }
      return address.toLowerCase();
    }

    const signedDirectly = await verifyTypedData({
      address: address as Hex,
      domain,
      types,
      primaryType,
      message,
      signature: signature as Hex,
    } as VerifyTypedDataArgs);
    if (!signedDirectly) {
      console.warn(`[${label}] reject: bad signature for ${address}`);
      return null;
    }
    return address.toLowerCase();
  } catch (e) {
    console.error(`[${label}] verify threw for ${address}`, e);
    return null;
  }
}
