import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barnet servis | Servisní výkazy",
  description: "Mobilní servisní výkazy, fakturační podklady a technická paměť týmu Barnet & synové.",
  metadataBase: new URL("https://barnet-servis-pilot.admaximus.chatgpt.site"),
  openGraph: {
    title: "Barnet servis",
    description: "Každá oprava zůstane v týmu.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Barnet servis",
    description: "Každá oprava zůstane v týmu.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="cs"><body>{children}</body></html>;
}
