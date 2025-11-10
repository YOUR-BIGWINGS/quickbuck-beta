"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { CompanyLogo } from "~/components/ui/company-logo";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import {
  Building2,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Store,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

export default function CompanyMarketplacePage() {
  const { userId: clerkUserId } = useAuth();

  // Get user and player
  const user = useQuery(
    api.users.findUserByToken,
    clerkUserId ? { tokenIdentifier: clerkUserId } : "skip"
  );
  const player = useQuery(
    api.players.getPlayerByUserId,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );

  // Get all companies for sale
  const companiesForSale = useQuery(api.companySales.getAllCompaniesForSale);

  // Mutation for buying directly
  const buyCompany = useMutation(api.companySales.buyCompanyDirectly);

  // State for offer modal
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Handle making an offer
  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!player || !selectedCompany) {
      setError("Player or company not found");
      return;
    }

    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Invalid offer amount");
      return;
    }

    const amountInCents = Math.round(amount * 100);

    if (player.balance < amountInCents) {
      setError("Insufficient balance for this offer");
      return;
    }

    setIsSubmitting(true);
    try {
      await buyCompany({
        saleId: selectedCompany._id,
        buyerId: player._id,
      });

      // Reset and close
      setOfferAmount("");
      setOfferModalOpen(false);
      setSelectedCompany(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to purchase company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open offer modal
  const openOfferModal = (sale: any) => {
    setSelectedCompany(sale);
    setOfferModalOpen(true);
    setError("");
    // Pre-fill with asking price
    if (sale.askingPrice > 0) {
      setOfferAmount((sale.askingPrice / 100).toFixed(2));
    } else {
      setOfferAmount("");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Company Marketplace
              </h1>
              <p className="text-muted-foreground">
                Browse and purchase companies from other players
              </p>
            </div>

            {player && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Your Balance</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(player.balance)}
                </p>
              </div>
            )}
          </div>

          {/* Companies For Sale Grid */}
          {!companiesForSale ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : companiesForSale.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Store className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  No companies for sale
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Check back later or list your own company for sale
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {companiesForSale.map((sale) => {
                const company = sale.company;
                const seller = sale.seller;
                if (!company || !seller) return null;

                const isOwnCompany = player && company.ownerId === player._id;

                return (
                  <Card key={sale._id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg">
                            {company.name}
                          </CardTitle>
                          {company.ticker && (
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {company.ticker}
                            </Badge>
                          )}
                        </div>
                        <CompanyLogo
                          src={company.logo}
                          alt={company.name}
                          size="md"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Company Balance */}
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Company Balance
                        </p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(company.balance)}
                        </p>
                      </div>

                      {/* Asking Price */}
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Asking Price
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(sale.askingPrice)}
                        </p>
                      </div>

                      {/* Market Cap (if public) */}
                      {company.isPublic && company.marketCap && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Market Cap
                          </p>
                          <p className="flex items-center gap-1 text-lg font-semibold text-blue-600">
                            <TrendingUp className="h-4 w-4" />
                            {formatCurrency(company.marketCap)}
                          </p>
                        </div>
                      )}

                      {/* Description */}
                      {company.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {company.description}
                        </p>
                      )}

                      {/* Seller Info */}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          Seller:{" "}
                          <span className="font-semibold">
                            Player #{seller._id.slice(-6)}
                          </span>
                        </p>
                      </div>

                      {/* Action Button */}
                      {!isOwnCompany && player && (
                        <Button
                          className="w-full"
                          onClick={() => openOfferModal(sale)}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Make Offer
                        </Button>
                      )}

                      {isOwnCompany && (
                        <Badge
                          variant="secondary"
                          className="w-full justify-center py-2"
                        >
                          Your Company
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Make Offer Modal */}
          <Dialog open={offerModalOpen} onOpenChange={setOfferModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Make an Offer</DialogTitle>
                <DialogDescription>
                  {selectedCompany?.company?.name
                    ? `Make an offer for ${selectedCompany.company.name}`
                    : "Make an offer for this company"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleMakeOffer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="offer-amount">Offer Amount ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="offer-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter your offer"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                  {selectedCompany?.askingPrice > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Asking price:{" "}
                      {formatCurrency(selectedCompany.askingPrice)}
                    </p>
                  )}
                  {player && (
                    <p className="text-xs text-muted-foreground">
                      Your balance: {formatCurrency(player.balance)}
                    </p>
                  )}
                </div>

                <div className="rounded-md bg-blue-50 p-3 text-sm">
                  <p className="text-muted-foreground mb-1">
                    <strong>How it works:</strong>
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    <li>Your offer will be sent to the seller</li>
                    <li>
                      The seller can accept, reject, or make a counter offer
                    </li>
                    <li>You'll be notified of their response</li>
                    <li>
                      Funds are only transferred when the offer is accepted
                    </li>
                  </ul>
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOfferModalOpen(false);
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Offer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
