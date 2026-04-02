# Next.js 16 App Router Export

This folder contains the source code converted for **Next.js 16 App Router**.

## How to use this in your Next.js project:

1. Create a new Next.js project if you haven't already:
   ```bash
   npx create-next-app@latest my-app
   ```
   (Select TypeScript, Tailwind CSS, App Router)

2. Copy the contents of `nextjs-export/src/` into your Next.js `src/` or `app/` directory as appropriate.
   - The `pages/` directory here corresponds to your route components. You'll need to rename them to `page.tsx` and place them in the correct folder structure (e.g., `app/claims/new/page.tsx`).
   - The `components/` directory can be placed in your `src/components/`.
   - The `store.ts` can be placed in your `src/store.ts`.

3. Install the required dependencies:
   ```bash
   npm install lucide-react date-fns sonner @react-google-maps/api zustand
   ```

4. Install shadcn/ui components:
   ```bash
   npx shadcn@latest init
   npx shadcn@latest add button card input label checkbox calendar popover select command dialog tabs
   ```

5. The routing hooks (`useRouter`, `usePathname`, `useSearchParams`, `useParams`) and `<Link>` components have already been converted to use `next/navigation` and `next/link`. All components have `'use client';` at the top where necessary.
