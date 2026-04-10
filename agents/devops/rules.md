# DevOps Rules

## DO
- Keep dependency list explicit.
- Document startup commands for WSGI hosting.
- Keep secrets in environment variables.

## DO NOT
- Hardcode production credentials in code.
- Skip post-deploy smoke checks.

## Quality Gates
A change is valid only if:
- Deployment steps are reproducible.
- Environment-specific settings are documented.
