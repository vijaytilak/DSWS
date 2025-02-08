"use client"

import * as React from "react"
import { VariantProps, cva } from "class-variance-authority"
import { PanelRight } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"

const RIGHT_SIDEBAR_COOKIE_NAME = "right-sidebar:state"
const RIGHT_SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const RIGHT_SIDEBAR_WIDTH = "20rem"
const RIGHT_SIDEBAR_WIDTH_MOBILE = "20rem"
const RIGHT_SIDEBAR_WIDTH_ICON = "3rem"
const RIGHT_SIDEBAR_KEYBOARD_SHORTCUT = "n"

type RightSidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const RightSidebarContext = React.createContext<RightSidebarContext | null>(null)

export function useRightSidebar() {
  const context = React.useContext(RightSidebarContext)
  if (!context) {
    throw new Error("useRightSidebar must be used within a RightSidebarProvider")
  }
  return context
}

export const RightSidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)
    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }
        document.cookie = `${RIGHT_SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${RIGHT_SIDEBAR_COOKIE_MAX_AGE}`
      },
      [setOpenProp, open]
    )

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isMobile, setOpen, setOpenMobile])

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === RIGHT_SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    const value = React.useMemo(
      () => ({
        state: open ? ("expanded" as const) : ("collapsed" as const),
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }),
      [open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar]
    )

    return (
      <RightSidebarContext.Provider value={value}>
        <div
          ref={ref}
          className={cn("relative flex h-full w-full", className)}
          style={style}
          {...props}
        >
          {children}
        </div>
      </RightSidebarContext.Provider>
    )
  }
)
RightSidebarProvider.displayName = "RightSidebarProvider"

// Used in type definition and styles
export const sidebarVariants = cva("", {
  variants: {
    variant: {
      sidebar: "",
      floating: "rounded-lg border bg-background shadow-lg",
      inset: "rounded-lg border bg-background shadow-lg",
    },
  },
})

export const RightSidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof sidebarVariants> & {
      collapsible?: "icon" | "offcanvas" | "none"
    }
>(({ className, collapsible = "none", ...props }, ref) => {
  const { open, openMobile, setOpenMobile, isMobile } = useRightSidebar()

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="right"
          className={cn(
            "w-[var(--sidebar-width-mobile)]",
            "flex flex-col gap-0 p-0",
            className
          )}
        >
          <div {...props} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      ref={ref}
      data-state={open ? "expanded" : "collapsed"}
      className={cn(
        "group/sidebar relative hidden h-full shrink-0 transition-[width] duration-300 ease-in-out lg:flex",
        collapsible === "icon" && [
          open
            ? "w-[var(--sidebar-width)]"
            : "w-[var(--sidebar-width-icon)] hover:w-[var(--sidebar-width)]",
        ],
        collapsible === "offcanvas" && [
          open ? "w-[var(--sidebar-width)]" : "w-0",
        ],
        collapsible === "none" && "w-[var(--sidebar-width)]",
        className
      )}
      style={{
        "--sidebar-width": RIGHT_SIDEBAR_WIDTH,
        "--sidebar-width-mobile": RIGHT_SIDEBAR_WIDTH_MOBILE,
        "--sidebar-width-icon": RIGHT_SIDEBAR_WIDTH_ICON,
      } as React.CSSProperties}
      {...props}
    />
  )
})
RightSidebar.displayName = "RightSidebarComponent"

export const RightSidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-1 flex-col overflow-auto", className)}
      {...props}
    />
  )
})
RightSidebarContent.displayName = "RightSidebarContent"

export const RightSidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex h-[60px] items-center px-6", className)}
      {...props}
    />
  )
})
RightSidebarHeader.displayName = "RightSidebarHeader"

export const RightSidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "mt-auto flex items-center gap-4 whitespace-nowrap p-4",
        className
      )}
      {...props}
    />
  )
})
RightSidebarFooter.displayName = "RightSidebarFooter"

export const RightSidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useRightSidebar()

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("hover:bg-muted", className)}
      onClick={(e) => {
        onClick?.(e)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelRight className="h-4 w-4" />
      <span className="sr-only">Toggle right sidebar</span>
    </Button>
  )
})

RightSidebarTrigger.displayName = "RightSidebarTrigger"
