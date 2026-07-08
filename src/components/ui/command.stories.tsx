import type { Meta, StoryObj } from "@storybook/react";
import {
  CheckCircle2,
  FolderOpen,
  Play,
  Plus,
  Square,
  UserPlus,
} from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

const meta = {
  title: "UI/Command",
  component: Command,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Command>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Command className="w-[420px] rounded-lg border shadow-md">
      <CommandInput placeholder="Search tickets, projects, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Projects">
          <CommandItem>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open OST-142
          </CommandItem>
          <CommandItem>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open Client Portal
          </CommandItem>
          <CommandItem>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open Time Logging
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem>
            <Play className="mr-2 h-4 w-4" />
            Start timer
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Square className="mr-2 h-4 w-4" />
            Stop timer
          </CommandItem>
          <CommandItem>
            <UserPlus className="mr-2 h-4 w-4" />
            Assign to Riley Chen
          </CommandItem>
          <CommandItem>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark as Done
          </CommandItem>
          <CommandItem>
            <Plus className="mr-2 h-4 w-4" />
            New ticket
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
