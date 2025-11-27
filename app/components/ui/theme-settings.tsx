"use client";

import { useState, useEffect } from "react";
import { Palette, Moon, Sun, Check, Trash2, Edit, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTheme } from "~/contexts/theme-context";
import { themes, type ThemePreset, applyThemeColors } from "~/lib/theme-config";
import { cn } from "~/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { CreateThemeDialog } from "~/components/ui/create-theme-dialog";
import { toast } from "sonner";
import type { Id } from "convex/_generated/dataModel";

// Helper to generate theme colors from primary and secondary colors
function generateCustomThemeColors(primaryColor: string, secondaryColor: string, mode: "light" | "dark") {
  const colors: any = {
    primary: primaryColor,
    primaryForeground: mode === "light" ? "#ffffff" : "#000000",
    secondary: secondaryColor,
    secondaryForeground: mode === "light" ? "#0a0a0a" : "#ffffff",
  };

  if (mode === "light") {
    colors.background = "#ffffff";
    colors.foreground = "#0a0a0a";
    colors.card = "#ffffff";
    colors.cardForeground = "#0a0a0a";
    colors.popover = "#ffffff";
    colors.popoverForeground = "#0a0a0a";
    colors.muted = "#f5f5f5";
    colors.mutedForeground = "#6b6b6b";
    colors.accent = "#f0f0f0";
    colors.accentForeground = "#0a0a0a";
    colors.destructive = "#ef4444";
    colors.destructiveForeground = "#ffffff";
    colors.border = "#e5e5e5";
    colors.input = "#e5e5e5";
    colors.ring = primaryColor;
    colors.chart1 = primaryColor;
    colors.chart2 = secondaryColor;
    colors.chart3 = primaryColor;
    colors.chart4 = secondaryColor;
    colors.chart5 = primaryColor;
    colors.sidebar = "#fafafa";
    colors.sidebarForeground = "#0a0a0a";
    colors.sidebarPrimary = primaryColor;
    colors.sidebarPrimaryForeground = "#ffffff";
    colors.sidebarAccent = "#f5f5f5";
    colors.sidebarAccentForeground = "#0a0a0a";
    colors.sidebarBorder = "#e5e5e5";
    colors.sidebarRing = primaryColor;
  } else {
    colors.background = "#0a0a0a";
    colors.foreground = "#ffffff";
    colors.card = "#1a1a1a";
    colors.cardForeground = "#ffffff";
    colors.popover = "#1a1a1a";
    colors.popoverForeground = "#ffffff";
    colors.muted = "#2a2a2a";
    colors.mutedForeground = "#a0a0a0";
    colors.accent = "#2a2a2a";
    colors.accentForeground = "#ffffff";
    colors.destructive = "#dc2626";
    colors.destructiveForeground = "#ffffff";
    colors.border = "#2a2a2a";
    colors.input = "#2a2a2a";
    colors.ring = primaryColor;
    colors.chart1 = primaryColor;
    colors.chart2 = secondaryColor;
    colors.chart3 = primaryColor;
    colors.chart4 = secondaryColor;
    colors.chart5 = primaryColor;
    colors.sidebar = "#0f0f0f";
    colors.sidebarForeground = "#ffffff";
    colors.sidebarPrimary = primaryColor;
    colors.sidebarPrimaryForeground = "#ffffff";
    colors.sidebarAccent = "#2a2a2a";
    colors.sidebarAccentForeground = "#ffffff";
    colors.sidebarBorder = "#2a2a2a";
    colors.sidebarRing = primaryColor;
  }

  return colors;
}

export function ThemeSettings() {
  const [open, setOpen] = useState(false);
  const { preset, mode, setPreset, toggleMode } = useTheme();
  const moderationAccess = useQuery(api.moderation.checkModerationAccess);
  const customThemes = useQuery(api.themes.getCustomThemes);
  const [allThemes, setAllThemes] = useState(themes);

  // Edit theme state
  const [editingTheme, setEditingTheme] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editMode, setEditMode] = useState<"light" | "dark">("light");
  const [editPrimaryColor, setEditPrimaryColor] = useState("#7678ed");
  const [editSecondaryColor, setEditSecondaryColor] = useState("#ffffff");
  const [isEditing, setIsEditing] = useState(false);

  const deleteTheme = useMutation(api.themes.deleteCustomTheme);
  const updateTheme = useMutation(api.themes.updateCustomTheme);

  const isAdmin = moderationAccess?.role === "admin";

  // Combine built-in themes with custom themes
  useEffect(() => {
    if (customThemes) {
      const customThemeObjects = customThemes.map((ct) => ({
        id: ct.id as ThemePreset,
        name: ct.name,
        mode: ct.mode,
        colors: generateCustomThemeColors(ct.primaryColor, ct.secondaryColor, ct.mode),
      }));
      setAllThemes([...themes, ...customThemeObjects]);
    }
  }, [customThemes]);

  const lightThemes = allThemes.filter((t) => t.mode === "light");
  const darkThemes = allThemes.filter((t) => t.mode === "dark");

  const handlePresetChange = (newPreset: ThemePreset) => {
    // Find the theme to get its colors and mode
    const theme = allThemes.find((t) => t.id === newPreset);
    if (theme) {
      setPreset(newPreset, theme.colors, theme.mode);
    } else {
      setPreset(newPreset);
    }
  };

  const handleThemeCreated = () => {
    // The custom themes query will automatically refresh
  };

  const handleDeleteTheme = async (themeDocId: Id<"customThemes">, themeName: string) => {
    if (!confirm(`Are you sure you want to delete the theme "${themeName}"?`)) {
      return;
    }
    
    try {
      await deleteTheme({ themeDocId });
      toast.success(`Theme "${themeName}" deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete theme");
    }
  };

  const handleStartEdit = (theme: any) => {
    setEditingTheme(theme);
    setEditName(theme.name);
    setEditMode(theme.mode);
    setEditPrimaryColor(theme.primaryColor);
    setEditSecondaryColor(theme.secondaryColor);
  };

  const handleCancelEdit = () => {
    setEditingTheme(null);
    setEditName("");
    setEditMode("light");
    setEditPrimaryColor("#7678ed");
    setEditSecondaryColor("#ffffff");
  };

  const handleSaveEdit = async () => {
    if (!editingTheme) return;
    
    if (!editName.trim()) {
      toast.error("Please enter a theme name");
      return;
    }

    setIsEditing(true);
    try {
      await updateTheme({
        themeDocId: editingTheme._id,
        name: editName.trim(),
        mode: editMode,
        primaryColor: editPrimaryColor,
        secondaryColor: editSecondaryColor,
      });

      toast.success(`Theme "${editName}" updated successfully`);
      handleCancelEdit();
    } catch (error: any) {
      toast.error(error.message || "Failed to update theme");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Theme settings"
          title="Theme settings"
          className="h-9 w-9"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Theme Settings</DialogTitle>
          <DialogDescription>
            Customize your QuickBuck theme appearance
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-1">
          <div className="space-y-6 py-4">
          {/* Current Mode Display (read-only) */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Current Mode</Label>
            <p className="text-sm text-muted-foreground">
              Mode is determined by the selected theme preset
            </p>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
              {mode === "light" ? (
                <>
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Dark Mode</span>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Admin: Create Theme Button */}
          {isAdmin && (
            <>
              <div className="space-y-2">
                <Label className="text-base font-semibold">Admin Actions</Label>
                <CreateThemeDialog onThemeCreated={handleThemeCreated} />
              </div>
              <Separator />
            </>
          )}

          {/* Default Themes */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Default Themes</Label>
            <div className="grid gap-3">
              {themes
                .filter((t) => t.id === "default" || t.id === "dark-default")
                .map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isSelected={preset === theme.id}
                    onSelect={() => handlePresetChange(theme.id)}
                  />
                ))}
            </div>
          </div>

          <Separator />

          {/* Light Preset Themes */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Light Themes</Label>
            <div className="grid gap-3">
              {lightThemes
                .filter((t) => t.id !== "default" && !t.id.startsWith("custom-"))
                .map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isSelected={preset === theme.id}
                    onSelect={() => handlePresetChange(theme.id)}
                  />
                ))}
            </div>
          </div>

          <Separator />

          {/* Dark Preset Themes */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Dark Themes</Label>
            <div className="grid gap-3">
              {darkThemes
                .filter((t) => t.id !== "dark-default" && !t.id.startsWith("custom-"))
                .map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isSelected={preset === theme.id}
                  onSelect={() => handlePresetChange(theme.id)}
                />
              ))}
            </div>
          </div>

          {/* Custom Themes (Admin can edit/delete) */}
          {customThemes && customThemes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-base font-semibold">Custom Themes</Label>
                <div className="grid gap-3">
                  {customThemes.map((ct) => {
                    const themeColors = generateCustomThemeColors(ct.primaryColor, ct.secondaryColor, ct.mode);
                    const isCurrentlyEditing = editingTheme?._id === ct._id;
                    
                    if (isCurrentlyEditing) {
                      return (
                        <div key={ct._id} className="rounded-lg border-2 border-primary p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Edit Theme</span>
                            <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">Name</Label>
                              <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Theme name"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="edit-mode">Mode</Label>
                              <Select value={editMode} onValueChange={(v: "light" | "dark") => setEditMode(v)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="light">Light</SelectItem>
                                  <SelectItem value="dark">Dark</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Primary</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type="color"
                                    value={editPrimaryColor}
                                    onChange={(e) => setEditPrimaryColor(e.target.value)}
                                    className="h-10 w-14 cursor-pointer p-1"
                                  />
                                  <Input
                                    value={editPrimaryColor}
                                    onChange={(e) => setEditPrimaryColor(e.target.value)}
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Secondary</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type="color"
                                    value={editSecondaryColor}
                                    onChange={(e) => setEditSecondaryColor(e.target.value)}
                                    className="h-10 w-14 cursor-pointer p-1"
                                  />
                                  <Input
                                    value={editSecondaryColor}
                                    onChange={(e) => setEditSecondaryColor(e.target.value)}
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <Button onClick={handleSaveEdit} disabled={isEditing} className="flex-1">
                                {isEditing ? "Saving..." : "Save Changes"}
                              </Button>
                              <Button variant="outline" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={ct._id} className="relative">
                        <ThemeCard
                          theme={{
                            id: ct.id as ThemePreset,
                            name: ct.name,
                            mode: ct.mode,
                            colors: themeColors,
                          }}
                          isSelected={preset === ct.id}
                          onSelect={() => handlePresetChange(ct.id as ThemePreset)}
                        />
                        {isAdmin && (
                          <div className="absolute right-2 top-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(ct);
                              }}
                              title="Edit theme"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTheme(ct._id, ct.name);
                              }}
                              title="Delete theme"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ThemeCardProps {
  theme: {
    id: ThemePreset;
    name: string;
    mode: "light" | "dark";
    colors: {
      primary: string;
      primaryForeground: string;
      background: string;
      foreground: string;
    };
  };
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeCard({ theme, isSelected, onSelect }: ThemeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all hover:border-primary/50",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:bg-accent/5"
      )}
    >
      {/* Color Preview - Show primary and background */}
      <div className="flex gap-1">
        <div
          className="h-10 w-10 rounded border border-border flex items-center justify-center text-[8px] font-semibold"
          style={{ 
            backgroundColor: theme.colors.primary,
            color: theme.colors.primaryForeground
          }}
          title="Primary color"
        >
          Primary
        </div>
        <div
          className="h-10 w-10 rounded border border-border"
          style={{ backgroundColor: theme.colors.background }}
          title="Background color"
        />
      </div>

      {/* Theme Info */}
      <div className="flex-1">
        <div className="font-semibold">{theme.name}</div>
        <div className="text-xs text-muted-foreground capitalize">
          {theme.mode} theme
        </div>
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}
