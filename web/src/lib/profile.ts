import { convex } from "./convex";
import { api } from "../../convex/_generated/api";
import { signingDomain, signatureDeadline } from "./contract";

// Off-chain profile (bio/banner/website): the owner signs the fields and the
// backend records them on their account. Infrequent → a direct wallet signature
// (not the session key). Mirrors lib/avatar.ts.
const domain = signingDomain;
const types = {
  Profile: [
    { name: "bio", type: "string" },
    { name: "banner", type: "string" },
    { name: "website", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export async function setProfile(opts: {
  address: `0x${string}`;
  bio: string;
  banner: string;
  website: string;
  signTypedDataAsync: (args: {
    domain: typeof domain;
    types: typeof types;
    primaryType: "Profile";
    message: { bio: string; banner: string; website: string; deadline: bigint };
  }) => Promise<`0x${string}`>;
}): Promise<void> {
  const deadline = BigInt(signatureDeadline());
  const signature = await opts.signTypedDataAsync({
    domain,
    types,
    primaryType: "Profile",
    message: { bio: opts.bio, banner: opts.banner, website: opts.website, deadline },
  });
  await convex.action(api.profile.set, {
    address: opts.address,
    bio: opts.bio,
    banner: opts.banner,
    website: opts.website,
    deadline: deadline.toString(),
    signature,
  });
}

const pinTypes = {
  Pin: [
    { name: "postId", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

/** Pin a post (or unpin with postId="") to your profile. Signs Pin{postId,deadline}. */
export async function setPin(opts: {
  address: `0x${string}`;
  postId: string;
  signTypedDataAsync: (args: {
    domain: typeof domain;
    types: typeof pinTypes;
    primaryType: "Pin";
    message: { postId: string; deadline: bigint };
  }) => Promise<`0x${string}`>;
}): Promise<void> {
  const deadline = BigInt(signatureDeadline());
  const signature = await opts.signTypedDataAsync({
    domain,
    types: pinTypes,
    primaryType: "Pin",
    message: { postId: opts.postId, deadline },
  });
  await convex.action(api.profile.pin, {
    address: opts.address,
    postId: opts.postId,
    deadline: deadline.toString(),
    signature,
  });
}
