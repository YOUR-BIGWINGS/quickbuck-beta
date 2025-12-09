"use client";
import { useAuth } from "@clerk/react-router";
import { useQuery, useAction } from "convex/react";
import { Crown, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "../../convex/_generated/api";

export default function SubscriptionStatus() {
  const { isSignedIn, userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionStatus = useQuery(
    api.subscriptions.checkUserSubscriptionStatus,
    isSignedIn && userId ? { userId } : "skip"
  );
  
  const createPortalUrl = useAction(api.subscriptions.createCustomerPortalUrl);

  const handleManageSubscription = async () => {
    if (!isSignedIn || !userId) {
      setError("Please sign in to manage subscription");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createPortalUrl({
        userId,
        returnUrl: `${window.location.origin}/dashboard/settings`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error("Error creating portal:", err);
      setError(err instanceof Error ? err.message : "Failed to open customer portal");
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Please sign in to view subscription details.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasActiveSubscription = subscriptionStatus?.hasActiveSubscription;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          QuickBuck+ Subscription
        </CardTitle>
        <CardDescription>
          {hasActiveSubscription
            ? "You have an active premium subscription"
            : "Upgrade to QuickBuck+ for premium features"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {hasActiveSubscription ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-green-600">
                  {subscriptionStatus.cancelAtPeriodEnd ? "Ending Soon" : "Active"}
                </span>
              </div>
              {subscriptionStatus.currentPeriodEnd && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {subscriptionStatus.cancelAtPeriodEnd ? "Ends" : "Renews"}
                  </span>
                  <span className="font-medium">
                    {new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleManageSubscription}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Manage Subscription
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Get exclusive features including a gold VIP tag, premium themes, and daily stock recommendations for just $3 AUD/month.
            </p>
            <Button asChild className="w-full">
              <a href="/subscription">
                View Plans & Subscribe
              </a>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
