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
import { Badge } from "~/components/ui/badge";
import { CompanyLogo } from "~/components/ui/company-logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { formatCurrency } from "~/lib/game-utils";
import { useAuth } from "@clerk/react-router";
import { useNavigate } from "react-router";
import { usePlayerData } from "~/hooks/use-player-data";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  DollarSign,
  Store,
} from "lucide-react";
import type { Id } from "convex/_generated/dataModel";

export default function ManageCompaniesPage() {
  const { userId: clerkUserId } = useAuth();
  const navigate = useNavigate();

  // Use the usePlayerData hook which handles automatic player creation
  const { player } = usePlayerData(clerkUserId || null);

  // Get player's companies
  const companies = useQuery(
    api.companies.getPlayerCompanies,
    player?._id ? { playerId: player._id } : "skip"
  );

  // Mutations
  const createCompany = useMutation(api.companies.createCompany);
  const makeCompanyPublic = useMutation(api.companies.makeCompanyPublic);
  const deleteCompany = useMutation(api.companies.deleteCompany);
  const listCompanyForSale = useMutation(api.companySales.listCompanyForSale);

  // State for create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyTicker, setCompanyTicker] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [companyTags, setCompanyTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State for make public modal
  const [publicModalOpen, setPublicModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] =
    useState<Id<"companies"> | null>(null);
  const [publicCompanyTicker, setPublicCompanyTicker] = useState("");
  const [publicCompanySector, setPublicCompanySector] = useState("tech");

  // Mutations for edit
  const updateCompanyInfo = useMutation(api.companies.updateCompanyInfo);

  // State for delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCompanyId, setDeleteCompanyId] =
    useState<Id<"companies"> | null>(null);
  const [deleteCompanyName, setDeleteCompanyName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // State for edit company modal
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);
  const [editCompanyId, setEditCompanyId] = useState<Id<"companies"> | null>(
    null
  );
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editCompanyDescription, setEditCompanyDescription] = useState("");
  const [editCompanyLogo, setEditCompanyLogo] = useState("");
  const [editCompanyTags, setEditCompanyTags] = useState("");

  // State for list for sale modal
  const [listForSaleModalOpen, setListForSaleModalOpen] = useState(false);
  const [listForSaleCompanyId, setListForSaleCompanyId] =
    useState<Id<"companies"> | null>(null);
  const [askingPrice, setAskingPrice] = useState("");

  // Handle create company
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!player) {
      setError("Player not found");
      return;
    }

    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }

    if (!companyTicker.trim()) {
      setError("Ticker symbol is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCompany({
        ownerId: player._id,
        name: companyName.trim(),
        ticker: companyTicker.trim(),
        description: companyDescription.trim() || undefined,
        logo: companyLogo.trim() || undefined,
        tags: companyTags.trim()
          ? companyTags.split(",").map((tag) => tag.trim())
          : undefined,
      });

      // Reset form and close modal
      setCompanyName("");
      setCompanyTicker("");
      setCompanyDescription("");
      setCompanyLogo("");
      setCompanyTags("");
      setCreateModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle make company public
  const handleMakePublic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedCompanyId) {
      setError("No company selected");
      return;
    }

    if (!player) {
      setError("Player not found");
      return;
    }

    if (!publicCompanyTicker.trim()) {
      setError("Ticker symbol is required");
      return;
    }

    if (!publicCompanySector.trim()) {
      setError("Sector is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await makeCompanyPublic({
        companyId: selectedCompanyId,
        ownerId: player._id,
        ticker: publicCompanyTicker.trim(),
        sector: publicCompanySector.trim(),
      });

      // Reset form and close modal
      setPublicModalOpen(false);
      setSelectedCompanyId(null);
      setPublicCompanyTicker("");
      setPublicCompanySector("tech");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to make company public"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open make public modal
  const openMakePublicModal = (companyId: Id<"companies">) => {
    setSelectedCompanyId(companyId);
    setPublicCompanyTicker("");
    setPublicCompanySector("tech");
    setError("");
    setPublicModalOpen(true);
  };

  // Handle delete company
  const handleDeleteCompany = async () => {
    if (!deleteCompanyId || !player) {
      setError("Company or player not found");
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      await deleteCompany({
        companyId: deleteCompanyId,
        ownerId: player._id,
      });
      setDeleteModalOpen(false);
      setDeleteCompanyId(null);
      setDeleteCompanyName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete company");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (companyId: Id<"companies">, name: string) => {
    setDeleteCompanyId(companyId);
    setDeleteCompanyName(name);
    setDeleteModalOpen(true);
  };

  // Handle list for sale
  const handleListForSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!listForSaleCompanyId) {
      setError("No company selected");
      return;
    }

    const price = parseFloat(askingPrice);
    if (isNaN(price) || price <= 0) {
      setError("Invalid asking price");
      return;
    }

    setIsSubmitting(true);
    try {
      await listCompanyForSale({
        companyId: listForSaleCompanyId,
        askingPrice: Math.round(price * 100), // Convert to cents
      });

      setListForSaleModalOpen(false);
      setListForSaleCompanyId(null);
      setAskingPrice("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to list company for sale"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open list for sale modal
  const openListForSaleModal = (companyId: Id<"companies">) => {
    setListForSaleCompanyId(companyId);
    setListForSaleModalOpen(true);
    setAskingPrice("");
    setError("");
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Manage Companies
              </h1>
              <p className="text-muted-foreground">
                Create and manage your business empire
              </p>
            </div>

            {/* Create Company Button */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Company
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                  <DialogDescription>
                    Start a new business venture
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCompany} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name *</Label>
                    <Input
                      id="company-name"
                      placeholder="Enter company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-ticker">Ticker Symbol *</Label>
                    <Input
                      id="company-ticker"
                      placeholder="e.g., TECH"
                      value={companyTicker}
                      onChange={(e) =>
                        setCompanyTicker(e.target.value.toUpperCase())
                      }
                      maxLength={6}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      2-6 characters. Must be unique.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-description">
                      Description (optional)
                    </Label>
                    <Textarea
                      id="company-description"
                      placeholder="What does your company do?"
                      value={companyDescription}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCompanyDescription(e.target.value)
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-logo">Logo URL (optional)</Label>
                    <Input
                      id="company-logo"
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={companyLogo}
                      onChange={(e) => setCompanyLogo(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-tags">
                      Tags (optional, comma-separated)
                    </Label>
                    <Input
                      id="company-tags"
                      placeholder="e.g., tech, startup, innovation"
                      value={companyTags}
                      onChange={(e) => setCompanyTags(e.target.value)}
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
                      onClick={() => setCreateModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Company"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Companies Grid */}
          {!companies ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No companies yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create your first company to start building your empire
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Company
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <Card key={company._id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">
                          {company.name}
                        </CardTitle>
                        {company.ticker && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {company.ticker}
                            </Badge>
                            {company.isPublic && (
                              <Badge variant="default" className="text-xs">
                                Public
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <CompanyLogo
                        src={company.logo}
                        alt={company.name}
                        size="md"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Balance */}
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(company.balance)}
                      </p>
                    </div>

                    {/* Market Cap (if public) */}
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

                    {/* Description */}
                    {company.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {company.description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/company/${company._id}`)}
                      >
                        <Building2 className="mr-2 h-3 w-3" />
                        Dashboard
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditCompanyId(company._id);
                            setEditCompanyName(company.name);
                            setEditCompanyDescription(
                              company.description || ""
                            );
                            setEditCompanyLogo(company.logo || "");
                            setEditCompanyTags(company.tags?.join(", ") || "");
                            setEditCompanyOpen(true);
                          }}
                          className="flex-1"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            openDeleteModal(company._id, company.name)
                          }
                          className="flex-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Make Public Button */}
                    {!company.isPublic && company.balance >= 5000000 && (
                      <Button
                        className="w-full"
                        onClick={() => openMakePublicModal(company._id)}
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Make Public (IPO)
                      </Button>
                    )}

                    {!company.isPublic && company.balance < 5000000 && (
                      <p className="text-xs text-center text-muted-foreground">
                        Need {formatCurrency(5000000 - company.balance)} more to
                        go public
                      </p>
                    )}

                    {/* List for Sale Button */}
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => openListForSaleModal(company._id)}
                    >
                      <Store className="mr-2 h-4 w-4" />
                      List for Sale
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Make Public Modal */}
          <Dialog open={publicModalOpen} onOpenChange={setPublicModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Make Company Public (IPO)</DialogTitle>
                <DialogDescription>
                  Your company will be listed on the stock market. Choose a
                  unique ticker symbol for your stock.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMakePublic} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="public-ticker">Ticker Symbol *</Label>
                  <Input
                    id="public-ticker"
                    placeholder="e.g., TECH"
                    value={publicCompanyTicker}
                    onChange={(e) =>
                      setPublicCompanyTicker(e.target.value.toUpperCase())
                    }
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    2-6 characters. Must be unique.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="public-sector">Industry Sector *</Label>
                  <Select
                    value={publicCompanySector}
                    onValueChange={setPublicCompanySector}
                  >
                    <SelectTrigger id="public-sector">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Technology</SelectItem>
                      <SelectItem value="energy">Energy</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="consumer">Consumer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the industry category for your company stock.
                  </p>
                </div>

                <div className="rounded-md bg-blue-50 p-3 text-sm">
                  <p className="text-muted-foreground mb-2">
                    <strong>How it works:</strong>
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    <li>Market Cap = Your company balance × 5</li>
                    <li>1,000,000 shares will be issued</li>
                    <li>Share Price = Market Cap ÷ 1,000,000</li>
                    <li>Requires minimum $100 company balance</li>
                  </ul>
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
                    onClick={() => {
                      setPublicModalOpen(false);
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Go Public"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Company Modal */}
          <Dialog open={editCompanyOpen} onOpenChange={setEditCompanyOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Company Details</DialogTitle>
                <DialogDescription>
                  Update your company information
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");

                  if (!editCompanyId || !editCompanyName.trim()) {
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
                      companyId: editCompanyId,
                      name: editCompanyName.trim(),
                      description: editCompanyDescription.trim() || undefined,
                      logo: editCompanyLogo.trim() || undefined,
                      tags: tags.length > 0 ? tags : undefined,
                    });

                    setEditCompanyOpen(false);
                    setEditCompanyId(null);
                    setSuccess("Company details updated successfully!");
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to update company"
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="space-y-4"
              >
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
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
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

          {/* Delete Confirmation Modal */}
          <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">
                  Delete Company?
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. Are you sure you want to delete{" "}
                  <strong>{deleteCompanyName}</strong>?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="font-semibold mb-1">What will happen:</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>Company will be archived (not recoverable)</li>
                    <li>Company balance will be transferred to you</li>
                    <li>
                      All products will be archived (not deleted from records)
                    </li>
                    <li>Company holdings/stocks cannot be deleted if public</li>
                  </ul>
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteCompany}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Company"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* List for Sale Modal */}
          <Dialog
            open={listForSaleModalOpen}
            onOpenChange={setListForSaleModalOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>List Company for Sale</DialogTitle>
                <DialogDescription>
                  Set an asking price for your company. Buyers can make offers
                  that you can accept, reject, or counter.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleListForSale} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asking-price">Asking Price ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="asking-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter asking price"
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-md bg-blue-50 p-3 text-sm">
                  <p className="text-muted-foreground mb-2">
                    <strong>How it works:</strong>
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    <li>Your company will be listed on the marketplace</li>
                    <li>Other players can make offers</li>
                    <li>You'll receive notifications for all offers</li>
                    <li>You can accept, reject, or make counter offers</li>
                    <li>
                      The sale completes when an offer is accepted by both
                      parties
                    </li>
                  </ul>
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
                    onClick={() => {
                      setListForSaleModalOpen(false);
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Listing..." : "List for Sale"}
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
