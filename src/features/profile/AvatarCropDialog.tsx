import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cropToAvatar } from "./cropImage";

interface Props {
  src: string | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => Promise<void>;
}

export function AvatarCropDialog({ src, onCancel, onCropped }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!src || !area) return;
    setBusy(true);
    try { await onCropped(await cropToAvatar(src, area)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!src} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Position your photo</DialogTitle></DialogHeader>
        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-surface-2">
          {src && (
            <Cropper image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          Zoom
          <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={([z]) => setZoom(z)} aria-label="Zoom" />
        </div>
        <p className="text-xs text-muted-foreground">Drag to choose which part of the photo to show.</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy || !area}>{busy ? "Saving…" : "Save photo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
