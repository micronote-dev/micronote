package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

type FileTree struct {
	Type     string      `json:"type"`
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	Children []*FileTree `json:"children,omitempty"`
}

type Settings struct {
	Path string `json:"path"`
}

func readDirTree(dir string) ([]*FileTree, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var items []*FileTree
	for _, entry := range entries {
		fullPath := filepath.Join(dir, entry.Name())
		if entry.IsDir() {
			children, err := readDirTree(fullPath)
			if err != nil {
				return nil, err
			}
			items = append(items, &FileTree{
				Type:     "directory",
				Name:     entry.Name(),
				Path:     fullPath,
				Children: children,
			})
		} else {
			items = append(items, &FileTree{
				Type: "file",
				Name: entry.Name(),
				Path: fullPath,
			})
		}
	}
	return items, nil
}

func (a *App) AppBoot(dirPath string) ([]*FileTree, error) {
	rootPath, err := filepath.Abs(filepath.Clean(dirPath))
	if err != nil {
		return nil, err
	}
	info, err := os.Stat(rootPath)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("'%s' is not a directory", rootPath)
	}
	children, err := readDirTree(rootPath)
	if err != nil {
		return nil, err
	}
	return []*FileTree{{
		Type:     "directory",
		Name:     filepath.Base(rootPath),
		Path:     rootPath,
		Children: children,
	}}, nil
}

func settingsFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "micro-note", "settings.json"), nil
}

func loadSettings(path string) (Settings, error) {
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return Settings{}, nil
	}
	if err != nil {
		return Settings{}, err
	}
	var settings Settings
	if err := json.Unmarshal(data, &settings); err != nil {
		return Settings{}, fmt.Errorf("read settings: %w", err)
	}
	return settings, nil
}

func saveSettings(path string, settings Settings) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	return atomicWriteText(path, string(data)+"\n")
}

func (a *App) GetWorkspacePath() (string, error) {
	path, err := settingsFilePath()
	if err != nil {
		return "", err
	}
	settings, err := loadSettings(path)
	return settings.Path, err
}

func (a *App) SetWorkspacePath(workspacePath string) error {
	cleanPath := ""
	if workspacePath != "" {
		absolutePath, err := filepath.Abs(filepath.Clean(workspacePath))
		if err != nil {
			return err
		}
		info, err := os.Stat(absolutePath)
		if err != nil {
			return err
		}
		if !info.IsDir() {
			return fmt.Errorf("'%s' is not a directory", absolutePath)
		}
		cleanPath = absolutePath
	}
	path, err := settingsFilePath()
	if err != nil {
		return err
	}
	return saveSettings(path, Settings{Path: cleanPath})
}

type UserConfig struct {
	Keybindings map[string]string `json:"keybindings,omitempty"`
}

func configFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "micro-note", "config.json"), nil
}

func (a *App) GetConfig() (UserConfig, error) {
	path, err := configFilePath()
	if err != nil {
		return UserConfig{}, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return UserConfig{}, nil
	}
	if err != nil {
		return UserConfig{}, err
	}
	var config UserConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return UserConfig{}, fmt.Errorf("read config: %w", err)
	}
	return config, nil
}

func (a *App) SelectFolder() string {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Folder",
	})
	if err != nil {
		return ""
	}
	return path
}

func (a *App) ReadJSON(filePath string) (interface{}, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	var result interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func (a *App) WriteJSON(filePath string, data interface{}) error {
	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return atomicWriteText(filePath, string(bytes))
}

func (a *App) ExistsJSON(filePath string) bool {
	_, err := os.Stat(filePath)
	return err == nil
}

func (a *App) InitJSON(filePath string) error {
	if _, err := os.Stat(filePath); !os.IsNotExist(err) {
		return nil
	}
	return a.WriteJSON(filePath, map[string]interface{}{"path": ""})
}

func (a *App) ReadText(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (a *App) MakeDir(dirPath string) error {
	return os.MkdirAll(dirPath, 0755)
}

func (a *App) WriteText(filePath string, content string) error {
	if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
		return err
	}
	return atomicWriteText(filePath, content)
}

func (a *App) ToggleFullscreen() {
	if runtime.WindowIsFullscreen(a.ctx) {
		runtime.WindowUnfullscreen(a.ctx)
	} else {
		runtime.WindowFullscreen(a.ctx)
	}
}

func (a *App) RenameEntry(oldPath, newPath string) error {
	if oldPath != newPath {
		if _, err := os.Stat(newPath); err == nil {
			return fmt.Errorf("'%s' already exists", filepath.Base(newPath))
		}
	}
	return os.Rename(oldPath, newPath)
}

func (a *App) DeleteEntry(path string) error {
	return os.RemoveAll(path)
}

func (a *App) MoveEntry(src, dst string) error {
	if _, err := os.Stat(dst); err == nil {
		return fmt.Errorf("'%s' already exists", filepath.Base(dst))
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}
	return os.Rename(src, dst)
}

func copyAll(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}
	if info.IsDir() {
		if err := os.MkdirAll(dst, info.Mode()); err != nil {
			return err
		}
		entries, err := os.ReadDir(src)
		if err != nil {
			return err
		}
		for _, entry := range entries {
			if err := copyAll(filepath.Join(src, entry.Name()), filepath.Join(dst, entry.Name())); err != nil {
				return err
			}
		}
		return nil
	}
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, info.Mode())
}

func (a *App) ClipboardGetText() (string, error) {
	return runtime.ClipboardGetText(a.ctx)
}

func (a *App) CopyEntry(src, dst string) error {
	if _, err := os.Stat(dst); err == nil {
		return fmt.Errorf("'%s' already exists", filepath.Base(dst))
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}
	return copyAll(src, dst)
}

func readTaskBoard(path string) (TaskBoard, error) {
	if !IsMTFFile(path) {
		return TaskBoard{}, errors.New("not an MTF task board file")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return TaskBoard{}, err
	}
	return ParseMTFBoard(string(data), path), nil
}

func (a *App) ListIssues(boardPath string) ([]Issue, error) {
	board, err := readTaskBoard(boardPath)
	return board.Issues, err
}

func (a *App) ReadIssue(path string, position int) (Issue, error) {
	board, err := readTaskBoard(path)
	if err != nil {
		return Issue{}, err
	}
	if position < 0 || position >= len(board.Issues) {
		return Issue{}, fmt.Errorf("issue position %d is out of range", position)
	}
	return board.Issues[position], nil
}

func boardTitleFromPath(path string) string {
	name := filepath.Base(path)
	name = strings.TrimSuffix(name, filepath.Ext(name))
	name = strings.TrimSuffix(name, ".mtf")
	name = strings.TrimSpace(strings.NewReplacer("-", " ", "_", " ").Replace(name))
	if name == "" {
		return "Tasks"
	}
	return name
}

func (a *App) CreateIssue(boardPath, title string) (Issue, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return Issue{}, errors.New("issue title is required")
	}
	if !IsMTFFile(boardPath) {
		return Issue{}, errors.New("not an MTF task board file")
	}
	data, err := os.ReadFile(boardPath)
	if err != nil && !os.IsNotExist(err) {
		return Issue{}, err
	}
	content := string(data)
	if strings.TrimSpace(content) == "" {
		content = SerializeMTFBoard(boardTitleFromPath(boardPath), nil)
	}
	content = appendIssueToStatus(content, IssueStatusBacklog, SerializeIssueBlock(Issue{Title: title}))
	if err := atomicWriteText(boardPath, content); err != nil {
		return Issue{}, err
	}
	board := ParseMTFBoard(content, boardPath)
	for index := len(board.Issues) - 1; index >= 0; index-- {
		if board.Issues[index].Status == IssueStatusBacklog && board.Issues[index].Title == title {
			return board.Issues[index], nil
		}
	}
	return Issue{}, errors.New("created issue could not be parsed")
}

func updateTaskBoardFile(path string, update func(string) (string, error)) (TaskBoard, error) {
	if !IsMTFFile(path) {
		return TaskBoard{}, errors.New("not an MTF task board file")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return TaskBoard{}, err
	}
	updated, err := update(string(data))
	if err != nil {
		return TaskBoard{}, err
	}
	if updated != string(data) {
		if err := atomicWriteText(path, updated); err != nil {
			return TaskBoard{}, err
		}
	}
	return ParseMTFBoard(updated, path), nil
}

func findIssueAfterUpdate(board TaskBoard, update IssueUpdate) (Issue, error) {
	updateDate := ""
	if update.LimitDate != nil {
		updateDate = *update.LimitDate
	}
	for index := len(board.Issues) - 1; index >= 0; index-- {
		issue := board.Issues[index]
		issueDate := ""
		if issue.LimitDate != nil {
			issueDate = *issue.LimitDate
		}
		if issue.Status == update.Status && issue.Title == strings.TrimSpace(update.Title) && issueDate == updateDate && issue.Description == strings.TrimSpace(update.Description) && sameSubissues(issue.Subissues, update.Subissues) {
			return issue, nil
		}
	}
	return Issue{}, fmt.Errorf("updated issue could not be parsed: update=%#v issues=%#v", update, board.Issues)
}

func (a *App) UpdateIssueStatus(path string, position int, status string) (Issue, error) {
	targetStatus := IssueStatus(status)
	currentBoard, err := readTaskBoard(path)
	if err != nil {
		return Issue{}, err
	}
	if position < 0 || position >= len(currentBoard.Issues) {
		return Issue{}, fmt.Errorf("issue position %d is out of range", position)
	}
	current := currentBoard.Issues[position]
	board, err := updateTaskBoardFile(path, func(content string) (string, error) {
		return MoveMTFIssue(content, position, targetStatus)
	})
	if err != nil {
		return Issue{}, err
	}
	return findIssueAfterUpdate(board, IssueUpdate{
		Title: current.Title, Status: targetStatus, LimitDate: current.LimitDate,
		Description: current.Description, Subissues: current.Subissues,
	})
}

func (a *App) UpdateIssueLimitDate(path string, position int, limitDate *string) (Issue, error) {
	board, err := updateTaskBoardFile(path, func(content string) (string, error) {
		blocks := parseIssueBlocks(content, path)
		if position < 0 || position >= len(blocks) {
			return content, fmt.Errorf("issue position %d is out of range", position)
		}
		updated, err := updateIssueLimitDate(content[blocks[position].start:blocks[position].end], limitDate)
		if err != nil {
			return content, err
		}
		return replaceIssueBlock(content, position, updated)
	})
	if err != nil {
		return Issue{}, err
	}
	return board.Issues[position], nil
}

func (a *App) ToggleIssueSubissue(path string, position, subissuePosition int, completed bool) (Issue, error) {
	board, err := updateTaskBoardFile(path, func(content string) (string, error) {
		return ToggleMTFSubissue(content, position, subissuePosition, completed)
	})
	if err != nil {
		return Issue{}, err
	}
	return board.Issues[position], nil
}

func (a *App) DeleteIssue(path string, position int) error {
	_, err := updateTaskBoardFile(path, func(content string) (string, error) {
		return DeleteMTFIssue(content, position)
	})
	return err
}

func (a *App) UpdateIssue(path string, position int, update IssueUpdate) (Issue, error) {
	if !validIssueStatus(update.Status) {
		return Issue{}, fmt.Errorf("invalid issue status %q", update.Status)
	}
	if update.LimitDate != nil {
		if _, err := time.Parse("2006-01-02", *update.LimitDate); err != nil {
			return Issue{}, errors.New("limit_date must use YYYY-MM-DD")
		}
	}
	board, err := updateTaskBoardFile(path, func(content string) (string, error) {
		blocks := parseIssueBlocks(content, path)
		if position < 0 || position >= len(blocks) {
			return content, fmt.Errorf("issue position %d is out of range", position)
		}
		current := blocks[position].issue
		updatedBlock, err := updateIssueBlock(content[blocks[position].start:blocks[position].end], current, update)
		if err != nil {
			return content, err
		}
		updated, err := replaceIssueBlock(content, position, updatedBlock)
		if err != nil {
			return content, err
		}
		if current.Status != update.Status {
			return MoveMTFIssue(updated, position, update.Status)
		}
		return updated, nil
	})
	if err != nil {
		return Issue{}, err
	}
	return findIssueAfterUpdate(board, update)
}
