# Manual para incorporar negocios a Gestión Delivery

Este manual explica cómo incorporar una empresa de delivery a Gestión Delivery, conectar su propio WhatsApp Business y comenzar a operar con pedidos, motorizados, vehículos y la PWA.

Los clientes finales no instalan ninguna aplicación: escriben al WhatsApp Business del negocio. El equipo atiende desde el panel web y cada motorizado usa una cuenta personal en la PWA.

## Antes de empezar

El dueño del negocio debe tener lo siguiente:

- Un correo al que tenga acceso y que no comparta con otros administradores.
- Un teléfono de contacto del negocio.
- Un número de WhatsApp Business que pueda administrar. Puede ser un número existente o uno nuevo.
- El teléfono donde está instalado y funcionando ese WhatsApp Business.
- La lista inicial de tarifas, horarios, zonas de atención, motorizados y vehículos.

> No compartas contraseñas ni códigos de verificación. El dueño escanea el QR directamente desde WhatsApp Business.

## Roles y responsabilidades

| Rol | Qué hace |
| --- | --- |
| Equipo de plataforma DevTesters | Mantiene el dominio, Supabase, el gateway QR persistente, webhook y secretos del servidor. Esta configuración se realiza una sola vez para toda la plataforma. |
| Dueño administrador del negocio | Crea la empresa, define tarifas y políticas, conecta su número, registra flota e invita al equipo. |
| Operador | Atiende conversaciones, prepara pedidos y solicita confirmación al cliente antes de asignar. |
| Motorizado | Usa únicamente la PWA con su cuenta, abre jornada, registra combustible, acepta pedidos, comparte ubicación durante el servicio y entrega con OTP. |

## Parte 1 Configuración única de la plataforma

Estos pasos los realiza DevTesters **una sola vez** antes de abrir Gestión Delivery a múltiples negocios. Cada empresa nueva solo crea su cuenta y escanea su QR; no configura servidores ni variables.

1. Publicar Gestión Delivery en un dominio HTTPS, por ejemplo `https://app.tudominio.com`.
2. Configurar Supabase cloud y las variables de entorno de producción.
3. Desplegar el gateway de WhatsApp en un contenedor permanente con volumen persistente.
4. Generar `WHATSAPP_GATEWAY_TOKEN` y `WHATSAPP_GATEWAY_WEBHOOK_SECRET` diferentes con `openssl rand -hex 32`.
5. Guardar esos secretos solo en Vercel y en el host del gateway.
6. Configurar el gateway para enviar eventos a `https://app.tudominio.com/api/whatsapp/gateway/webhook`.
7. Probar dos empresas con dos números distintos y confirmar que las conversaciones quedan separadas.

La instalación técnica detallada está en [OPERACION_E_INSTALACION.md](./OPERACION_E_INSTALACION.md). Meta Cloud API queda disponible como integración oficial opcional en [WHATSAPP_EMBEDDED_SIGNUP.md](./WHATSAPP_EMBEDDED_SIGNUP.md).

## Parte 2 Crear la empresa en Gestión Delivery

El dueño del negocio abre `https://TU-DOMINIO/registro` y sigue estos pasos.

### Paso 1 Crear la cuenta administradora

1. Escribe el nombre comercial del negocio.
2. Indica tu nombre completo, teléfono de administrador, correo y contraseña segura de al menos ocho caracteres.
3. Pulsa **Continuar**.
4. Si la plataforma solicita verificar el correo, abre el mensaje recibido, confirma la cuenta y vuelve a iniciar sesión en `https://TU-DOMINIO/login`.

La persona que crea la cuenta es el dueño administrador. Cada empresa queda aislada: no puede ver pedidos, clientes, vehículos ni conversaciones de otra empresa.

### Paso 2 Completar el onboarding

El asistente inicial tiene tres pasos.

1. **Información:** confirma el nombre, ciudad y teléfono comercial. La moneda inicial es córdobas nicaragüenses (C$).
2. **Tarifas:** revisa las zonas iniciales y ajusta la gestión base para mandados y compras.
3. **WhatsApp Business:** pulsa **Entendido, continuar** y luego **Crear empresa y escanear QR**. El sistema abre Configuración para vincular el número.

## Parte 3 Configurar la operación antes del primer pedido

### 1. Tarifas y reglas

En **Tarifas**, crea o ajusta las zonas de cobertura. Para cada zona define el delivery y verifica la gestión base para compras/mandados.

En **Configuración**, define:

- Horario comercial.
- Mensaje automático de bienvenida de WhatsApp.
- Cuándo se permite cancelar y qué ocurre si la compra ya fue realizada.
- Si se exige OTP para finalizar cada entrega.
- Distancia máxima de desvío de ruta y mantenimiento preventivo de vehículos.

### 2. Vehículos

En **Vehículos**, selecciona **Agregar vehículo** y registra como mínimo:

- Tipo de vehículo, marca/modelo, placa y estado.
- Odómetro actual.
- Nivel de combustible inicial.
- Kilometraje para próximo mantenimiento.

Programa cambios de aceite, revisiones y reparaciones desde el mismo módulo. Un vehículo con mantenimiento vencido no podrá iniciar jornada.

### 3. Motorizados y PWA

En **Motorizados**, selecciona **Registrar motorizado** o **Enviar invitación**. Completa nombre, teléfono, correo y número de licencia.

El sistema envía un enlace individual. El motorizado debe:

1. Abrir el enlace desde su teléfono.
2. Crear su contraseña personal.
3. Iniciar sesión en `https://TU-DOMINIO/driver`.
4. Instalar la PWA y permitir ubicación solo cuando la app la solicite durante un pedido aceptado.

Nunca compartas la cuenta del administrador con un motorizado.

## Parte 4 Conectar el WhatsApp Business de cada negocio

Este paso lo realiza el dueño administrador del negocio desde su panel y con el teléfono donde funciona WhatsApp Business.

1. Entra al panel web y abre **Configuración → WhatsApp Business**.
2. Pulsa **Generar código QR**.
3. En el teléfono abre **WhatsApp Business → Dispositivos vinculados → Vincular un dispositivo**.
4. Escanea el QR que aparece en Gestión Delivery.
5. Espera a que el panel muestre **WhatsApp conectado** y el número vinculado.
6. Envía un WhatsApp de prueba desde otro teléfono. El mensaje debe aparecer en **Conversaciones**.
7. Responde desde la bandeja para confirmar el envío saliente.

Cada empresa tiene su propia sesión separada. Si WhatsApp cierra un dispositivo vinculado, el dueño deberá generar y escanear un QR nuevo. Este mecanismo utiliza una sesión de WhatsApp Web y no la API oficial de Meta; por eso el negocio debe conocer y aceptar ese riesgo operativo.

## Parte 5 Operación diaria

### Abrir jornada del motorizado

1. El motorizado entra a la PWA.
2. Elige un vehículo disponible.
3. Registra odómetro de salida, nivel de tanque y fondo de caja para vueltas/compras.
4. Inicia la jornada.

### Atender y crear un pedido

1. El cliente escribe al número Business y el operador abre **Conversaciones**.
2. Confirma nombre, teléfono, dirección, referencia, tipo de pago y, si existe, ubicación GPS.
3. Añade comercio, producto, importe de compra, gestión, delivery y total.
4. Si el cliente paga en efectivo, registra cuánto entregó: la aplicación calcula el vuelto.
5. Confirma el pedido con el cliente antes de asignarlo.
6. El administrador asigna un motorizado con jornada abierta y vehículo apto. El sistema genera el OTP de entrega para el administrador.

### Ejecutar y cerrar la entrega

1. El motorizado recibe y acepta el pedido en la PWA.
2. A partir de la aceptación, la PWA comparte su ubicación según la política configurada.
3. El motorizado marca llegada al comercio, compra/recoge y se dirige al cliente.
4. Para completar, solicita al cliente el OTP que el administrador recibió y lo registra en la PWA.
5. Si no puede terminar, reporta una incidencia: lluvia, no encuentra el destino, no encuentra a la persona o vehículo dañado. La cancelación requiere autorización administrativa.

### Combustible y fin de jornada

1. Cada vez que cargue combustible, el motorizado registra litros, monto, odómetro y nivel de tanque.
2. Al terminar, registra odómetro de regreso, fondo de caja y observaciones.
3. El administrador revisa en **Reportes** consumo por kilómetro, entregas, ingresos, incidencias y mantenimientos.

## Instalar la PWA de motorizados

### Android

1. Abre `https://TU-DOMINIO/driver` en Chrome e inicia sesión.
2. Pulsa el menú de tres puntos.
3. Selecciona **Instalar app** o **Agregar a pantalla principal**.
4. Acepta y abre Tudelivery desde el icono.

### iPhone

1. Abre `https://TU-DOMINIO/driver` en Safari e inicia sesión.
2. Pulsa **Compartir**.
3. Selecciona **Agregar a pantalla de inicio** y luego **Agregar**.
4. Permite la ubicación solo al usar la PWA cuando el sistema la solicite.

## Validación de una empresa nueva

Antes de iniciar operaciones reales, el dueño debe completar esta prueba:

- [ ] Empresa, horario y tarifas configurados.
- [ ] Al menos un vehículo activo, con odómetro y mantenimiento definidos.
- [ ] Al menos un motorizado invitado, con sesión PWA y vehículo asignable.
- [ ] WhatsApp Business con estado **Canal conectado**.
- [ ] Un mensaje de prueba recibido y respondido desde Conversaciones.
- [ ] Un pedido de prueba creado, confirmado y asignado.
- [ ] Jornada iniciada, combustible registrado y GPS visible tras aceptar el pedido.
- [ ] Pedido completado mediante OTP y jornada cerrada.

## Problemas frecuentes

| Situación | Qué revisar |
| --- | --- |
| El QR no aparece | Revisa que el gateway esté activo, accesible desde Next.js y tenga los mismos secretos configurados. |
| El QR vence | Pulsa **Generar nuevo QR** y vuelve a escanearlo desde Dispositivos vinculados. |
| No llegan mensajes a Conversaciones | Confirma que el canal esté conectado, el webhook firmado llegue al dominio y el número de prueba escribió al número exacto vinculado. |
| El motorizado no puede iniciar jornada | Revisa invitación activada, vehículo activo, mantenimiento no vencido y que no tenga otra jornada abierta. |
| No aparece ubicación en el mapa | El motorizado debe aceptar el pedido y conceder ubicación a la PWA. Revisa además la clave y APIs de Google Maps configuradas por la plataforma. |
| No se puede terminar el pedido | Verifica el OTP vigente con el administrador; no se usa ningún código de WhatsApp. |

## Regla de oro de seguridad

Cada negocio administra únicamente su empresa y su número. Los propietarios no comparten cuentas administrativas; los motorizados usan invitaciones individuales; y los secretos del gateway permanecen únicamente en los servidores.
