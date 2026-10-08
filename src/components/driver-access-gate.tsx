"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowRight, Motorcycle, ShieldCheck } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DriverAccessGate({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchAccount() {
    setBusy(true);
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/login?next=/driver");
    router.refresh();
  }

  return <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top,#e7f8ef,transparent_32rem)] px-4 py-10">
    <Card className="w-full max-w-md border-emerald-100 bg-white/95 shadow-2xl shadow-emerald-950/10">
      <CardHeader className="items-start gap-4 p-7">
        <span className="grid size-12 place-items-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-700/20"><Motorcycle size={27} weight="fill" /></span>
        <div className="space-y-2"><CardTitle className="text-2xl font-bold tracking-tight text-slate-950">Acceso para motorizados</CardTitle><CardDescription className="text-sm leading-6">Esta PWA usa una cuenta individual del conductor. Así sus pedidos, ubicación y jornada nunca se mezclan con la cuenta del administrador.</CardDescription></div>
      </CardHeader>
      <CardContent className="px-7"><div className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-700" size={22} weight="fill" /><p className="text-sm leading-5 text-emerald-950"><strong className="block">La aplicación está funcionando.</strong>{signedIn ? "Tienes abierta una sesión administrativa; entra con la invitación del motorizado." : "Inicia sesión con el correo que recibió la invitación del negocio."}</p></div></CardContent>
      <CardFooter className="flex-col gap-2 border-t border-slate-100 bg-slate-50/70 p-5 sm:flex-row">
        {signedIn ? <Button className="h-10 flex-1 bg-emerald-700 hover:bg-emerald-800" onClick={() => { void switchAccount(); }} disabled={busy}>{busy ? "Cerrando sesión…" : "Entrar como motorizado"}<ArrowRight /></Button> : <Button className="h-10 flex-1 bg-emerald-700 hover:bg-emerald-800" asChild><Link href="/login?next=/driver">Iniciar sesión <ArrowRight /></Link></Button>}
        <Button className="h-10" variant="outline" asChild><Link href="/admin/motorizados">Volver al panel</Link></Button>
      </CardFooter>
    </Card>
  </main>;
}
