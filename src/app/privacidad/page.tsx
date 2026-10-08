import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Política de privacidad | Tudelivery" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="PRIVACIDAD"
      title="Política de privacidad"
      description="Explicamos qué información procesa Tudelivery, para qué se utiliza y cómo la protegemos."
      sections={[
        {
          title: "1. Responsable y alcance",
          paragraphs: [
            "Tudelivery es una plataforma operada por DevTesters Delivery's para gestionar empresas de delivery, sus administradores, operadores, motorizados, clientes, vehículos, pedidos y comunicaciones de WhatsApp Business.",
            "Cada empresa mantiene sus datos separados de los de otras empresas. La empresa usuaria es responsable de contar con una base válida para atender a sus clientes y operar sus números de WhatsApp Business.",
          ],
        },
        {
          title: "2. Información que procesamos",
          items: [
            "Datos de cuenta: nombre, correo, teléfono, rol y empresa.",
            "Datos operativos: pedidos, direcciones, referencias, tarifas, pagos, incidencias y códigos de entrega.",
            "Datos de flota: vehículos, kilometraje, combustible, mantenimiento y jornadas.",
            "Ubicación del motorizado únicamente durante pedidos aceptados y jornadas activas.",
            "Mensajes y metadatos necesarios para atender conversaciones de WhatsApp Business.",
          ]}
        ,
        {
          title: "3. Finalidades",
          items: [
            "Autenticar usuarios y separar la información por empresa.",
            "Crear, asignar, rastrear y completar pedidos.",
            "Atender conversaciones, enviar actualizaciones y gestionar WhatsApp Business.",
            "Controlar jornadas, combustible, kilometraje, mantenimiento e incidencias.",
            "Proteger la plataforma, investigar fallos y prevenir usos indebidos.",
          ],
        },
        {
          title: "4. Proveedores y transferencias",
          paragraphs: [
            "Utilizamos proveedores técnicos necesarios para prestar el servicio, entre ellos Meta/WhatsApp para mensajería, Supabase para base de datos y autenticación, Vercel para alojamiento y proveedores de mapas cuando estén habilitados. Cada proveedor procesa información bajo sus propias condiciones y medidas de seguridad.",
          ],
        },
        {
          title: "5. Seguridad y conservación",
          paragraphs: [
            "Aplicamos cifrado en tránsito, control de acceso por roles y empresa, secretos exclusivos del servidor y cifrado de credenciales sensibles. Conservamos la información mientras la cuenta esté activa o durante el tiempo necesario para la operación, seguridad y obligaciones aplicables.",
          ],
        },
        {
          title: "6. Derechos y contacto",
          paragraphs: [
            "Puedes solicitar acceso, corrección o eliminación de tus datos escribiendo a joel.chavarria@devtester.lat. Si los datos fueron recopilados por una empresa que usa Tudelivery, también puedes contactar directamente a esa empresa.",
          ],
        },
      ]}
    />
  );
}
