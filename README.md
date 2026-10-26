# CareSys information website

An independent HTML5 website for the CareSys application. It has its own repository, local Node server, public assets and private form inbox. It does not load the application's PHP code, connect to its MySQL database, proxy the mobile API or reuse application sessions. Only an explicit link opens the separate application.

## Run locally

Requires Node.js 20 or later. There are no npm dependencies.

```sh
npm run build
npm start
```

Open `http://localhost:8090`. The default bind address is loopback only. Stop with Ctrl+C. Windows helpers are in `deploy/`; they launch only the website process. `npm test` checks form persistence/validation, rate limits, origin rejection, privacy boundaries and media range requests.

Pages: Home, About, Module Information, Subscriptions, Tutorials, Customer Feedback, Contact and Website Privacy. `public/` is the only served directory. The page generator is `tools/build-pages.mjs`; CSS and browser behavior are in `public/assets/`.

## Prices and application links

Edit `content/site.json` and run `npm run build`. Current provisional pilot prices are Starter $59/month (10 active workers), Operations $129/month (30), Growth $249/month (75), and $3 per extra worker, all in USD. These are discussion prices, not live checkout products. Confirm taxes, module availability, scope and commercial terms before selling subscriptions. Set `applicationUrl` to the actual application host for another environment.

## Contact and customer feedback

Forms submit to website-only `/api/contact` and `/api/feedback`. Valid submissions are appended to private `var/contact.jsonl` and `var/feedback.jsonl`. The private directory is outside the public root and excluded from Git. Request sizes, field validation, consent, a honeypot, same-origin checks and per-process rate limits are enforced. Do not collect patient records or other sensitive care information here.

**Email delivery is not configured.** Submissions are received in the local inbox; no email is sent. Inspect them privately with `npm run inbox`. Restrict access to the operating-system account and data directory. Select a monitored email/CRM integration and define retention/deletion procedures before public launch.

Feedback remains private by default. The website starts without testimonials; no customer statements are fabricated. After reviewing a real submission and confirming explicit publication consent, publish it with `node tools/inbox.mjs publish <full-feedback-id>`. The public endpoint exposes only the approved first name, role, rating and feedback. Review the text for personal details before publishing it. Remove an item from `var/published-feedback.json` to withdraw it.

## Existing videos

Three existing CareSys videos are included in `public/media/`, with English WebVTT captions, readable transcripts, local poster images and native HTML5 video controls. The agency/caregiver versions use the same narration and timing, with different background music. The videos contain fictional demo records and mention some roadmap items; current capabilities are explained in the website copy. Native mobile apps and online payment collection are still planned.

## Deployment boundary

This site runs separately from the application and API. Keep production web hosting, website inbox storage, credentials and deployments separate too. Set `HOST`, `PORT`, `SITE_ORIGIN` and optionally `DATA_DIR` for your target. Environment files are not loaded automatically: supply environment variables through the process manager. Use HTTPS at the reverse proxy, secure inbox access, a shared rate-limit store before multiple instances, backups, retention and approved privacy/contact details before public launch.

`deploy/Dockerfile` builds the independent Node service. Container configuration is prepared but has not been runtime-tested on the current Windows machine because Docker is not installed. GitHub contains website source and approved media only, never inbox contents, runtime keys or application secrets.
