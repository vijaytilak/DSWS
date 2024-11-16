"use client"

import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebase"
import { NavMain } from "@/components/layout/nav-main"
import { SidebarOptInForm } from "./sidebar-opt-in-form"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const { open, setOpen } = useSidebar()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <h1 className="text-xl font-semibold">DataSphere</h1>
      </SidebarHeader>
      <SidebarMenu className="p-4">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            <NavMain />
            <Accordion type="single" collapsible>
              <AccordionItem value="opt-in">
                <AccordionTrigger>Opt-in Settings</AccordionTrigger>
                <AccordionContent>
                  <SidebarOptInForm />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
      </SidebarMenu>
      <SidebarFooter className="border-t border-border p-4">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
