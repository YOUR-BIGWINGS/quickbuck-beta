"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
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
import { usePlayerData } from "~/hooks/use-player-data";
import { DollarSign, TrendingDown, AlertTriangle, History } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

export default function LoansPage() {
  const { userId: clerkUserId } = useAuth();

  // Use the usePlayerData hook which handles automatic player creation
  const { player } = usePlayerData(clerkUserId || null);

  // Get player's loans
  const allLoans = useQuery(
    api.loans.getPlayerLoans,
    player?._id ? { playerId: player._id } : "skip"
  );

  const activeLoans = useQuery(
    api.loans.getPlayerActiveLoans,
    player?._id ? { playerId: player._id } : "skip"
  );

  const totalDebt = useQuery(
    api.loans.getPlayerTotalDebt,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Mutations
  const createLoan = useMutation(api.loans.createLoan);
  const repayLoan = useMutation(api.loans.repayLoan);

  // Form state
  const [loanAmount, setLoanAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [selectedLoanId, setSelectedLoanId] = useState<Id<"loans"> | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // VIP users get $10M max, regular users get $5M
  const MAX_LOAN_AMOUNT = player?.isVIP ? 1000000000 : 500000000;
  const MAX_LOAN_DISPLAY = player?.isVIP ? "$10,000,000" : "$5,000,000";
  const INTEREST_RATE = 5; // 5% per day

  // Calculate projected cost
  const calculateProjectedCost = (principal: number, days: number = 30) => {
    const amount = principal;
    const totalInterest = amount * (INTEREST_RATE / 100) * days;
    return {
      daily: amount * (INTEREST_RATE / 100),
      monthly: totalInterest,
      total: amount + totalInterest,
    };
  };

  const projectedCost = loanAmount
    ? calculateProjectedCost(parseFloat(loanAmount) * 100)
    : null;

  // Handle borrow
  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!player) {
      setError("Player not found");
      return;
    }

    const amountDollars = parseFloat(loanAmount);
    if (isNaN(amountDollars) || amountDollars <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const amountCents = Math.round(amountDollars * 100);
    if (amountCents > MAX_LOAN_AMOUNT) {
      setError(`Maximum loan amount is ${MAX_LOAN_DISPLAY}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await createLoan({
        playerId: player._id,
        amount: amountCents,
      });
      setSuccess(`Loan of ${formatCurrency(amountCents)} approved!`);
      setLoanAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create loan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle repayment
  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedLoanId) {
      setError("Please select a loan to repay");
      return;
    }

    const amountDollars = parseFloat(repayAmount);
    if (isNaN(amountDollars) || amountDollars <= 0) {
      setError("Please enter a valid repayment amount");
      return;
    }

    const amountCents = Math.round(amountDollars * 100);

    setIsSubmitting(true);
    try {
      const remaining = await repayLoan({
        loanId: selectedLoanId,
        amount: amountCents,
      });
      setSuccess(
        remaining === 0
          ? "Loan fully paid off!"
          : `Payment successful! Remaining: ${formatCurrency(remaining)}`
      );
      setRepayAmount("");
      setSelectedLoanId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to repay loan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pay off full loan
  const handlePayOffFull = async (loanId: Id<"loans">, balance: number) => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const remaining = await repayLoan({
        loanId,
        amount: balance,
      });
      setSuccess(
        remaining === 0
          ? "Loan fully paid off!"
          : `Payment successful! Remaining: ${formatCurrency(remaining)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to repay loan");
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
            <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
            <p className="text-muted-foreground">
              Borrow money to grow your business (5% daily interest)
            </p>
          </div>

          {/* Total Debt Card */}
          {totalDebt !== undefined && totalDebt > 0 && (
            <Card className="border-2 border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Debt</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {formatCurrency(totalDebt)}
                    </p>
                  </div>
                  <AlertTriangle className="h-12 w-12 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Borrow Money Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Borrow Money
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBorrow} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loan-amount">
                    Loan Amount (max {MAX_LOAN_DISPLAY})
                  </Label>
                  <Input
                    id="loan-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={MAX_LOAN_AMOUNT / 100}
                    placeholder="0.00"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="rounded-md bg-muted p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingDown className="h-4 w-4" />
                    Interest Rate: 5% per day
                  </div>
                  {projectedCost && (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        Daily interest:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(projectedCost.daily)}
                        </span>
                      </p>
                      <p>
                        30-day interest:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(projectedCost.monthly)}
                        </span>
                      </p>
                      <p>
                        Total after 30 days:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(projectedCost.total)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-yellow-500/50 bg-yellow-500/5 p-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">
                      <strong>Warning:</strong> Interest is automatically
                      deducted daily and can make your balance negative. Repay
                      loans promptly to avoid accumulating debt!
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                    {success}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Processing..." : "Borrow Money"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Repay Loan Section */}
          {activeLoans && activeLoans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Repay Loan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeLoans.map((loan) => (
                    <div
                      key={loan._id}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Original Amount
                          </p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(loan.amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Remaining Balance
                          </p>
                          <p className="text-lg font-semibold text-red-600">
                            {formatCurrency(loan.remainingBalance)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Interest Rate</p>
                          <p className="font-medium">
                            {loan.interestRate}% daily
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Accrued Interest
                          </p>
                          <p className="font-medium text-red-600">
                            {formatCurrency(loan.accruedInterest || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handlePayOffFull(loan._id, loan.remainingBalance)
                          }
                          disabled={
                            isSubmitting ||
                            (player?.balance || 0) < loan.remainingBalance
                          }
                          className="flex-1"
                        >
                          Pay Off Full
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLoanId(loan._id)}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          Make Payment
                        </Button>
                      </div>

                      {selectedLoanId === loan._id && (
                        <form onSubmit={handleRepay} className="space-y-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Payment amount"
                            value={repayAmount}
                            onChange={(e) => setRepayAmount(e.target.value)}
                            required
                          />
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={isSubmitting}
                              className="flex-1"
                            >
                              Submit Payment
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLoanId(null);
                                setRepayAmount("");
                              }}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loan History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Loan History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!allLoans ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b pb-3"
                    >
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="space-y-2 text-right">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : allLoans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No loans yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Interest Rate</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allLoans
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .slice(0, 5)
                      .map((loan) => (
                        <TableRow key={loan._id}>
                          <TableCell className="text-sm">
                            {new Date(loan.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(loan.amount)}
                          </TableCell>
                          <TableCell>{loan.interestRate}%</TableCell>
                          <TableCell
                            className={
                              loan.remainingBalance > 0
                                ? "font-medium text-red-600"
                                : "text-muted-foreground"
                            }
                          >
                            {formatCurrency(loan.remainingBalance)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                loan.status === "active"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {loan.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
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
