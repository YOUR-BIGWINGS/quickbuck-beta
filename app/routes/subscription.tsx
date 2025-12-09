"use client";
import { useAuth, useUser } from "@clerk/react-router";
import { useAction, useQuery } from "convex/react";
import { Check, Crown, Loader2, Sparkles } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "../../convex/_generated/api";

export default function SubscriptionPage() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get subscription data
  const userSubscription = useQuery(
    api.subscriptions.getUserSubscription,
    isSignedIn && userId ? { userId } : "skip"
  );

  const handleSubscribe = async () => {
    if (!isSignedIn || !userId || !user?.primaryEmailAddress?.emailAddress) {
      setError("Please sign in to subscribe");
      return;
    }

    // Redirect to Ko-fi membership page
    const kofiUrl = process.env.NEXT_PUBLIC_KOFI_URL || "https://ko-fi.com/yourpage/membership";
    window.open(kofiUrl, "_blank");
  };

  const handleManageSubscription = async () => {
    if (!isSignedIn || !userId) {
      setError("Please sign in to manage subscription");
      return;
    }

    setError("Subscription management coming soon!");
  };

  // Check for success/cancel params
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setError(null);
    } else if (params.get("canceled") === "true") {
      setError("Subscription checkout was canceled");
    }
  }, []);

  const hasActiveSubscription = userSubscription?.status === "active" || userSubscription?.status === "on_trial";

  // Define QuickBuck+ features
  const quickbuckPlusFeatures = [
    "Special gold VIP tag",
    "Access to exclusive premium themes",
    "Stock analysis bot with daily recommendations",
    "Investment insights and suggestions"
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
          <Crown className="h-8 w-8 text-yellow-500" />
          QuickBuck+
        </h1>
        <p className="text-muted-foreground text-lg">
          Upgrade your experience with premium features
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Tier */}
        <Card className="relative">
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Basic QuickBuck experience</CardDescription>
            <div className="text-3xl font-bold mt-4">
              $0<span className="text-sm font-normal text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span>Access to all basic features</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span>Stock trading</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span>Company management</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span>Marketplace access</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button disabled className="w-full" variant="outline">
              Current Plan
            </Button>
          </CardFooter>
        </Card>

        {/* QuickBuck+ Tier */}
        <Card className="relative border-primary shadow-lg">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Premium
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              QuickBuck+
            </CardTitle>
            <CardDescription>Enhanced features and benefits</CardDescription>
            <div className="text-3xl font-bold mt-4">
              $3 AUD<span className="text-sm font-normal text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="font-medium">Everything in Free</span>
              </li>
              {quickbuckPlusFeatures.map((feature: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {!isSignedIn ? (
              <Button className="w-full" asChild>
                <a href="/sign-in">Sign In to Subscribe</a>
              </Button>
            ) : hasActiveSubscription ? (
              <div className="w-full space-y-2">
                <div className="text-sm text-center text-muted-foreground">
                  {userSubscription.cancelAtPeriodEnd ? (
                    <>
                      Subscription ends{" "}
                      {userSubscription.currentPeriodEnd ? new Date(userSubscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                    </>
                  ) : (
                    <>
                      Renews{" "}
                      {userSubscription.currentPeriodEnd ? new Date(userSubscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                    </>
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
                    "Manage Subscription"
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* FAQ Section */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How does billing work?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                QuickBuck+ is billed monthly at 3 AUD. Your subscription automatically renews
                each month until you cancel. All payments are processed securely through Stripe.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes! You can cancel your subscription at any time through the customer portal.
                You'll retain access to premium features until the end of your billing period.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Is payment secure?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Absolutely. We use Stripe, a PCI Level 1 certified payment processor. We never
                store your credit card information on our servers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What payment methods are accepted?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We accept all major credit and debit cards including Visa, Mastercard, American
                Express, and more through Stripe.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
