import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function MemberAvatar({ name, color = "#6366f1", size = "sm", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white ring-1 ring-white/10",
        sizeMap[size],
        className
      )}
      style={{ background: color }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}

export function MemberAvatarStack({
  members,
  size = "sm",
  max = 3,
}: {
  members: { id: string; name: string; avatar_color: string }[];
  size?: "xs" | "sm" | "md" | "lg";
  max?: number;
}) {
  const visible = members.slice(0, max);
  const extra = members.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((m) => (
        <MemberAvatar key={m.id} name={m.name} color={m.avatar_color} size={size} />
      ))}
      {extra > 0 && (
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10",
            size === "xs" ? "h-5 w-5 text-[9px]" : size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
          )}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
