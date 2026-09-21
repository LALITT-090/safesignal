# SafeSignal

SafeSignal is an anonymous community safety reporting application designed to help individuals submit incidents without sharing personal details while surfacing connected safety signals for human review.

## What it does

- Anonymous incident reporting for safety concerns
- Safety signal pattern grouping based on location, time, category and behaviour
- Authority dashboard for reviewing emerging patterns
- Report lookup and later detail updates through a secure report ID flow
- Geographic map view for connected incidents

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase for persistence and auth
- Leaflet for map visualization

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add the required environment variables:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   AUTHORITY_EMAILS=authority@example.com,team@example.com
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Production checks

```bash
npm run build
npm run lint
```

## Safety model

SafeSignal is intended for human review and decision support. It surfaces possible patterns for investigation rather than making definitive judgments on guilt, identity or responsibility.
