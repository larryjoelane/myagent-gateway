# Testing that endpoints are authenticated

Commands to confirm the deployed gateway rejects unauthenticated requests. Every
endpoint must return `HTTP 401`. No secret needed — these test the locked-down case.

## Bash (Git Bash)

```bash
# registry: no token
curl -s -w "\nHTTP %{http_code}\n" https://registry.yourdomainname/npm/left-pad

# registry: bogus token
curl -s -w "\nHTTP %{http_code}\n" -H "Authorization: Bearer not-a-real-token" https://registry.yourdomainname/npm/left-pad

# context7: no token
curl -s -w "\nHTTP %{http_code}\n" "https://context7.yourdomainname/search?libraryName=react"

# context7: bogus token
curl -s -w "\nHTTP %{http_code}\n" -H "Authorization: Bearer not-a-real-token" "https://context7.yourdomainname/search?libraryName=react"
```

Each must print `{"error":"unauthorized",...}` and `HTTP 401`.

## PowerShell

PowerShell's `curl` is an alias for `Invoke-WebRequest` and does not accept real
curl flags, so use `Invoke-WebRequest` directly:

```powershell
# registry: no token — prints 401
(Invoke-WebRequest -Uri "https://registry.yourdomainname/npm/left-pad" -SkipHttpErrorCheck).StatusCode

# context7: no token — prints 401
(Invoke-WebRequest -Uri "https://context7.yourdomainname/search?libraryName=react" -SkipHttpErrorCheck).StatusCode
```

Each must print `401`. If any endpoint returns `200` without a token, auth is not
being enforced on that path.
