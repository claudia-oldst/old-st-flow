import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function MemberSearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dimmer" />
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        placeholder="Search people…"
        aria-label="Search people"
        className="pl-8 h-9"
      />
    </div>
  );
}
