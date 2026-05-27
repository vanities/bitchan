import { convex } from "./convex";
import { api } from "../../convex/_generated/api";
import { chain } from "./contract";

// Off-chain avatar: upload an image (media), then sign the resulting hash so the
// backend can record it on your account. Infrequent action → a direct wallet
// signature (not the session key).
const domain = { name: "bitchan", version: "1", chainId: chain.id } as const;
const types = { Avatar: [{ name: "avatar", type: "string" }] } as const;

export async function setAvatar(opts: {
  address: `0x${string}`;
  avatar: `0x${string}`;
  signTypedDataAsync: (args: {
    domain: typeof domain;
    types: typeof types;
    primaryType: "Avatar";
    message: { avatar: string };
  }) => Promise<`0x${string}`>;
}): Promise<void> {
  const signature = await opts.signTypedDataAsync({
    domain,
    types,
    primaryType: "Avatar",
    message: { avatar: opts.avatar },
  });
  await convex.action(api.avatar.set, { address: opts.address, avatar: opts.avatar, signature });
}
