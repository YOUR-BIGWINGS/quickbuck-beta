import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/home";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  // If user is signed in, redirect to dashboard
  if (userId) {
    throw redirect("/dashboard");
  }

  // Otherwise, redirect to the landing page
  throw redirect("/home");
}

export default function Home() {
  // This component should never render due to the loader redirect
  return null;
}
