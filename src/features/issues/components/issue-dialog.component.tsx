import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/bridge";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Issue, IssueStatus, Subissue } from "../issues.types";

type Props = {
  issue: Issue | null;
  onClose: () => void;
};

type FormProps = {
  issue: Issue;
  onClose: () => void;
};

const IssueForm = ({ issue, onClose }: FormProps) => {
  const [title, setTitle] = useState(issue.title);
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [limitDate, setLimitDate] = useState(issue.limit_date ?? "");
  const [description, setDescription] = useState(issue.description);
  const [subissues, setSubissues] = useState<Subissue[]>(issue.subissues);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateIssue(issue.path, issue.position, {
        title: title.trim(),
        status,
        limit_date: limitDate || null,
        description,
        subissues: subissues.filter((subissue) => subissue.title.trim()).map((subissue) => ({
          ...subissue,
          title: subissue.title.trim(),
        })),
      });
      window.dispatchEvent(new CustomEvent("micro-note:file-saved", { detail: { path: issue.path } }));
      onClose();
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const deleteIssue = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteIssue(issue.path, issue.position);
      window.dispatchEvent(new CustomEvent("micro-note:file-saved", { detail: { path: issue.path } }));
      onClose();
    } catch (deleteError) {
      setError(String(deleteError));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Issue</DialogTitle>
        <DialogDescription className="truncate">{issue.path}</DialogDescription>
      </DialogHeader>
      <div className="grid min-h-0 gap-4 overflow-y-auto pr-1">
        {(issue.validation_errors.length > 0 || error) && (
          <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <ul>
              {issue.validation_errors.map((validation, index) => <li key={`${validation.field}-${index}`}>{validation.message}</li>)}
              {error && <li>{error}</li>}
            </ul>
          </div>
        )}
        <label className="grid gap-1.5 text-xs font-medium">
          Title
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-xs font-medium">
            Status
            <Select value={status} onValueChange={(value) => setStatus(value as IssueStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium">
            Limit date
            <DatePicker value={limitDate || null} onValueChange={(value) => setLimitDate(value ?? "")} />
          </label>
        </div>
        <label className="grid gap-1.5 text-xs font-medium">
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={6} className="resize-y rounded-md border bg-background px-3 py-2 font-mono text-sm leading-6 outline-none focus:ring-2 focus:ring-ring/40" />
        </label>
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>Subissues</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSubissues((items) => [...items, { title: "", completed: false }])}>
              <Plus className="size-3.5" /> Add
            </Button>
          </div>
          {subissues.map((subissue, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={subissue.completed}
                aria-label={`Complete subissue ${index + 1}`}
                onChange={(event) => setSubissues((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, completed: event.target.checked } : item))}
              />
              <Input
                value={subissue.title}
                aria-label={`Subissue ${index + 1}`}
                onChange={(event) => setSubissues((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))}
              />
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete subissue ${index + 1}`} onClick={() => setSubissues((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="destructive"
          className="sm:mr-auto"
          disabled={saving || deleting}
          onClick={() => {
            if (confirmDelete) void deleteIssue();
            else setConfirmDelete(true);
          }}
        >
          {deleting ? "Deleting…" : confirmDelete ? "Click again to delete" : "Delete issue"}
        </Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!title.trim() || saving || deleting} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </>
  );
};

export const IssueDialog = ({ issue, onClose }: Props) => {
  return (
    <Dialog open={Boolean(issue)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[85svh] max-w-2xl flex-col">
        {issue ? (
          <IssueForm key={`${issue.path}:${issue.position}:${JSON.stringify(issue)}`} issue={issue} onClose={onClose} />
        ) : (
          <p className="text-sm text-muted-foreground" aria-busy="true">Loading issue…</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
