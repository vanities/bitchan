import { drizzleReactHooks } from "@drizzle/react-plugin";

export function UserExists () {
  const { useCacheCall } = drizzleReactHooks.useDrizzle();
  const exists = useCacheCall("User", "exists");
  return exists;
}
