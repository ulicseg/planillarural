# Backend Rules

## DO
- Validate required inputs on create and update.
- Return consistent JSON response shapes.
- Keep errors user-safe (no stack traces in responses).
- Keep endpoints small and explicit.

## DO NOT
- Trust frontend inputs without validation.
- Return HTML from JSON endpoints.
- Put SQL queries directly in views.

## Quality Gates
A change is valid only if:
- CRUD endpoints are functional.
- Invalid data returns 4xx with clear message.
