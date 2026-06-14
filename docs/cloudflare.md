# Cloudflare Feature Integrations

The platform is designed to run exclusively on Cloudflare’s developer platform to optimize for low latency, serverless execution, and zero cold starts.

## Cloudflare KV (Caching)

We use **Workers KV** for caching expensive aggregated calculations and stable question assets:

- **Cached Elements**:
  - Global question bank lists (re-validated on Admin updates).
  - Subject performance metrics.
  - High-traffic public guidelines index.
- **Cache Invalidation**:
  - When an Admin updates or creates questions, the worker wipes the cached key using:
    ```typescript
    await env.KV.delete(`bank:${bankId}`);
    ```

## Cloudflare R2 (Storage)

**R2 Object Storage** hosts static medical resources and document guidelines without egress charges:

- File assets, images uploaded by instructors, and sample PDFs are directed to the storage bucket.
- The worker exposes a route that returns pre-signed upload URLs (`@aws-sdk/client-s3` compatible) or digests file uploads directly into R2.

## Cloudflare Turnstile (Anti-Bot)

To protect candidate registration pathways and limit brute-force credential stuffing, **Cloudflare Turnstile** is integrated into authentication forms:

- **Frontend**: The login/register pages mount the lightweight Turnstile widget.
- **Worker**: The worker validates the client-side token by dispatching a background verification payload directly to `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
