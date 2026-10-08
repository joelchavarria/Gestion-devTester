# DevTesters Delivery

Plataforma multiempresa para delivery, mandados, flota y operación por WhatsApp.

La instalación, módulos, variables, conexión real de WhatsApp Business, Docker y PWA para Android/iPhone están documentados en [docs/OPERACION_E_INSTALACION.md](docs/OPERACION_E_INSTALACION.md).

Para incorporar a un negocio nuevo sin mezclar sus datos, consulta el [manual paso a paso para negocios](docs/MANUAL_ALTA_DE_NEGOCIOS.md).

## Inicio rápido

```bash
npm install
npm run db:up
# completa .env.local con los valores impresos por Supabase
npm run db:reset
npm run dev
```

Abre `http://localhost:3000/registro` para crear la primera empresa. Para usar Docker, ejecuta `docker compose up --build` después de iniciar Supabase.

## Despliegue en Vercel

El repositorio se puede importar directamente en Vercel; Next.js se detecta automáticamente. Antes de un despliegue real se necesita una base de datos Supabase/PostgreSQL accesible desde Internet y se agregan las variables indicadas en `.env.example` desde **Vercel → Settings → Environment Variables**. El gateway QR de WhatsApp debe ejecutarse como un contenedor permanente con disco persistente; Vercel sirve la web, pero no conserva esa sesión. No copies secretos al código, al navegador ni al repositorio. La instalación completa está en [la documentación operativa](docs/OPERACION_E_INSTALACION.md).

## Principios

- Cada empresa queda aislada por `company_id` y RLS.
- Los clientes finales escriben por WhatsApp; no requieren una PWA.
- Motorizados tienen cuenta y PWA independiente.
- Cada negocio vincula su propio WhatsApp Business por QR y conserva una sesión aislada.
- Meta Cloud API se mantiene como integración oficial opcional para una migración futura.
