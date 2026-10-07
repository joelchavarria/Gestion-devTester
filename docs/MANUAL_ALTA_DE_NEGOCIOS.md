# Manual para incorporar negocios a Gestión Delivery

Este manual explica cómo incorporar una empresa de delivery a Gestión Delivery, conectar su propio WhatsApp Business y comenzar a operar con pedidos, motorizados, vehículos y la PWA.

Los clientes finales no instalan ninguna aplicación: escriben al WhatsApp Business del negocio. El equipo atiende desde el panel web y cada motorizado usa una cuenta personal en la PWA.

## Antes de empezar

El dueño del negocio debe tener lo siguiente:

- Un correo al que tenga acceso y que no comparta con otros administradores.
- Un teléfono de contacto del negocio.
- Un número de WhatsApp Business que pueda administrar. Puede ser un número existente o uno nuevo.
- Acceso de administrador al portfolio comercial de Meta donde vive ese número. Si todavía no tiene uno, el flujo oficial de Meta permite crear o elegir el portfolio y verificar el número.
- La lista inicial de tarifas, horarios, zonas de atención, motorizados y vehículos.

> No compartas contraseñas, códigos de verificación, tokens ni secretos de Meta con el equipo de soporte. La conexión se completa dentro de la ventana oficial de Meta.

## Roles y responsabilidades

| Rol | Qué hace |
| --- | --- |
| Equipo de plataforma DevTesters | Mantiene el dominio, Supabase, la aplicación Meta, webhook y claves del servidor. Esta configuración se realiza una sola vez para toda la plataforma. |
| Dueño administrador del negocio | Crea la empresa, define tarifas y políticas, conecta su número, registra flota e invita al equipo. |
| Operador | Atiende conversaciones, prepara pedidos y solicita confirmación al cliente antes de asignar. |
| Motorizado | Usa únicamente la PWA con su cuenta, abre jornada, registra combustible, acepta pedidos, comparte ubicación durante el servicio y entrega con OTP. |

## Parte 1 Configuración única de la plataforma

Estos pasos los realiza DevTesters **una sola vez** antes de abrir Gestión Delivery a múltiples negocios. Cada empresa nueva no debe crear otra aplicación Meta ni recibir secretos técnicos.

1. Publicar Gestión Delivery en un dominio HTTPS, por ejemplo `https://app.tudominio.com`.
2. Configurar Supabase cloud y las variables de entorno de producción.
3. Crear el portfolio comercial de DevTesters en Meta Business Suite.
4. Crear la aplicación de Meta for Developers con el caso de uso **Conectarte con los clientes a través de WhatsApp**.
5. Configurar Meta Embedded Signup/Facebook Login for Business, el dominio HTTPS y el webhook `https://app.tudominio.com/api/whatsapp/webhook`.
6. Guardar los valores técnicos solo en el servidor: App ID, App Secret, Configuration ID de Embedded Signup, versión Graph, verify token y clave de cifrado.
7. Cambiar `WHATSAPP_PROVIDER=meta` en producción y probar el webhook con un número de prueba.
8. Dejar la app de Meta en el estado y con los permisos que Meta solicite para operar con negocios reales.

La instalación técnica detallada está en [OPERACION_E_INSTALACION.md](./OPERACION_E_INSTALACION.md) y la guía de Meta en [WHATSAPP_EMBEDDED_SIGNUP.md](./WHATSAPP_EMBEDDED_SIGNUP.md).

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
3. **WhatsApp Business:** pulsa **Preparar conexión** y luego **Crear empresa e ir al panel**. El número se conectará desde Configuración después de entrar al panel.

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

Este paso lo realiza el dueño administrador del negocio desde su panel. Necesita iniciar la ventana de Meta con el perfil que tiene control sobre su portfolio comercial y su número Business.

1. Entra al panel web y abre **Configuración → WhatsApp Business**.
2. Pulsa **Abrir conexión Meta**.
3. En la ventana oficial de Meta, inicia sesión con el perfil administrador del negocio, no con una cuenta de un negocio ajeno.
4. Selecciona o crea el portfolio comercial correspondiente al negocio.
5. Selecciona o registra el número de WhatsApp Business. Meta puede solicitar un código SMS o llamada para validar el número.
6. Acepta los permisos de mensajería necesarios y finaliza el flujo de Meta.
7. Vuelve a Gestión Delivery y confirma que el estado indique **Canal conectado**.
8. Envía un WhatsApp de prueba desde otro teléfono. El mensaje debe aparecer en **Conversaciones**.
9. Responde desde la bandeja para confirmar el envío saliente.

El QR, código o verificación pertenece a Meta. Gestión Delivery no almacena una sesión de WhatsApp Web ni pide al negocio que comparta sus tokens.

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
| El botón de Meta no abre | El administrador de plataforma debe revisar el dominio HTTPS, Meta App ID, Configuration ID y versión Graph. |
| Meta no muestra el número | Inicia sesión con el perfil que tiene acceso total al portfolio y al WhatsApp Business del negocio. No selecciones una empresa ajena. |
| No llegan mensajes a Conversaciones | Confirma que el canal está conectado, que el webhook está verificado y que el número de prueba escribió al número exacto conectado. |
| El motorizado no puede iniciar jornada | Revisa invitación activada, vehículo activo, mantenimiento no vencido y que no tenga otra jornada abierta. |
| No aparece ubicación en el mapa | El motorizado debe aceptar el pedido y conceder ubicación a la PWA. Revisa además la clave y APIs de Google Maps configuradas por la plataforma. |
| No se puede terminar el pedido | Verifica el OTP vigente con el administrador; no se usa el código de Meta ni el código SMS del número. |

## Regla de oro de seguridad

Cada negocio administra únicamente su empresa y su número. Los propietarios no deben compartir cuentas administrativas; los motorizados usan invitaciones individuales; y las claves, tokens y códigos de Meta permanecen en el servidor o en la ventana oficial de Meta.
