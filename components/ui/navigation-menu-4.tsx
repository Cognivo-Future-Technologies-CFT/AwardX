import * as React from "react"
import { BellIcon, BookOpenIcon, InfoIcon, LifeBuoyIcon, MenuIcon, SearchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

export type HeaderNavItem = {
  href?: string
  label: string
  description?: string
  icon?: "BookOpenIcon" | "LifeBuoyIcon" | "InfoIcon"
  onSelect?: () => void
}

export type HeaderNavigationLink =
  | {
      href?: string
      label: string
      submenu: false
      onSelect?: () => void
    }
  | {
      label: string
      submenu: true
      type: "description" | "simple" | "icon"
      items: HeaderNavItem[]
    }

const isTopLevelLink = (
  link: HeaderNavigationLink
): link is Extract<HeaderNavigationLink, { submenu: false }> => !link.submenu

interface NotificationItem {
  id: string
  title: string
  body?: string
  isRead: boolean
  createdAt: string
}

interface NavigationMenuFourProps {
  navigationLinks?: HeaderNavigationLink[]
  eventTitle?: string
  currentView?: string
  unreadCount?: number
  isLive?: boolean
  compact?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  onToggleLive?: () => void
  onBackToHub?: () => void
  onOpenMobileMenu?: () => void
  notifications?: NotificationItem[]
  isNotificationsOpen?: boolean
  onToggleNotifications?: () => void
  onMarkAllRead?: () => void
  onMarkRead?: (id: string) => void
  notificationsRef?: React.RefObject<HTMLDivElement | null>
}

const defaultNavigationLinks: HeaderNavigationLink[] = [
  { href: "#", label: "Home", submenu: false },
  {
    label: "Features",
    submenu: true,
    type: "description",
    items: [
      {
        href: "#",
        label: "Components",
        description: "Browse all components in the library.",
      },
      {
        href: "#",
        label: "Documentation",
        description: "Learn how to use the library.",
      },
      {
        href: "#",
        label: "Templates",
        description: "Pre-built layouts for common use cases.",
      },
    ],
  },
]

const getNavigationLinkType = (link: HeaderNavigationLink) =>
  "type" in link ? link.type : null

const runLinkAction = (
  event: React.MouseEvent<HTMLElement>,
  onSelect?: () => void
) => {
  if (!onSelect) return
  event.preventDefault()
  onSelect()
}

export default function NavigationMenuFour({
  navigationLinks = defaultNavigationLinks,
  eventTitle = "Active Event",
  currentView = "overview",
  unreadCount = 0,
  isLive = true,
  compact = false,
  searchValue = "",
  onSearchChange,
  onToggleLive,
  onBackToHub,
  onOpenMobileMenu,
  notifications = [],
  isNotificationsOpen = false,
  onToggleNotifications,
  onMarkAllRead,
  onMarkRead,
  notificationsRef,
}: NavigationMenuFourProps) {
  return (
    <header className="border-b bg-white px-4 md:px-6">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onOpenMobileMenu ? (
            <Button
              className="size-8 md:hidden"
              variant="ghost"
              size="icon"
              onClick={onOpenMobileMenu}
              aria-label="Open dashboard menu"
            >
              <MenuIcon className="size-4" />
            </Button>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button className="group size-8 md:hidden" variant="ghost" size="icon">
                  <svg
                    className="pointer-events-none"
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 12L20 12"
                      className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
                    />
                    <path
                      d="M4 12H20"
                      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                    />
                    <path
                      d="M4 12H20"
                      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
                    />
                  </svg>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-1 md:hidden">
                <NavigationMenu className="max-w-none *:w-full">
                  <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                    {navigationLinks.map((link, index) => (
                      <NavigationMenuItem key={index} className="w-full">
                        {!isTopLevelLink(link) ? (
                          <>
                            <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                              {link.label}
                            </div>
                            <ul>
                              {link.items.map((item, itemIndex) => (
                                <li key={itemIndex}>
                                  <NavigationMenuLink asChild>
                                    <a
                                      href={item.href || "#"}
                                      className="py-1.5"
                                      onClick={(event) => runLinkAction(event, item.onSelect)}
                                    >
                                      {item.label}
                                    </a>
                                  </NavigationMenuLink>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <NavigationMenuLink asChild>
                            <a
                              href={link.href || "#"}
                              className="py-1.5"
                              onClick={(event) => runLinkAction(event, link.onSelect)}
                            >
                              {link.label}
                            </a>
                          </NavigationMenuLink>
                        )}
                        {index < navigationLinks.length - 1 &&
                          ((!link.submenu && navigationLinks[index + 1].submenu) ||
                            (link.submenu && !navigationLinks[index + 1].submenu) ||
                            (link.submenu &&
                              navigationLinks[index + 1].submenu &&
                              getNavigationLinkType(link) !==
                                getNavigationLinkType(navigationLinks[index + 1]))) && (
                            <div
                              role="separator"
                              aria-orientation="horizontal"
                              className="bg-border -mx-1 my-1 h-px w-full"
                            />
                          )}
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              </PopoverContent>
            </Popover>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="hidden size-8 md:inline-flex 2xl:hidden"
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
              >
                <MenuIcon className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-1">
              <NavigationMenu className="max-w-none *:w-full">
                <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                  {navigationLinks.map((link, index) => (
                    <NavigationMenuItem key={`compact-${index}`} className="w-full">
                      {!isTopLevelLink(link) ? (
                        <>
                          <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                            {link.label}
                          </div>
                          <ul>
                            {link.items.map((item, itemIndex) => (
                              <li key={itemIndex}>
                                <NavigationMenuLink asChild>
                                  <a
                                    href={item.href || "#"}
                                    className="py-1.5"
                                    onClick={(event) => runLinkAction(event, item.onSelect)}
                                  >
                                    {item.label}
                                  </a>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <NavigationMenuLink asChild>
                          <a
                            href={link.href || "#"}
                            className="py-1.5"
                            onClick={(event) => runLinkAction(event, link.onSelect)}
                          >
                            {link.label}
                          </a>
                        </NavigationMenuLink>
                      )}
                      {index < navigationLinks.length - 1 &&
                        ((!link.submenu && navigationLinks[index + 1].submenu) ||
                          (link.submenu && !navigationLinks[index + 1].submenu) ||
                          (link.submenu &&
                            navigationLinks[index + 1].submenu &&
                            getNavigationLinkType(link) !==
                              getNavigationLinkType(navigationLinks[index + 1]))) && (
                          <div
                            role="separator"
                            aria-orientation="horizontal"
                            className="bg-border -mx-1 my-1 h-px w-full"
                          />
                        )}
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </PopoverContent>
          </Popover>

          <div className="flex min-w-0 items-center gap-4 lg:gap-6">
            {!compact && (
              <button
                type="button"
                onClick={onBackToHub}
                className="text-muted-foreground hidden text-sm hover:text-foreground lg:inline-flex"
              >
                Back to Hub
              </button>
            )}
            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <span className="text-sm font-semibold text-foreground">{eventTitle}</span>
              <span className="text-xs capitalize text-muted-foreground">{currentView}</span>
            </div>
            <div className="hidden 2xl:block">
              <NavigationMenu>
                <NavigationMenuList>
                  {navigationLinks.map((link, index) => (
                    <NavigationMenuItem key={index}>
                      {!isTopLevelLink(link) ? (
                        <>
                          <NavigationMenuTrigger className="text-muted-foreground hover:text-primary bg-transparent px-2 py-1.5 font-medium">
                            {link.label}
                          </NavigationMenuTrigger>
                          <NavigationMenuContent>
                            <ul
                              className={cn(
                                "grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]",
                                link.type === "description" && "md:grid-cols-1"
                              )}
                            >
                              {link.items.map((item, itemIndex) => (
                                <li key={itemIndex}>
                                  <NavigationMenuLink asChild>
                                    <a
                                      href={item.href || "#"}
                                      onClick={(event) => runLinkAction(event, item.onSelect)}
                                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                    >
                                      {link.type === "icon" && "icon" in item && (
                                        <div className="flex items-center gap-2">
                                          {item.icon === "BookOpenIcon" && (
                                            <BookOpenIcon
                                              size={16}
                                              className="text-foreground opacity-60"
                                              aria-hidden="true"
                                            />
                                          )}
                                          {item.icon === "LifeBuoyIcon" && (
                                            <LifeBuoyIcon
                                              size={16}
                                              className="text-foreground opacity-60"
                                              aria-hidden="true"
                                            />
                                          )}
                                          {item.icon === "InfoIcon" && (
                                            <InfoIcon
                                              size={16}
                                              className="text-foreground opacity-60"
                                              aria-hidden="true"
                                            />
                                          )}
                                          <div className="text-sm font-medium leading-none">
                                            {item.label}
                                          </div>
                                        </div>
                                      )}

                                      {link.type === "description" && "description" in item && (
                                        <>
                                          <div className="text-sm font-medium leading-none">
                                            {item.label}
                                          </div>
                                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                            {item.description}
                                          </p>
                                        </>
                                      )}

                                      {link.type === "simple" && (
                                        <div className="text-sm font-medium leading-none">
                                          {item.label}
                                        </div>
                                      )}
                                    </a>
                                  </NavigationMenuLink>
                                </li>
                              ))}
                            </ul>
                          </NavigationMenuContent>
                        </>
                      ) : (
                        <NavigationMenuLink asChild>
                          <a
                            href={link.href || "#"}
                            onClick={(event) => runLinkAction(event, link.onSelect)}
                            className="text-muted-foreground hover:text-primary px-2 py-1.5 font-medium"
                          >
                            {link.label}
                          </a>
                        </NavigationMenuLink>
                      )}
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
                <NavigationMenuViewport />
              </NavigationMenu>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Toggle
            pressed={!isLive}
            onPressedChange={onToggleLive}
            className="hidden rounded-full border px-4 sm:flex"
            aria-label="Toggle environment"
          >
            {isLive ? "LIVE" : "SANDBOX"}
          </Toggle>
          <div className="relative hidden xl:block">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search everything..."
              className="w-56 pl-9"
            />
          </div>
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notifications"
              onClick={onToggleNotifications}
            >
              <BellIcon className="size-4" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>

            {isNotificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkAllRead}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">No notifications yet</div>
                  ) : notifications.map(n => (
                    <div
                      key={n.id}
                      className={cn(
                        "p-4 hover:bg-slate-50 transition-colors cursor-pointer",
                        !n.isRead && "bg-indigo-50/30"
                      )}
                      onClick={() => !n.isRead && onMarkRead?.(n.id)}
                    >
                      <div className="flex items-start gap-3">
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
