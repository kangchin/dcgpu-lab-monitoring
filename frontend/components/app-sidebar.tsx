"use client";

import { Home, Factory, Moon, Thermometer, Radar } from "lucide-react";
import { useTheme } from "next-themes";
import { Fragment } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    activeIndicator: "",
  },
  {
    title: "System Temperatures",
    url: "/system-temperatures",
    icon: Thermometer,
    activeIndicator: "",
  },
  {
    title: "Nmap Scan",
    url: "/nmap-scan",
    icon: Radar,
    activeIndicator: "",
  },
  {
    title: "OpenDC",
    icon: Factory,
    subitems: [
      {
        title: "Data Hall 1",
        url: "/opendc/dh1",
        activeIndicator: "",
      },
      {
        title: "Data Hall 2",
        url: "/opendc/dh2",
        activeIndicator: "",
      },
      {
        title: "Data Hall 3",
        url: "/opendc/dh3",
        activeIndicator: "",
      },
      {
        title: "Data Hall 4",
        url: "/opendc/dh4",
        activeIndicator: "",
      },
      {
        title: "Data Hall 5",
        url: "/opendc/dh5",
        activeIndicator: "",
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme == "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  return (
    <Sidebar className="font-manrope font-semibold">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-clashDisplay font-semibold text-2xl text-center mx-auto text-text dark:text-text-dark my-5 tracking-wide">
            DCGPU Lab
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
                item.subitems ? (
                  <Fragment key={item.title}>
                    <Slot className="flex items-center h-8 text-sm peer/menu-button w-full gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0">
                      <div>
                        <item.icon />
                        <span>{item.title}</span>
                      </div>
                    </Slot>
                    <SidebarMenuSub>
                      {item.subitems.map((subitem) => (
                        <Fragment key={subitem.title}>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={subitem.url == pathname}
                            >
                              <a href={subitem.url}>
                                <span>{subitem.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </Fragment>
                      ))}
                    </SidebarMenuSub>
                  </Fragment>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.url == pathname}>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          {/* <div className="px-2 w-full flex items-center h-8 gap-2 text-sm">
            <Moon size={16} />
            <span>Dark</span>
          </div> */}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="hover:cursor-pointer"
                  onClick={toggleTheme}
                >
                  <div className="flex items-center justify-between text-sm h-8 ">
                    <div className="flex items-center gap-2">
                      <Moon size={16} />
                      <span>Dark</span>
                    </div>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full text-center flex items-center justify-center",
                        theme === "dark"
                          ? "bg-blue-500"
                          : "border border-slate-300",
                      )}
                    >
                      {theme === "dark" && (
                        // <Check size={10} color="white" className="text-center" strokeWidth={4} />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-4 text-white"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <motion.path
                            d="M20 6 9 17l-5-5"
                            initial={{ pathLength: 0, pathOffset: 1 }}
                            animate={{ pathLength: 1, pathOffset: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}