"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { CompanyLogo } from "~/components/ui/company-logo";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import {
  Building2,
  DollarSign,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/company-sales";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw redirect("/sign-in");
  }

  return {};
}

export default function CompanySalesPage() {
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

  // Get player's pending offers (as seller)
  const pendingOffers = useQuery(
    api.companySales.getPlayerPendingOffers,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get player's offers as buyer
  const myOffers = useQuery(
    api.companySales.getPlayerOffersAsBuyer,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Mutations
  const makeOffer = useMutation(api.companySales.makeCompanySaleOffer);
  const respondToOffer = useMutation(
    api.companySales.respondToCompanySaleOffer
  );

  // Make Offer modal state
  const [selectedCompany, setSelectedCompany] =
    useState<Id<"companies"> | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Counter Offer modal state
  const [selectedOffer, setSelectedOffer] = useState<Id<"companySales"> | null>(
    null
  );
  const [counterAmount, setCounterAmount] = useState("");
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterError, setCounterError] = useState("");

  // Get company details for listings
  const companiesWithDetails = companiesForSale
    ?.map((sale) => {
      const company = useQuery(api.companies.getCompany, {
        companyId: sale.companyId,
      });
      const seller = useQuery(api.players.getPlayer, {
        playerId: sale.sellerId,
      });
      return { sale, company, seller };
    })
    .filter((item) => item.company && item.seller);

  // Get company details for pending offers
  const offersWithDetails = pendingOffers
    ?.map((offer) => {
      const company = useQuery(api.companies.getCompany, {
        companyId: offer.companyId,
      });
      const buyer = offer.buyerId
        ? useQuery(api.players.getPlayer, { playerId: offer.buyerId })
        : null;
      return { offer, company, buyer };
    })
    .filter((item) => item.company);

  // Handle make offer
  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfferError("");

    if (!player || !selectedCompany) {
      setOfferError("Missing required information");
      return;
    }

    const amount = parseFloat(offerAmount) * 100; // Convert to cents
    if (amount <= 0 || isNaN(amount)) {
      setOfferError("Invalid offer amount");
      return;
    }

    if (amount > player.balance) {
      setOfferError("Insufficient balance");
      return;
    }

    setIsSubmitting(true);
    try {
      await makeOffer({
        companyId: selectedCompany,
        buyerId: player._id,
        offeredPrice: Math.round(amount),
      });

      setIsOfferModalOpen(false);
      setOfferAmount("");
      setSelectedCompany(null);
    } catch (err) {
      setOfferError(
        err instanceof Error ? err.message : "Failed to make offer"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle accept offer
  const handleAcceptOffer = async (offerId: Id<"companySales">) => {
    if (!player) return;

    try {
      await respondToOffer({
        offerId,
        response: "accept",
      });
    } catch (err) {
      console.error("Failed to accept offer:", err);
    }
  };

  // Handle reject offer
  const handleRejectOffer = async (offerId: Id<"companySales">) => {
    if (!player) return;

    try {
      await respondToOffer({
        offerId,
        response: "reject",
      });
    } catch (err) {
      console.error("Failed to reject offer:", err);
    }
  };

  // Handle counter offer
  const handleCounterOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCounterError("");

    if (!player || !selectedOffer) {
      setCounterError("Missing required information");
      return;
    }

    const amount = parseFloat(counterAmount) * 100; // Convert to cents
    if (amount <= 0 || isNaN(amount)) {
      setCounterError("Invalid counter offer amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await respondToOffer({
        offerId: selectedOffer,
        response: "counter",
        counterOfferPrice: Math.round(amount),
      });

      setIsCounterModalOpen(false);
      setCounterAmount("");
      setSelectedOffer(null);
    } catch (err) {
      setCounterError(
        err instanceof Error ? err.message : "Failed to counter offer"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Sales</h1>
            <p className="text-muted-foreground">
              Browse companies for sale or manage offers for your companies
            </p>
          </div>

          {/* Companies for Sale */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Companies for Sale
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!companiesWithDetails || companiesWithDetails.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No companies for sale at the moment
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Asking Price</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companiesWithDetails.map((item) => (
                      <TableRow key={item.sale._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CompanyLogo
                              src={item.company?.logo}
                              alt={item.company?.name || "Company"}
                              size="xs"
                            />
                            {item.company?.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.company?.ticker ? (
                            <Badge variant="outline" className="font-mono">
                              {item.company.ticker}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              Private
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(item.sale.askingPrice)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          Player #{item.seller?._id.slice(-6)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCompany(item.sale.companyId);
                              setIsOfferModalOpen(true);
                            }}
                            disabled={item.sale.sellerId === player?._id}
                          >
                            <DollarSign className="mr-1 h-3 w-3" />
                            Make Offer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* My Sale Offers (as seller) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Offers on My Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!offersWithDetails || offersWithDetails.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No pending offers on your companies
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Offered Price</TableHead>
                      <TableHead>Counter Offer</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offersWithDetails.map((item) => (
                      <TableRow key={item.offer._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CompanyLogo
                              src={item.company?.logo}
                              alt={item.company?.name || "Company"}
                              size="xs"
                            />
                            {item.company?.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.offer.status === "offer_pending"
                                ? "default"
                                : "outline"
                            }
                          >
                            {item.offer.status === "offer_pending"
                              ? "Pending"
                              : "Countered"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          {formatCurrency(item.offer.offeredPrice || 0)}
                        </TableCell>
                        <TableCell className="font-semibold text-purple-600">
                          {item.offer.counterOfferPrice
                            ? formatCurrency(item.offer.counterOfferPrice)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleAcceptOffer(item.offer._id)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectOffer(item.offer._id)}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOffer(item.offer._id);
                                setIsCounterModalOpen(true);
                              }}
                            >
                              <MessageSquare className="mr-1 h-3 w-3" />
                              Counter
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Make Offer Modal */}
          <Dialog open={isOfferModalOpen} onOpenChange={setIsOfferModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Make Offer</DialogTitle>
                <DialogDescription>
                  Enter your offer amount for this company
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMakeOffer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="offerAmount">Offer Amount ($)</Label>
                  <Input
                    id="offerAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="10000.00"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-medium">
                    Your balance: {formatCurrency(player?.balance || 0)}
                  </p>
                </div>

                {offerError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {offerError}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOfferModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Offer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Counter Offer Modal */}
          <Dialog
            open={isCounterModalOpen}
            onOpenChange={setIsCounterModalOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Counter Offer</DialogTitle>
                <DialogDescription>
                  Enter your counter offer amount
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCounterOffer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="counterAmount">
                    Counter Offer Amount ($)
                  </Label>
                  <Input
                    id="counterAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="15000.00"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    required
                  />
                </div>

                {counterError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {counterError}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCounterModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Counter"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
