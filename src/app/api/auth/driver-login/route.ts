import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertSameOrigin, apiErrorResponse, AppError } from "@/lib/server/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(32),
  password: z.string().regex(/^\d{6,12}$/, "La clave debe tener entre 6 y 12 números."),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const { data: usersResult, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;
    const invitedUser = usersResult.users.find((user) => String(user.user_metadata?.username ?? "").toLowerCase() === input.username);
    if (!invitedUser?.email) throw new AppError("Usuario o clave incorrectos.", 401);

    const supabase = await createSupabaseServerClient();
    const { data: sessionResult, error: signInError } = await supabase.auth.signInWithPassword({ email: invitedUser.email, password: input.password });
    if (signInError || !sessionResult.user) throw new AppError("Usuario o clave incorrectos.", 401);

    const { data: membership, error: membershipError } = await admin
      .from("company_members")
      .select("role")
      .eq("user_id", sessionResult.user.id)
      .eq("is_active", true)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (membership?.role !== "driver") throw new AppError("Este usuario no corresponde a un motorizado.", 403);

    return NextResponse.json({ destination: "/driver" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
