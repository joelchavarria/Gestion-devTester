import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { apiErrorResponse, assertSameOrigin, requireCompanyContext } from "@/lib/server/context";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const readSchema = z.object({
  ids: z.array(z.string().uuid()).max(50).optional(),
});

export async function GET() {
  try {
    const context = await requireCompanyContext();
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("notifications")
      .select("id, kind, title, body, payload, read_at, created_at")
      .eq("company_id", context.companyId)
      .eq("channel", "in_app")
      .or(`user_id.is.null,user_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw error;

    return NextResponse.json({ notifications: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const input = readSchema.parse(await request.json());
    const context = await requireCompanyContext();
    const admin = createSupabaseAdminClient();
    let query = admin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("company_id", context.companyId)
      .eq("channel", "in_app")
      .is("read_at", null)
      .or(`user_id.is.null,user_id.eq.${context.userId}`);
    if (input.ids?.length) query = query.in("id", input.ids);
    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ updated: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
