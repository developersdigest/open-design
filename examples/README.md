# Examples

Sample request bodies for testing the brand webhooks. Use with: `curl -d @examples/decode-stripe.json -H Content-Type:application/json http://localhost:5678/webhook/brand/decode`

| File | Route |
|------|-------|
| `decode-stripe.json` | `POST /webhook/brand/decode` |
| `decode-vercel.json` | `POST /webhook/brand/decode` |
| `decode-linear.json` | `POST /webhook/brand/decode` |
| `design.json` | `POST /webhook/brand/design` |
| `html.json` | `POST /webhook/brand/html` |
| `assets.json` | `POST /webhook/brand/assets` |
