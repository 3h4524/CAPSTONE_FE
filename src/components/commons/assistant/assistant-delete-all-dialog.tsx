"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AssistantDeleteAllDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export const AssistantDeleteAllDialog = ({ open, onOpenChange, onConfirm }: AssistantDeleteAllDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete all chats?</DialogTitle>
        <DialogDescription>
          Every chat in your history is deleted except the one that is open now. This cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm}>
          Delete all
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
