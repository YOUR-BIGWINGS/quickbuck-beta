"use client";
import { useAuth, useUser } from "@clerk/react-router";
import { useAction, useQuery } from "convex/react";
import { ArrowLeft, Check, Crown, Loader2, Sparkles } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { Link } from "react-router";
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

    // Redirect to Ko-fi QuickBuck+ tier
    const kofiUrl = import.meta.env.VITE_KOFI_URL || "https://ko-fi.com/brodie21746#tier17652766881070";
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
    "VIP chat lounge with other members",
    "Access to exclusive premium themes",
    "Stock analysis bot with daily recommendations",
    "Investment insights and suggestions",
    "+10% tax evasion success chance",
    "Gold leaderboard highlight",
    "$10M max loan limit (vs $5M)",
    "+5% casino luck bonus"
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
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

      {/* Feature Comparison Section */}
      <div className="mt-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Feature Comparison
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">Free</th>
                    <th className="text-center p-4 font-medium bg-primary/5">
                      <span className="flex items-center justify-center gap-1">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        QuickBuck+
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4">Stock Trading</td>
                    <td className="text-center p-4"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                    <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4">Company Management</td>
                    <td className="text-center p-4"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                    <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4">Marketplace Access</td>
                    <td className="text-center p-4"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                    <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4">Gambling Features</td>
                    <td className="text-center p-4"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                    <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4">Loans & Banking</td>
                    <td className="text-center p-4"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                    <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium text-yellow-600">Gold VIP Tag</td>
                    <td className="text-center p-4"><span className="text-muted-foreground">—</span></td>
                    <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-primary mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium text-yellow-600">Premium Themes</td>
                    <td className="text-center p-4"><span className="text-muted-foreground">—</span></td>
                    <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-primary mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium text-yellow-600">Stock Analysis Bot</td>
                    <td className="text-center p-4"><span className="text-muted-foreground">—</span></td>
                    <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-primary mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium text-yellow-600">Investment Insights</td>
                    <td className="text-center p-4"><span className="text-muted-foreground">—</span></td>
                    <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 text-primary mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium text-yellow-600">Tax Evasion Bonus</td>
                    <td className="text-center p-4"><span className="text-muted-foreground">60%</span></td>
                    <td className="text-center p-4 bg-primary/5"><span className="font-medium text-primary">70%</span></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium text-yellow-600">Leaderboard Highlight</td>
                    <td className="text-center p-4"><span className="text-muted-foreground">—</span></td>
                    <td className="text-center p-4 bg-primary/5"><span className="font-medium text-yellow-500">Gold</span></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium text-yellow-600">Max Loan Amount</td>
                    <td className="text-center p-4"><span className="text-muted-foreground">$5M</span></td>
                    <td className="text-center p-4 bg-primary/5"><span className="font-medium text-primary">$10M</span></td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-yellow-600">Casino Luck Bonus</td>
                    <td className="text-center p-4"><span className="text-muted-foreground">—</span></td>
                    <td className="text-center p-4 bg-primary/5"><span className="font-medium text-primary">+5%</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
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
                each month until you cancel. All payments are processed securely through Ko-fi.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes! You can cancel your subscription at any time through your Ko-fi account.
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
                Absolutely. We use Ko-fi, a trusted payment platform with secure payment processing.
                We never store your payment information on our servers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What payment methods are accepted?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Ko-fi accepts all major credit and debit cards including Visa, Mastercard, American
                Express, and also supports PayPal for your convenience.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
