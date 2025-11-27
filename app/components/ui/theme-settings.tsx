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
import { themes, type ThemePreset, applyThemeColors, type Theme } from "~/lib/theme-config";
import { cn } from "~/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { CreateThemeDialog } from "~/components/ui/create-theme-dialog";
import { toast } from "sonner";
import type { Id } from "convex/_generated/dataModel";

// Check if a theme is a built-in theme (not from database)
function isBuiltInTheme(themeId: string): boolean {
  return themes.some((t) => t.id === themeId);
}

// Check if a theme is a default theme (should not be editable)
function isDefaultTheme(themeId: string): boolean {
  return themeId === "default" || themeId === "dark-default";
}

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
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMode, setEditMode] = useState<"light" | "dark">("light");
  const [editPrimaryColor, setEditPrimaryColor] = useState("#7678ed");
  const [editSecondaryColor, setEditSecondaryColor] = useState("#ffffff");
  const [isEditing, setIsEditing] = useState(false);
  const [isBuiltInEdit, setIsBuiltInEdit] = useState(false);

  const deleteTheme = useMutation(api.themes.deleteCustomTheme);
  const updateTheme = useMutation(api.themes.updateCustomTheme);
  const upsertTheme = useMutation(api.themes.upsertTheme);

  const isAdmin = moderationAccess?.role === "admin";

  // Combine built-in themes with custom themes (custom themes override built-in if same id)
  useEffect(() => {
    if (customThemes) {
      // Create a map of custom theme overrides by id
      const customOverrides = new Map(customThemes.map((ct) => [ct.id, ct]));
      
      // Map built-in themes, replacing with custom override if it exists
      const builtInMapped = themes.map((t) => {
        const override = customOverrides.get(t.id);
        if (override) {
          return {
            id: override.id as ThemePreset,
            name: override.name,
            mode: override.mode,
            colors: generateCustomThemeColors(override.primaryColor, override.secondaryColor, override.mode),
          };
        }
        return t;
      });
      
      // Add custom themes that don't override built-in themes
      const pureCustomThemes = customThemes
        .filter((ct) => !themes.some((t) => t.id === ct.id))
        .map((ct) => ({
          id: ct.id as ThemePreset,
          name: ct.name,
          mode: ct.mode,
          colors: generateCustomThemeColors(ct.primaryColor, ct.secondaryColor, ct.mode),
        }));
      
      setAllThemes([...builtInMapped, ...pureCustomThemes]);
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

  const handleDeleteTheme = async (themeId: string, themeName: string, themeDocId?: Id<"customThemes">) => {
    // Check if this is a built-in theme
    if (isBuiltInTheme(themeId) && !themeDocId) {
      toast.error("Built-in themes cannot be deleted. You can only reset customized versions.");
      return;
    }
    
    if (!themeDocId) {
      toast.error("Cannot delete this theme");
      return;
    }
    
    const message = isBuiltInTheme(themeId)
      ? `Are you sure you want to reset "${themeName}" to its default appearance?`
      : `Are you sure you want to delete the theme "${themeName}"?`;
      
    if (!confirm(message)) {
      return;
    }
    
    try {
      await deleteTheme({ themeDocId });
      toast.success(isBuiltInTheme(themeId) 
        ? `Theme "${themeName}" reset to default`
        : `Theme "${themeName}" deleted successfully`
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to delete theme");
    }
  };

  // Helper to extract primary/secondary color from theme colors
  const extractColorsFromTheme = (theme: Theme): { primary: string; secondary: string } => {
    const colors = theme.colors;
    // Primary and secondary are usually stored directly
    let primary = colors.primary;
    let secondary = colors.secondary;
    
    // If colors are in oklch format, convert to hex (basic conversion)
    if (primary.includes("oklch")) {
      // For oklch colors, use a fallback - in real world we'd need proper conversion
      primary = "#7678ed"; // fallback
    }
    if (secondary.includes("oklch")) {
      secondary = "#f5f5f5"; // fallback
    }
    
    return { primary, secondary };
  };

  const handleStartEdit = (theme: any, isBuiltIn: boolean = false) => {
    setEditingTheme(theme);
    setEditingThemeId(theme.id || theme._id);
    setEditName(theme.name);
    setIsBuiltInEdit(isBuiltIn);
    
    if (isBuiltIn) {
      // For built-in themes, extract colors from the theme object
      const extracted = extractColorsFromTheme(theme);
      setEditPrimaryColor(extracted.primary);
      setEditSecondaryColor(extracted.secondary);
      setEditMode(theme.mode);
    } else {
      // For custom themes from DB, use the stored colors
      setEditPrimaryColor(theme.primaryColor);
      setEditSecondaryColor(theme.secondaryColor);
      setEditMode(theme.mode);
    }
  };

  const handleCancelEdit = () => {
    setEditingTheme(null);
    setEditingThemeId(null);
    setEditName("");
    setEditMode("light");
    setEditPrimaryColor("#7678ed");
    setEditSecondaryColor("#ffffff");
    setIsBuiltInEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!editingTheme) return;
    
    if (!editName.trim()) {
      toast.error("Please enter a theme name");
      return;
    }

    setIsEditing(true);
    try {
      if (isBuiltInEdit) {
        // For built-in themes, use upsert to create/update an override
        await upsertTheme({
          originalThemeId: editingTheme.id,
          name: editName.trim(),
          mode: editMode,
          primaryColor: editPrimaryColor,
          secondaryColor: editSecondaryColor,
        });
        toast.success(`Theme "${editName}" customized successfully`);
      } else {
        // For custom themes, use regular update
        await updateTheme({
          themeDocId: editingTheme._id,
          name: editName.trim(),
          mode: editMode,
          primaryColor: editPrimaryColor,
          secondaryColor: editSecondaryColor,
        });
        toast.success(`Theme "${editName}" updated successfully`);
      }
      handleCancelEdit();
    } catch (error: any) {
      toast.error(error.message || "Failed to update theme");
    } finally {
      setIsEditing(false);
    }
  };

  // Helper to get the custom theme doc id if this theme has been customized
  const getCustomThemeDoc = (themeId: string) => {
    return customThemes?.find((ct) => ct.id === themeId);
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

          {/* Light Themes (all light themes with admin edit/delete) */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Light Themes</Label>
            <div className="grid gap-3">
              {lightThemes
                .filter((t) => t.id !== "default")
                .map((theme) => {
                  const customDoc = getCustomThemeDoc(theme.id);
                  const isCurrentlyEditing = editingThemeId === theme.id;
                  
                  if (isCurrentlyEditing) {
                    return (
                      <div key={theme.id} className="rounded-lg border-2 border-primary p-4 space-y-4">
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
                    <div key={theme.id} className="relative">
                      <ThemeCard
                        theme={theme}
                        isSelected={preset === theme.id}
                        onSelect={() => handlePresetChange(theme.id)}
                      />
                      {isAdmin && (
                        <div className="absolute right-2 top-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Check if this is a built-in theme or has a custom override
                              const builtIn = isBuiltInTheme(theme.id);
                              if (customDoc) {
                                // Has custom override - edit the custom doc
                                handleStartEdit(customDoc, false);
                              } else if (builtIn) {
                                // Built-in theme without override - create new override
                                handleStartEdit(theme, true);
                              }
                            }}
                            title="Edit theme"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {(customDoc || !isBuiltInTheme(theme.id)) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTheme(theme.id, theme.name, customDoc?._id);
                              }}
                              title={isBuiltInTheme(theme.id) ? "Reset to default" : "Delete theme"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          <Separator />

          {/* Dark Themes (all dark themes with admin edit/delete) */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Dark Themes</Label>
            <div className="grid gap-3">
              {darkThemes
                .filter((t) => t.id !== "dark-default")
                .map((theme) => {
                  const customDoc = getCustomThemeDoc(theme.id);
                  const isCurrentlyEditing = editingThemeId === theme.id;
                  
                  if (isCurrentlyEditing) {
                    return (
                      <div key={theme.id} className="rounded-lg border-2 border-primary p-4 space-y-4">
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
                    <div key={theme.id} className="relative">
                      <ThemeCard
                        theme={theme}
                        isSelected={preset === theme.id}
                        onSelect={() => handlePresetChange(theme.id)}
                      />
                      {isAdmin && (
                        <div className="absolute right-2 top-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Check if this is a built-in theme or has a custom override
                              const builtIn = isBuiltInTheme(theme.id);
                              if (customDoc) {
                                // Has custom override - edit the custom doc
                                handleStartEdit(customDoc, false);
                              } else if (builtIn) {
                                // Built-in theme without override - create new override
                                handleStartEdit(theme, true);
                              }
                            }}
                            title="Edit theme"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {(customDoc || !isBuiltInTheme(theme.id)) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTheme(theme.id, theme.name, customDoc?._id);
                              }}
                              title={isBuiltInTheme(theme.id) ? "Reset to default" : "Delete theme"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
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
