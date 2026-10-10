# Contrato HTTP: Base del proyecto

Base URL local: `http://localhost:3000` (o el `PORT` configurado).

## GET /health

Informa si el servicio y la base de datos están disponibles. No requiere autenticación.

**200 OK**: servicio y base disponibles

```json
{ "service": "up", "database": "up" }
```

**503 Service Unavailable**: el servicio responde pero la base no

```json
{ "service": "up", "database": "down" }
```

Garantías:
- Responde en menos de 1 s con la base arriba y en menos de 5 s con la base caída (timeout
  interno de 2 s).
- El servicio no se cae si la base no está. Cuando la base vuelve, la próxima consulta
  responde 200 sin reiniciar el servicio.

## Formato de error (todas las rutas)

Todo error del servicio responde con esta estructura:

```json
{ "error": { "type": "VALIDATION_ERROR", "message": "Texto legible" } }
```

| `type` | Status | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 (u otro 4xx de Fastify) | Datos de entrada inválidos, JSON mal formado |
| `NOT_FOUND` | 404 | Recurso o ruta inexistente |
| `INTERNAL_ERROR` | 500 | Cualquier error inesperado |

Ejemplo de ruta inexistente: `GET /no-existe` → 404

```json
{ "error": { "type": "NOT_FOUND", "message": "Ruta GET /no-existe no encontrada" } }
```

Un `INTERNAL_ERROR` siempre lleva el mensaje genérico `"Error interno del servidor"`. El
detalle (mensaje original y stack) se registra en el log del servicio, nunca en la respuesta.
