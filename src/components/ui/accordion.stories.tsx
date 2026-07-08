import type { Meta, StoryObj } from "@storybook/react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

const meta = {
  title: "UI/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible defaultValue="logging" className="w-full max-w-xl">
      <AccordionItem value="logging">
        <AccordionTrigger>How do I log time against a ticket?</AccordionTrigger>
        <AccordionContent>
          Open the ticket (e.g. OST-142 on the Client Portal project) and use the timer in the
          header, or add a manual entry from the Time Logging tab.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="status">
        <AccordionTrigger>What do the workflow statuses mean?</AccordionTrigger>
        <AccordionContent>
          Tickets move through To-do, In progress, For integration, then Done. Only a reviewer can
          move a ticket from For integration to Done.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="roles">
        <AccordionTrigger>Which roles can be assigned to a ticket?</AccordionTrigger>
        <AccordionContent>
          Tickets can be assigned across Frontend, Backend, Fullstack, QA, PMBA, and Design roles.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
