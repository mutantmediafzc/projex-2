# Campaign Forms API

Production requests must use `https://www.creamcrm.io` directly. The apex domain redirects to the `www` host, and clients may remove the `Authorization` header while following that cross-host redirect.

All campaign sources submit through one endpoint:

- `POST /api/campaign-forms`

The API accepts any source name and does not apply source-specific or questionnaire field validation.

## Authorization

Exchange a valid Supabase email and password for an access token:

```http
POST /api/campaign-forms/authorize
Content-Type: application/json

{
  "email": "authorized-user@example.com",
  "password": "user-password"
}
```

Include the returned token with every submission:

```http
Authorization: Bearer <accessToken>
```

## Submit a campaign form

```http
POST /api/campaign-forms
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "source": "mm26-aeo",
  "sourceUrl": "https://www.mutant.ae/campaign/mm26-aeo",
  "answers": {
    "website": "https://example.com",
    "email": "jane@example.com",
    "customQuestion": "Any value"
  },
  "metadata": {
    "utm_source": "meta"
  }
}
```

`source` may be `mm26-aeo`, `mm26-pm`, or any other source name. For compatibility, `formSlug` is also accepted as an alias for `source`. `source_url` is accepted as an alias for `sourceUrl`.

Instead of `answers`, callers may provide any `questionnaire` array. When `answers` is supplied, it is stored as a questionnaire automatically. Top-level `website` and `email` fields are also accepted; otherwise they are taken from `answers` when present.

Before deploying, apply all pending migrations under `supabase/migrations/`.
