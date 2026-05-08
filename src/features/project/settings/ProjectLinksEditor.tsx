import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectLink } from "./types";

interface Props {
  links: ProjectLink[];
  canEdit: boolean;
  onChange: (links: ProjectLink[]) => void;
}

export function ProjectLinksEditor({ links, canEdit, onChange }: Props) {
  const addLink = () => onChange([...links, { name: "", url: "" }]);
  const removeLink = (idx: number) => onChange(links.filter((_, i) => i !== idx));
  const updateLink = (idx: number, key: keyof ProjectLink, value: string) =>
    onChange(links.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Project links</Label>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={addLink}
            className="h-7 gap-1"
            aria-label="Add link"
          >
            <Plus className="h-3.5 w-3.5" /> Add link
          </Button>
        )}
      </div>
      {links.length === 0 ? (
        <div className="text-xs text-dim italic px-2 py-3">No links yet.</div>
      ) : (
        <div className="space-y-2">
          {links.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                placeholder="Name (e.g. Figma)"
                value={link.name}
                onChange={(e) => updateLink(idx, "name", e.target.value)}
                disabled={!canEdit}
                className="w-1/3"
                aria-label={`Link ${idx + 1} name`}
              />
              <Input
                placeholder="https://..."
                value={link.url}
                onChange={(e) => updateLink(idx, "url", e.target.value)}
                disabled={!canEdit}
                className="flex-1"
                aria-label={`Link ${idx + 1} url`}
              />
              {!canEdit && link.url && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dim hover:text-foreground"
                  aria-label={`Open ${link.name || link.url}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-dimmer hover:text-destructive"
                  onClick={() => removeLink(idx)}
                  aria-label={`Remove link ${idx + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
