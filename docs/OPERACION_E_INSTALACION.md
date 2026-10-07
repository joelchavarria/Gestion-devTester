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
- Solo los valores con prefijo `NEXT_PUBLIC_` llegan al navegador. **Nunca** pongas un token de Meta, `SUPABASE_SERVICE_ROLE_KEY`, secreto de la app o clave de cifrado con ese prefijo.
- Los tokens de cada negocio se cifran con AES-256-GCM antes de guardarse en la base. La clave que permite descifrarlos se queda únicamente en `.env.local`/el servidor.
- Docker publica el panel solo en `127.0.0.1:3000`. Para una prueba de webhook usa un túnel HTTPS dirigido a ese puerto; no abras el panel directamente a la red local.
- Si un secreto aparece en un chat, captura, repositorio o correo, revócalo en Meta/Supabase y reemplázalo; no basta con borrarlo del mensaje.

| Variable | Cuándo se usa |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Siempre. Supabase local ahora; valores del proyecto Supabase al pasar a cloud. |
| `SUPABASE_SERVER_URL` | Opcional, solo para el servidor Next.js dentro de Docker. |
| `WHATSAPP_PROVIDER=mock` | Desarrollo local; permite probar envíos sin mandar mensajes reales. |
| `WHATSAPP_PROVIDER=meta` | Producción o pruebas reales con Meta Cloud API. |
| `META_APP_ID`, `META_EMBEDDED_SIGNUP_CONFIG_ID`, `META_GRAPH_API_VERSION` | Habilitan el botón de Meta Embedded Signup. |
| `META_APP_SECRET`, `META_WHATSAPP_APP_SECRET`, `META_WHATSAPP_VERIFY_TOKEN` | Intercambio de código y verificación segura del webhook. |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Clave Base64 de 32 bytes para cifrar tokens por empresa. Genera una sola vez con `openssl rand -base64 32`. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Mapa y Directions de Google. Restringe la llave por dominio. |

## Conectar un número real de WhatsApp Business

La plataforma usa el flujo oficial **Meta Embedded Signup**. No usa ni almacena QR/sesiones de WhatsApp Web.

1. Despliega la aplicación en un dominio HTTPS público. Meta no valida un webhook `localhost`.
2. Crea una app de Meta, añade WhatsApp Business Platform y habilita Embedded Signup/Facebook Login.
3. En Meta, agrega el dominio de la aplicación y registra `https://TU-DOMINIO/api/whatsapp/webhook` como callback de webhook.
4. Pon el mismo secreto elegido en Meta y en `META_WHATSAPP_VERIFY_TOKEN`.
5. Completa en `.env.local` las variables de Meta, cambia `WHATSAPP_PROVIDER=meta` y reinicia la web.
6. Como dueño, entra a **Configuración → WhatsApp Business → Abrir conexión Meta**.
7. Termina la verificación oficial/QR de Meta. El código se intercambia en el servidor y el token queda cifrado por empresa.
8. Envía un mensaje al número para comprobar que aparece en **Conversaciones**. Responde desde la bandeja para probar el envío saliente.

La guía ampliada de variables y webhook está en [WHATSAPP_EMBEDDED_SIGNUP.md](./WHATSAPP_EMBEDDED_SIGNUP.md).

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
- [ ] Callback de Meta y token de webhook verificados.
- [ ] Embedded Signup probado con una cuenta/número de prueba.
- [ ] Google Maps y Directions API habilitadas con clave restringida al dominio.
- [ ] Primer administrador, vehículo y motorizado creados.
- [ ] Flujo completo probado: conversación → pedido → turno → aceptación → GPS → OTP → cierre de jornada.
