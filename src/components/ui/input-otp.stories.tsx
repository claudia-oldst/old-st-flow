import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./input-otp";

const meta = {
  title: "UI/InputOTP",
  component: InputOTP,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div className="space-y-3 text-center">
        <InputOTP maxLength={6} value={value} onChange={setValue}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        <p className="text-sm text-muted-foreground">
          Enter the code sent to Dennis Mariano.
        </p>
      </div>
    );
  },
};
