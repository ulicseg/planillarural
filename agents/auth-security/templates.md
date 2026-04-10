# Auth-Security Templates

## Security Checklist Template
- CSRF active
- Input validation active
- DEBUG false in production
- ALLOWED_HOSTS configured
- SECRET_KEY loaded from environment

## Error Response Template
- 400: invalid input
- 403: forbidden/CSRF
- 500: generic safe message
