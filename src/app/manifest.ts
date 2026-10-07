import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tudelivery Motorizados",
    short_name: "Tudelivery",
    description: "PWA operativa para motorizados.",
    start_url: "/driver",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f7f8f5",
    theme_color: "#00894d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
