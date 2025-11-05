"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency } from "~/lib/game-utils";
import { Building2, Wallet, TrendingUp } from "lucide-react";
import { useAuth } from "@clerk/react-router";
import type { Id } from "convex/_generated/dataModel";

export default function AccountsPage() {
  const { userId: clerkUserId } = useAuth();

  // First, get the Convex user ID
  const user = useQuery(
    api.users.findUserByToken,
    clerkUserId ? { tokenIdentifier: clerkUserId } : "skip"
  );

  // Fetch player data (gets static ID)
  const playerBasic = useQuery(
    api.players.getPlayerByUserId,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );

  // Fetch player with calculated net worth (includes company equity)
  const player = useQuery(
    api.players.getPlayer,
    playerBasic?._id ? { playerId: playerBasic._id } : "skip"
  );

  // Fetch companies owned by player
  const companies = useQuery(
    api.companies.getPlayerCompanies,
    playerBasic?._id ? { playerId: playerBasic._id } : "skip"
  );

  // Calculate total company assets
  const totalCompanyAssets = companies
    ? companies.reduce((sum, company) => sum + company.balance, 0)
    : 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground">
              Manage your personal account and company finances
            </p>
          </div>

          {/* Personal Account Card */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Wallet className="h-6 w-6" />
                Personal Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!player ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Available Balance
                    </p>
                    <p className="text-4xl font-bold text-green-600">
                      {formatCurrency(player.balance)}
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Net Worth</p>
                      <p className="text-xl font-semibold text-blue-600">
                        {formatCurrency(player.netWorth)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company Accounts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Company Accounts</h2>
              {companies && companies.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Total Assets:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(totalCompanyAssets)}
                  </span>
                </div>
              )}
            </div>

            {!companies ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : companies.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No companies yet
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Create your first company to start managing business
                    finances
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {companies.map((company) => (
                  <Card
                    key={company._id}
                    className="transition-all hover:shadow-lg"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {company.name}
                          </CardTitle>
                          <p className="text-xs font-mono text-muted-foreground">
                            {company.ticker || "Private"}
                          </p>
                        </div>
                        {company.isPublic && (
                          <div className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            Public
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(company.balance)}
                        </p>
                      </div>
                      {company.isPublic && company.marketCap && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Market Cap
                          </p>
                          <p className="flex items-center gap-1 text-lg font-semibold text-purple-600">
                            <TrendingUp className="h-4 w-4" />
                            {formatCurrency(company.marketCap)}
                          </p>
                        </div>
                      )}
                      {company.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {company.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
