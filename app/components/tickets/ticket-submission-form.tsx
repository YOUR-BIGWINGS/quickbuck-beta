import { useMutation, useQuery } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useToast } from "~/hooks/use-toast";

export function TicketSubmissionForm() {
  const [category, setCategory] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const createTicket = useMutation(api.tickets.createTicket);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !subject || !description) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createTicket({
        category: category as any,
        subject,
        description,
      });

      toast({
        title: "Ticket submitted",
        description: "Your ticket has been submitted to moderators for review",
      });

      // Reset form
      setCategory("");
      setSubject("");
      setDescription("");
    } catch (error: any) {
      toast({
        title: "Failed to submit ticket",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report an Issue</CardTitle>
        <CardDescription>
          Submit a ticket to report bugs, player behavior, or other issues to our moderation team
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player_behavior">Player Behavior</SelectItem>
                <SelectItem value="bug_report">Bug Report</SelectItem>
                <SelectItem value="content_violation">Content Violation</SelectItem>
                <SelectItem value="exploit_abuse">Exploit/Abuse</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief summary of the issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about the issue. Include usernames, timestamps, and any relevant details."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              required
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/1000 characters
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Ticket
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
