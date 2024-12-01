import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/layout/header/theme-toggle"
import Datasphere from "@/components/Datasphere/Datasphere"

export default async function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex-1 rounded-xl bg-muted/50 p-4">
        <Datasphere />
      </div>
    </div>
  )
}
