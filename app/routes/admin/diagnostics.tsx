"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function AdminDiagnosticsPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const allProducts = useQuery(api.diagnostics.checkAllProducts);
  const activeProducts = useQuery(api.diagnostics.checkActiveProducts);
  const botQuery = useQuery(api.diagnostics.testBotProductQuery);
  const companies = useQuery(api.diagnostics.checkCompanies);
  const marketplaceSales = useQuery(api.diagnostics.checkMarketplaceSales);

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-3xl font-bold mb-6">Bot Purchase Diagnostics</h1>

      <div className="grid gap-6">
        {/* All Products Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Products Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {!allProducts ? (
              <p>Loading...</p>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-blue-100 rounded">
                    <p className="text-2xl font-bold">{allProducts?.total ?? 0}</p>
                    <p className="text-sm">Total Products</p>
                  </div>
                  <div className="p-4 bg-green-100 rounded">
                    <p className="text-2xl font-bold">{allProducts?.active ?? 0}</p>
                    <p className="text-sm">Active & Not Archived</p>
                  </div>
                  <div className="p-4 bg-red-100 rounded">
                    <p className="text-2xl font-bold">{allProducts?.inactive ?? 0}</p>
                    <p className="text-sm">Inactive or Archived</p>
                  </div>
                </div>
                
                {(allProducts?.active ?? 0) === 0 && (allProducts?.total ?? 0) > 0 && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">⚠️ PROBLEM FOUND!</p>
                    <p>All {allProducts?.total ?? 0} products are either INACTIVE or ARCHIVED!</p>
                    <p>Bot cannot purchase from inactive/archived products.</p>
                  </div>
                )}
                
                {(allProducts?.total ?? 0) === 0 && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">⚠️ PROBLEM FOUND!</p>
                    <p>NO PRODUCTS EXIST IN DATABASE!</p>
                    <p>Create some products first.</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="font-semibold">Sample Products:</p>
                  {(allProducts?.allProducts ?? []).slice(0, 5).map((p: any) => (
                    <div
                      key={p.id}
                      className={`p-2 rounded text-sm ${
                        p.isActive && !p.isArchived
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <p className="font-semibold">{p.name ?? "Unknown"}</p>
                      <p>Price: ${((p.price ?? 0) / 100).toFixed(2)}</p>
                      <p>Stock: {p.stock ?? "Unlimited"}</p>
                      <p>
                        <span className={p.isActive ? "text-green-600" : "text-red-600"}>
                          Active: {p.isActive ? "✓" : "✗"}
                        </span>
                        {" | "}
                        <span className={!p.isArchived ? "text-green-600" : "text-red-600"}>
                          Not Archived: {!p.isArchived ? "✓" : "✗"}
                        </span>
                      </p>
                      <p>Total Sold: {p.totalSold}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bot Product Query Test */}
        <Card>
          <CardHeader>
            <CardTitle>Bot Product Query Simulation</CardTitle>
          </CardHeader>
          <CardContent>
            {!botQuery ? (
              <p>Loading...</p>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-blue-50 rounded">
                  <p className="font-bold text-lg">Query Results:</p>
                  <p>Products Found: {botQuery?.totalFound ?? 0}</p>
                  <p>Eligible (valid price & stock): {botQuery?.eligible ?? 0}</p>
                </div>
                
                {(botQuery?.totalFound ?? 0) === 0 && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">⚠️ ROOT CAUSE IDENTIFIED!</p>
                    <p>Bot query returns 0 products!</p>
                    <p>The query filters for: isActive=true AND isArchived=false AND price ≤ $50,000</p>
                  </div>
                )}
                
                {(botQuery?.totalFound ?? 0) > 0 && (botQuery?.eligible ?? 0) === 0 && (
                  <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">⚠️ ROOT CAUSE IDENTIFIED!</p>
                    <p>Products found but none are eligible!</p>
                    <p>Check: price &gt; 0, price is finite, and stock &gt; 0 (or unlimited)</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  {(botQuery?.products ?? []).map((p: any) => (
                    <div
                      key={p.id}
                      className={`p-2 rounded text-sm ${
                        p.hasValidPrice && p.hasStock
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <p className="font-semibold">{p.name ?? "Unknown"}</p>
                      <p>Price: ${((p.price ?? 0) / 100).toFixed(2)}</p>
                      <p>Stock: {p.stock ?? "Unlimited"}</p>
                      <p>
                        <span className={p.hasValidPrice ? "text-green-600" : "text-red-600"}>
                          Valid Price: {p.hasValidPrice ? "✓" : "✗"}
                        </span>
                        {" | "}
                        <span className={p.hasStock ? "text-green-600" : "text-red-600"}>
                          Has Stock: {p.hasStock ? "✓" : "✗"}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Companies */}
        <Card>
          <CardHeader>
            <CardTitle>Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {!companies ? (
              <p>Loading...</p>
            ) : (
              <div>
                <p className="font-semibold mb-4">
                  Total: {companies?.count ?? 0} companies
                </p>
                <div className="space-y-2">
                  {(companies?.companies ?? []).map((c: any) => (
                    <div key={c.id} className="p-2 bg-muted rounded text-sm">
                      <p className="font-semibold">{c.name ?? "Unknown"}</p>
                      <p>Balance: ${((c.balance ?? 0) / 100).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Marketplace Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {!marketplaceSales ? (
              <p>Loading...</p>
            ) : (
              <div>
                <p className="font-semibold mb-4">
                  Total Recent: {marketplaceSales?.count ?? 0} sales
                </p>
                <div className="space-y-2">
                  {(marketplaceSales?.sales ?? []).slice(0, 10).map((s: any) => (
                    <div key={s.id} className="p-2 bg-muted rounded text-sm">
                      <p>
                        Quantity: {s.quantity}, Price: $
                        {(s.totalPrice / 100).toFixed(2)}
                      </p>
                      <p>
                        Purchaser: {s.purchaserId} ({s.purchaserType})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
