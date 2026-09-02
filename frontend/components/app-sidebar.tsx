"use client";

import { Database, Home, Factory, Moon, Thermometer, Radar, Zap } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Play } from "lucide-react";

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
    url: "/nmap",
    icon: Radar,
    activeIndicator: "",
  },
  {
    title: "PDU",
    url: "/pdu",
    icon: Database,
    activeIndicator: "",
  },
  {
    title: "Macros",
    url: "/macros",
    icon: Play,
    activeIndicator: "",
  },
  {
    title: "OpenDC",
    url: "/opendc/overview",
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
        subitems: [
          {
            title: "Temperature Monitoring",
            url: "/opendc/dh3/temperature",
            activeIndicator: "",
          },
        ],
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
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={item.url == pathname}>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuSub>
                      {item.subitems.map((subitem) =>
                        subitem.subitems ? (
                          // Handle nested subitems (e.g., DH3 Temperature)
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
                              {/* Nested sub-subitems */}
                              <SidebarMenuSub>
                                {subitem.subitems.map((nestedItem) => (
                                  <SidebarMenuSubItem key={nestedItem.title}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={nestedItem.url == pathname}
                                    >
                                      <a href={nestedItem.url}>
                                        <span>
                                          {nestedItem.title}
                                        </span>
                                      </a>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </SidebarMenuSubItem>
                          </Fragment>
                        ) : (
                          // Regular subitems
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
                        ),
                      )}
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