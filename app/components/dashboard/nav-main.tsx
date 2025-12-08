import { memo, useMemo } from "react";

import { Link, useLocation } from "react-router";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { Badge } from "~/components/ui/badge";

export const NavMain = memo(
  ({
    groups,
    unreadCount,
  }: {
    groups: {
      title: string;
      items: {
        title: string;
        url: string;
        icon?: React.ElementType;
      }[];
    }[];
    unreadCount?: number;
  }) => {
    const location = useLocation();
    const { isMobile, setOpenMobile } = useSidebar();

    const groupsWithActiveStatus = useMemo(
      () =>
        groups.map((group) => ({
          ...group,
          items: group.items.map((item) => ({
            ...item,
            isActive: location.pathname === item.url,
          })),
        })),
      [groups, location.pathname]
    );

    return (
      <>
        {groupsWithActiveStatus.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent className="flex flex-col gap-2">
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={item.isActive}
                      asChild
                    >
                      <Link 
                        to={item.url} 
                        prefetch="intent"
                        onClick={() => {
                          // Auto-close sidebar on mobile when navigation link is clicked
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        {item.url === "/messages" && unreadCount && unreadCount > 0 && (
                          <Badge variant="default" className="ml-auto">
                            {unreadCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </>
    );
  }
);

NavMain.displayName = "NavMain";
