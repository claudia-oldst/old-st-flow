import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="frontend">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="frontend" id="role-frontend" />
        <Label htmlFor="role-frontend">Frontend</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="backend" id="role-backend" />
        <Label htmlFor="role-backend">Backend</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="fullstack" id="role-fullstack" />
        <Label htmlFor="role-fullstack">Fullstack</Label>
      </div>
    </RadioGroup>
  ),
};
