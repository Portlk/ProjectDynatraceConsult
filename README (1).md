# Portal OB Ventas Digitales

Portal interno que consulta Dynatrace (USQL) y devuelve el conteo de onboarding
para un rango de fechas elegido por el usuario. El token de Dynatrace nunca vive
en el codigo: se inyecta como variable de entorno desde un Secret de OpenShift.

## Estructura

- `server.js` — backend (proxy hacia el API de Dynatrace)
- `public/index.html` — formulario con calendario y resultado
- `package.json` — define Node y la dependencia (express)

## Variables de entorno

| Variable    | Descripcion                                   | Requerida |
|-------------|-----------------------------------------------|-----------|
| `DT_TOKEN`  | Token de Dynatrace con scope `DTAQLAccess`    | Si        |
| `DT_TENANT` | Host del tenant (default: ylf61356.live...)   | No        |
| `PORT`      | Puerto (OpenShift lo asigna, default 8080)    | No        |

## Despliegue en OpenShift (Import from Git)

1. Sube esta carpeta a un repositorio Git interno.
2. En la consola (perspectiva Developer): +Add > Import from Git.
3. Pega la URL del repo. OpenShift detecta Node y construye la imagen.
4. Crea un Secret `dynatrace-token` con la clave `DT_TOKEN`.
5. En el Deployment > Environment, agrega `DT_TOKEN` desde ese Secret.
6. Expon el Route y restringelo a la red interna (coordinar con plataforma).

## Probar localmente (opcional)

```
npm install
DT_TOKEN=tu_token_nuevo npm start
```
Luego abre http://localhost:8080
