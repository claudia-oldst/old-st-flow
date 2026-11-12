import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/store/currentUser";
import { uploadAvatar } from "./uploadAvatar";

/** File picker → crop dialog → compressed upload for the signed-in user. */
export function useAvatarPicker(onDone?: () => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const { user, setUser } = useCurrentUser();

  const pick = () => inputRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image file");
    setSrc(URL.createObjectURL(f));
  };
  const cancel = () => { if (src) URL.revokeObjectURL(src); setSrc(null); };
  const onCropped = async (blob: Blob) => {
    if (!user) return;
    try {
      setUser(await uploadAvatar(user.id, blob));
      toast.success("Profile photo updated");
      cancel();
      onDone?.();
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    }
  };
  return { inputRef, src, pick, onFile, cancel, onCropped };
}
