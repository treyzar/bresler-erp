import { useState, useEffect } from "react"
import { NavLink, useLocation } from "react-router"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type NavItem = {
    to: string;
    label: string;
    subItems?: { to: string; label: string }[];
}

export function SidebarNavItem({ item }: { item: NavItem }) {
    const [expanded, setExpanded] = useState(false)
    const location = useLocation()

    useEffect(() => {
        if (item.subItems && location.pathname.startsWith(item.to)) {
            setExpanded(true)
        }
    }, [location.pathname, item.to, item.subItems])

    const hasSubItems = Boolean(item.subItems?.length)

    return (
        <div className="space-y-1">
            <NavLink
                end={true}
                to={item.to}
                onClick={() => {
                    if (hasSubItems) {
                        setExpanded(!expanded)
                    }
                }}
                className={({ isActive }) =>
                    cn(
                        "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "hover:bg-sidebar-accent/50",
                    )
                }
            >
                <span>{item.label}</span>
                {hasSubItems && (
                    <span
                        className="ml-auto"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setExpanded(!expanded)
                        }}
                    >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                )}
            </NavLink>
            {hasSubItems && expanded && (
                <div className="ml-4 space-y-1 border-l-2 pl-2 border-border/20">
                    {item.subItems!.map((sub) => (
                        <NavLink
                            key={sub.to}
                            to={sub.to}
                            className={({ isActive }) =>
                                cn(
                                    "block rounded-md px-3 py-2 text-sm transition-colors",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                        : "hover:bg-sidebar-accent/50 text-muted-foreground",
                                )
                            }
                        >
                            {sub.label}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    )
}
