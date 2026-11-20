# Add the receiver file-review interface to FINBASE

Authoritative tested changes are on:
https://github.com/dilepanaravinda-art/finbase/pull/1
feature/liyanna-receiver-preview-20261119

1. Add components/LiyannaPreview.tsx and tests/e2e/liyanna-preview-ui.test.ts from this kit.
2. In components/IntegrationCenter.tsx, import LiyannaPreview from './LiyannaPreview.tsx'.
   Extend its api prop to (path:string,body?:unknown)=>Promise<unknown>.
   Add revenueMappings?:Array<{category:string}> with an empty-array default.
   Render <LiyannaPreview api={api} preview={preview} mappings={revenueMappings}/> inside IntegrationCenter.
3. In FinbaseApp's existing IntegrationCenter call, pass revenueMappings={setup.salesMappings??[]}.
   Preserve the existing scope-key remount, company-scope restriction and API wrapper.
4. Explain that automatic synchronization remains unavailable and that file review is a separate, read-only manual action.
5. Run pnpm test, pnpm run test:e2e and pnpm run build:vercel.

The file is read in memory. It is transmitted only after selecting a mapped income category, confirming the source business ID and explicitly submitting review consent.
Files over 60 KB are rejected before transmission. Existing server request-size limits still apply.
Company scope changes remount the parent interface, and loss of access clears file/result state and invalidates late requests.
No browser storage, saved import, persistent business binding or accounting posting is introduced.
