"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function NavMain() {
  return (
    <nav className="space-y-2">
      <Button asChild variant="ghost" className="w-full justify-start">
        <Link href="/dashboard">Dashboard</Link>
      </Button>
      <Button asChild variant="ghost" className="w-full justify-start">
        <Link href="/settings">Settings</Link>
      </Button>
    </nav>
  )
}