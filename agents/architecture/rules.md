# Architecture Rules

## DO
- Keep Controller -> Service -> Repository flow in backend.
- Keep Django templates focused on presentation and client interaction.
- Keep persistence logic inside models/services only.
- Document key decisions when changing structure.

## DO NOT
- Mix API transport concerns with persistence details.
- Place business rules directly in templates.
- Duplicate core logic across multiple layers.

## Quality Gates
A change is valid only if:
- Layer boundaries are preserved.
- The flow of data is clear and testable.
