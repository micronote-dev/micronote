package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const sampleBoard = `# Product Tasks

## Backlog

### Implement fuzzy search

**Limit date:** 2026-08-31

Add fuzzy search support.

#### Subissues

- [x] Add input
- [ ] Add matcher

### Add command palette

## In Progress

### Improve editor

Keep user **Markdown**.

## Done

### Release v0.1`

func TestParseMTFBoard(t *testing.T) {
	board := ParseMTFBoard(sampleBoard, "tasks.mtf.md")
	if board.Title != "Product Tasks" || len(board.Issues) != 4 {
		t.Fatalf("unexpected board: %#v", board)
	}
	first := board.Issues[0]
	if first.Position != 0 || first.Title != "Implement fuzzy search" || first.Status != IssueStatusBacklog || first.LimitDate == nil || *first.LimitDate != "2026-08-31" || first.Description != "Add fuzzy search support." {
		t.Fatalf("unexpected first issue: %#v", first)
	}
	if len(first.Subissues) != 2 || !first.Subissues[0].Completed || first.Subissues[1].Completed {
		t.Fatalf("unexpected subissues: %#v", first.Subissues)
	}
	if board.Issues[2].Status != IssueStatusInProgress || board.Issues[3].Status != IssueStatusDone {
		t.Fatalf("status sections were not mapped: %#v", board.Issues)
	}
}

func TestParseMTFBoardToleratesPartialIssues(t *testing.T) {
	content := "# Tasks\n\n### Outside section\n\nBody\n\n## Backlog\n\n### Invalid date\n\n**Limit date:** tomorrow"
	board := ParseMTFBoard(content, "partial.mtf.md")
	if len(board.Issues) != 2 || board.Issues[0].Status != IssueStatusBacklog || board.Issues[0].Description != "Body" {
		t.Fatalf("unexpected partial board: %#v", board)
	}
	if len(board.Issues[0].ValidationErrors) == 0 || board.Issues[0].ValidationErrors[0].Field != "status" {
		t.Fatalf("missing status validation: %#v", board.Issues[0].ValidationErrors)
	}
	if len(board.Issues[1].ValidationErrors) == 0 || board.Issues[1].ValidationErrors[0].Field != "limit_date" || board.Issues[1].LimitDate != nil {
		t.Fatalf("missing date validation: %#v", board.Issues[1])
	}
}

func TestMinimalAndEmptyBoard(t *testing.T) {
	minimal := ParseMTFBoard("# Tasks\n\n## Backlog\n\n### One", "minimal.mtf.md")
	if len(minimal.Issues) != 1 || minimal.Issues[0].Title != "One" || minimal.Issues[0].LimitDate != nil || minimal.Issues[0].Description != "" || len(minimal.Issues[0].Subissues) != 0 {
		t.Fatalf("unexpected minimal issue: %#v", minimal.Issues)
	}
	empty := ParseMTFBoard("", "empty.mtf.md")
	if len(empty.Issues) != 0 || len(empty.ValidationErrors) != 0 {
		t.Fatalf("empty board should be accepted: %#v", empty)
	}
}

func TestSerializeMTFBoardRoundTrip(t *testing.T) {
	date := "2026-09-03"
	content := SerializeMTFBoard("Tasks", []Issue{
		{Title: "Backlog task", Status: IssueStatusBacklog},
		{Title: "Active task", Status: IssueStatusInProgress, LimitDate: &date, Description: "Description", Subissues: []Subissue{{Title: "Child", Completed: true}}},
	})
	board := ParseMTFBoard(content, "tasks.mtf.md")
	if len(board.Issues) != 2 || board.Issues[1].Status != IssueStatusInProgress || board.Issues[1].LimitDate == nil || len(board.Issues[1].Subissues) != 1 {
		t.Fatalf("board did not round trip: %#v\n%s", board, content)
	}
}

func TestMoveIssuePreservesBlock(t *testing.T) {
	updated, err := MoveMTFIssue(sampleBoard, 0, IssueStatusInProgress)
	if err != nil {
		t.Fatal(err)
	}
	board := ParseMTFBoard(updated, "tasks.mtf.md")
	var moved *Issue
	for index := range board.Issues {
		if board.Issues[index].Title == "Implement fuzzy search" {
			moved = &board.Issues[index]
		}
	}
	if moved == nil || moved.Status != IssueStatusInProgress || moved.Description != "Add fuzzy search support." || len(moved.Subissues) != 2 {
		t.Fatalf("issue was not moved intact: %#v\n%s", moved, updated)
	}
	if !strings.Contains(updated, "Keep user **Markdown**.") {
		t.Fatalf("unrelated Markdown was changed:\n%s", updated)
	}
}

func TestLimitDateAndSubissueUpdatesPreserveMarkdown(t *testing.T) {
	newDate := "2026-09-10"
	blocks := parseIssueBlocks(sampleBoard, "tasks.mtf.md")
	block, err := updateIssueLimitDate(sampleBoard[blocks[0].start:blocks[0].end], &newDate)
	if err != nil {
		t.Fatal(err)
	}
	withDate, err := replaceIssueBlock(sampleBoard, 0, block)
	if err != nil {
		t.Fatal(err)
	}
	toggled, err := ToggleMTFSubissue(withDate, 0, 1, true)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(toggled, "**Limit date:** 2026-09-10") || !strings.Contains(toggled, "- [x] Add matcher") || !strings.Contains(toggled, "Keep user **Markdown**.") {
		t.Fatalf("targeted update did not preserve Markdown:\n%s", toggled)
	}
}

func TestFileDetection(t *testing.T) {
	tests := map[string]bool{"note.md": false, "tasks.mtf.md": true, "foo.mtf.md": true, "UPPER.MTF.MD": true}
	for name, expected := range tests {
		if actual := IsMTFFile(name); actual != expected {
			t.Errorf("IsMTFFile(%q) = %v, want %v", name, actual, expected)
		}
	}
}

func TestCreateMultipleIssuesInOneBoardFile(t *testing.T) {
	directory := t.TempDir()
	path := filepath.Join(directory, "product-tasks.mtf.md")
	if err := os.WriteFile(path, nil, 0644); err != nil {
		t.Fatal(err)
	}
	app := NewApp()
	if _, err := app.CreateIssue(path, "First task"); err != nil {
		t.Fatal(err)
	}
	if _, err := app.CreateIssue(path, "Second task"); err != nil {
		t.Fatal(err)
	}
	issues, err := app.ListIssues(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(issues) != 2 || issues[0].Path != path || issues[0].Title != "First task" || issues[1].Title != "Second task" {
		t.Fatalf("unexpected board issues: %#v", issues)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Count(string(data), ".mtf.md") != 0 || !strings.Contains(string(data), "# product tasks") {
		t.Fatalf("unexpected board content:\n%s", data)
	}
}

func TestIssueFileIntegration(t *testing.T) {
	directory := t.TempDir()
	path := filepath.Join(directory, "flow.mtf.md")
	if err := os.WriteFile(path, []byte(sampleBoard), 0644); err != nil {
		t.Fatal(err)
	}
	app := NewApp()
	if _, err := app.UpdateIssueStatus(path, 0, string(IssueStatusInProgress)); err != nil {
		t.Fatal(err)
	}
	issues, err := app.ListIssues(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(issues) != 4 {
		t.Fatalf("unexpected issue count: %#v", issues)
	}
	found := false
	for _, issue := range issues {
		if issue.Title == "Implement fuzzy search" && issue.Status == IssueStatusInProgress {
			found = true
		}
	}
	if !found {
		t.Fatalf("Kanban move was not reflected: %#v", issues)
	}

	textEdited := strings.Replace(sampleBoard, "### Release v0.1", "### Release v0.2\n\nEdited in Text mode.", 1)
	if err := app.WriteText(path, textEdited); err != nil {
		t.Fatal(err)
	}
	issues, err = app.ListIssues(path)
	if err != nil {
		t.Fatal(err)
	}
	if issues[3].Title != "Release v0.2" || issues[3].Description != "Edited in Text mode." {
		t.Fatalf("Text edit was not reparsed: %#v", issues[3])
	}
}

func TestUpdateIssueDetailsPreservesOtherIssues(t *testing.T) {
	directory := t.TempDir()
	path := filepath.Join(directory, "details.mtf.md")
	if err := os.WriteFile(path, []byte(sampleBoard), 0644); err != nil {
		t.Fatal(err)
	}
	date := "2026-10-01"
	updated, err := NewApp().UpdateIssue(path, 0, IssueUpdate{
		Title:       "New title",
		Status:      IssueStatusDone,
		LimitDate:   &date,
		Description: "New **description**.",
		Subissues:   []Subissue{{Title: "First", Completed: true}, {Title: "Second"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Title != "New title" || updated.Status != IssueStatusDone || updated.LimitDate == nil || *updated.LimitDate != date || len(updated.Subissues) != 2 {
		t.Fatalf("unexpected updated issue: %#v", updated)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(data), "### Improve editor\n\nKeep user **Markdown**.") || !strings.Contains(string(data), "### Add command palette") {
		t.Fatalf("other issues were not preserved:\n%s", data)
	}
}

func TestDeleteIssuePreservesBoardAndOtherIssues(t *testing.T) {
	updated, err := DeleteMTFIssue(sampleBoard, 1)
	if err != nil {
		t.Fatal(err)
	}
	board := ParseMTFBoard(updated, "tasks.mtf.md")
	if len(board.Issues) != 3 {
		t.Fatalf("expected 3 remaining issues, got %#v", board.Issues)
	}
	for _, issue := range board.Issues {
		if issue.Title == "Add command palette" {
			t.Fatalf("deleted issue still exists: %#v", board.Issues)
		}
	}
	if board.Title != "Product Tasks" || !strings.Contains(updated, "Keep user **Markdown**.") || !strings.Contains(updated, "### Release v0.1") {
		t.Fatalf("board content was not preserved:\n%s", updated)
	}
}
