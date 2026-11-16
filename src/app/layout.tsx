import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpeechCoach — Personal AI Speech Training Coach",
  description:
    "Your personal local-first speech training coach: diagnostic assessment, adaptive daily training plans, coached practice materials with model audio, explainable acoustic analysis, and progress tracking.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
