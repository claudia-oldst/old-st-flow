import type { Meta, StoryObj } from "@storybook/react";

import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
} from "./toast";

const meta = {
  title: "UI/Toast",
  component: Toast,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof Toast>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <Toast open>
        <div className="grid gap-1">
          <ToastTitle>Time logged</ToastTitle>
          <ToastDescription>6.5h added to OST-142 — Client Portal.</ToastDescription>
        </div>
        <ToastAction altText="Undo time log">Undo</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};

export const Variants: Story = {
  render: () => (
    <ToastProvider>
      <Toast open>
        <div className="grid gap-1">
          <ToastTitle>Time logged</ToastTitle>
          <ToastDescription>6.5h added to OST-142 — Client Portal.</ToastDescription>
        </div>
        <ToastClose />
      </Toast>
      <Toast open variant="destructive">
        <div className="grid gap-1">
          <ToastTitle>Failed to log time</ToastTitle>
          <ToastDescription>Could not save hours for OST-118.</ToastDescription>
        </div>
        <ToastAction altText="Retry saving time">Retry</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};
