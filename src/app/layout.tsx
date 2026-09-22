import type { Metadata } from "next";
import { Lora } from "next/font/google";
import { NavBar } from "@/components/layout/NavBar";
import "./globals.css";

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "daily-blocks",
  description: "Planificación diaria por bloques de tiempo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${lora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
