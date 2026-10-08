"use client";

import { ArrowSquareOut, CheckCircle, Copy, DownloadSimple, ShareNetwork } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallCard({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    window.queueMicrotask(() => {
      setInstalled(standalone);
      setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    });
    const receivePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const receiveInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener("beforeinstallprompt", receivePrompt);
    window.addEventListener("appinstalled", receiveInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", receivePrompt);
      window.removeEventListener("appinstalled", receiveInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) { setShowHelp(true); return; }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/driver`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return <section className={compact ? "pwa-install-card compact" : "settings-card pwa-install-card"}>
    <span className="pwa-install-icon"><DownloadSimple size={24} weight="bold" /></span>
    <div className="pwa-install-copy"><h3>App de motorizados</h3><p>{installed ? "Esta PWA ya está instalada en el dispositivo." : "Instala la app segura del driver desde el navegador, sin usar la cuenta del administrador."}</p><code>/driver</code></div>
    <div className="pwa-install-actions">
      {installed ? <span className="pwa-installed"><CheckCircle size={17} weight="fill" /> Instalada</span> : <button className="button button-primary button-small" type="button" onClick={() => { void install(); }}><DownloadSimple size={17} /> {promptEvent ? "Instalar PWA" : isIos ? "Cómo instalar" : "Instalar PWA"}</button>}
      <Link className="button button-secondary button-small" href="/driver"><ArrowSquareOut size={16} /> Abrir PWA</Link>
      <button className="pwa-copy-link" type="button" onClick={() => { void copyLink(); }}><Copy size={15} /> {copied ? "Enlace copiado" : "Copiar enlace"}</button>
    </div>
    {showHelp ? <div className="pwa-install-help"><ShareNetwork size={18} weight="fill" /><span>{isIos ? "En Safari toca Compartir y luego Agregar a pantalla de inicio." : "Abre esta página en Chrome o Edge y elige Instalar aplicación en el menú del navegador."}</span></div> : null}
  </section>;
}
