"use client";

import { Coins } from "lucide-react";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/crypto";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    throw redirect("/sign-in");
  }
  return {};
}

export default function CryptoPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4 space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <Coins className="w-12 h-12 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">crypto is under individual maintenince.</h1>
      <p className="text-muted-foreground">we are working to fix this problem.</p>
    </div>
  );
}
