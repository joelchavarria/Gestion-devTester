"use client";

import { CheckCircle, Motorcycle } from "@phosphor-icons/react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EmailOtpType, Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Completes Supabase's invite hash in the browser before the protected PWA route runs. */
export function InviteAcceptScreen() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setError("La invitación está tardando demasiado. Ábrela nuevamente desde el correo o solicita un nuevo enlace.");
    }, 12_000);

    async function completeInvite() {
      const currentUrl = new URL(window.location.href);
      const hashParams = new URLSearchParams(currentUrl.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const code = currentUrl.searchParams.get("code");
      const tokenHash = currentUrl.searchParams.get("token_hash");
      const tokenType = currentUrl.searchParams.get("type");
      let session: Session | null = null;

      if (accessToken && refreshToken) {
        const result = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (result.error) throw result.error;
        session = result.data.session;
      } else if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        if (result.error) throw result.error;
        session = result.data.session;
      } else if (tokenHash && tokenType) {
        const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType as EmailOtpType });
        if (result.error) throw result.error;
        session = result.data.session;
      } else {
        const result = await supabase.auth.getSession();
        if (result.error) throw result.error;
        session = result.data.session;
      }

      if (!session) throw new Error("La invitación no pudo validarse. Solicita al administrador que envíe una nueva.");
      const { data: membership, error: membershipError } = await supabase
        .from("company_members")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .eq("role", "driver")
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership) throw new Error("Este enlace no corresponde a una cuenta de motorizado.");
      if (!active) return;
      window.clearTimeout(timeout);
      // A full navigation lets the server middleware see the freshly persisted auth cookies.
      window.history.replaceState(null, "", currentUrl.pathname);
      window.location.replace("/driver");
    }

    void completeInvite().catch((caught: unknown) => {
      if (!active) return;
      window.clearTimeout(timeout);
      setError(caught instanceof Error ? caught.message : "La invitación no pudo validarse. Solicita un nuevo enlace.");
    });
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);

  return <main className="auth-layout"><section className="auth-marketing"><div className="auth-brand"><span><Motorcycle size={27} weight="fill" /></span><strong>Tudelivery</strong></div></section><section className="auth-card-wrap"><div className="auth-card invite-accept-card"><span className="auth-icon"><CheckCircle size={25} weight="fill" /></span><h2>Preparando tu acceso</h2><p>{error ?? "Estamos validando tu invitación segura y abriendo la PWA del motorizado."}</p>{error ? <Link className="button button-secondary button-full" href="/login">Ir a iniciar sesión</Link> : <span className="loading-copy">Un momento…</span>}</div></section></main>;
}
