"use client";

import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Package,
  ArrowLeft,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

export default function CompanyDashboardPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
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

  // Get company data
  const company = useQuery(
    api.companies.getCompany,
    companyId ? { companyId: companyId as Id<"companies"> } : "skip"
  );

  // Get company products
  const products = useQuery(
    api.products.getCompanyProducts,
    companyId ? { companyId: companyId as Id<"companies"> } : "skip"
  );

  // Mutations
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const updateCompanyBalance = useMutation(api.companies.updateCompanyBalance);

  // State for add product modal
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productQuantity, setProductQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // State for edit product modal
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<Id<"products"> | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");

  // Calculate production cost (35%-67% of price)
  const calculateProductionCost = (price: number) => {
    const percentage = 0.35 + Math.random() * 0.32; // 35% to 67%
    return Math.floor(price * percentage);
  };

  // Handle add product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!company) {
      setError("Company not found");
      return;
    }

    if (!productName.trim()) {
      setError("Product name is required");
      return;
    }

    if (!productDescription.trim()) {
      setError("Product description is required");
      return;
    }

    const price = parseFloat(productPrice);
    if (isNaN(price) || price <= 0) {
      setError("Invalid price");
      return;
    }

    const priceCents = Math.round(price * 100);
    const productionCost = calculateProductionCost(priceCents);

    if (company.balance < productionCost) {
      setError(
        `Insufficient balance. Production cost: ${formatCurrency(
          productionCost
        )}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await createProduct({
        companyId: company._id,
        name: productName.trim(),
        description: productDescription.trim(),
        price: priceCents,
        // @ts-expect-error: legacy route; backend accepts this field though not reflected in generated types
        productionCost,
        stock: productQuantity ? parseInt(productQuantity) : undefined,
      });

      // Deduct production cost from company balance
      await updateCompanyBalance({
        companyId: company._id,
        amount: -productionCost,
      });

      // Reset form and close modal
      setProductName("");
      setProductDescription("");
      setProductPrice("");
      setProductQuantity("");
      setAddProductOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit product
  const openEditModal = (product: any) => {
    setEditProductId(product._id);
    setEditName(product.name);
    setEditDescription(product.description || "");
    setEditPrice((product.price / 100).toFixed(2));
    setEditProductOpen(true);
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!editProductId) return;

    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) {
      setError("Invalid price");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProduct({
        productId: editProductId,
        name: editName.trim(),
        description: editDescription.trim(),
        price: Math.round(price * 100),
      });

      setEditProductOpen(false);
      setEditProductId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats
  const totalRevenue =
    products?.reduce((sum, p) => sum + p.totalRevenue, 0) || 0;
  const totalProductionCosts =
    products?.reduce((sum, p) => sum + p.productionCost, 0) || 0;
  const totalProfit = totalRevenue - totalProductionCosts;

  if (!company) {
    return (
      <div className="flex flex-1 flex-col p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="mt-1 h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Products Section Skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b pb-3"
                >
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/companies")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Building2 className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {company.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    {company.ticker && (
                      <Badge variant="outline" className="font-mono">
                        {company.ticker}
                      </Badge>
                    )}
                    {company.isPublic && (
                      <Badge variant="default">Public</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Add Product Button */}
            <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>
                    Create a new product for your company
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-name">Product Name *</Label>
                    <Input
                      id="product-name"
                      placeholder="Enter product name"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-description">Description *</Label>
                    <Textarea
                      id="product-description"
                      placeholder="Describe your product"
                      value={productDescription}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setProductDescription(e.target.value)
                      }
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-price">Price ($) *</Label>
                    <Input
                      id="product-price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="10.00"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-quantity">
                      Quantity to Produce (optional)
                    </Label>
                    <Input
                      id="product-quantity"
                      type="number"
                      min="1"
                      placeholder="Leave empty for unlimited stock"
                      value={productQuantity}
                      onChange={(e) => setProductQuantity(e.target.value)}
                    />
                  </div>

                  {productPrice && (
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-sm text-muted-foreground">
                        Production cost (35-67% of price):
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(
                          calculateProductionCost(
                            Math.round(parseFloat(productPrice) * 100)
                          )
                        )}
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddProductOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Product"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Description */}
          {company.description && (
            <p className="text-muted-foreground">{company.description}</p>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(company.balance)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${
                    totalProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(totalProfit)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{products?.length || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Products Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!products ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b pb-3"
                    >
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No products yet
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Add your first product to start selling
                  </p>
                  <Button onClick={() => setAddProductOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Production Cost</TableHead>
                      <TableHead>Total Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product._id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {product.description}
                        </TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          {formatCurrency(product.productionCost)}
                        </TableCell>
                        <TableCell>{product.totalSold}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(product.totalRevenue)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled>
                              <Trash2 className="h-4 w-4" />
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

          {/* Edit Product Modal */}
          <Dialog open={editProductOpen} onOpenChange={setEditProductOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>
                  Update product information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditProduct} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Product Name *</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description *</Label>
                  <Textarea
                    id="edit-description"
                    value={editDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditDescription(e.target.value)
                    }
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price ($) *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    required
                  />
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
                    onClick={() => setEditProductOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Updating..." : "Update Product"}
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
