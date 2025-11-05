import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { BookOpen, Edit, Save, X } from "lucide-react";

export function meta() {
  return [
    { title: "Game Rules - Quickbuck" },
    { name: "description", content: "Quickbuck game rules and guidelines" },
  ];
}

export default function Rules() {
  const rules = useQuery(api.rules.getRules);
  const isAdmin = useQuery(api.rules.checkIsAdmin);
  const updateRules = useMutation(api.rules.updateRules);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleEdit = () => {
    if (rules?.content) {
      setEditedContent(rules.content);
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent("");
    setMessage(null);
  };

  const handleSave = async () => {
    if (!editedContent.trim()) {
      setMessage({ type: "error", text: "Rules content cannot be empty" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await updateRules({ content: editedContent });
      setMessage({ type: "success", text: "Rules updated successfully!" });
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to update rules" });
    } finally {
      setIsSaving(false);
    }
  };

  if (rules === undefined || isAdmin === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              <CardTitle className="text-2xl">Game Rules</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => window.location.href = '/dashboard'} variant="outline" size="sm">
                Back to Dashboard
              </Button>
              {isAdmin && (
                <Button onClick={handleEdit} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Rules
                </Button>
              )}
            </div>
          </div>
          {rules.lastUpdatedAt && !rules.isDefault && (
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {new Date(rules.lastUpdatedAt).toLocaleString()}
              {rules.lastUpdatedBy && ` by ${rules.lastUpdatedBy}`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-[600px] w-full rounded-md border p-6 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {rules.content}
            </pre>
          </div>

          {message && (
            <div
              className={`mt-4 p-3 rounded-md ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Game Rules</DialogTitle>
            <DialogDescription>
              Update the game rules. All changes will be visible to all players immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Enter game rules..."
            />
            {message && (
              <div
                className={`mt-4 p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Rules"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
