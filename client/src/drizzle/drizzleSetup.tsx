import { Drizzle, generateStore } from "@drizzle/store";

import { options } from "./drizzleOptions";


export const setupDrizzle = () => {
  console.log("setticng up drizzle");
  const drizzleStore = generateStore(options);
  console.log("Setting up Drizzle:", options, drizzleStore);
  return new Drizzle(options, drizzleStore);
};
