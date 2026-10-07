import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(24).optional(),
  city: z.string().trim().min(2).max(120).default("Granada, Nicaragua"),
  currencyCode: z.literal("NIO").default("NIO"),
  managementFee: z.coerce.number().min(0).max(10000).default(35),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Tu sesión expiró. Inicia sesión nuevamente." }, { status: 401 });

    const { data, error } = await supabase.rpc("create_company_onboarding", {
      p_display_name: input.displayName,
      p_phone: input.phone || null,
      p_city: input.city,
      p_currency_code: input.currencyCode,
      p_management_fee: input.managementFee,
    });
    if (error) throw error;
    return NextResponse.json({ companyId: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible crear la empresa.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
