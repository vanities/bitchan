import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { ConvexProvider } from "convex/react";
import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";
import { wagmiConfig } from "./wagmi";
import { convex } from "./lib/convex";
import App from "./App";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConvexProvider client={convex}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: "#e5384e",
              accentColorForeground: "#ffffff",
              borderRadius: "medium",
              fontStack: "system",
            })}
          >
            <App />
          </RainbowKitProvider>
        </ConvexProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
