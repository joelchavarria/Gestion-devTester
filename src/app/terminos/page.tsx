import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Términos del servicio | Tudelivery" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="CONDICIONES"
      title="Términos del servicio"
      description="Estas condiciones regulan el uso de Tudelivery por empresas, administradores, operadores y motorizados."
      sections={[
        {
          title: "1. Uso de la plataforma",
          paragraphs: [
            "Tudelivery proporciona herramientas para recibir conversaciones, registrar pedidos, coordinar motorizados y administrar flota. La empresa usuaria conserva la responsabilidad sobre sus servicios, precios, personal, vehículos, pagos y atención al cliente.",
          ],
        },
        {
          title: "2. Cuentas y acceso",
          items: [
            "La información de registro debe ser verdadera y mantenerse actualizada.",
            "Cada usuario debe utilizar su propia cuenta y proteger sus credenciales.",
            "El administrador controla invitaciones, roles, permisos y acceso a la empresa.",
            "Los motorizados acceden mediante su invitación y nunca con la cuenta del administrador.",
          ],
        },
        {
          title: "3. WhatsApp Business",
          paragraphs: [
            "La empresa debe conectar un número que administra y cumplir las condiciones de Meta y WhatsApp. Los cargos de mensajería o conversación que aplique Meta son independientes de Tudelivery.",
          ],
        },
        {
          title: "4. Uso aceptable",
          items: [
            "No usar la plataforma para fraude, acoso, contenido ilegal o mensajería no solicitada.",
            "No intentar acceder a datos de otras empresas, vulnerar controles o extraer credenciales.",
            "No compartir códigos OTP ni finalizar pedidos de forma falsa.",
          ],
        },
        {
          title: "5. Disponibilidad y cambios",
          paragraphs: [
            "Podemos mejorar, corregir o actualizar la plataforma para mantener su seguridad y funcionamiento. Servicios externos como Meta, mapas, alojamiento o base de datos pueden afectar temporalmente ciertas funciones.",
          ],
        },
        {
          title: "6. Soporte y terminación",
          paragraphs: [
            "La empresa puede dejar de usar el servicio y solicitar la eliminación de su información. Podemos restringir una cuenta cuando exista riesgo de seguridad, uso ilegal o incumplimiento grave de estas condiciones.",
          ],
        },
      ]}
    />
  );
}
