# Guía de operación e instalación — DevTesters Delivery's Granada

Esta plataforma sirve a empresas de delivery que reciben solicitudes por WhatsApp. Los clientes **no instalan una app**: escriben al número Business de la empresa. El equipo atiende la bandeja web y los motorizados trabajan desde la PWA con su propia cuenta.

## Módulos web

| Módulo | Uso principal |
| --- | --- |
| Panel | Resume pedidos activos, entregas, motorizados, flota e incidencias. |
| Conversaciones | Recibe mensajes de WhatsApp, responde al cliente y convierte la solicitud en pedido. También permite crear una conversación manual para llamadas. |
| Pedidos | Consulta el estado y cobro de todos los pedidos reales de la empresa. |
| Mapa en vivo | Muestra pedidos aceptados, última ubicación GPS y alertas de desvío. No inventa posiciones cuando no hay servicio activo. |
| Motorizados | Registra e invita al repartidor por correo. Cada invitación crea un acceso PWA independiente. |
| Vehículos | Registra motos, odómetro, combustible y próximo mantenimiento. |
| Tarifas | Define zonas, delivery, gestión, mínimo y política de cancelación. |
| Incidencias | Revisa y resuelve reportes del motorizado o de operaciones. |
| Reportes | Calcula entregas, ingresos, estados, combustible y flota usando los datos de la empresa. |
| Configuración | Edita datos de empresa, horario, saludo WhatsApp, OTP, GPS, desviación de ruta y mantenimiento. |

## Flujo diario de un pedido

1. El cliente escribe al WhatsApp Business de la empresa.
2. La bandeja crea o actualiza la conversación y guarda el mensaje en la empresa correcta.
3. El operador responde, define servicio, comercio, dirección, referencia, zona, producto, gestión, delivery y pago.
4. El administrador u operador confirma con el cliente. Las transferencias requieren validación manual.
5. Se asigna un motorizado que tenga cuenta activada, turno abierto y vehículo apto.
6. El administrador recibe el OTP de un solo uso. El motorizado acepta en su PWA; entonces se activa su GPS.
7. El motorizado llega al comercio, confirma compra, va al cliente e ingresa el OTP para finalizar.
8. El pedido, caja, combustible, GPS e incidencias quedan registrados para reportes.

## Configuración local (sin Docker)

Requisitos: Node.js 22+, Docker Desktop y Supabase CLI.

```bash
npm install
npm run db:up
# copia las claves locales que imprime Supabase a .env.local
npm run db:reset
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), crea una empresa desde **Crea tu empresa** y completa el onboarding. `npm run db:reset` reinicia la base local y borra datos de prueba.

## Configuración con Docker

Primero inicia Supabase local en Docker:

```bash
npm run db:up
docker compose up --build
```

La web queda en [http://localhost:3000](http://localhost:3000). El contenedor usa `SUPABASE_SERVER_URL=http://host.docker.internal:54321` solo internamente; el navegador continúa usando `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`.

Para detenerlo:

```bash
docker compose down
npm run db:down
```

## Variables de entorno

Copia `.env.example` a `.env.local`. Nunca subas `.env.local` ni secretos a Git.

### Seguridad de claves

- `.env.local` debe pertenecer solo al usuario que opera el servidor (`chmod 600 .env.local` en macOS/Linux). La instalación local ya queda con ese permiso.
- Todo archivo `.env*` está bloqueado para Git y para la imagen Docker; `.env.example` contiene únicamente marcadores sin valor.
- Solo los valores con prefijo `NEXT_PUBLIC_` llegan al navegador. **Nunca** pongas el token del gateway, `SUPABASE_SERVICE_ROLE_KEY`, secretos de Meta o claves de cifrado con ese prefijo.
- El token y la firma del gateway permanecen en el servidor. Las credenciales de los dispositivos vinculados se guardan únicamente en su volumen persistente, aisladas por `company_id`.
- Docker publica el panel solo en `127.0.0.1:3000`. Para una prueba de webhook usa un túnel HTTPS dirigido a ese puerto; no abras el panel directamente a la red local.
- Si un secreto aparece en un chat, captura, repositorio o correo, revócalo y reemplázalo; no basta con borrarlo del mensaje.

| Variable | Cuándo se usa |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Siempre. Supabase local ahora; valores del proyecto Supabase al pasar a cloud. |
| `SUPABASE_SERVER_URL` | Opcional, solo para el servidor Next.js dentro de Docker. |
| `WHATSAPP_PROVIDER=qr_gateway` | Flujo predeterminado: cada empresa vincula su número por QR. |
| `WHATSAPP_GATEWAY_URL` | URL interna o HTTPS del contenedor persistente del gateway. |
| `WHATSAPP_GATEWAY_TOKEN` | Token aleatorio compartido solo entre Next.js y el gateway. Genera con `openssl rand -hex 32`. |
| `WHATSAPP_GATEWAY_WEBHOOK_SECRET` | Secreto independiente para firmar webhooks del gateway. Genera con `openssl rand -hex 32`. |
| `WHATSAPP_PROVIDER=mock` | Desarrollo aislado; permite probar envíos sin mandar mensajes reales. |
| `META_APP_ID`, `META_EMBEDDED_SIGNUP_CONFIG_ID`, `META_GRAPH_API_VERSION` | Habilitan el botón de Meta Embedded Signup. |
| `META_APP_SECRET`, `META_WHATSAPP_APP_SECRET`, `META_WHATSAPP_VERIFY_TOKEN` | Intercambio de código y verificación segura del webhook. |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Clave Base64 de 32 bytes para cifrar tokens por empresa. Genera una sola vez con `openssl rand -base64 32`. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Mapa y Directions de Google. Restringe la llave por dominio. |

## Conectar un número real de WhatsApp Business por QR

1. Inicia Next.js y el gateway con `docker compose up --build`. El volumen `whatsapp_sessions` conserva las sesiones aunque reinicies los contenedores.
2. Como dueño, entra a **Configuración → WhatsApp Business** y pulsa **Generar código QR**.
3. En el teléfono del negocio abre **WhatsApp Business → Dispositivos vinculados → Vincular un dispositivo**.
4. Escanea el QR. El panel mostrará el número conectado y empezará a recibir mensajes en **Conversaciones**.
5. Repite el proceso dentro de cada empresa: cada `company_id` mantiene su propio número y sesión.
6. Envía un mensaje desde otro teléfono y responde desde la bandeja para validar entrada y salida.

El gateway QR usa el protocolo de dispositivo vinculado de WhatsApp Web y no es una integración oficial de Meta Cloud API. Puede requerir volver a escanear si WhatsApp cierra la sesión y su uso debe evaluarse frente a las condiciones de WhatsApp. La integración oficial de Meta permanece en el código como alternativa opcional; su guía está en [WHATSAPP_EMBEDDED_SIGNUP.md](./WHATSAPP_EMBEDDED_SIGNUP.md).

### Producción

La web puede vivir en Vercel, pero el gateway debe vivir en Railway, Render, Fly.io, un VPS u otro servicio que mantenga un contenedor activo y un disco persistente. Configura en ambos servicios el mismo `WHATSAPP_GATEWAY_TOKEN` y `WHATSAPP_GATEWAY_WEBHOOK_SECRET`; en el gateway usa `WHATSAPP_APP_WEBHOOK_URL=https://TU-DOMINIO/api/whatsapp/gateway/webhook`. Nunca publiques el puerto del gateway sin HTTPS y control de acceso.

## Google Maps y GPS

En Google Cloud habilita **Maps JavaScript API** y **Directions API**, crea una browser key restringida a tu dominio y define `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. La PWA comparte ubicación solo conforme a la regla configurada y al aceptar un pedido por defecto. Una desviación sobre el umbral configurado (500 m inicial) crea una alerta en el mapa.

## Instalar la PWA del motorizado

Antes de instalarla, el administrador debe crear el motorizado en **Motorizados** con correo, teléfono y licencia. El repartidor abre su invitación, crea su contraseña y entra con su cuenta personal. La invitación abre primero una pantalla segura de activación y luego la PWA. Una vez dentro, el motorizado debe ir a **Perfil → Definir o actualizar contraseña**; desde entonces podrá iniciar sesión sin volver a usar el enlace.

### Android (Chrome)

1. Abre `https://TU-DOMINIO/driver` con Chrome.
2. Inicia sesión con la cuenta invitada.
3. Pulsa el menú de tres puntos y selecciona **Instalar app** o **Agregar a pantalla principal**.
4. Acepta. La app aparecerá como Tudelivery y se abrirá a pantalla completa.
5. Permite ubicación **solo mientras se usa la app**. Se solicita al aceptar un pedido; no se necesita para solo ver la jornada.

### iPhone (Safari)

1. Abre `https://TU-DOMINIO/driver` con Safari; iOS no instala PWAs desde Chrome.
2. Pulsa **Compartir** y luego **Agregar a pantalla de inicio**.
3. Confirma el nombre y pulsa **Agregar**.
4. Abre Tudelivery desde el icono y permite ubicación al usarla cuando el sistema la solicite.

## Controles operativos importantes

- Un motorizado solo puede tener una jornada y un vehículo a la vez.
- No se puede iniciar jornada con mantenimiento vencido o vehículo inactivo.
- Todo combustible guarda litros, monto, odómetro y nivel de tanque.
- El administrador puede ver costos por kilómetro cuando existen jornadas cerradas y combustibles registrados.
- El OTP vence a las cuatro horas y no se almacena en texto plano.
- Las transferencias se validan manualmente antes de asignar.
- La cancelación posterior a la compra sigue la regla configurada en Tarifas.

## Checklist antes de producción

- [ ] Migraciones aplicadas en Supabase cloud y claves de producción configuradas.
- [ ] Dominio HTTPS configurado.
- [ ] Gateway QR desplegado con volumen persistente y secretos distintos.
- [ ] Webhook del gateway apunta al dominio público y acepta eventos firmados.
- [ ] Dos empresas de prueba conectan números distintos sin mezclar mensajes.
- [ ] Google Maps y Directions API habilitadas con clave restringida al dominio.
- [ ] Primer administrador, vehículo y motorizado creados.
- [ ] Flujo completo probado: conversación → pedido → turno → aceptación → GPS → OTP → cierre de jornada.
