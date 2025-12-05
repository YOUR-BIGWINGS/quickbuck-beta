import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Sparkles, Trophy } from "lucide-react";
import { formatCurrency } from "~/lib/game-utils";
import { toast } from "sonner";

export function RebirthNotification() {
  const [open, setOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  
  const eligibility = useQuery(api.rebirths.checkRebirthEligibility);
  const performRebirth = useMutation(api.rebirths.performRebirth);
  const [isRebirthing, setIsRebirthing] = useState(false);

  useEffect(() => {
    // Show notification when player becomes eligible and hasn't been shown yet
    if (eligibility?.eligible && !hasShown && !open) {
      setOpen(true);
      setHasShown(true);
    }
  }, [eligibility?.eligible, hasShown, open]);

  const handleRebirth = async () => {
    try {
      setIsRebirthing(true);
      const result = await performRebirth();
      
      toast.success(result.message, {
        description: `You are now Rebirth ${result.newRebirthCount}!`,
        duration: 5000,
      });
      
      setOpen(false);
      
      // Refresh page after rebirth
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast.error("Rebirth failed", {
        description: error.message || "An error occurred during rebirth",
      });
    } finally {
      setIsRebirthing(false);
    }
  };

  if (!eligibility) return null;

  const nextRebirth = eligibility.nextRebirth || 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 p-6">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-3xl font-bold">
            🎉 Rebirth Available! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-lg mt-2">
            Congratulations! You've reached {formatCurrency(eligibility.threshold)} net worth!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className="h-8 w-8 text-primary" />
              <h3 className="text-xl font-bold">Rebirth {nextRebirth}</h3>
            </div>
            
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Ascending will reset your progress but grant powerful rewards:
                </p>
              </div>

              <div className="space-y-2 bg-background rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="font-semibold">Rebirth {nextRebirth} Badge</span>
                </div>
                {nextRebirth === 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Clerk account protection during wipes</span>
                  </div>
                )}
                {nextRebirth === 2 && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Unlock QuickBuck Pro theme</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Clerk account protection during wipes</span>
                    </div>
                  </>
                )}
                {nextRebirth === 3 && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="font-bold text-primary">5% Total Account Boost</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>QuickBuck Pro theme</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Clerk account protection during wipes</span>
                    </div>
                  </>
                )}
                {nextRebirth === 4 && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="font-bold" style={{ color: "#9333EA" }}>Purple Username Color</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="font-bold text-primary">5% Total Account Boost</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>QuickBuck Pro theme</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Clerk account protection during wipes</span>
                    </div>
                  </>
                )}
                {nextRebirth >= 5 && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="font-bold text-primary">Custom Hex Username Color</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="font-bold text-primary">5% Discount on All Items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="font-bold text-primary">5% Total Account Boost</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>QuickBuck Pro theme</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Clerk account protection during wipes</span>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                  ⚠️ Warning: The following will be reset:
                </p>
                <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 ml-4">
                  <li>• Balance and net worth</li>
                  <li>• Companies and products</li>
                  <li>• Stock and crypto portfolios</li>
                  <li>• Loans and upgrades</li>
                  <li>• Inventory and carts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isRebirthing}
          >
            Not Yet
          </Button>
          <Button
            onClick={handleRebirth}
            disabled={isRebirthing}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            {isRebirthing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Ascending...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Ascend Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
