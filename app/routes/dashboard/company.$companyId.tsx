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
import { CompanyLogo } from "~/components/ui/company-logo";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import {
  Building2,
  Plus,
  Edit,
  Package,
  ShoppingCart,
  ArrowLeft,
  History,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { cn } from "~/lib/utils";
import { usePlayerData } from "~/hooks/use-player-data";

export default function CompanyDashboardPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { userId: clerkUserId } = useAuth();

  // Use the usePlayerData hook which handles automatic player creation
  const { player } = usePlayerData(clerkUserId || null);

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

  // Get batch order history
  const batchOrders = useQuery(
    api.products.getProductBatchOrders,
    companyId ? { companyId: companyId as Id<"companies"> } : "skip"
  );

  // Mutations
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const orderBatch = useMutation(api.products.orderProductBatch);
  const bulkOrderProducts = useMutation(api.products.bulkOrderProducts);
  const updateCompanyInfo = useMutation(api.companies.updateCompanyInfo);

  // State for edit company modal
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editCompanyDescription, setEditCompanyDescription] = useState("");
  const [editCompanyLogo, setEditCompanyLogo] = useState("");
  const [editCompanyTags, setEditCompanyTags] = useState("");

  // State for add product modal
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productTags, setProductTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State for edit product modal
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<Id<"products"> | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editTags, setEditTags] = useState("");

  // State for order batch modal
  const [orderBatchOpen, setOrderBatchOpen] = useState(false);
  const [orderProductId, setOrderProductId] = useState<Id<"products"> | null>(
    null
  );
  const [batchQuantity, setBatchQuantity] = useState("");
  const [batchError, setBatchError] = useState("");

  // State for bulk order modal
  const [bulkOrderOpen, setBulkOrderOpen] = useState(false);
  const [totalBudget, setTotalBudget] = useState("");
  const [productAllocations, setProductAllocations] = useState<
    Record<string, string>
  >({});
  const [bulkOrderError, setBulkOrderError] = useState("");

  // Handle add product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!company) {
      setError("Company not found");
      return;
    }

    if (!productName.trim()) {
      setError("Product name is required");
      return;
    }

    const price = parseFloat(productPrice);
    if (isNaN(price) || price <= 0) {
      setError("Invalid price");
      return;
    }

    const priceCents = Math.round(price * 100);
    const tags = productTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setIsSubmitting(true);
    try {
      await createProduct({
        companyId: company._id,
        name: productName.trim(),
        description: productDescription.trim() || undefined,
        price: priceCents,
        image: productImage.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      // Reset form and close modal
      setProductName("");
      setProductDescription("");
      setProductPrice("");
      setProductImage("");
      setProductTags("");
      setSuccess(
        "Product created successfully! Now order a batch to add inventory."
      );
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
    setEditImage(product.image || "");
    setEditTags(product.tags?.join(", ") || "");
    setEditProductOpen(true);
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!editProductId) return;

    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) {
      setError("Invalid price");
      return;
    }

    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setIsSubmitting(true);
    try {
      await updateProduct({
        productId: editProductId,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        price: Math.round(price * 100),
        image: editImage.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      setEditProductOpen(false);
      setEditProductId(null);
      setSuccess("Product updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete product
  const handleDeleteProduct = async (productId: Id<"products">) => {
    if (!player || !company) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this product? This action cannot be undone."
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await deleteProduct({
        productId: productId,
        ownerId: player._id,
      });
      setSuccess("Product deleted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle order batch
  const openOrderBatchModal = (productId: Id<"products">) => {
    setOrderProductId(productId);
    setBatchQuantity("");
    setBatchError("");
    setOrderBatchOpen(true);
  };

  // Handle edit company details
  const openEditCompanyModal = () => {
    if (!company) return;
    setEditCompanyName(company.name);
    setEditCompanyDescription(company.description || "");
    setEditCompanyLogo(company.logo || "");
    setEditCompanyTags(company.tags?.join(", ") || "");
    setEditCompanyOpen(true);
  };

  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!company || !editCompanyName.trim()) {
      setError("Company name is required");
      return;
    }

    const tags = editCompanyTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setIsSubmitting(true);
    try {
      await updateCompanyInfo({
        companyId: company._id,
        name: editCompanyName.trim(),
        description: editCompanyDescription.trim() || undefined,
        logo: editCompanyLogo.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      setEditCompanyOpen(false);
      setSuccess("Company details updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update company");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError("");
    setSuccess("");

    if (!orderProductId) return;

    const quantity = parseInt(batchQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      setBatchError("Invalid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await orderBatch({
        productId: orderProductId,
        quantity: quantity,
      });

      setOrderBatchOpen(false);
      setOrderProductId(null);
      setBatchQuantity("");
      setSuccess(
        `Successfully ordered ${quantity} units! Total cost: ${formatCurrency(
          result.totalCost
        )}`
      );
    } catch (err) {
      setBatchError(
        err instanceof Error ? err.message : "Failed to order batch"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bulk order
  const openBulkOrderModal = () => {
    if (!products || products.length === 0) {
      setError("No products to restock");
      return;
    }

    // Initialize with total budget
    const budget = company?.balance || 0;
    setTotalBudget(String(Math.floor(budget / 100)));

    // Set equal allocation percentages for all products (100% / product count)
    const equalPercentage = 100 / products.length;
    const initialAllocations: Record<string, string> = {};
    products.forEach((product) => {
      initialAllocations[product._id] = String(equalPercentage);
    });
    setProductAllocations(initialAllocations);
    setBulkOrderError("");
    setBulkOrderOpen(true);
  };

  const handleAllocationChange = (productId: string, value: string) => {
    setProductAllocations((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  const redistributeAllocations = (changedProductId: string) => {
    if (!products) return;

    const changedPercentage = parseFloat(
      productAllocations[changedProductId] || "0"
    );

    // Calculate remaining percentage for other products
    const otherProducts = products.filter((p) => p._id !== changedProductId);
    if (otherProducts.length === 0) return;

    const remainingPercentage = 100 - changedPercentage;
    const equalShare = remainingPercentage / otherProducts.length;

    setProductAllocations((prev) => {
      const updated = { ...prev };
      otherProducts.forEach((product) => {
        updated[product._id] = String(equalShare);
      });
      return updated;
    });
  };

  const handleBulkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkOrderError("");
    setSuccess("");

    if (!company || !products) return;

    const budgetCents = Math.round(parseFloat(totalBudget || "0") * 100);
    if (isNaN(budgetCents) || budgetCents <= 0) {
      setBulkOrderError("Invalid budget amount");
      return;
    }

    if (budgetCents > company.balance) {
      setBulkOrderError(
        `Insufficient balance. Budget: ${formatCurrency(
          budgetCents
        )}, Available: ${formatCurrency(company.balance)}`
      );
      return;
    }

    // Build allocations with percentages
    const allocations = products.map((product) => {
      const percentage = parseFloat(productAllocations[product._id] || "0");
      return {
        productId: product._id,
        percentage: Math.max(0, Math.min(100, percentage)),
      };
    });

    // Validate allocations sum to 100%
    const totalPercentage = allocations.reduce(
      (sum, alloc) => sum + alloc.percentage,
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.1) {
      setBulkOrderError(
        `Allocations must total 100% (currently ${totalPercentage.toFixed(1)}%)`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await bulkOrderProducts({
        companyId: company._id,
        totalBudget: budgetCents,
        productAllocations: allocations,
      });

      setBulkOrderOpen(false);
      setSuccess(
        `Bulk order completed! Restocked ${
          result.orders.length
        } products for ${formatCurrency(
          result.totalSpent
        )}. Unspent: ${formatCurrency(result.unspentBudget)}`
      );
    } catch (err) {
      setBulkOrderError(
        err instanceof Error ? err.message : "Failed to complete bulk order"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats
  const totalRevenue =
    products?.reduce((sum, p) => sum + p.totalRevenue, 0) || 0;
  const totalProductionCosts =
    products?.reduce(
      (sum, p) =>
        sum +
        Math.floor(p.price * (p.productionCostPercentage ?? 0.35)) *
          p.totalSold,
      0
    ) || 0;
  const totalProfit = totalRevenue - totalProductionCosts;
  const totalStockValue =
    products?.reduce(
      (sum, p) =>
        sum +
        (p.stock || 0) *
          Math.floor(p.price * (p.productionCostPercentage ?? 0.35)),
      0
    ) || 0;

  if (!company) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
            {/* Header Skeleton */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
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
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products & Inventory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-6 w-40" />
                          <Skeleton className="h-4 w-64" />
                          <div className="flex gap-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-9 w-9 rounded" />
                          <Skeleton className="h-9 w-9 rounded" />
                          <Skeleton className="h-9 w-32 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
                <CompanyLogo src={company.logo} alt={company.name} size="lg" />
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

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={openEditCompanyModal}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
              <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Product</DialogTitle>
                    <DialogDescription>
                      Define your product details. You'll order inventory
                      separately.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddProduct} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="product-name">Product Name *</Label>
                        <Input
                          id="product-name"
                          placeholder="e.g., Premium Widget"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="product-price">
                          Selling Price ($) *
                        </Label>
                        <Input
                          id="product-price"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="19.99"
                          value={productPrice}
                          onChange={(e) => setProductPrice(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-description">Description</Label>
                      <Textarea
                        id="product-description"
                        placeholder="Describe your product..."
                        value={productDescription}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setProductDescription(e.target.value)
                        }
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-image">Image URL</Label>
                      <Input
                        id="product-image"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={productImage}
                        onChange={(e) => setProductImage(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="product-tags">
                        Tags (comma-separated)
                      </Label>
                      <Input
                        id="product-tags"
                        placeholder="electronics, gadget, premium"
                        value={productTags}
                        onChange={(e) => setProductTags(e.target.value)}
                      />
                    </div>

                    {productPrice && (
                      <div className="rounded-md bg-muted p-4">
                        <p className="text-sm font-medium mb-1">
                          Production Cost Estimate:
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          (35-67% of selling price, randomly determined)
                        </p>
                        <p className="text-lg font-semibold text-[var(--chart-3)]">
                          ~$
                          {(
                            (parseFloat(productPrice) * 0.35 +
                              parseFloat(productPrice) * 0.67) /
                            2
                          ).toFixed(2)}{" "}
                          per unit
                        </p>
                      </div>
                    )}

                    {error && (
                      <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
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
          </div>

          {/* Description */}
          {company.description && (
            <p className="text-muted-foreground">{company.description}</p>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </div>
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
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    totalProfit >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(totalProfit)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Inventory Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[var(--chart-3)]">
                  {formatCurrency(totalStockValue)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Products Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products & Inventory
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={openBulkOrderModal}
                  disabled={!products || products.length === 0}
                  size="sm"
                  variant="outline"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Bulk Restock
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!products ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-6 w-40" />
                          <Skeleton className="h-4 w-64" />
                          <div className="flex gap-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-9 w-9 rounded" />
                          <Skeleton className="h-9 w-9 rounded" />
                          <Skeleton className="h-9 w-32 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="mb-4 h-16 w-16 text-muted-foreground opacity-50" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No products yet
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground max-w-sm">
                    Create your first product to start selling in the
                    marketplace
                  </p>
                  <Button onClick={() => setAddProductOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Product
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Cost/Unit</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product._id}>
                          <TableCell>
                            <div className="flex gap-3 items-start">
                              {/* Product Image */}
                              {product.image ? (
                                <div className="relative w-12 h-12 bg-muted rounded flex-shrink-0">
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}

                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.tags && product.tags.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {product.tags
                                      .slice(0, 3)
                                      .map((tag, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(product.price)}
                          </TableCell>
                          <TableCell className="text-[var(--chart-3)]">
                            {formatCurrency(
                              Math.floor(
                                product.price *
                                  (product.productionCostPercentage ?? 0.35)
                              )
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "font-medium",
                                (product.stock || 0) === 0
                                  ? "text-red-600"
                                  : (product.stock || 0) < 10
                                  ? "text-[var(--chart-3)]"
                                  : "text-green-600"
                              )}
                            >
                              {product.stock || 0}
                            </span>
                          </TableCell>
                          <TableCell>{product.totalSold}</TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(product.totalRevenue)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openOrderBatchModal(product._id)}
                              >
                                <ShoppingCart className="mr-1 h-3 w-3" />
                                Order Batch
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProduct(product._id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Order History */}
          {batchOrders && batchOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Batch Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchOrders.slice(0, 10).map((order: any) => (
                      <TableRow key={order._id}>
                        <TableCell className="text-sm">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 items-center">
                            {/* Product Image */}
                            {order.productImage ? (
                              <div className="relative w-8 h-8 bg-muted rounded flex-shrink-0">
                                <img
                                  src={order.productImage}
                                  alt={order.productName}
                                  className="w-full h-full object-cover rounded"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">
                              {order.productName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.description}
                        </TableCell>
                        <TableCell className="text-right font-medium text-[var(--chart-3)]">
                          -{formatCurrency(order.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Edit Product Modal */}
          <Dialog open={editProductOpen} onOpenChange={setEditProductOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>
                  Update product details (doesn't affect existing inventory)
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditProduct} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
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
                    <Label htmlFor="edit-price">Selling Price ($) *</Label>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditDescription(e.target.value)
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-image">Image URL</Label>
                  <Input
                    id="edit-image"
                    type="url"
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                  <Input
                    id="edit-tags"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
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

          {/* Order Batch Modal */}
          <Dialog open={orderBatchOpen} onOpenChange={setOrderBatchOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Order Product Batch</DialogTitle>
                <DialogDescription>
                  Manufacture inventory to sell in the marketplace
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleOrderBatch} className="space-y-4">
                {orderProductId && products && (
                  <>
                    {(() => {
                      const product = products.find(
                        (p) => p._id === orderProductId
                      );
                      if (!product) return null;

                      const quantity = parseInt(batchQuantity) || 0;
                      const productionCost = Math.floor(
                        product.price *
                          (product.productionCostPercentage ?? 0.35)
                      );
                      const totalCost = productionCost * quantity;
                      const profit =
                        (product.price - productionCost) * quantity;

                      return (
                        <>
                          <div className="rounded-md bg-muted p-4 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Product:
                              </span>
                              <span className="font-medium">
                                {product.name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Cost per unit:
                              </span>
                              <span className="font-medium text-[var(--chart-3)]">
                                {formatCurrency(productionCost)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Selling price:
                              </span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(product.price)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Profit per unit:
                              </span>
                              <span className="font-medium text-blue-600">
                                {formatCurrency(product.price - productionCost)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Current stock:
                              </span>
                              <span className="font-medium">
                                {product.stock || 0}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="batch-quantity">
                                Quantity to Order *
                              </Label>
                              {(() => {
                                const product = products.find(
                                  (p) => p._id === orderProductId
                                );
                                if (!product) return null;
                                const productionCost = Math.floor(
                                  product.price *
                                    (product.productionCostPercentage ?? 0.35)
                                );
                                const maxAffordable = Math.floor(
                                  company.balance / productionCost
                                );
                                return (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setBatchQuantity(String(maxAffordable))
                                    }
                                    className="text-xs h-6"
                                  >
                                    Max: {maxAffordable}
                                  </Button>
                                );
                              })()}
                            </div>
                            <Input
                              id="batch-quantity"
                              type="number"
                              min="1"
                              placeholder="e.g., 100"
                              value={batchQuantity}
                              onChange={(e) => setBatchQuantity(e.target.value)}
                              required
                            />
                          </div>

                          {quantity > 0 && (
                            <div className="rounded-md border-2 border-primary/20 bg-primary/5 p-4 space-y-2">
                              <div className="flex justify-between text-lg">
                                <span className="font-medium">Total Cost:</span>
                                <span className="font-bold text-[var(--chart-3)]">
                                  {formatCurrency(totalCost)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Potential Profit:
                                </span>
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(profit)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Your Balance:
                                </span>
                                <span
                                  className={cn(
                                    "font-semibold",
                                    company.balance >= totalCost
                                      ? "text-green-600"
                                      : "text-red-600"
                                  )}
                                >
                                  {formatCurrency(company.balance)}
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}

                {batchError && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {batchError}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOrderBatchOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Ordering..." : "Order Batch"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Bulk Order Modal */}
          <Dialog open={bulkOrderOpen} onOpenChange={setBulkOrderOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Restock Products</DialogTitle>
                <DialogDescription>
                  Set a total budget and allocate amounts to each product for
                  restocking
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBulkOrder} className="space-y-4">
                {/* Total Budget Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="total-budget">Total Budget ($) *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setTotalBudget(
                          String(Math.floor(company?.balance || 0) / 100)
                        )
                      }
                      className="text-xs h-6"
                    >
                      Max: {formatCurrency(company?.balance || 0)}
                    </Button>
                  </div>
                  <Input
                    id="total-budget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 1000"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    required
                  />
                </div>

                {/* Product Budget Allocations */}
                {products && products.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Budget Allocation Per Product</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const equalPercentage = 100 / products.length;
                          const newAllocations: Record<string, string> = {};
                          products.forEach((p) => {
                            newAllocations[p._id] = String(equalPercentage);
                          });
                          setProductAllocations(newAllocations);
                        }}
                        className="text-xs"
                      >
                        Equal Split
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                      {products.map((product) => {
                        const allocationPercentage = parseFloat(
                          productAllocations[product._id] || "0"
                        );
                        const budgetCents = Math.round(
                          parseFloat(totalBudget || "0") * 100
                        );
                        const productBudget = Math.floor(
                          (budgetCents * allocationPercentage) / 100
                        );
                        const productionCost = Math.floor(
                          product.price *
                            (product.productionCostPercentage ?? 0.35)
                        );
                        const quantity =
                          productionCost > 0
                            ? Math.floor(productBudget / productionCost)
                            : 0;

                        return (
                          <div
                            key={product._id}
                            className="space-y-2 p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex gap-2 items-center flex-1">
                                {product.image ? (
                                  <div className="w-10 h-10 bg-muted rounded flex-shrink-0">
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Cost/Unit: {formatCurrency(productionCost)}{" "}
                                    • Stock: {product.stock || 0}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-green-600">
                                  +{quantity} units
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ({formatCurrency(productBudget)})
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor={`allocation-${product._id}`}
                                className="text-xs min-w-[30px]"
                              >
                                %
                              </Label>
                              <Input
                                id={`allocation-${product._id}`}
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                placeholder="0"
                                value={productAllocations[product._id] || ""}
                                onChange={(e) =>
                                  handleAllocationChange(
                                    product._id,
                                    e.target.value
                                  )
                                }
                                onBlur={() =>
                                  redistributeAllocations(product._id)
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary */}
                    <div className="rounded-md border-2 border-primary/20 bg-primary/5 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Total Allocation:
                        </span>
                        <span className="font-medium">
                          {Object.values(productAllocations)
                            .reduce(
                              (sum, val) => sum + (parseFloat(val) || 0),
                              0
                            )
                            .toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Total Budget:
                        </span>
                        <span className="font-medium">
                          {formatCurrency(
                            Math.round(parseFloat(totalBudget || "0") * 100)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Company Balance:
                        </span>
                        <span className="font-medium">
                          {formatCurrency(company?.balance || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {bulkOrderError && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {bulkOrderError}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkOrderOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Complete Bulk Order"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Company Details Modal */}
          <Dialog open={editCompanyOpen} onOpenChange={setEditCompanyOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Company Details</DialogTitle>
                <DialogDescription>
                  Update your company information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name *</Label>
                  <Input
                    id="company-name"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-description">Description</Label>
                  <Textarea
                    id="company-description"
                    value={editCompanyDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditCompanyDescription(e.target.value)
                    }
                    rows={3}
                    placeholder="Describe your company..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-logo">Logo URL</Label>
                  <Input
                    id="company-logo"
                    type="url"
                    value={editCompanyLogo}
                    onChange={(e) => setEditCompanyLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-tags">Tags (comma-separated)</Label>
                  <Input
                    id="company-tags"
                    value={editCompanyTags}
                    onChange={(e) => setEditCompanyTags(e.target.value)}
                    placeholder="technology, startup, innovation"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditCompanyOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
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
