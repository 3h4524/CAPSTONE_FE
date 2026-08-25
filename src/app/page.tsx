import { Container } from "@/components/commons/layout/container";
import { HeroSection } from "@/components/landing/hero-section";

const VALUE_PROPS = [
  { title: "Fast", description: "Server-rendered, optimized out of the box." },
  { title: "SEO-ready", description: "Metadata, sitemap, robots, and JSON-LD wired in." },
  { title: "Yours to shape", description: "Swap the placeholder copy and content for your own." },
];

const RootPage = () => {
  return (
    <main className="flex flex-col">
      <HeroSection />

      <section className="py-20">
        <Container className="grid gap-8 sm:grid-cols-3">
          {VALUE_PROPS.map((item) => (
            <div key={item.title} className="flex flex-col gap-2 text-center">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="text-muted-foreground text-sm">{item.description}</p>
            </div>
          ))}
        </Container>
      </section>
    </main>
  );
};

export default RootPage;
