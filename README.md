# my-app

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Enable public application submissions

The application form inserts into `public.applications`. Run the migration in
`supabase/migrations/20261011000000_allow_public_application_submissions.sql`
against the project's Supabase database (or paste its contents into the
Supabase SQL Editor). This allows anonymous and authenticated visitors to
submit applications only for active organizations; application records remain
protected from public reads.

Organization logos use the `org-logos` Supabase Storage bucket. Run
`supabase/migrations/20261011000001_create_org_logos_bucket.sql` in the same
Supabase project before creating an organization with a logo.

Permanent organization deletion is restricted to active admin accounts. Run
`supabase/migrations/20261011000002_allow_admin_organization_deletion.sql`
to enable the delete action in the admin organization list.


### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
