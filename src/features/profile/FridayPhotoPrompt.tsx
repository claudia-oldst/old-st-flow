import { useState } from "react";
import { Camera } from "lucide-react";
import { useCurrentUser } from "@/store/currentUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { useAvatarPicker } from "./useAvatarPicker";
import { FRIDAY_KEY, localDateKey, shouldPromptForAvatar } from "./fridayPrompt";

export function FridayPhotoPrompt() {
  const user = useCurrentUser((s) => s.user);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(FRIDAY_KEY));
  const picker = useAvatarPicker();
  // Wait for the GitHub prompt first so two dialogs never stack.
  const open = !!user && !!user.github_username && shouldPromptForAvatar(!!user.avatar_url, new Date(), dismissed);

  const dismiss = () => {
    const k = localDateKey(new Date());
    localStorage.setItem(FRIDAY_KEY, k);
    setDismissed(k);
  };

  return (
    <>
      <Dialog open={open && !picker.src} onOpenChange={(o) => !o && dismiss()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Happy Friday!</DialogTitle>
            <DialogDescription>Personalise your profile with some flare and add a profile picture to your profile!</DialogDescription>
          </DialogHeader>
          <input ref={picker.inputRef} type="file" accept="image/*" hidden onChange={picker.onFile} />
          <DialogFooter>
            <Button variant="ghost" onClick={dismiss}>Remind me next Friday</Button>
            <Button onClick={picker.pick} className="gap-2"><Camera className="h-4 w-4" />Add a photo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AvatarCropDialog src={picker.src} onCancel={picker.cancel} onCropped={picker.onCropped} />
    </>
  );
}
