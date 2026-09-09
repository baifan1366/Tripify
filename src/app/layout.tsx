import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tripify",
  description: "An AI travel teammate for group trips.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
