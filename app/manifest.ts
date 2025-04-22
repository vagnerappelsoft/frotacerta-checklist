import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Checklist Veicular",
    short_name: "Checklist",
    description: "Aplicativo de checklist veicular para motoristas",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b6fff", // Atualizado para a nova cor azul
    orientation: "portrait",
    scope: "/",
    id: "/",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
