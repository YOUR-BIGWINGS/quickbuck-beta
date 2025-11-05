"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import {
  Send,
  History,
  Search,
  User,
  Building2,
  ArrowDownUp,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { cn } from "~/lib/utils";

type RecipientType = "player" | "company" | null;

export default function TransfersPage() {
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

  // Get transaction history
  const transactions = useQuery(
    api.transactions.getPlayerTransactionHistory,
    player?._id ? { playerId: player._id, limit: 10 } : "skip"
  );

  // Get player's companies
  const playerCompanies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get all players
  const allPlayersResult = useQuery(api.leaderboard.getAllPlayersSorted, {
    sortBy: "netWorth",
    limit: 100,
  });

  // Get all companies
  const allCompaniesResult = useQuery(api.leaderboard.getAllCompaniesSorted, {
    sortBy: "marketCap",
    limit: 100,
  });

  // Transfer mutation
  const transferCash = useMutation(api.transactions.transferCash);

  // Form state
  const [senderAccount, setSenderAccount] = useState<{
    type: "player" | "company";
    id: string;
    name: string;
    balance: number;
  } | null>(null);
  const [recipientType, setRecipientType] = useState<RecipientType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: string;
    type: "player" | "company";
    name: string;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Initialize sender account to player's account on load
  useEffect(() => {
    if (player && !senderAccount) {
      setSenderAccount({
        type: "player",
        id: player._id,
        name: "Personal Account",
        balance: player.balance,
      });
    }
  }, [player, senderAccount]);

  // Filter players and companies based on search
  const filteredPlayers = useMemo(() => {
    if (!allPlayersResult?.players || recipientType !== "player") return [];

    return allPlayersResult.players.filter((p) => {
      const displayName = p.userName || "Anonymous";
      return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [allPlayersResult, recipientType, searchQuery]);

  const filteredCompanies = useMemo(() => {
    if (!allCompaniesResult?.companies || recipientType !== "company")
      return [];

    return allCompaniesResult.companies.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ticker?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allCompaniesResult, recipientType, searchQuery]);

  // Handle recipient type selection
  const handleRecipientTypeSelect = (type: RecipientType) => {
    setRecipientType(type);
    setSearchQuery("");
    setSelectedRecipient(null);
    setError("");
  };

  // Handle recipient selection
  const handleRecipientSelect = (
    id: string,
    type: "player" | "company",
    name: string
  ) => {
    setSelectedRecipient({ id, type, name });
    setSearchQuery("");
    setError("");
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!senderAccount) {
      setError("Please select a sender account");
      return;
    }
    if (!selectedRecipient) {
      setError("Please select a recipient");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!description.trim()) {
      setError("Please add a description");
      return;
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Check balance
    if (amountInCents > senderAccount.balance) {
      setError("Insufficient balance");
      return;
    }

    setIsSubmitting(true);

    try {
      await transferCash({
        fromAccountId: senderAccount.id as Id<"players"> | Id<"companies">,
        fromAccountType: senderAccount.type,
        toAccountId: selectedRecipient.id as Id<"players"> | Id<"companies">,
        toAccountType: selectedRecipient.type,
        amount: amountInCents,
        description: description.trim(),
      });

      setSuccess(
        `Successfully transferred ${formatCurrency(amountInCents)} to ${
          selectedRecipient.name
        }`
      );

      // Reset form
      setAmount("");
      setDescription("");
      setSelectedRecipient(null);
      setRecipientType(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
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
            <h1 className="text-3xl font-bold tracking-tight">Transfers</h1>
            <p className="text-muted-foreground">
              Send money to players and companies
            </p>
          </div>

          {/* Current Balance */}
          {senderAccount && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Sending From:{" "}
                      {senderAccount.type === "player"
                        ? "Personal Account"
                        : senderAccount.name}
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(senderAccount.balance)}
                    </p>
                  </div>
                  <ArrowDownUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transfer Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Money
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 0: Select Sender Account */}
                <div className="space-y-3">
                  <Label>Send From</Label>
                  <Select
                    value={
                      senderAccount
                        ? `${senderAccount.type}:${senderAccount.id}`
                        : ""
                    }
                    onValueChange={(value) => {
                      const [type, id] = value.split(":");
                      if (type === "player" && player) {
                        setSenderAccount({
                          type: "player",
                          id: player._id,
                          name: "Personal Account",
                          balance: player.balance,
                        });
                      } else if (type === "company") {
                        const company = playerCompanies?.find(
                          (c) => c._id === id
                        );
                        if (company) {
                          setSenderAccount({
                            type: "company",
                            id: company._id,
                            name: company.name,
                            balance: company.balance,
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {player && (
                        <SelectItem value={`player:${player._id}`}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>
                              Personal ({formatCurrency(player.balance)})
                            </span>
                          </div>
                        </SelectItem>
                      )}
                      {playerCompanies && playerCompanies.length > 0 && (
                        <>
                          {playerCompanies.map((company) => (
                            <SelectItem
                              key={company._id}
                              value={`company:${company._id}`}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span>
                                  {company.name} (
                                  {formatCurrency(company.balance)})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 1: Select Recipient Type */}
                <div className="space-y-3">
                  <Label>Send To</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleRecipientTypeSelect("player")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary/50",
                        recipientType === "player"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <User className="h-6 w-6" />
                      <span className="font-medium">Player</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecipientTypeSelect("company")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary/50",
                        recipientType === "company"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <Building2 className="h-6 w-6" />
                      <span className="font-medium">Company</span>
                    </button>
                  </div>
                </div>

                {/* Step 2: Search and Select Recipient */}
                {recipientType && (
                  <div className="space-y-3">
                    <Label>
                      {selectedRecipient
                        ? "Selected Recipient"
                        : `Search ${
                            recipientType === "player" ? "Players" : "Companies"
                          }`}
                    </Label>

                    {selectedRecipient ? (
                      <div className="flex items-center justify-between rounded-lg border-2 border-primary bg-primary/5 p-4">
                        <div className="flex items-center gap-3">
                          {selectedRecipient.type === "player" ? (
                            <User className="h-5 w-5" />
                          ) : (
                            <Building2 className="h-5 w-5" />
                          )}
                          <div>
                            <p className="font-medium">
                              {selectedRecipient.name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {selectedRecipient.type}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRecipient(null)}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder={`Search ${
                              recipientType === "player"
                                ? "by player name"
                                : "by company name or ticker"
                            }...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>

                        {/* Search Results */}
                        {searchQuery && (
                          <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border p-2">
                            {recipientType === "player" &&
                              filteredPlayers.length > 0 &&
                              filteredPlayers.map((p) => (
                                <button
                                  key={p._id}
                                  type="button"
                                  onClick={() =>
                                    handleRecipientSelect(
                                      p._id,
                                      "player",
                                      p.userName || "Anonymous"
                                    )
                                  }
                                  className="flex w-full items-center justify-between rounded-md p-3 text-left transition-colors hover:bg-accent"
                                >
                                  <div className="flex items-center gap-3">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">
                                        {p.userName || "Anonymous"}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Net Worth: {formatCurrency(p.netWorth)}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}

                            {recipientType === "company" &&
                              filteredCompanies.length > 0 &&
                              filteredCompanies.map((c) => (
                                <button
                                  key={c._id}
                                  type="button"
                                  onClick={() =>
                                    handleRecipientSelect(
                                      c._id,
                                      "company",
                                      c.name
                                    )
                                  }
                                  className="flex w-full items-center justify-between rounded-md p-3 text-left transition-colors hover:bg-accent"
                                >
                                  <div className="flex items-center gap-3">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">{c.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {c.ticker && `${c.ticker} • `}
                                        {c.marketCap
                                          ? `Market Cap: ${formatCurrency(
                                              c.marketCap
                                            )}`
                                          : `Balance: ${formatCurrency(
                                              c.balance
                                            )}`}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}

                            {((recipientType === "player" &&
                              filteredPlayers.length === 0) ||
                              (recipientType === "company" &&
                                filteredCompanies.length === 0)) && (
                              <p className="p-3 text-center text-sm text-muted-foreground">
                                No results found
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Step 3: Amount and Description */}
                {selectedRecipient && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                      {amount && parseFloat(amount) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          You will send:{" "}
                          {formatCurrency(Math.round(parseFloat(amount) * 100))}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="What is this transfer for?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {/* Messages */}
                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {success}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedRecipient}
                  className="w-full"
                >
                  {isSubmitting ? "Processing..." : "Send Transfer"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Transfer History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!transactions ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b pb-3"
                    >
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <div className="space-y-2 text-right">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No transfers yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const isSent = tx.fromAccountId === player?._id;
                      return (
                        <TableRow key={tx._id}>
                          <TableCell className="text-sm">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isSent ? "text-red-600" : "text-green-600"
                              )}
                            >
                              {isSent ? "Sent" : "Received"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {tx.description}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium",
                              isSent ? "text-red-600" : "text-green-600"
                            )}
                          >
                            {isSent ? "-" : "+"}
                            {formatCurrency(tx.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
