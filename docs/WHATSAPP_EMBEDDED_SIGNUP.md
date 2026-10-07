# Conexión oficial de WhatsApp Business

La plataforma usa **Meta Embedded Signup** para que cada administrador conecte su propia cuenta y número de WhatsApp Business. El QR o verificación se muestra dentro del diálogo de Meta; no se genera ni se almacena una sesión de WhatsApp Web.

## Preparación en Meta

1. Crea una app de Meta para el negocio/proyecto y añade WhatsApp Business Platform.
2. Configura Embedded Signup/Facebook Login para el dominio en que se desplegará la plataforma.
3. Registra el callback HTTPS de `https://TU-DOMINIO/api/whatsapp/webhook` y usa el mismo valor de `META_WHATSAPP_VERIFY_TOKEN` en Meta y en el servidor.
4. Solicita/activa los permisos necesarios para administrar el negocio y mensajería de WhatsApp.
5. En `.env.local`, configura las variables siguientes. No subas este archivo a Git.

```dotenv
WHATSAPP_PROVIDER=meta
META_APP_ID=tu_app_id_publico
META_EMBEDDED_SIGNUP_CONFIG_ID=tu_config_id
META_GRAPH_API_VERSION=vXX.X
META_APP_SECRET=secreto_de_la_app
META_WHATSAPP_APP_SECRET=secreto_para_validar_webhooks
META_WHATSAPP_VERIFY_TOKEN=un_valor_aleatorio_largo
WHATSAPP_TOKEN_ENCRYPTION_KEY=base64_de_32_bytes
```

Genera la clave de cifrado una sola vez con:

```bash
openssl rand -base64 32
```

## Flujo en la aplicación

1. El dueño crea su empresa y termina el onboarding.
2. Va a **Configuración → WhatsApp Business**.
3. Pulsa **Abrir conexión Meta** y termina la verificación/QR en la ventana oficial de Meta.
4. La plataforma intercambia el código únicamente en el servidor, cifra el token antes de guardarlo y enlaza el número a la empresa autenticada.
5. Meta valida el webhook y los mensajes entrantes entran a la bandeja de conversaciones.

El código no mostrará el botón activo hasta que estén configuradas `META_APP_ID`, `META_EMBEDDED_SIGNUP_CONFIG_ID` y `META_GRAPH_API_VERSION`.

Consulta la guía oficial de Meta en [Embedded Signup](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup) y el paso de [incrustar el flujo](https://www.postman.com/meta/whatsapp-business-platform/folder/b1a1oq8/step-1-embed-the-signup-flow).
