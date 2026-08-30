package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAppBootIncludesSelectedDirectoryAsRoot(t *testing.T) {
	root := filepath.Join(t.TempDir(), "note")
	nested := filepath.Join(root, "zzz")
	if err := os.MkdirAll(nested, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(nested, "yyy.md"), []byte("hello"), 0644); err != nil {
		t.Fatal(err)
	}

	trees, err := (&App{}).AppBoot(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(trees) != 1 || trees[0].Name != "note" || trees[0].Path != root {
		t.Fatalf("unexpected root: %#v", trees)
	}
	if len(trees[0].Children) != 1 || trees[0].Children[0].Name != "zzz" {
		t.Fatalf("unexpected children: %#v", trees[0].Children)
	}
	if children := trees[0].Children[0].Children; len(children) != 1 || children[0].Name != "yyy.md" {
		t.Fatalf("unexpected nested children: %#v", children)
	}
}

func TestAppBootIncludesEmptySelectedDirectory(t *testing.T) {
	root := filepath.Join(t.TempDir(), "empty-note")
	if err := os.Mkdir(root, 0755); err != nil {
		t.Fatal(err)
	}

	trees, err := (&App{}).AppBoot(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(trees) != 1 || trees[0].Name != "empty-note" || len(trees[0].Children) != 0 {
		t.Fatalf("unexpected tree: %#v", trees)
	}
}

func TestAppBootRejectsMissingDirectory(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "missing")
	if _, err := (&App{}).AppBoot(missing); err == nil {
		t.Fatal("expected an error for a missing directory")
	}
	if _, err := os.Stat(missing); !os.IsNotExist(err) {
		t.Fatalf("AppBoot unexpectedly created the directory: %v", err)
	}
}

func TestSettingsRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "settings.json")
	want := Settings{Path: "/tmp/note"}
	if err := saveSettings(path, want); err != nil {
		t.Fatal(err)
	}
	got, err := loadSettings(path)
	if err != nil {
		t.Fatal(err)
	}
	if got != want {
		t.Fatalf("got %#v, want %#v", got, want)
	}
}

func TestWriteTextCreatesParentsAndReplacesContent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "notes", "today.md")
	app := &App{}
	if err := app.WriteText(path, "first"); err != nil {
		t.Fatal(err)
	}
	if err := app.WriteText(path, "second"); err != nil {
		t.Fatal(err)
	}
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "second" {
		t.Fatalf("got %q, want %q", content, "second")
	}
}
