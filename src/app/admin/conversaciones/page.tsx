import { ConversationWorkspace } from "@/components/conversation-workspace";
import { PageHeader } from "@/components/ui";
import { requireOperationsContext } from "@/lib/server/context";
import { getAdminBootstrap } from "@/lib/server/operations";

export default async function ConversationsPage() {
  const data = await getAdminBootstrap(await requireOperationsContext());
  return <><PageHeader title="Conversaciones" description="Atiende mensajes y conviértelos en pedidos confirmados." /><ConversationWorkspace data={data} /></>;
}
