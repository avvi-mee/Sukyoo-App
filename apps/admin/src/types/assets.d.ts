// Next normally provides this via the generated next-env.d.ts, which references
// next/types/global. In this monorepo that reference doesn't resolve (the
// hoisted next lives at the repo root), so declare the side-effect CSS import
// explicitly rather than loosening `strict` or excluding the file.
declare module '*.css';
