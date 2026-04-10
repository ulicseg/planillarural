# Database Rules

## DO
- Use clear snake_case model fields.
- Add migrations for schema changes.
- Keep nullable fields explicit.
- Keep default ordering deterministic.

## DO NOT
- Store duplicate calculated values without need.
- Mix unrelated entities in one model.
- Skip migration generation.

## Quality Gates
A change is valid only if:
- Migrations apply cleanly.
- CRUD operations persist expected data.
