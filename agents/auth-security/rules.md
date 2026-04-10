# Auth-Security Rules

## DO
- Keep CSRF protection enabled for modifying requests.
- Validate required fields and data types server-side.
- Keep DEBUG off in production.
- Restrict ALLOWED_HOSTS in deployment.

## DO NOT
- Commit secrets to repository.
- Disable CSRF globally for convenience.
- Expose stack traces to end users.

## Quality Gates
A change is valid only if:
- Unsafe requests require CSRF token.
- Production checklist is documented.
