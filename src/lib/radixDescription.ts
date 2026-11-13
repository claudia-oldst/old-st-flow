import * as React from "react";

type DescriptionType = React.ElementType;

/**
 * True when a Description element is rendered anywhere inside `children`.
 * Radix's own Description element is what the screen-reader link points at, so
 * the wrapper component around it counts too.
 */
export function hasDescriptionElement(
  children: React.ReactNode,
  descriptionTypes: readonly DescriptionType[],
): boolean {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) return false;
    if (descriptionTypes.includes(child.type as DescriptionType)) return true;
    const nested = (child.props as { children?: React.ReactNode } | undefined)?.children;
    return nested !== undefined && hasDescriptionElement(nested, descriptionTypes);
  });
}

/**
 * Radix always points a dialog at its generated description id, and then logs
 * "Missing `Description` or `aria-describedby={undefined}`" when nothing is
 * rendered there. When the consumer genuinely has no description we pass an
 * explicit `undefined` so Radix treats the omission as intentional; when a
 * description is rendered (or the consumer links their own element) the
 * auto-generated link is left untouched so it keeps working.
 */
export function withoutOrphanDescription<T extends { "aria-describedby"?: string }>(
  props: T,
  children: React.ReactNode,
  descriptionTypes: readonly DescriptionType[],
): T {
  if (props["aria-describedby"] !== undefined) return props;
  if (hasDescriptionElement(children, descriptionTypes)) return props;
  return { ...props, "aria-describedby": undefined } as T;
}
