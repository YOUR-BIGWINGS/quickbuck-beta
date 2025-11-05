import { getAuth } from "@clerk/react-router/ssr.server";
import type { Route } from "./+types/landing";
import { LandingNavbar } from "~/components/landing/navbar";
import { HeroSection } from "~/components/landing/hero";
import { FeaturesSection } from "~/components/landing/features";
import { HowItWorksSection } from "~/components/landing/how-it-works";
import { StatsSection } from "~/components/landing/stats";
import { CTASection } from "~/components/landing/cta";
import { Footer } from "~/components/landing/footer";

export function meta({}: Route.MetaArgs) {
  const title = "Quickbuck - Play the Markets, Dominate the Leaderboard";
  const description =
    "Trade stocks and crypto, build companies, and compete against players worldwide in this real-time financial simulation game.";
  const keywords =
    "trading game, stock market simulation, crypto trading, financial game, leaderboard, competition";
  const siteUrl = "https://quickbuck.com";
  const imageUrl = "/og-image.png";

  return [
    { title },
    {
      name: "description",
      content: description,
    },

    // Open Graph / Facebook
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: siteUrl },
    { property: "og:site_name", content: "Quickbuck" },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    {
      name: "twitter:description",
      content: description,
    },
    { name: "twitter:image", content: imageUrl },
    {
      name: "keywords",
      content: keywords,
    },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  return {
    isSignedIn: !!userId,
  };
}

export default function Landing({ loaderData }: Route.ComponentProps) {
  const isSignedIn = loaderData?.isSignedIn ?? false;

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar isSignedIn={isSignedIn} />
      <HeroSection isSignedIn={isSignedIn} />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection isSignedIn={isSignedIn} />
      <Footer />
    </div>
  );
}
