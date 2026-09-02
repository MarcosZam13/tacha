import { ScrapingDemo } from "@/app/components/scraping-demo/ScrapingDemo";

export const metadata = {
  title: "Demo: Scraping Ingesta",
  description: "Herramienta de verificación del pipeline cache-first de scraping",
};

export default function ScrapingDemoPage(): JSX.Element {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <ScrapingDemo />
    </main>
  );
}
