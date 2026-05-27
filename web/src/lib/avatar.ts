import { convex } from "./convex";
import { api } from "../../convex/_generated/api";
import { signingDomain, signatureDeadline } from "./contract";

// Off-chain avatar: upload an image (media), then sign the resulting hash so the
// backend can record it on your account. Infrequent action → a direct wallet
// signature (not the session key).
const domain = signingDomain;
const types = {
  Avatar: [
    { name: "avatar", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export async function setAvatar(opts: {
  address: `0x${string}`;
  avatar: `0x${string}`;
  signTypedDataAsync: (args: {
    domain: typeof domain;
    types: typeof types;
    primaryType: "Avatar";
    message: { avatar: string; deadline: bigint };
  }) => Promise<`0x${string}`>;
}): Promise<void> {
  const deadline = BigInt(signatureDeadline());
  const signature = await opts.signTypedDataAsync({
    domain,
    types,
    primaryType: "Avatar",
    message: { avatar: opts.avatar, deadline },
  });
  await convex.action(api.avatar.set, {
    address: opts.address,
    avatar: opts.avatar,
    deadline: deadline.toString(),
    signature,
  });
}
