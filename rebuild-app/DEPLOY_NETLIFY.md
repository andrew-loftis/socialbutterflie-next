# Netlify Deploy (Reliable)

## Last successful deploy — 2026-02-23

**Site:** https://socialbutterflie.studio  
**Netlify project:** `shimmering-alpaca-782093`  
**Unique deploy URL:** https://699c5d398418db94e4ada3d9--shimmering-alpaca-782093.netlify.app  
**Build time:** ~52 s | **Routes:** 28 (19 static, 9 dynamic)

### Build fixes applied before this deploy

1. **`src/app/(app)/studio/page.tsx`** — File had leftover dead JSX after the redirect component body, causing a `Return statement is not allowed here` syntax error. Overwrote the file with only the clean redirect:
   ```tsx
   "use client";
   import { useEffect } from 'react';
   import { useRouter } from 'next/navigation';
   export default function StudioPage() {
     const router = useRouter();
     useEffect(() => { router.replace('/build'); }, [router]);
     return null;
   }
   ```

2. **`src/app/(app)/build/page.tsx` line 128** — `activeCompany.sections?.identity?.description` caused a TypeScript type error because the `identity` section type has `mission`/`tagline`/`legalName` but no `description` field. Fixed to:
   ```tsx
   context: activeCompany.sections?.identity?.mission ?? activeCompany.sections?.identity?.tagline ?? '',
   ```

---

This Next.js app deploys correctly to Netlify only when you deploy the build artifacts produced by the Netlify Next.js runtime.

If you `netlify deploy --prod --dir <some folder>` without the generated functions, you will commonly get `Page not found` on routes that require the Next.js server handler.

## The Known-Good Production Deploy

Run from `rebuild-app/`:

```powershell
netlify build
netlify deploy --no-build --prod --dir .netlify/static --functions .netlify/functions-internal
```

Notes:
- `netlify build` generates the correct publish output in `.netlify/static` and the Next handler in `.netlify/functions-internal`.
- `--no-build` ensures the deploy uses exactly those artifacts (and avoids local/CI differences).

## Common Failure Modes

If production shows `Page not found`:
- You likely deployed the wrong folder (for example `.next/` or `out/`) and/or did not deploy `.netlify/functions-internal`.
- Re-run the two commands above exactly.

If the deploy command appears to "hang":
- It can spend time "Uploading blobs" and "CDN diffing". Let it finish.
- If it runs for a very long time, cancel and re-run the deploy command (the build artifacts are already present after `netlify build`).

