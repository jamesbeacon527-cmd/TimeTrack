import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Bug } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirebase } from "@/components/FirebaseProvider";

export function BugReportDialog() {
  const [open, setOpen] = useState(false);
  const [bugDesc, setBugDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useFirebase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugDesc.trim()) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, "bugs"), {
        description: bugDesc,
        userId: user?.uid || "anonymous",
        userEmail: user?.email || "anonymous",
        createdAt: serverTimestamp(),
        resolved: false,
        userAgent: navigator.userAgent
      });
      toast({
        title: "Bug Reported",
        description: "Thank you! We'll look into it.",
      });
      setBugDesc("");
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Failed to submit",
        description: "Could not send the bug report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 lg:bottom-10 lg:right-[max(2.5rem,calc(50vw-768px+2.5rem))] h-12 w-12 rounded-full shadow-lg border-muted bg-background/80 backdrop-blur z-50 hover:bg-muted/50 transition-colors"
          aria-label="Report a bug"
        >
          <Bug className="h-5 w-5 text-red-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-obsidian border-border z-[100]">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <Textarea 
            placeholder="Please describe the issue, what section you were on, and what you expected to happen..."
            value={bugDesc}
            onChange={(e) => setBugDesc(e.target.value)}
            className="min-h-[120px] bg-background border-border"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!bugDesc.trim() || submitting}>
              {submitting ? "Sending..." : "Submit Bug"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
