# Frontend Rules

## DO
- Keep UI labels explicit and easy to understand.
- Keep forms responsive and mobile-first.
- Handle API errors with user-readable messages.
- Escape dynamic HTML to prevent XSS.

## DO NOT
- Store source of truth in localStorage when backend exists.
- Expose internal error details to users.
- Use blocking alerts for normal feedback.

## Quality Gates
A change is valid only if:
- Main flow create/edit/delete works end-to-end.
- Search works without page reload.
