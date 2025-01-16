import { Activity, Repeat, Heart } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type FlowOption = 'churn' | 'switching' | 'affinity';

interface NavOptionsProps {
  onFlowOptionChange: (option: FlowOption) => void;
  flowOption: FlowOption;
}

const optionItems = [
  {
    title: "Churn",
    value: "churn" as FlowOption,
    icon: Activity,
  },
  {
    title: "Switching",
    value: "switching" as FlowOption,
    icon: Repeat,
  },
  {
    title: "Affinity",
    value: "affinity" as FlowOption,
    icon: Heart,
  },
]

export function NavOptions({ onFlowOptionChange, flowOption }: NavOptionsProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Options</SidebarGroupLabel>
      <SidebarMenu>
        {optionItems.map((item) => (
          <SidebarMenuItem key={item.value}>
            <SidebarMenuButton
              isActive={flowOption === item.value}
              onClick={() => onFlowOptionChange(item.value)}
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
