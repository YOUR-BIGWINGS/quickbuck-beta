import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { redirect, useLoaderData } from "react-router";
import { AppSidebar } from "~/components/dashboard/app-sidebar";
import { SiteHeader } from "~/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { api } from "../../../convex/_generated/api";
import type { Route } from "./+types/layout";
import { createClerkClient } from "@clerk/react-router/api.server";
import { Outlet } from "react-router";
import { useQuery } from "convex/react";
import {
  BannedAccountScreen,
  LimitedAccountAlert,
  WarningModal,
  ModeratorMessageModal,
} from "~/components/account-status";
import { MaintenanceCheck } from "~/components/maintenance-check";
import { useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "convex/_generated/dataModel";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  // Redirect to sign-in if not authenticated
  if (!userId) {
    throw redirect("/sign-in");
  }

  // Fetch the current user only. Subscription checks are disabled while payments are removed.
  const user = await createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  }).users.getUser(userId);

  return { user };
}

export default function DashboardLayout() {
  const { user } = useLoaderData();
  // @ts-ignore - moderation API will be available after Convex regenerates types
  const currentPlayer = useQuery(api.moderation?.getCurrentPlayer);
  const [dismissedWarnings, setDismissedWarnings] = useState(false);

  // Query for unread moderator messages
  // @ts-ignore
  const unreadMessages = useQuery(api.moderation?.getMyModeratorMessages);
  // @ts-ignore
  const markMessageAsRead = useMutation(api.moderation?.markMessageAsRead);
  const [dismissedMessages, setDismissedMessages] = useState(false);

  // Show banned screen if player is banned
  if (currentPlayer?.role === "banned") {
    return (
      <BannedAccountScreen
        reason={currentPlayer.banReason || "Your account has been banned."}
      />
    );
  }

  // Show warnings modal if player has warnings and hasn't dismissed them
  const hasWarnings =
    currentPlayer?.warnings && currentPlayer.warnings.length > 0;

  // Show moderator messages modal if player has unread messages
  const hasUnreadMessages =
    unreadMessages && unreadMessages.length > 0 && !dismissedMessages;

  const handleMarkMessageAsRead = async (messageId: Id<"moderatorMessages">) => {
    try {
      await markMessageAsRead({ messageId });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      {/* Check if maintenance mode is enabled and redirect if necessary */}
      <MaintenanceCheck />

      {/* Show moderator messages modal if player has unread messages */}
      {hasUnreadMessages && (
        <ModeratorMessageModal
          messages={unreadMessages}
          onDismiss={() => setDismissedMessages(true)}
          onMarkAsRead={handleMarkMessageAsRead}
        />
      )}

      {/* Show warning modal if player has warnings */}
      {hasWarnings && !dismissedWarnings && currentPlayer.warnings && (
        <WarningModal
          warnings={currentPlayer.warnings}
          onDismiss={() => setDismissedWarnings(true)}
        />
      )}

      {/* Show limited account modal if player is limited */}
      {currentPlayer?.role === "limited" && currentPlayer.limitReason && (
        <LimitedAccountAlert reason={currentPlayer.limitReason} />
      )}

      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
