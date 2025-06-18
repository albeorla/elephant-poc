"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { 
  Inbox, 
  CheckSquare, 
  FolderOpen, 
  Lightbulb, 
  Clock, 
  Archive,
  Calendar,
  Home,
  Settings
} from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/next-actions", label: "Next Actions", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/someday", label: "Someday/Maybe", icon: Lightbulb },
  { href: "/waiting", label: "Waiting For", icon: Clock },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/review", label: "Weekly Review", icon: Calendar },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CheckSquare className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold tracking-tight">TaskFlow GTD</span>
            </Link>
            
            <div className="hidden md:flex md:gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "relative",
                      isActive && "bg-secondary/80"
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-2 px-3">
                      <Icon className={cn(
                        "h-4 w-4 transition-colors",
                        isActive && "text-primary"
                      )} />
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.href === "/inbox" && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                          <span className="sr-only">Inbox count</span>
                          3
                        </Badge>
                      )}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9">
              <Link href="/settings">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}