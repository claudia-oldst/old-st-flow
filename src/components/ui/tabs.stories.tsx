import type { Meta, StoryObj } from "@storybook/react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[420px]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="tickets">Tickets</TabsTrigger>
        <TabsTrigger value="time-logs">Time logs</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        Client Portal project summary, progress and sprint health.
      </TabsContent>
      <TabsContent value="tickets">
        OST-142 and OST-118 are currently assigned to Dennis Mariano.
      </TabsContent>
      <TabsContent value="time-logs">
        18.5 hours logged this week across the Time Logging workstream.
      </TabsContent>
    </Tabs>
  ),
};
