import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return {
    name: "Fondocampo — analisi padel e tennis",
    short_name: "Fondocampo",
    description: "Errori, colpi buoni e cosa allenare dopo ogni partita di padel o tennis.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    background_color: "#07110e",
    theme_color: "#07110e",
    lang: "it",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
