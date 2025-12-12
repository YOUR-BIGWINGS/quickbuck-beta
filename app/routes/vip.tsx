"use client";

import { useAuth } from "@clerk/react-router";
import { useQuery, useMutation } from "convex/react";
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
  Check,
  Zap,
  CloudLightning,
  Settings2,
  Upload,
  RotateCcw,
  MessageSquare,
  Send
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { useTheme } from "~/contexts/theme-context";
import { vipThemes, type ThemePreset } from "~/lib/theme-config";
import { cn } from "~/lib/utils";
import { ScrollArea } from "~/components/ui/scroll-area";

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

// Default custom theme settings
const defaultCustomSettings = {
  backgroundUrl: "",
  backgroundColor: "#0a0a0a",
  cardBackground: "rgba(30, 30, 30, 0.8)",
  cardOpacity: 80,
  borderColor: "rgba(100, 100, 100, 0.5)",
  textColor: "#ffffff",
  accentColor: "#6366f1",
  blurAmount: 12,
};

export default function VIPPage() {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState("analysis");
  const { preset, setPreset, applyCustomThemeSettings } = useTheme();
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [customSettings, setCustomSettings] = useState(defaultCustomSettings);
  const [message, setMessage] = useState("");
  const [loungeError, setLoungeError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get current player to check VIP status
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);
  
  // Get stock recommendations (VIP only)
  // @ts-ignore - API may not be generated yet
  const stockAnalysis = useQuery(
    api.stocks.getVIPStockAnalysis,
    currentPlayer?.isVIP ? {} : "skip"
  );

  // Get saved custom theme settings
  const savedCustomSettings = useQuery(
    api.themes.getUserCustomThemeSettings,
    currentPlayer?.isVIP ? {} : "skip"
  );
  
  // Mutation to save custom theme settings
  const saveCustomSettings = useMutation(api.themes.saveUserCustomThemeSettings);

  // VIP Lounge queries and mutations
  // @ts-ignore - vipLounge API may not be generated yet
  const loungeMessages = useQuery(api.vipLounge?.getVIPLoungeMessages, currentPlayer?.isVIP ? { limit: 100 } : "skip");
  // @ts-ignore - vipLounge API may not be generated yet
  const sendLoungeMessage = useMutation(api.vipLounge?.sendVIPMessage);

  // Load saved custom settings
  useEffect(() => {
    if (savedCustomSettings) {
      setCustomSettings({
        backgroundUrl: savedCustomSettings.backgroundUrl || "",
        backgroundColor: savedCustomSettings.backgroundColor,
        cardBackground: savedCustomSettings.cardBackground,
        cardOpacity: savedCustomSettings.cardOpacity,
        borderColor: savedCustomSettings.borderColor,
        textColor: savedCustomSettings.textColor,
        accentColor: savedCustomSettings.accentColor,
        blurAmount: savedCustomSettings.blurAmount,
      });
    }
  }, [savedCustomSettings]);

  // Auto-scroll to bottom when new lounge messages arrive
  useEffect(() => {
    if (scrollRef.current && activeTab === "lounge") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [loungeMessages, activeTab]);

  // VIP themes - hardcoded animated themes
  const vipThemesList = vipThemes.map(theme => ({
    id: theme.id,
    name: theme.name,
    mode: theme.mode,
    primaryColor: theme.colors.primary,
    secondaryColor: theme.colors.secondary,
    description: theme.id === "crimson-pulse" 
      ? "Pulsing crimson borders on glassy black"
      : theme.id === "storm"
      ? "Foggy atmosphere with lightning flashes"
      : "Fully customizable theme",
    icon: theme.id === "crimson-pulse" 
      ? Zap 
      : theme.id === "storm" 
      ? CloudLightning 
      : Settings2,
    isAnimated: theme.id !== "full-custom",
  }));

  const handleApplyTheme = (themeId: string) => {
    setPreset(themeId as ThemePreset);
    if (themeId === "full-custom") {
      setShowCustomEditor(true);
      applyCustomThemeSettings(customSettings);
    } else {
      setShowCustomEditor(false);
    }
  };

  const handleCustomSettingChange = (key: keyof typeof customSettings, value: string | number) => {
    const newSettings = { ...customSettings, [key]: value };
    setCustomSettings(newSettings);
    if (preset === "full-custom") {
      applyCustomThemeSettings(newSettings);
    }
  };

  const handleSaveCustomSettings = async () => {
    try {
      await saveCustomSettings({
        backgroundUrl: customSettings.backgroundUrl || undefined,
        backgroundColor: customSettings.backgroundColor,
        cardBackground: customSettings.cardBackground,
        cardOpacity: customSettings.cardOpacity,
        borderColor: customSettings.borderColor,
        textColor: customSettings.textColor,
        accentColor: customSettings.accentColor,
        blurAmount: customSettings.blurAmount,
      });
    } catch (error) {
      console.error("Failed to save custom settings:", error);
    }
  };

  const handleResetCustomSettings = () => {
    setCustomSettings(defaultCustomSettings);
    if (preset === "full-custom") {
      applyCustomThemeSettings(defaultCustomSettings);
    }
  };

  const handleSendLoungeMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setLoungeError("Message cannot be empty");
      return;
    }

    try {
      setLoungeError(null);
      await sendLoungeMessage({ content: message });
      setMessage("");
    } catch (err: any) {
      setLoungeError(err.message || "Failed to send message");
    }
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
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="analysis" className="gap-2">
            <Bot className="h-4 w-4" />
            Stock Analysis
          </TabsTrigger>
          <TabsTrigger value="lounge" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            VIP Lounge
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

        {/* VIP Lounge Chat Tab */}
        <TabsContent value="lounge" className="space-y-6">
          <Card className="h-[calc(100vh-300px)] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                VIP Lounge Chat
              </CardTitle>
              <CardDescription>
                Connect with fellow QuickBuck+ members
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <ScrollArea ref={scrollRef} className="flex-1 px-4">
                <div className="space-y-4 py-4">
                  {loungeMessages === undefined ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading messages...</p>
                      </div>
                    </div>
                  ) : loungeMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No messages yet. Be the first to say hello!
                      </p>
                    </div>
                  ) : (
                    loungeMessages.map((msg: any) => (
                      <div key={msg._id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm flex items-center gap-1">
                            {msg.playerName}
                            <Crown className="h-3 w-3 text-yellow-500" />
                          </span>
                          {msg.senderBadges && msg.senderBadges.length > 0 && (
                            <div className="flex gap-1">
                              {msg.senderBadges.map((badge: any) => (
                                <span
                                  key={badge._id}
                                  className="text-xs"
                                  title={badge.description}
                                  dangerouslySetInnerHTML={{ __html: badge.icon }}
                                />
                              ))}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.sentAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm pl-1">{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <form onSubmit={handleSendLoungeMessage} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    maxLength={500}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!message.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                {loungeError && (
                  <p className="text-sm text-destructive mt-2">{loungeError}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {message.length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Premium Themes Tab */}
        <TabsContent value="themes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Premium Animated Themes
              </CardTitle>
              <CardDescription>
                Exclusive animated themes only available to QuickBuck+ members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* VIP Theme Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {vipThemesList.map((theme) => (
                  <VIPThemeCard
                    key={theme.id}
                    theme={theme}
                    isActive={preset === theme.id}
                    onApply={() => handleApplyTheme(theme.id)}
                  />
                ))}
              </div>

              {/* Full Custom Theme Editor */}
              {(showCustomEditor || preset === "full-custom") && (
                <Card className="border-2 border-dashed border-primary/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings2 className="h-5 w-5" />
                      Customize Your Theme
                    </CardTitle>
                    <CardDescription>
                      Adjust colors, transparency, and upload a custom background
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Background Settings */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Background</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bgUrl">Background Image URL</Label>
                          <div className="flex gap-2">
                            <Input
                              id="bgUrl"
                              placeholder="https://example.com/image.jpg"
                              value={customSettings.backgroundUrl}
                              onChange={(e) => handleCustomSettingChange("backgroundUrl", e.target.value)}
                            />
                            <Button variant="outline" size="icon" title="Upload coming soon">
                              <Upload className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bgColor">Background Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="bgColor"
                              type="color"
                              className="w-12 h-10 p-1 cursor-pointer"
                              value={customSettings.backgroundColor}
                              onChange={(e) => handleCustomSettingChange("backgroundColor", e.target.value)}
                            />
                            <Input
                              value={customSettings.backgroundColor}
                              onChange={(e) => handleCustomSettingChange("backgroundColor", e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card/Asset Settings */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Cards & Assets</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Card Opacity: {customSettings.cardOpacity}%</Label>
                          <Slider
                            value={[customSettings.cardOpacity]}
                            onValueChange={(values: number[]) => handleCustomSettingChange("cardOpacity", values[0])}
                            min={20}
                            max={100}
                            step={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Blur Amount: {customSettings.blurAmount}px</Label>
                          <Slider
                            value={[customSettings.blurAmount]}
                            onValueChange={(values: number[]) => handleCustomSettingChange("blurAmount", values[0])}
                            min={0}
                            max={30}
                            step={2}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="borderColor">Border Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="borderColor"
                            type="color"
                            className="w-12 h-10 p-1 cursor-pointer"
                            value={customSettings.borderColor.startsWith("rgba") ? "#646464" : customSettings.borderColor}
                            onChange={(e) => handleCustomSettingChange("borderColor", e.target.value)}
                          />
                          <Input
                            value={customSettings.borderColor}
                            onChange={(e) => handleCustomSettingChange("borderColor", e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Color Settings */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Colors</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="textColor">Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="textColor"
                              type="color"
                              className="w-12 h-10 p-1 cursor-pointer"
                              value={customSettings.textColor}
                              onChange={(e) => handleCustomSettingChange("textColor", e.target.value)}
                            />
                            <Input
                              value={customSettings.textColor}
                              onChange={(e) => handleCustomSettingChange("textColor", e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accentColor">Accent Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="accentColor"
                              type="color"
                              className="w-12 h-10 p-1 cursor-pointer"
                              value={customSettings.accentColor}
                              onChange={(e) => handleCustomSettingChange("accentColor", e.target.value)}
                            />
                            <Input
                              value={customSettings.accentColor}
                              onChange={(e) => handleCustomSettingChange("accentColor", e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardBg">Card Background</Label>
                          <div className="flex gap-2">
                            <Input
                              id="cardBg"
                              type="color"
                              className="w-12 h-10 p-1 cursor-pointer"
                              value={customSettings.cardBackground.startsWith("rgba") ? "#1e1e1e" : customSettings.cardBackground}
                              onChange={(e) => handleCustomSettingChange("cardBackground", e.target.value)}
                            />
                            <Input
                              value={customSettings.cardBackground}
                              onChange={(e) => handleCustomSettingChange("cardBackground", e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button onClick={handleSaveCustomSettings} className="flex-1">
                        Save Settings
                      </Button>
                      <Button variant="outline" onClick={handleResetCustomSettings}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// VIP Theme Card Component
function VIPThemeCard({ theme, isActive, onApply }: { 
  theme: { 
    id: string; 
    name: string; 
    mode: string; 
    primaryColor: string; 
    secondaryColor: string; 
    description: string;
    icon: any;
    isAnimated: boolean;
  }; 
  isActive: boolean; 
  onApply: () => void 
}) {
  const Icon = theme.icon;
  
  return (
    <div 
      className={cn(
        "relative group border rounded-lg overflow-hidden transition-all cursor-pointer",
        isActive ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50",
        theme.id === "crimson-pulse" && "border-red-900/50",
        theme.id === "storm" && "border-blue-500/30"
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
        className={cn(
          "h-28 p-4 flex flex-col justify-between relative overflow-hidden",
          theme.id === "crimson-pulse" && "bg-gradient-to-br from-[#0a0a0a] via-[#1a0a0a] to-[#0a0a0a]",
          theme.id === "storm" && "bg-[#0d1117]",
          theme.id === "full-custom" && "bg-gradient-to-br from-gray-900 to-gray-800"
        )}
      >
        {/* Animated preview elements */}
        {theme.id === "crimson-pulse" && (
          <div className="absolute inset-0 border-2 border-red-900 animate-pulse" 
               style={{ boxShadow: "inset 0 0 20px rgba(220, 20, 60, 0.3)" }} />
        )}
        {theme.id === "storm" && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent animate-pulse" />
            <div className="absolute top-1/4 left-1/3 w-1 h-8 bg-white/20 rotate-12 animate-ping" 
                 style={{ animationDuration: "3s" }} />
          </>
        )}
        
        <div className="flex items-center gap-2 relative z-10">
          <Icon className={cn(
            "h-5 w-5",
            theme.id === "crimson-pulse" && "text-red-500",
            theme.id === "storm" && "text-blue-400",
            theme.id === "full-custom" && "text-indigo-400"
          )} />
          <span className="font-bold text-white">{theme.name}</span>
        </div>
        
        <div className="flex gap-2 relative z-10">
          <div 
            className="w-6 h-6 rounded border border-white/20"
            style={{ backgroundColor: theme.primaryColor }}
          />
          <div 
            className="w-6 h-6 rounded border border-white/20"
            style={{ backgroundColor: theme.secondaryColor }}
          />
        </div>

        {theme.isAnimated && (
          <Badge variant="secondary" className="absolute bottom-2 right-2 text-xs bg-white/10 text-white">
            Animated
          </Badge>
        )}
      </div>
      
      {/* Theme Info */}
      <div className="p-3 bg-card">
        <p className="text-xs text-muted-foreground">{theme.description}</p>
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
