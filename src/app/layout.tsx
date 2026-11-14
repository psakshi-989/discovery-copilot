import type { Metadata } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const ui = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const doc = Newsreader({ subsets: ["latin"], variable: "--font-doc", display: "swap" });

export const metadata: Metadata = {
  title: `${site.name}: ${site.tagline}`,
  description:
    "Paste a customer call. Get requirements tied to the customer's exact words, an architecture, an effort and savings estimate as ranges, and a clickable demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${doc.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="bar">
          <a className="brand" href="/">{site.name}</a>
          <nav aria-label="Main">
            <a href="/#run">Run it on a call</a>
            <a href="/#examples">Examples</a>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="foot">
          <span>Built by {site.author}.</span>
          {site.repoUrl ? <a href={site.repoUrl}>Source code</a> : null}
        </footer>
      </body>
    </html>
  );
}
