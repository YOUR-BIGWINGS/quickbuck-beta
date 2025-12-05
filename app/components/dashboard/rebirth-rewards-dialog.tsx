import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Award, Palette } from "lucide-react";
import { formatCurrency } from "~/lib/game-utils";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";

export function RebirthRewardsDialog() {
  const [open, setOpen] = useState(false);
  const [customHexColor, setCustomHexColor] = useState("#9333EA");
  const [isSettingColor, setIsSettingColor] = useState(false);
  
  const rebirthRewards = useQuery(api.rebirths.getRebirthRewards);
  const playerRebirthInfo = useQuery(api.rebirths.getPlayerRebirthInfo, {});
  const eligibility = useQuery(api.rebirths.checkRebirthEligibility);
  const setCustomColor = useMutation(api.rebirths.setCustomUsernameColor);

  if (!rebirthRewards) return null;

  const currentRebirth = playerRebirthInfo?.rebirthCount || 0;

  const handleSetCustomColor = async () => {
    try {
      setIsSettingColor(true);
      await setCustomColor({ hexColor: customHexColor });
      toast.success("Custom username color set!", {
        description: `Your username color has been updated to ${customHexColor}`,
      });
    } catch (error: any) {
      toast.error("Failed to set custom color", {
        description: error.message || "An error occurred",
      });
    } finally {
      setIsSettingColor(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          title="Rebirth Rewards"
          aria-label="Rebirth Rewards"
          className="font-bold"
        >
          <Award className="h-5 w-5 mr-2" />
          REBIRTH
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Rebirth System</DialogTitle>
          <DialogDescription>
            Reach $100 billion net worth to ascend and unlock exclusive rewards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Status */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <h3 className="font-semibold mb-2">Your Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Rebirth Level:</span>
                <Badge variant={currentRebirth > 0 ? "default" : "secondary"}>
                  {currentRebirth > 0 ? `Rebirth ${currentRebirth}` : "No Rebirths"}
                </Badge>
              </div>
              {eligibility && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Net Worth:</span>
                    <span className="font-semibold">{formatCurrency(eligibility.netWorth)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Required for Next Rebirth:</span>
                    <span className="font-semibold">{formatCurrency(eligibility.threshold)}</span>
                  </div>
                  {eligibility.eligible && (
                    <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-md">
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                        🎉 You're eligible for rebirth! Check your game dashboard for the rebirth button.
                      </p>
                    </div>
                  )}
                </>
              )}
              {playerRebirthInfo?.accountBoost && playerRebirthInfo.accountBoost > 0 && (
                <div className="flex justify-between items-center mt-2 p-2 bg-primary/10 rounded">
                  <span className="text-sm font-semibold">Active Boost:</span>
                  <span className="font-bold text-primary">+{(playerRebirthInfo.accountBoost * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Rebirth Rewards */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Rebirth Rewards</h3>
            
            {Object.entries(rebirthRewards).map(([level, reward]: [string, any]) => {
              const rebirthLevel = parseInt(level);
              const isUnlocked = currentRebirth >= rebirthLevel;
              const isCurrent = currentRebirth === rebirthLevel;

              return (
                <div
                  key={level}
                  className={`rounded-lg border p-4 transition-all ${
                    isCurrent
                      ? "border-primary bg-primary/5"
                      : isUnlocked
                      ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                          isUnlocked
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        style={
                          isUnlocked && reward.badge
                            ? { backgroundColor: reward.badge.color, color: "#ffffff" }
                            : undefined
                        }
                      >
                        {reward.badge?.text || `R${level}`}
                      </div>
                      <div>
                        <h4 className="font-semibold">Rebirth {level}</h4>
                        <p className="text-sm text-muted-foreground">
                          {reward.badge?.description || `Ascension level ${level}`}
                        </p>
                      </div>
                    </div>
                    {isUnlocked && (
                      <Badge variant="default" className="bg-green-600">
                        Unlocked
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge variant="default">Current</Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold mb-2">Rewards:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {reward.rewards?.map((rewardText: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {rewardText}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {reward.unlockedTheme && (
                    <div className="mt-3 p-2 bg-muted rounded text-xs">
                      <span className="font-semibold">Unlocked Theme:</span> {reward.unlockedTheme}
                    </div>
                  )}
                  {reward.accountBoost && (
                    <div className="mt-3 p-2 bg-primary/10 rounded text-xs">
                      <span className="font-semibold">Account Boost:</span> +{(reward.accountBoost * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom Username Color Picker (Tier 5 only) */}
          {currentRebirth >= 5 && (
            <div className="rounded-lg border p-4 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border-pink-300 dark:border-pink-700">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-5 w-5 text-pink-600" />
                <h3 className="font-semibold text-pink-900 dark:text-pink-100">Custom Username Color</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                As a Rebirth 5 player, you can customize your username color to any hex value!
              </p>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="hexColor" className="text-sm mb-1 block">
                      Hex Color Code
                    </Label>
                    <Input
                      id="hexColor"
                      type="text"
                      value={customHexColor}
                      onChange={(e) => setCustomHexColor(e.target.value)}
                      placeholder="#9333EA"
                      className="font-mono"
                      maxLength={7}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Label htmlFor="colorPreview" className="text-sm mb-1 block">
                      Preview
                    </Label>
                    <div
                      id="colorPreview"
                      className="w-12 h-10 rounded border-2 border-border"
                      style={{ backgroundColor: customHexColor }}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSetCustomColor}
                  disabled={isSettingColor || !/^#[0-9A-Fa-f]{6}$/.test(customHexColor)}
                  className="w-full"
                >
                  {isSettingColor ? "Setting Color..." : "Set Custom Color"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Format: #RRGGBB (e.g., #9333EA for purple, #EC4899 for pink)
                </p>
              </div>
            </div>
          )}

          {/* Rebirth Information */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <h3 className="font-semibold mb-2">How Rebirth Works</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Reach a net worth of $100 billion (10 trillion cents) to qualify</li>
              <li>• Rebirthing resets your balance, companies, investments, and assets</li>
              <li>• You keep your rebirth level, badges, and special privileges</li>
              <li>• Your Clerk account is protected during game wipes</li>
              <li>• Each rebirth grants increasingly powerful rewards</li>
              <li>• Rebirth 3+ players receive a permanent 5% account boost</li>
              <li>• Rebirth 5+ players receive a 5% discount on all purchases</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
