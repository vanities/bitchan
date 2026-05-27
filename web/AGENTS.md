<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Vercel (deploy + env)

Project `bitchan` (scope `vanities`), linked in `web/.vercel`. The frontend is a
**Vite SPA — `VITE_*` env vars are baked at BUILD time**, so changing one only
takes effect on the next deploy. Run from `web/`:

```bash
vercel env ls                                           # list
printf '<value>' | vercel env add VITE_FOO production   # add (non-interactive; no trailing newline)
vercel env rm VITE_FOO production --yes                 # remove
vercel --prod --yes                                     # deploy prod (bakes in current env)
```

Project env vars (set in Vercel, not committed):

- `VITE_ELECTION_ADDRESS` — active `BitchanElections` address. The app reads it
  from this env (default `""` = no election wired), so it must be re-set to the new
  address after every Sepolia redeploy, then redeploy the frontend. Current:
  `0x47B79bEe2A97F863fa6B8377272688a6f9e80E1f` (2026-05-27 deploy).
- `VITE_BITCHAN_ADDRESS` / `VITE_CHAIN` / `VITE_CONVEX_URL` — optional overrides;
  `SEPOLIA_REPUBLIC` has an in-code default in `src/lib/contract.ts`.
