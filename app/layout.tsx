import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barnet servis | Servisní výkazy",
  description: "Mobilní servisní výkazy, fakturační podklady a technická paměť týmu Barnet & synové.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="cs"><body>{children}</body></html>;
}
