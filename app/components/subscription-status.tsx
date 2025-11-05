"use client";
import { useAuth } from "@clerk/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export default function SubscriptionStatus() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Please sign in to view account details.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          Subscription and billing features are currently disabled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        You can continue using the app. Billing will be added later when ready.
      </CardContent>
    </Card>
  );
}
