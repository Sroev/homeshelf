import { useState } from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useLibrary, useRegenerateShareToken } from "@/hooks/useLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";

export default function Share() {
  const { data: library, isLoading } = useLibrary();
  const regenerateToken = useRegenerateShareToken();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  const shareUrl = library
    ? `${window.location.origin}/s/${library.share_token}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Share this link with friends so they can browse your books.",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = async () => {
    if (!library) return;

    try {
      await regenerateToken.mutateAsync(library.id);
      toast({
        title: "New link generated",
        description: "The old link will no longer work.",
      });
      setShowConfirm(false);
    } catch {
      toast({
        title: "Failed to regenerate link",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePreview = () => {
    window.open(shareUrl, "_blank");
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Share Your Library</h1>
          <p className="mt-1 text-muted-foreground">
            Share an unlisted link with friends so they can browse and request books
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Share Link</CardTitle>
            <CardDescription>
              Anyone with this link can view your shareable books and request to borrow them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button variant="outline" onClick={handlePreview}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirm(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Link
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">1. Share your link:</strong> Send your unique link to friends via email, text, or any messaging app.
            </p>
            <p>
              <strong className="text-foreground">2. Friends browse:</strong> They can see all your shareable books (excluding any marked as private or unavailable).
            </p>
            <p>
              <strong className="text-foreground">3. Request a book:</strong> Friends can request any book by providing their name, email, and an optional message.
            </p>
            <p>
              <strong className="text-foreground">4. You decide:</strong> You'll receive an email notification and can approve or decline requests from the Requests page.
            </p>
          </CardContent>
        </Card>

        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-foreground">
              🔒 Privacy Note
            </p>
            <p className="mt-1 text-muted-foreground">
              Your email address is never shown on the shared page. Friends can only see your display name and city (if set).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Regenerate Share Link?</DialogTitle>
            <DialogDescription>
              The current link will immediately stop working. Anyone with the old link will no longer be able to view your library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegenerate} disabled={regenerateToken.isPending}>
              {regenerateToken.isPending ? "Generating..." : "Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
