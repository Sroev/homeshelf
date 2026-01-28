import { useState } from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useLibrary, useRegenerateShareToken } from "@/hooks/useLibrary";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);

  const shareUrl = library
    ? `${window.location.origin}/s/${library.share_token}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: t.share.linkCopied,
        description: t.share.linkCopiedDesc,
      });
    } catch {
      toast({
        title: t.share.failedToCopy,
        description: t.share.copyManually,
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = async () => {
    if (!library) return;

    try {
      await regenerateToken.mutateAsync(library.id);
      toast({
        title: t.share.newLinkGenerated,
        description: t.share.oldLinkInvalid,
      });
      setShowConfirm(false);
    } catch {
      toast({
        title: t.share.failedToRegenerate,
        description: t.share.tryAgain,
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
          <h1 className="text-3xl font-bold text-foreground">{t.share.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {t.share.description}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.share.yourShareLink}</CardTitle>
            <CardDescription>
              {t.share.linkDescription}
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
                {t.share.copyLink}
              </Button>
              <Button variant="outline" onClick={handlePreview}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {t.share.preview}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirm(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t.share.regenerateLink}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.share.howItWorks}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">1. {t.share.step1Title}</strong> {t.share.step1Desc}
            </p>
            <p>
              <strong className="text-foreground">2. {t.share.step2Title}</strong> {t.share.step2Desc}
            </p>
            <p>
              <strong className="text-foreground">3. {t.share.step3Title}</strong> {t.share.step3Desc}
            </p>
            <p>
              <strong className="text-foreground">4. {t.share.step4Title}</strong> {t.share.step4Desc}
            </p>
          </CardContent>
        </Card>

        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-foreground">
              {t.share.privacyNote}
            </p>
            <p className="mt-1 text-muted-foreground">
              {t.share.privacyDesc}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.share.regenerateTitle}</DialogTitle>
            <DialogDescription>
              {t.share.regenerateDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleRegenerate} disabled={regenerateToken.isPending}>
              {regenerateToken.isPending ? t.share.generating : t.share.regenerate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
