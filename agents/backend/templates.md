# Backend Templates

## Endpoint Template
- Route: /api/resource/
- Methods: GET, POST
- Validation: required fields + types
- Response 200/201: { "data": ... }
- Response 400: { "error": "..." }

## Service Flow Template
- Parse request input
- Validate business constraints
- Persist using model/repository
- Map to response DTO
