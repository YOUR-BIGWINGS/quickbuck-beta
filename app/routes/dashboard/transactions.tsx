"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import { Filter, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

const ITEMS_PER_PAGE = 20;

export default function TransactionsPage() {
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

  // Get player companies
  const companies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // State
  const [selectedAccount, setSelectedAccount] = useState<string>("personal");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [transactionType, setTransactionType] = useState<string>("all");

  // Fetch transactions based on selected account
  const personalTransactions = useQuery(
    api.transactions.getPlayerTransactionHistory,
    player?._id && selectedAccount === "personal"
      ? { playerId: player._id }
      : "skip"
  );

  const companyTransactions = useQuery(
    api.transactions.getCompanyTransactionHistory,
    selectedAccount !== "personal" && selectedAccount
      ? { companyId: selectedAccount as Id<"companies"> }
      : "skip"
  );

  const transactions =
    selectedAccount === "personal" ? personalTransactions : companyTransactions;

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    let filtered = [...transactions];

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom).getTime();
      filtered = filtered.filter((tx) => tx.createdAt >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo).getTime() + 86400000; // Add 1 day
      filtered = filtered.filter((tx) => tx.createdAt < toDate);
    }

    // Filter by amount range
    if (minAmount) {
      const min = parseFloat(minAmount) * 100;
      filtered = filtered.filter((tx) => tx.amount >= min);
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount) * 100;
      filtered = filtered.filter((tx) => tx.amount <= max);
    }

    // Filter by transaction type
    if (transactionType !== "all") {
      const accountId =
        selectedAccount === "personal" ? player?._id : selectedAccount;
      if (transactionType === "sent") {
        filtered = filtered.filter((tx) => tx.fromAccountId === accountId);
      } else if (transactionType === "received") {
        filtered = filtered.filter((tx) => tx.toAccountId === accountId);
      }
    }

    return filtered;
  }, [
    transactions,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    transactionType,
    selectedAccount,
    player,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset pagination when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    transactionType,
    selectedAccount,
  ]);

  // Get account name helper
  const getAccountName = (
    accountId: Id<"players"> | Id<"companies">,
    accountType: string
  ) => {
    if (accountType === "player") {
      if (accountId === player?._id) return "You";
      return "Another Player";
    } else {
      const company = companies?.find((c) => c._id === accountId);
      return company?.name || "Unknown Company";
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Transaction History
            </h1>
            <p className="text-muted-foreground">
              View all transactions for your accounts
            </p>
          </div>

          {/* Account Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Account</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedAccount}
                onValueChange={setSelectedAccount}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">
                    Personal Account{" "}
                    {player ? `- ${formatCurrency(player.balance)}` : ""}
                  </SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company._id} value={company._id}>
                      {company.name} - {formatCurrency(company.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Date From */}
                <div className="space-y-2">
                  <Label htmlFor="date-from">From Date</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <Label htmlFor="date-to">To Date</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>

                {/* Transaction Type */}
                <div className="space-y-2">
                  <Label htmlFor="tx-type">Transaction Type</Label>
                  <Select
                    value={transactionType}
                    onValueChange={setTransactionType}
                  >
                    <SelectTrigger id="tx-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Min Amount */}
                <div className="space-y-2">
                  <Label htmlFor="min-amount">Min Amount ($)</Label>
                  <Input
                    id="min-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                  />
                </div>

                {/* Max Amount */}
                <div className="space-y-2">
                  <Label htmlFor="max-amount">Max Amount ($)</Label>
                  <Input
                    id="max-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                  />
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      setMinAmount("");
                      setMaxAmount("");
                      setTransactionType("all");
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Transactions
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {filteredTransactions.length} transaction
                  {filteredTransactions.length !== 1 ? "s" : ""}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {!transactions ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b pb-3"
                    >
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <div className="space-y-2 text-right">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : paginatedTransactions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No transactions found
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((tx) => {
                        const accountId =
                          selectedAccount === "personal"
                            ? player?._id
                            : selectedAccount;
                        const isSent = tx.fromAccountId === accountId;
                        return (
                          <TableRow key={tx._id}>
                            <TableCell className="text-sm">
                              {new Date(tx.createdAt).toLocaleDateString()}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleTimeString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs font-medium ${
                                  isSent ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                {isSent ? "Sent" : "Received"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {getAccountName(
                                tx.fromAccountId,
                                tx.fromAccountType
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getAccountName(tx.toAccountId, tx.toAccountType)}
                            </TableCell>
                            <TableCell className="text-sm capitalize">
                              {tx.assetType}
                            </TableCell>
                            <TableCell className="text-sm max-w-xs truncate">
                              {tx.description}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                isSent ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {isSent ? "-" : "+"}
                              {formatCurrency(tx.amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
