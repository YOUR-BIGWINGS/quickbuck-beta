"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { CompanyLogo } from "~/components/ui/company-logo";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import { ShoppingCart, Package, Search, Trash2, Coins } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/marketplace";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw redirect("/sign-in");
  }

  return {};
}

export default function MarketplacePage() {
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

  // Get in-stock products only and companies
  const inStockProducts = useQuery(api.products.getInStockProducts, { limit: 10000 });
  const allCompanies = useQuery(api.companies.getAllCompanies);

  // Get player's cart
  const cartData = useQuery(
    api.cart.getPlayerCart,
    player?._id ? { userId: player._id } : "skip"
  );

  // Get player's companies for checkout
  const playerCompanies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Get player's crypto portfolio
  const cryptoPortfolio = useQuery(api.crypto.getMyPortfolio);

  // Mutations
  const addToCart = useMutation(api.cart.addToCart);
  const removeFromCart = useMutation(api.cart.removeFromCart);
  const updateQuantity = useMutation(api.cart.updateCartItemQuantity);
  const checkout = useMutation(api.cart.checkout);
  const checkoutWithCrypto = useMutation(api.cart.checkoutWithCrypto);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "newest">(
    "newest"
  );

  // Checkout state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"balance" | "crypto">(
    "balance"
  );
  const [checkoutAccount, setCheckoutAccount] = useState<{
    type: "player" | "company";
    id: Id<"players"> | Id<"companies">;
  } | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<{
    id: Id<"cryptocurrencies">;
    symbol: string;
    price: number;
  } | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Add to cart state
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Filter and sort products - only show in-stock
  const filteredProducts = useMemo(() => {
    if (!inStockProducts) return [];

    let filtered = inStockProducts.filter((product) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesDesc = product.description?.toLowerCase().includes(query);
        const matchesTags = product.tags?.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }

      // Company filter
      if (selectedCompany !== "all" && product.companyId !== selectedCompany) {
        return false;
      }

      // Price range filter
      const min = minPrice ? parseFloat(minPrice) * 100 : 0;
      const max = maxPrice ? parseFloat(maxPrice) * 100 : Infinity;
      if (product.price < min || product.price > max) return false;

      return true;
    });

    // Sort
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return filtered;
  }, [
    inStockProducts,
    searchQuery,
    selectedCompany,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  // Get company details
  const getCompanyDetails = (companyId: Id<"companies">) => {
    const company = allCompanies?.find((c) => c._id === companyId);
    return {
      name: company?.name || "Unknown",
      logo: company?.logo,
    };
  };

  // Handle add to cart
  const handleAddToCart = async (productId: Id<"products">) => {
    if (!player) return;

    const quantity = quantities[productId] || 1;
    setAddingToCart(productId);

    try {
      await addToCart({
        userId: player._id,
        productId,
        quantity,
      });
      setQuantities({ ...quantities, [productId]: 1 });
    } catch (err) {
      console.error("Failed to add to cart:", err);
    } finally {
      setAddingToCart(null);
    }
  };

  // Handle remove from cart
  const handleRemoveFromCart = async (productId: Id<"products">) => {
    if (!player) return;

    try {
      await removeFromCart({
        userId: player._id,
        productId,
      });
    } catch (err) {
      console.error("Failed to remove from cart:", err);
    }
  };

  // Handle update cart quantity
  const handleUpdateQuantity = async (
    productId: Id<"products">,
    quantity: number
  ) => {
    if (!player || quantity <= 0) return;

    try {
      await updateQuantity({
        userId: player._id,
        productId,
        quantity,
      });
    } catch (err) {
      console.error("Failed to update quantity:", err);
    }
  };

  // Handle checkout with balance or crypto
  const handleCheckout = async () => {
    if (paymentMethod === "balance" && !checkoutAccount) {
      setCheckoutError("Please select an account");
      return;
    }

    if (paymentMethod === "crypto" && !selectedCrypto) {
      setCheckoutError("Please select a cryptocurrency");
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError("");

    try {
      if (paymentMethod === "crypto") {
        await checkoutWithCrypto({
          userId: player!._id,
          accountType: "player",
          accountId: player!._id,
          cryptoId: selectedCrypto!.id,
        });
      } else {
        await checkout({
          userId: player!._id,
          accountType: checkoutAccount!.type,
          accountId: checkoutAccount!.id,
        });
      }
      setCheckoutOpen(false);
      setCheckoutAccount(null);
      setSelectedCrypto(null);
      setPaymentMethod("balance");
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Get cart items with product details
  const cartItems = useMemo(() => {
    if (!cartData?.items || !inStockProducts) return [];
    return cartData.items.map((item) => {
      const product = inStockProducts.find((p) => p._id === item.productId);
      return { ...item, product };
    });
  }, [cartData, inStockProducts]);

  const cartTotal = cartData?.cart?.totalPrice || 0;
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate crypto needed if paying with crypto
  const cryptoNeeded = useMemo(() => {
    if (!selectedCrypto || cartTotal <= 0) return 0;
    return cartTotal / selectedCrypto.price;
  }, [selectedCrypto, cartTotal]);

  // Check if player has enough crypto
  const hasSufficientCrypto = useMemo(() => {
    if (!selectedCrypto || !cryptoPortfolio) return false;
    const cryptoBalance = cryptoPortfolio.find(
      (p) => p.cryptoId === selectedCrypto.id
    );
    return cryptoBalance && cryptoBalance.balance >= cryptoNeeded;
  }, [selectedCrypto, cryptoPortfolio, cryptoNeeded]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
              <p className="text-muted-foreground">
                Browse and purchase in-stock products from companies
              </p>
            </div>

            {/* Cart Button */}
            <Button
              onClick={() => setCheckoutOpen(true)}
              disabled={cartItemCount === 0}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart ({cartItemCount})
            </Button>
          </div>

          {/* Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Select
                    value={selectedCompany}
                    onValueChange={setSelectedCompany}
                  >
                    <SelectTrigger id="company">
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {allCompanies?.map((company) => (
                        <SelectItem key={company._id} value={company._id}>
                          <div className="flex items-center gap-2">
                            <CompanyLogo
                              src={company.logo}
                              alt={company.name}
                              size="xs"
                            />
                            {company.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-price">Min Price ($)</Label>
                  <Input
                    id="min-price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-price">Max Price ($)</Label>
                  <Input
                    id="max-price"
                    type="number"
                    step="0.01"
                    placeholder="1000.00"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label htmlFor="sort">Sort by:</Label>
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger id="sort" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-asc">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price-desc">
                      Price: High to Low
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          {!inStockProducts ? (
            <p className="text-sm text-muted-foreground">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  No products found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or check back later
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <Card key={product._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">
                          {product.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {getCompanyDetails(product.companyId).name}
                        </p>
                      </div>
                      <CompanyLogo
                        src={getCompanyDetails(product.companyId).logo}
                        alt={getCompanyDetails(product.companyId).name}
                        size="md"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Product Image */}
                    {product.image && (
                      <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>

                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(product.price)}
                      </p>
                      {product.stock !== undefined &&
                        product.stock !== null && (
                          <p className="text-sm font-medium text-blue-600">
                            In stock: {product.stock}
                          </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={quantities[product._id] || 1}
                        onChange={(e) =>
                          setQuantities({
                            ...quantities,
                            [product._id]: Math.max(
                              1,
                              parseInt(e.target.value) || 1
                            ),
                          })
                        }
                        className="w-20"
                      />
                      <Button
                        className="flex-1"
                        onClick={() => handleAddToCart(product._id)}
                        disabled={addingToCart === product._id}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {addingToCart === product._id
                          ? "Adding..."
                          : "Add to Cart"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Checkout Modal */}
          <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Shopping Cart</DialogTitle>
                <DialogDescription>
                  Review your cart and complete purchase
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {cartItems.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">
                    Your cart is empty
                  </p>
                ) : (
                  <>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div
                          key={item.productId}
                          className="flex gap-4 p-4 border rounded-lg"
                        >
                          {/* Product Image */}
                          {item.product?.image ? (
                            <div className="relative w-20 h-20 bg-muted rounded flex-shrink-0">
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}

                          {/* Product Details */}
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="font-medium">
                                {item.product?.name || "Unknown"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(item.pricePerUnit)} each
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateQuantity(
                                    item.productId,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-16"
                              />
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} ×{" "}
                                {formatCurrency(item.pricePerUnit)} ={" "}
                                <span className="font-semibold">
                                  {formatCurrency(
                                    item.pricePerUnit * item.quantity
                                  )}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromCart(item.productId)}
                            className="h-full"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between border-t pt-4">
                      <p className="text-lg font-semibold">Total:</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(cartTotal)}
                      </p>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-3 border-t pt-4">
                      <Label>Payment Method</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={
                            paymentMethod === "balance" ? "default" : "outline"
                          }
                          onClick={() => {
                            setPaymentMethod("balance");
                            setSelectedCrypto(null);
                          }}
                          className="flex-1"
                        >
                          Balance
                        </Button>
                        <Button
                          variant={
                            paymentMethod === "crypto" ? "default" : "outline"
                          }
                          onClick={() => setPaymentMethod("crypto")}
                          className="flex-1"
                        >
                          <Coins className="mr-2 h-4 w-4" />
                          Crypto
                        </Button>
                      </div>
                    </div>

                    {/* Balance Payment Account */}
                    {paymentMethod === "balance" && (
                      <div className="space-y-2">
                        <Label>Payment Account</Label>
                        <Select
                          value={
                            checkoutAccount
                              ? `${checkoutAccount.type}:${checkoutAccount.id}`
                              : ""
                          }
                          onValueChange={(value) => {
                            const [type, id] = value.split(":");
                            setCheckoutAccount({
                              type: type as "player" | "company",
                              id: id as any,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {player && (
                              <SelectItem value={`player:${player._id}`}>
                                Personal ({formatCurrency(player.balance)})
                              </SelectItem>
                            )}
                            {playerCompanies?.map((company) => (
                              <SelectItem
                                key={company._id}
                                value={`company:${company._id}`}
                              >
                                {company.name} (
                                {formatCurrency(company.balance)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Crypto Payment */}
                    {paymentMethod === "crypto" && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Select Cryptocurrency</Label>
                          <Select
                            value={selectedCrypto ? selectedCrypto.id : ""}
                            onValueChange={(value) => {
                              const wallet = cryptoPortfolio?.find(
                                (p) => p.cryptoId === value
                              );
                              if (wallet && wallet.crypto) {
                                setSelectedCrypto({
                                  id: wallet.cryptoId as Id<"cryptocurrencies">,
                                  symbol: wallet.crypto.symbol,
                                  price: wallet.crypto.currentPrice,
                                });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a cryptocurrency" />
                            </SelectTrigger>
                            <SelectContent>
                              {cryptoPortfolio?.map((wallet) => (
                                <SelectItem
                                  key={wallet.cryptoId}
                                  value={wallet.cryptoId}
                                >
                                  {wallet.crypto?.symbol || "Unknown"} -
                                  Balance: {wallet.balance.toFixed(8)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedCrypto && (
                          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Current price:
                              </span>
                              <span className="font-medium">
                                {formatCurrency(selectedCrypto.price)}{" "}
                                {selectedCrypto.symbol}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Amount needed:
                              </span>
                              <span className="font-medium">
                                {cryptoNeeded.toFixed(8)}{" "}
                                {selectedCrypto.symbol}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Your balance:
                              </span>
                              <span
                                className={
                                  hasSufficientCrypto
                                    ? "font-medium text-green-600"
                                    : "font-medium text-red-600"
                                }
                              >
                                {cryptoPortfolio
                                  ?.find(
                                    (p) => p.cryptoId === selectedCrypto.id
                                  )
                                  ?.balance.toFixed(8) || "0"}{" "}
                                {selectedCrypto.symbol}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {checkoutError && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {checkoutError}
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCheckoutOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={
                    isCheckingOut ||
                    cartItems.length === 0 ||
                    (paymentMethod === "balance" &&
                      (!checkoutAccount ||
                        (checkoutAccount.type === "player" &&
                          player &&
                          player.balance < cartTotal) ||
                        (checkoutAccount.type === "company" &&
                          playerCompanies &&
                          playerCompanies.find(
                            (c) => c._id === checkoutAccount.id
                          ) &&
                          playerCompanies.find(
                            (c) => c._id === checkoutAccount.id
                          )!.balance < cartTotal))) ||
                    (paymentMethod === "crypto" &&
                      (!selectedCrypto || !hasSufficientCrypto))
                  }
                >
                  {isCheckingOut ? "Processing..." : "Complete Purchase"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
