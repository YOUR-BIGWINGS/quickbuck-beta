"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  ShoppingCart,
  X,
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

  // Get player's listed companies
  const myListedCompanies = useQuery(
    api.companySales.getPlayerListedCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Mutations
  const buyCompany = useMutation(api.companySales.buyCompanyDirectly);
  const unlistCompany = useMutation(api.companySales.unlistCompany);

  // Buy confirmation modal state
  const [selectedSale, setSelectedSale] = useState<Id<"companySales"> | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Get selected sale details
  const selectedSaleData = companiesForSale?.find(s => s._id === selectedSale);

  // Handle buy company
  const handleBuyCompany = async () => {
    setError("");

    if (!player || !selectedSale) {
      setError("Missing required information");
      return;
    }

    setIsSubmitting(true);
    try {
      await buyCompany({
        saleId: selectedSale,
        buyerId: player._id,
      });

      setIsBuyModalOpen(false);
      setSelectedSale(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to purchase company"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle unlist company
  const handleUnlistCompany = async (companyId: Id<"companies">) => {
    if (!player) return;

    try {
      await unlistCompany({
        companyId,
        sellerId: player._id,
      });
    } catch (err) {
      console.error("Failed to unlist company:", err);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Marketplace</h1>
            <p className="text-muted-foreground">
              Browse and purchase companies instantly at the listed price
            </p>
          </div>

          {/* My Listed Companies */}
          {myListedCompanies && myListedCompanies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  My Listed Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Asking Price</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myListedCompanies.map((listing) => (
                      <TableRow key={listing._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CompanyLogo
                              src={listing.company?.logo}
                              alt={listing.company?.name || "Company"}
                              size="xs"
                            />
                            {listing.company?.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {listing.company?.ticker ? (
                            <Badge variant="outline" className="font-mono">
                              {listing.company.ticker}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              Private
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(listing.askingPrice)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUnlistCompany(listing.companyId)}
                          >
                            <X className="mr-1 h-3 w-3" />
                            Remove Listing
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Companies for Sale */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Companies for Sale
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!companiesForSale || companiesForSale.length === 0 ? (
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
                    {companiesForSale.map((sale) => (
                      <TableRow key={sale._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CompanyLogo
                              src={sale.company?.logo}
                              alt={sale.company?.name || "Company"}
                              size="xs"
                            />
                            {sale.company?.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sale.company?.ticker ? (
                            <Badge variant="outline" className="font-mono">
                              {sale.company.ticker}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              Private
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(sale.askingPrice)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          Player #{sale.seller?._id.slice(-6)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedSale(sale._id);
                              setIsBuyModalOpen(true);
                            }}
                            disabled={sale.sellerId === player?._id}
                          >
                            <ShoppingCart className="mr-1 h-3 w-3" />
                            Buy Now
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Buy Confirmation Modal */}
          <Dialog open={isBuyModalOpen} onOpenChange={setIsBuyModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Purchase</DialogTitle>
                <DialogDescription>
                  Are you sure you want to purchase {selectedSaleData?.company?.name} for{" "}
                  <span className="font-semibold text-green-600">
                    {formatCurrency(selectedSaleData?.askingPrice || 0)}
                  </span>?
                  <br />
                  <br />
                  Your balance: {formatCurrency(player?.balance || 0)}
                </DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBuyModalOpen(false);
                    setError("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBuyCompany}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Confirm Purchase"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
