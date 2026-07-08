import type { Meta, StoryObj } from "@storybook/react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Button } from "./button";

type LogTimeValues = {
  hours: string;
  note: string;
};

const meta = {
  title: "UI/Form",
  component: Form,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const form = useForm<LogTimeValues>({
      defaultValues: { hours: "", note: "" },
    });

    const onSubmit = (values: LogTimeValues) => {
      // eslint-disable-next-line no-console
      console.log("Logged time for OST-142", values);
    };

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-w-sm space-y-6"
        >
          <FormField
            control={form.control}
            name="hours"
            rules={{ required: "Hours logged is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hours logged</FormLabel>
                <FormControl>
                  <Input type="number" step="0.25" placeholder="2.5" {...field} />
                </FormControl>
                <FormDescription>
                  Time spent on OST-142 — Client Portal.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea placeholder="What did you work on?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Log time</Button>
        </form>
      </Form>
    );
  },
};
