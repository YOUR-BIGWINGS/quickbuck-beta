"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency, formatCompactCurrency } from "~/lib/game-utils";

interface TopCompany {
  _id: string;
  name: string;
  ticker?: string;
  balance: number;
  marketCap?: number;
  ownerName: string;
}

interface TopCompaniesProps {
  title: string;
  companies: TopCompany[] | undefined;
  sortBy: "marketCap" | "balance";
  isLoading?: boolean;
}

export function TopCompaniesCard({
  title,
  companies,
  sortBy,
  isLoading,
}: TopCompaniesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No companies yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {companies.slice(0, 5).map((company, index) => (
            <div
              key={company._id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-6 text-center">
                  {index + 1}
                </Badge>
                <div>
                  <div className="font-medium">{company.name}</div>
                  {company.ticker && (
                    <div className="text-xs text-muted-foreground">
                      {company.ticker}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-muted-foreground">
                {sortBy === "balance"
                  ? formatCompactCurrency(company.balance)
                  : formatCompactCurrency(company.marketCap || 0)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
