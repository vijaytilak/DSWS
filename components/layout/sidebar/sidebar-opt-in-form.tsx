"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function SidebarOptInForm() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="emails" />
        <Label htmlFor="emails">Receive email notifications</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="updates" />
        <Label htmlFor="updates">Receive product updates</Label>
      </div>
      <Button className="w-full">Save preferences</Button>
    </div>
  )
}
