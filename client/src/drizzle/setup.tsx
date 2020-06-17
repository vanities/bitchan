import { Drizzle, generateStore } from "@drizzle/store";

import { options } from "./options";

export function setupDrizzle () {
  console.log("setting up drizzle");
  const drizzleStore = generateStore(options);
  console.log("Setting up Drizzle:", options, drizzleStore);
  return new Drizzle(options, drizzleStore);
}
