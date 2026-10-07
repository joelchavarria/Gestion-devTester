"use client";

import { CheckCircle, Motorcycle } from "@phosphor-icons/react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Completes Supabase's invite hash in the browser before the protected PWA route runs. */
export function InviteAcceptScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let redirected = false;
    const openPwa = () => {
      if (redirected) return;
      redirected = true;
      router.replace("/driver");
      router.refresh();
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) openPwa();
    });
    const inviteParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = inviteParams.get("access_token");
    const refreshToken = inviteParams.get("refresh_token");
    const establishSession = accessToken && refreshToken
      ? supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      : supabase.auth.getSession();
    void establishSession.then(({ data, error: sessionError }: { data: { session: Session | null }; error: Error | null }) => {
      if (sessionError) setError(sessionError.message);
      else if (data.session) {
        window.history.replaceState(null, "", window.location.pathname);
        openPwa();
      } else window.setTimeout(() => setError("La invitación no pudo validarse. Solicita al administrador que envíe una nueva."), 1_500);
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  return <main className="auth-layout"><section className="auth-marketing"><div className="auth-brand"><span><Motorcycle size={27} weight="fill" /></span><strong>Tudelivery</strong></div></section><section className="auth-card-wrap"><div className="auth-card invite-accept-card"><span className="auth-icon"><CheckCircle size={25} weight="fill" /></span><h2>Preparando tu acceso</h2><p>{error ?? "Estamos validando tu invitación segura y abriendo la PWA del motorizado."}</p>{error ? <Link className="button button-secondary button-full" href="/login">Ir a iniciar sesión</Link> : <span className="loading-copy">Un momento…</span>}</div></section></main>;
}
