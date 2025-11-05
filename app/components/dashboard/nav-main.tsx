import { memo, useMemo } from "react";

import { Link, useLocation } from "react-router";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

export const NavMain = memo(
  ({
    groups,
  }: {
    groups: {
      title: string;
      items: {
        title: string;
        url: string;
        icon?: React.ElementType;
      }[];
    }[];
  }) => {
    const location = useLocation();

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
                      <Link to={item.url} prefetch="intent">
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
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
