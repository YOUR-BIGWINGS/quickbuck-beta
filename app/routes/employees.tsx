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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/employees";
import { motion } from "motion/react";
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect("/sign-in");
  return {};
}

export default function EmployeesPage() {
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

  // Get player's companies
  const playerCompanies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  const [selectedCompanyId, setSelectedCompanyId] = useState<Id<"companies"> | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  if (!player || !playerCompanies) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (playerCompanies.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <motion.div
          className="@container/main flex flex-1 flex-col gap-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                    <p className="mt-4 text-lg font-medium">No Companies Found</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      You need to own a company to hire employees
                    </p>
                    <Button className="mt-4" onClick={() => window.location.href = "/companies"}>
                      Create a Company
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  const companyId = selectedCompanyId || playerCompanies[0]._id;
  const selectedCompany = playerCompanies.find(c => c._id === companyId);

  return (
    <div className="flex flex-1 flex-col">
      <motion.div
        className="@container/main flex flex-1 flex-col gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <motion.div variants={itemVariants}>
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
              <p className="text-muted-foreground">
                Hire employees to boost your company's performance
              </p>
            </div>
          </motion.div>

          {/* Company Selector */}
          {playerCompanies.length > 1 && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Select Company</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {playerCompanies.map((company) => (
                      <Button
                        key={company._id}
                        variant={companyId === company._id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCompanyId(company._id)}
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        {company.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Current Company Info */}
          {selectedCompany && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedCompany.name}</CardTitle>
                      <CardDescription>Company Balance: {formatCurrency(selectedCompany.balance)}</CardDescription>
                    </div>
                    <Badge variant="outline">
                      {selectedCompany.employees?.length || 0} Employee{selectedCompany.employees?.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          )}

          {/* Employee Management */}
          <motion.div variants={itemVariants}>
            <EmployeeManagement companyId={companyId} playerId={player._id} />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// Employee Management Component
function EmployeeManagement({ 
  companyId, 
  playerId 
}: { 
  companyId: Id<"companies">; 
  playerId: Id<"players"> 
}) {
  const availableEmployees = useQuery(api.companies.getAvailableEmployees, { companyId });
  const hiredEmployees = useQuery(api.companies.getHiredEmployees, { companyId });
  const employeeBonus = useQuery(api.companies.getCompanyEmployeeBonus, { companyId });
  const hireEmployee = useMutation(api.companies.hireEmployee);
  const fireEmployee = useMutation(api.companies.fireEmployee);
  const playerBalance = useQuery(api.players.getPlayerBalance, { playerId });

  const handleHire = async (employeeId: string, employeeName: string, cost: number) => {
    try {
      await hireEmployee({ companyId, employeeId });
      toast.success(`Successfully hired ${employeeName}!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to hire employee");
    }
  };

  const handleFire = async (employeeId: string, employeeName: string) => {
    try {
      await fireEmployee({ companyId, employeeId });
      toast.success(`${employeeName} has been dismissed`);
    } catch (error: any) {
      toast.error(error.message || "Failed to fire employee");
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {employeeBonus && hiredEmployees && hiredEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Employee Benefits Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Total Stock Boost</p>
                <p className="mt-1 text-2xl font-bold">+{employeeBonus.totalStockBoost}%</p>
                <p className="mt-1 text-xs text-muted-foreground">Applied to product orders</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Tick Cost</p>
                <p className="mt-1 text-2xl font-bold">{employeeBonus.totalTickCostPercentage}%</p>
                <p className="mt-1 text-xs text-muted-foreground">of income per tick</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hired Employees */}
      {hiredEmployees && hiredEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Current Employees</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hiredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-semibold">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">
                        +{employee.bonusPercentage}% Stock Boost
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tick Cost: {employee.tickCostPercentage}% of income
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleFire(employee.id, employee.name)}
                  >
                    Fire
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Employees */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Available to Hire</CardTitle>
            </div>
            <Badge variant="outline">
              Your Balance: {formatCurrency(playerBalance || 0)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!availableEmployees || availableEmployees.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              All available employees have been hired
            </p>
          ) : (
            <div className="space-y-3">
              {availableEmployees.map((employee) => {
                const canAfford = (playerBalance || 0) >= employee.upfrontCost;
                
                return (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {employee.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            Upfront: {formatCurrency(employee.upfrontCost)}
                          </Badge>
                          <Badge variant="secondary">
                            Tick Cost: {employee.tickCostPercentage}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={canAfford ? "default" : "outline"}
                      size="sm"
                      disabled={!canAfford}
                      onClick={() =>
                        handleHire(employee.id, employee.name, employee.upfrontCost)
                      }
                    >
                      {canAfford ? "Hire" : "Can't Afford"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
