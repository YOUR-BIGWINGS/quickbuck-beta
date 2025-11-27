"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { toast } from "sonner";

interface CreateThemeDialogProps {
  onThemeCreated?: () => void;
}

export function CreateThemeDialog({ onThemeCreated }: CreateThemeDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [primaryColor, setPrimaryColor] = useState("#7678ed");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [isCreating, setIsCreating] = useState(false);

  const createTheme = useMutation(api.themes.createCustomTheme);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a theme name");
      return;
    }

    if (!primaryColor || !secondaryColor) {
      toast.error("Please select both primary and secondary colors");
      return;
    }

    setIsCreating(true);
    try {
      await createTheme({
        name: name.trim(),
        mode,
        primaryColor,
        secondaryColor,
      });

      toast.success(`Theme "${name}" created successfully!`);
      setOpen(false);
      setName("");
      setPrimaryColor("#7678ed");
      setSecondaryColor("#ffffff");
      setMode("light");
      onThemeCreated?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to create theme");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Theme
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Custom Theme</DialogTitle>
          <DialogDescription>
            Create a new custom theme with your chosen colors
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Theme Name */}
          <div className="space-y-2">
            <Label htmlFor="theme-name">Theme Name</Label>
            <Input
              id="theme-name"
              placeholder="e.g., Purple Haze"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Theme Type */}
          <div className="space-y-2">
            <Label htmlFor="theme-mode">Theme Type</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "light" | "dark")}>
              <SelectTrigger id="theme-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light Theme</SelectItem>
                <SelectItem value="dark">Dark Theme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-20 cursor-pointer"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#7678ed"
                className="flex-1"
              />
            </div>
          </div>

          {/* Secondary Color */}
          <div className="space-y-2">
            <Label htmlFor="secondary-color">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondary-color"
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-20 cursor-pointer"
              />
              <Input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>

          {/* Color Preview */}
          <div className="space-y-2">
            <Label>Color Preview</Label>
            <div className="flex gap-2">
              <div
                className="h-20 flex-1 rounded-lg border-2 border-border flex items-center justify-center text-xs font-semibold"
                style={{
                  backgroundColor: primaryColor,
                  color: mode === "light" ? "#ffffff" : "#000000",
                }}
              >
                Primary
              </div>
              <div
                className="h-20 flex-1 rounded-lg border-2 border-border flex items-center justify-center text-xs font-semibold"
                style={{
                  backgroundColor: secondaryColor,
                  color: mode === "light" ? "#0a0a0a" : "#ffffff",
                }}
              >
                Secondary
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Theme"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
