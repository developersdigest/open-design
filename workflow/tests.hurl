# Brand workflow webhook tests
#
# Usage:
#   hurl --variable baseUrl=http://localhost:5678/webhook/brand workflow/tests.hurl
#   hurl --test --variable baseUrl=http://localhost:5678/webhook/brand workflow/tests.hurl
#
# Install hurl:
#   brew install hurl   (or see https://hurl.dev/docs/installation.html)
#
# Variables (override with --variable name=value):
#   baseUrl       default: http://localhost:5678/webhook/brand
#   brand_run_id  default: test-run-1

[Options]
variable: baseUrl=http://localhost:5678/webhook/brand
variable: brand_run_id=test-run-1


# 1. Decode — extract brand info from a URL
POST {{baseUrl}}/decode
Content-Type: application/json
{
  "url": "https://stripe.com",
  "brand_run_id": "{{brand_run_id}}"
}

HTTP 200
[Asserts]
jsonpath "$.copy.brand_name" exists
jsonpath "$.branding" exists
jsonpath "$.source_url" exists
[Captures]
branding: jsonpath "$.branding"
copy: jsonpath "$.copy"
source_url: jsonpath "$.source_url"


# 2. Design — generate design markdown from decoded brand
POST {{baseUrl}}/design
Content-Type: application/json
{
  "brand_run_id": "{{brand_run_id}}",
  "branding": {{branding}},
  "copy": {{copy}},
  "source_url": "{{source_url}}"
}

HTTP 200
[Asserts]
jsonpath "$.design_md" isString
jsonpath "$.design_md" matches /.{100,}/
[Captures]
design_md: jsonpath "$.design_md"


# 3. HTML — render design markdown to HTML
POST {{baseUrl}}/html
Content-Type: application/json
{
  "brand_run_id": "{{brand_run_id}}",
  "design_md": "{{design_md}}"
}

HTTP 200
[Asserts]
jsonpath "$.html" matches /(?i)^<!doctype/


# 4. Assets — produce asset bundle from branding/copy/design
POST {{baseUrl}}/assets
Content-Type: application/json
{
  "brand_run_id": "{{brand_run_id}}",
  "branding": {{branding}},
  "copy": {{copy}},
  "design_md": "{{design_md}}"
}

HTTP 200
[Asserts]
jsonpath "$.assets" count == 4
jsonpath "$.assets[0].url" matches /^https:\/\//
