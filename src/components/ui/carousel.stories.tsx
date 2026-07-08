import type { Meta, StoryObj } from "@storybook/react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./carousel";
import { Card, CardContent } from "./card";

const meta = {
  title: "UI/Carousel",
  component: Carousel,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Carousel>;
export default meta;
type Story = StoryObj<typeof meta>;

const metrics = [
  { label: "Logged hours", value: "38h", project: "Client Portal" },
  { label: "Open tickets", value: "12", project: "Time Logging" },
  { label: "In progress", value: "5", project: "Client Portal" },
  { label: "For integration", value: "3", project: "Time Logging" },
  { label: "Done this week", value: "9", project: "Client Portal" },
];

export const Default: Story = {
  render: () => (
    <Carousel className="w-[280px]">
      <CarouselContent>
        {metrics.map((m) => (
          <CarouselItem key={m.label}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-1 p-6">
                <span className="text-3xl font-semibold">{m.value}</span>
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-xs text-muted-foreground">{m.project}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};
