import type { Meta, StoryObj } from "@storybook/react";
import { FolderKanban, ListTodo, Shield } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar";

const meta = {
  title: "UI/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

const navItems = [
  { title: "Projects", icon: FolderKanban, isActive: true },
  { title: "My Work", icon: ListTodo, isActive: false },
  { title: "Admin", icon: Shield, isActive: false },
];

export const Default: Story = {
  render: () => (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader>
          <span className="px-2 text-sm font-semibold">The Old St Tracker</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton isActive={item.isActive} tooltip={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium">Client Portal</span>
        </header>
        <main className="p-4 text-sm text-muted-foreground">OST-142 · In progress</main>
      </SidebarInset>
    </SidebarProvider>
  ),
};
