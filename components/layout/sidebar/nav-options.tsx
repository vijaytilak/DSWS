import { Activity, Repeat } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type FlowOption = 'churn' | 'switching';
type View = 'Markets' | 'Brands';

interface NavOptionsProps {
  onFlowOptionChange: (option: FlowOption) => void;
  flowOption: FlowOption;
  selectedView: View;
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
]

export function NavOptions({ onFlowOptionChange, flowOption, selectedView }: NavOptionsProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Metric</SidebarGroupLabel>
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
