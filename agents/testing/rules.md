# Testing Rules

## DO
- Test happy path and invalid input path.
- Test create, list, update, and delete endpoints.
- Keep tests deterministic and isolated.

## DO NOT
- Depend on external services for core tests.
- Leave broken tests in default branch.

## Quality Gates
A change is valid only if:
- CRUD tests pass.
- Validation tests pass.
