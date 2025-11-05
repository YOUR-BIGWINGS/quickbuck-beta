import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/react-router";
import { api } from "../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2, Check, Lock, TrendingUp, Zap } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/upgrades";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw redirect("/sign-in");
  }

  return {};
}

export default function UpgradesPage() {
  const { userId: clerkUserId } = useAuth();

  const user = useQuery(
    api.users.findUserByToken,
    clerkUserId ? { tokenIdentifier: clerkUserId } : "skip"
  );

  const player = useQuery(
    api.players.getPlayerByUserId,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );

  const availableUpgrades = useQuery(api.upgrades.getAvailableUpgrades);
  const myUpgrades = useQuery(api.upgrades.getMyUpgrades);
  const upgradeStats = useQuery(api.upgrades.getUpgradeStats);
  const purchaseUpgrade = useMutation(api.upgrades.purchaseUpgrade);
  const toggleUpgrade = useMutation(api.upgrades.toggleUpgrade);

  const handlePurchase = async (upgradeType: string) => {
    try {
      await purchaseUpgrade({ upgradeType });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleToggle = async (upgradeId: Id<"upgrades">) => {
    try {
      await toggleUpgrade({ upgradeId });
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (!player || !availableUpgrades || !myUpgrades || !upgradeStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upgrades</h1>
        <p className="text-muted-foreground">
          Enhance your gameplay with powerful upgrades
        </p>
      </div>

      {/* Player Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Your Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            ${(player.balance / 100).toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Upgrades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upgradeStats.totalUpgrades}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Upgrades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upgradeStats.activeUpgrades}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${(upgradeStats.totalSpent / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* My Upgrades */}
      {myUpgrades.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            My Upgrades
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myUpgrades.map((upgrade) => (
              <Card
                key={upgrade._id}
                className={
                  upgrade.isActive ? "border-green-500" : "border-gray-300"
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{upgrade.name}</CardTitle>
                    <Badge variant={upgrade.isActive ? "default" : "outline"}>
                      {upgrade.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>{upgrade.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <TrendingUp className="h-4 w-4" />
                      {upgrade.benefit}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Purchased:{" "}
                      {new Date(upgrade.purchasedAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleToggle(upgrade._id)}
                    variant={upgrade.isActive ? "outline" : "default"}
                    className="w-full"
                  >
                    {upgrade.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Upgrades */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Available Upgrades</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableUpgrades.map((upgrade) => (
            <Card
              key={upgrade.upgradeType}
              className={upgrade.isPurchased ? "opacity-50" : ""}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{upgrade.name}</CardTitle>
                  {upgrade.isPurchased && (
                    <Badge variant="secondary">
                      <Check className="h-3 w-3 mr-1" />
                      Owned
                    </Badge>
                  )}
                </div>
                <CardDescription>{upgrade.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <TrendingUp className="h-4 w-4" />
                    {upgrade.benefit}
                  </div>
                  <p className="text-2xl font-bold">
                    ${(upgrade.cost / 100).toFixed(2)}
                  </p>
                  {!upgrade.canAfford && !upgrade.isPurchased && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Insufficient balance
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handlePurchase(upgrade.upgradeType)}
                  disabled={upgrade.isPurchased || !upgrade.canAfford}
                  className="w-full"
                >
                  {upgrade.isPurchased ? "Already Purchased" : "Purchase"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
