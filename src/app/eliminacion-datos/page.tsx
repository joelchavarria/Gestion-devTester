import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Eliminación de datos | Tudelivery" };

export default function DataDeletionPage() {
  return (
    <LegalPage
      eyebrow="CONTROL DE DATOS"
      title="Solicitud de eliminación de datos"
      description="Puedes solicitar la eliminación de tu cuenta y de la información asociada a Tudelivery."
      sections={[
        {
          title: "Cómo solicitarla",
          items: [
            "Escribe a joel.chavarria@devtester.lat desde el correo registrado en Tudelivery.",
            "Incluye el nombre de la empresa, tu nombre y el teléfono asociado.",
            "Usa el asunto: Solicitud de eliminación de datos.",
            "Confirmaremos tu identidad antes de procesar la solicitud.",
          ],
        },
        {
          title: "Qué eliminaremos",
          paragraphs: [
            "Eliminaremos o anonimizaremos la cuenta, los datos de perfil y la información operativa asociada cuando sea técnicamente posible. Si eres miembro de una empresa, también notificaremos al administrador correspondiente cuando sea necesario.",
          ],
        },
        {
          title: "Plazo y excepciones",
          paragraphs: [
            "Responderemos y procesaremos la solicitud dentro de un plazo razonable. Podemos conservar registros mínimos cuando sean necesarios para seguridad, prevención de fraude, resolución de disputas u obligaciones legales.",
          ],
        },
        {
          title: "Desconectar WhatsApp",
          paragraphs: [
            "El administrador puede desconectar la cuenta de WhatsApp Business desde Configuración. La desconexión de Tudelivery no elimina automáticamente la cuenta o el número dentro de Meta Business Manager.",
          ],
        },
      ]}
    />
  );
}
