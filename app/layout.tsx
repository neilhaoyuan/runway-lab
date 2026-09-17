import type { Metadata } from "next";
import "./globals.css";
import { FinancialModelProvider } from "@/components/financial-model-provider";

export const metadata: Metadata = {
  title: "Runway Lab",
  description: "Turn startup financial actuals into interactive operating scenarios.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('runway-lab-theme');document.documentElement.dataset.theme=t||'light'}catch(e){document.documentElement.dataset.theme='light'}` }} /></head><body><FinancialModelProvider>{children}</FinancialModelProvider></body></html>;
}
