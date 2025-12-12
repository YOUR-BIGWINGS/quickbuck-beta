"use client";

import { useAuth } from "@clerk/react-router";
import { useQuery } from "convex/react";
import { 
  Crown, 
  TrendingUp, 
  Palette, 
  Bot, 
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  AlertTriangle,
  Check
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { useTheme } from "~/contexts/theme-context";
import { themes, applyThemeColors, type ThemePreset } from "~/lib/theme-config";
import { cn } from "~/lib/utils";

// Format price in dollars
function formatPrice(cents: number | undefined): string {
  if (cents === undefined) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

// Format percentage
function formatPercent(value: number | undefined): string {
  if (value === undefined) return "0.00%";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export default function VIPPage() {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState("analysis");
  const { preset, setPreset } = useTheme();

  // Get current player to check VIP status
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);
  
  // Get stock recommendations (VIP only)
  // @ts-ignore - API may not be generated yet
  const stockAnalysis = useQuery(
    api.stocks.getVIPStockAnalysis,
    currentPlayer?.isVIP ? {} : "skip"
  );

  // Get premium themes (custom themes from admin)
  const customThemes = useQuery(api.themes.getCustomThemes);

  // Combine built-in themes with custom themes for display
  const allPremiumThemes = [
    // Custom themes from database (VIP exclusive)
    ...(customThemes || []).map((ct: any) => ({
      _id: ct._id,
      id: ct.id,
      name: ct.name,
      mode: ct.mode,
      primaryColor: ct.primaryColor,
      secondaryColor: ct.secondaryColor,
      isCustom: true,
    })),
  ];

  const handleApplyTheme = (themeId: string) => {
    setPreset(themeId as ThemePreset);
  };

  // Loading state
  if (currentPlayer === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Not VIP - show upgrade prompt
  if (!currentPlayer?.isVIP) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Lock className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">VIP Access Required</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Subscribe to QuickBuck+ to unlock exclusive features including the Stock Analysis Bot, 
              premium themes, and your gold VIP badge.
            </p>
            <Button asChild size="lg">
              <Link to="/subscription">
                <Crown className="mr-2 h-5 w-5" />
                Upgrade to QuickBuck+
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-500/10 rounded-lg">
          <Crown className="h-8 w-8 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            QuickBuck+ VIP
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
              <Sparkles className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            Your exclusive premium features
          </p>
        </div>
      </div>

      {/* Tabs for VIP Features */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="analysis" className="gap-2">
            <Bot className="h-4 w-4" />
            Stock Analysis
          </TabsTrigger>
          <TabsTrigger value="themes" className="gap-2">
            <Palette className="h-4 w-4" />
            Premium Themes
          </TabsTrigger>
        </TabsList>

        {/* Stock Analysis Bot Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Stock Analysis Bot
              </CardTitle>
              <CardDescription>
                AI-powered daily stock recommendations and market insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stockAnalysis === undefined ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : stockAnalysis === null || (Array.isArray(stockAnalysis) && stockAnalysis.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No analysis available yet. Check back soon!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Market Summary */}
                  {stockAnalysis.marketSummary && (
                    <div className="p-4 bg-muted/50 rounded-lg mb-6">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Market Summary
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {stockAnalysis.marketSummary}
                      </p>
                    </div>
                  )}

                  {/* Stock Recommendations */}
                  <h3 className="font-semibold mb-3">Today's Recommendations</h3>
                  <div className="grid gap-4">
                    {stockAnalysis.recommendations?.map((rec: any) => (
                      <div
                        key={rec.symbol}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-lg ${
                          rec.signal === "buy" ? "bg-green-500/10" :
                          rec.signal === "sell" ? "bg-red-500/10" : "bg-yellow-500/10"
                        }`}>
                          {rec.signal === "buy" ? (
                            <ArrowUpRight className="h-6 w-6 text-green-500" />
                          ) : rec.signal === "sell" ? (
                            <ArrowDownRight className="h-6 w-6 text-red-500" />
                          ) : (
                            <Minus className="h-6 w-6 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{rec.symbol}</span>
                            <span className="text-sm text-muted-foreground">{rec.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {rec.reason}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatPrice(rec.price)}</div>
                          <div className={`text-sm ${
                            (rec.change24h ?? 0) >= 0 ? "text-green-500" : "text-red-500"
                          }`}>
                            {formatPercent(rec.change24h)}
                          </div>
                        </div>
                        <Badge variant={
                          rec.signal === "buy" ? "default" :
                          rec.signal === "sell" ? "destructive" : "secondary"
                        }>
                          {rec.signal.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {/* Disclaimer */}
                  <p className="text-xs text-muted-foreground mt-4 p-3 bg-muted/30 rounded">
                    This is simulated analysis for entertainment purposes only. 
                    Recommendations are generated based on in-game market trends and volatility patterns.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Premium Themes Tab */}
        <TabsContent value="themes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Premium Themes
              </CardTitle>
              <CardDescription>
                Exclusive themes only available to QuickBuck+ members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customThemes === undefined ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : allPremiumThemes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No premium themes available yet.</p>
                  <p className="text-sm mt-1">Check back soon for exclusive themes!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {allPremiumThemes.map((theme: any) => (
                    <ThemeCard 
                      key={theme._id || theme.id} 
                      theme={theme} 
                      isActive={preset === theme.id}
                      onApply={() => handleApplyTheme(theme.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Theme Card Component
function ThemeCard({ theme, isActive, onApply }: { theme: any; isActive: boolean; onApply: () => void }) {
  return (
    <div 
      className={cn(
        "relative group border rounded-lg overflow-hidden transition-all cursor-pointer",
        isActive ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50"
      )}
      onClick={onApply}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1">
          <Check className="h-3 w-3" />
        </div>
      )}

      {/* Theme Preview */}
      <div 
        className="h-24 p-3"
        style={{ 
          background: theme.mode === "dark" ? "#0a0a0a" : "#ffffff",
          borderBottom: `3px solid ${theme.primaryColor}`
        }}
      >
        <div className="flex gap-2">
          <div 
            className="w-8 h-8 rounded"
            style={{ backgroundColor: theme.primaryColor }}
          />
          <div 
            className="w-8 h-8 rounded"
            style={{ backgroundColor: theme.secondaryColor }}
          />
        </div>
        <div 
          className="mt-2 h-2 w-16 rounded"
          style={{ backgroundColor: theme.mode === "dark" ? "#2a2a2a" : "#e5e5e5" }}
        />
      </div>
      
      {/* Theme Info */}
      <div className="p-3 bg-card">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{theme.name}</span>
          <Badge variant="outline" className="text-xs">
            {theme.mode}
          </Badge>
        </div>
      </div>

      {/* Hover Overlay */}
      {!isActive && (
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" variant="secondary">
            Apply Theme
          </Button>
        </div>
      )}
    </div>
  );
}
