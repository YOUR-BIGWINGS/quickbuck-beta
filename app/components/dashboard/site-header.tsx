import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Github, BookOpen, Newspaper, Bug, Trash2, Plus } from "lucide-react";
import DiscordIcon from "~/components/icons/discord-icon";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Link } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { RebirthRewardsDialog } from "./rebirth-rewards-dialog";

export function SiteHeader() {
  const currentPlayer = useQuery(api.moderation.getCurrentPlayer);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-2 sm:px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Button
          variant="ghost"
          size="icon"
          asChild
          title="QuickBuck+"
          aria-label="QuickBuck+"
          className="h-8 w-8 sm:h-9 sm:w-9 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
        >
          <Link to="/pricing" className="flex items-center">
            <Plus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={3} />
          </Link>
        </Button>
        <Separator
          orientation="vertical"
          className="mx-1 sm:mx-2 data-[orientation=vertical]:h-4"
        />
        {currentPlayer?.role === "limited" && (
          <div className="flex items-center gap-1 sm:gap-2 rounded-md bg-yellow-100 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-yellow-800 border-2 border-yellow-400">
            <span className="hidden sm:inline">⚠️</span> <span className="hidden sm:inline">Account </span>Limited
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            asChild
            title="Rules"
            aria-label="Rules"
            className="font-bold text-xs sm:text-sm"
            size="sm"
          >
            <Link to="/rules" className="flex items-center gap-1 sm:gap-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">RULES</span>
            </Link>
          </Button>

          <RebirthRewardsDialog />

          {currentPlayer?.role === "admin" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Debug Tools"
                  aria-label="Debug Tools"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <Bug className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/admin/tick" className="cursor-pointer">
                    Manual Tick
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/maintenance" className="cursor-pointer">
                    Maintenance
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/wipe" className="cursor-pointer flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Full Wipe
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            asChild
            title="GitHub"
            aria-label="GitHub"
            className="h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
          >
            <a
              href="https://github.com/saltjsx/quickbuck-v1b"
              rel="noopener noreferrer"
              target="_blank"
              className="flex items-center"
            >
              <Github className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            title="Discord"
            aria-label="Discord"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <a
              href="https://discord.gg/hVcv6upDW"
              rel="noopener noreferrer"
              target="_blank"
              className="flex items-center"
            >
              <DiscordIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
