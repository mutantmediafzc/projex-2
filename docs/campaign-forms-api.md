# Campaign Forms API

The two campaigns have separate endpoints:

- `GET|POST /api/campaign-forms/mm26-aeo`
- `GET|POST /api/campaign-forms/mm26-pm`

`GET` returns the canonical questions for that form. `POST` validates and stores a submission.

## Authorization

First exchange a valid Supabase email and password for a short-lived, campaign-scoped token:

```http
POST /api/campaign-forms/authorize
Content-Type: application/json

{
  "email": "authorized-user@example.com",
  "password": "user-password"
}
```

The returned token is valid for one hour and can be used to submit either campaign form. Include it when submitting:

```http
Authorization: Bearer <accessToken>
```

Set `CAMPAIGN_FORMS_TOKEN_SECRET` to a cryptographically random value of at least 32 characters in every deployed environment. Do not expose this value to the browser; it is different from the short-lived access token returned by the authorization endpoint.

## Recommended POST body

```json
{
  "answers": {
    "website": "https://example.com",
    "business": "Real Estate",
    "ranking": "Page 2 or beyond",
    "aiSearch": "Never tried it",
    "traffic": "Mostly paid",
    "frustration": ["Competitors outrank us"],
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phoneCountryCode": "+971",
    "mobile": "501234567"
  },
  "metadata": {
    "utm_source": "meta"
  }
}
```

The API also accepts a `questionnaire` array when the client needs to send both the question and answer:

```json
{
  "questionnaire": [
    {
      "id": "website",
      "question": "What is your company website?",
      "answer": "https://example.com"
    }
  ]
}
```

Every required question must be included. Question text supplied by a client must exactly match the canonical question returned by `GET`. The saved `questionnaire` always contains both the canonical question and its validated answer.

Before deploying, apply `supabase/migrations/20260803_create_campaign_form_submissions.sql` to the configured Supabase project.
