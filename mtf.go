package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type IssueStatus string

const (
	IssueStatusBacklog    IssueStatus = "backlog"
	IssueStatusInProgress IssueStatus = "in_progress"
	IssueStatusDone       IssueStatus = "done"
)

type Subissue struct {
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
}

type IssueValidation struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type Issue struct {
	Path             string            `json:"path"`
	Position         int               `json:"position"`
	Title            string            `json:"title"`
	Status           IssueStatus       `json:"status"`
	LimitDate        *string           `json:"limit_date"`
	Description      string            `json:"description"`
	Subissues        []Subissue        `json:"subissues"`
	ValidationErrors []IssueValidation `json:"validation_errors"`
}

type IssueUpdate struct {
	Title       string      `json:"title"`
	Status      IssueStatus `json:"status"`
	LimitDate   *string     `json:"limit_date"`
	Description string      `json:"description"`
	Subissues   []Subissue  `json:"subissues"`
}

type TaskBoard struct {
	Path             string            `json:"path"`
	Title            string            `json:"title"`
	Issues           []Issue           `json:"issues"`
	ValidationErrors []IssueValidation `json:"validation_errors"`
}

type issueBlock struct {
	issue        Issue
	start        int
	contentStart int
	end          int
}

var (
	boardTitlePattern       = regexp.MustCompile(`(?m)^#[ \t]+(.+?)[ \t]*\r?$`)
	statusHeadingPattern    = regexp.MustCompile(`(?mi)^##[ \t]+(Backlog|In Progress|Done)[ \t]*\r?$`)
	issueHeadingPattern     = regexp.MustCompile(`(?m)^###[ \t]+(.+?)[ \t]*\r?$`)
	subissuesHeadingPattern = regexp.MustCompile(`(?mi)^####[ \t]+Subissues[ \t]*\r?$`)
	limitDatePattern        = regexp.MustCompile(`(?mi)^\*\*Limit date:\*\*[ \t]*(.*?)[ \t]*\r?$`)
	checkboxPattern         = regexp.MustCompile(`(?m)^[ \t]*[-+*][ \t]+\[([ xX])\][ \t]+(.+?)[ \t]*\r?$`)
)

func IsMTFFile(name string) bool {
	return strings.HasSuffix(strings.ToLower(name), ".mtf.md")
}

func validIssueStatus(status IssueStatus) bool {
	return status == IssueStatusBacklog || status == IssueStatusInProgress || status == IssueStatusDone
}

func statusLabel(status IssueStatus) string {
	switch status {
	case IssueStatusInProgress:
		return "In Progress"
	case IssueStatusDone:
		return "Done"
	default:
		return "Backlog"
	}
}

func parseStatusLabel(label string) IssueStatus {
	switch strings.ToLower(strings.TrimSpace(label)) {
	case "in progress":
		return IssueStatusInProgress
	case "done":
		return IssueStatusDone
	default:
		return IssueStatusBacklog
	}
}

func statusAt(content string, offset int) (IssueStatus, bool) {
	status := IssueStatusBacklog
	found := false
	for _, match := range statusHeadingPattern.FindAllStringSubmatchIndex(content, -1) {
		if match[0] >= offset {
			break
		}
		status = parseStatusLabel(content[match[2]:match[3]])
		found = true
	}
	return status, found
}

func parseIssueBlocks(content, path string) []issueBlock {
	headings := issueHeadingPattern.FindAllStringSubmatchIndex(content, -1)
	statuses := statusHeadingPattern.FindAllStringSubmatchIndex(content, -1)
	blocks := make([]issueBlock, 0, len(headings))
	for position, heading := range headings {
		end := len(content)
		if position+1 < len(headings) {
			end = headings[position+1][0]
		}
		for _, status := range statuses {
			if status[0] > heading[0] && status[0] < end {
				end = status[0]
				break
			}
		}
		issue := Issue{
			Path:             path,
			Position:         position,
			Title:            strings.TrimSpace(content[heading[2]:heading[3]]),
			Subissues:        []Subissue{},
			ValidationErrors: []IssueValidation{},
		}
		var hasStatus bool
		issue.Status, hasStatus = statusAt(content, heading[0])
		if !hasStatus {
			issue.ValidationErrors = append(issue.ValidationErrors, IssueValidation{Field: "status", Message: "Issue must be inside a status section"})
		}

		body := content[heading[1]:end]
		descriptionEnd := len(body)
		if subissuesHeading := subissuesHeadingPattern.FindStringIndex(body); subissuesHeading != nil {
			descriptionEnd = subissuesHeading[0]
			for _, checkbox := range checkboxPattern.FindAllStringSubmatch(body[subissuesHeading[1]:], -1) {
				issue.Subissues = append(issue.Subissues, Subissue{
					Title:     strings.TrimSpace(checkbox[2]),
					Completed: strings.EqualFold(checkbox[1], "x"),
				})
			}
		}
		description := body[:descriptionEnd]
		if limitDate := limitDatePattern.FindStringSubmatch(description); limitDate != nil {
			value := strings.TrimSpace(limitDate[1])
			if _, err := time.Parse("2006-01-02", value); err != nil {
				issue.ValidationErrors = append(issue.ValidationErrors, IssueValidation{Field: "limit_date", Message: "Limit date must use YYYY-MM-DD"})
			} else {
				issue.LimitDate = &value
			}
			description = limitDatePattern.ReplaceAllString(description, "")
		}
		issue.Description = strings.TrimSpace(description)
		blocks = append(blocks, issueBlock{issue: issue, start: heading[0], contentStart: heading[1], end: end})
	}
	return blocks
}

func ParseMTFBoard(content, path string) TaskBoard {
	board := TaskBoard{Path: path, Issues: []Issue{}, ValidationErrors: []IssueValidation{}}
	if title := boardTitlePattern.FindStringSubmatch(content); title != nil {
		board.Title = strings.TrimSpace(title[1])
	} else if strings.TrimSpace(content) != "" {
		board.ValidationErrors = append(board.ValidationErrors, IssueValidation{Field: "title", Message: "Missing board H1 title"})
	}
	for _, block := range parseIssueBlocks(content, path) {
		issue := block.issue
		if board.Title == "" && strings.TrimSpace(content) != "" {
			issue.ValidationErrors = append(issue.ValidationErrors, board.ValidationErrors...)
		}
		board.Issues = append(board.Issues, issue)
	}
	return board
}

func SerializeIssueBlock(issue Issue) string {
	var builder strings.Builder
	builder.WriteString("### ")
	builder.WriteString(strings.TrimSpace(issue.Title))
	if issue.LimitDate != nil && *issue.LimitDate != "" {
		builder.WriteString("\n\n**Limit date:** ")
		builder.WriteString(*issue.LimitDate)
	}
	if strings.TrimSpace(issue.Description) != "" {
		builder.WriteString("\n\n")
		builder.WriteString(strings.TrimSpace(issue.Description))
	}
	if len(issue.Subissues) > 0 {
		builder.WriteString("\n\n#### Subissues\n\n")
		for _, subissue := range issue.Subissues {
			mark := " "
			if subissue.Completed {
				mark = "x"
			}
			fmt.Fprintf(&builder, "- [%s] %s\n", mark, strings.TrimSpace(subissue.Title))
		}
	}
	return strings.TrimRight(builder.String(), "\r\n")
}

func SerializeMTFBoard(title string, issues []Issue) string {
	if strings.TrimSpace(title) == "" {
		title = "Tasks"
	}
	var builder strings.Builder
	builder.WriteString("# ")
	builder.WriteString(strings.TrimSpace(title))
	for _, status := range []IssueStatus{IssueStatusBacklog, IssueStatusInProgress, IssueStatusDone} {
		builder.WriteString("\n\n## ")
		builder.WriteString(statusLabel(status))
		for _, issue := range issues {
			if issue.Status == status {
				builder.WriteString("\n\n")
				builder.WriteString(SerializeIssueBlock(issue))
			}
		}
	}
	return builder.String()
}

func appendIssueToStatus(content string, status IssueStatus, block string) string {
	for index, heading := range statusHeadingPattern.FindAllStringSubmatchIndex(content, -1) {
		if parseStatusLabel(content[heading[2]:heading[3]]) != status {
			continue
		}
		sectionEnd := len(content)
		allHeadings := statusHeadingPattern.FindAllStringSubmatchIndex(content, -1)
		if index+1 < len(allHeadings) {
			sectionEnd = allHeadings[index+1][0]
		}
		before := strings.TrimRight(content[:sectionEnd], "\r\n")
		after := strings.TrimLeft(content[sectionEnd:], "\r\n")
		if after == "" {
			return before + "\n\n" + strings.TrimSpace(block)
		}
		return before + "\n\n" + strings.TrimSpace(block) + "\n\n" + after
	}
	prefix := strings.TrimRight(content, "\r\n")
	if prefix != "" {
		prefix += "\n\n"
	}
	return prefix + "## " + statusLabel(status) + "\n\n" + strings.TrimSpace(block)
}

func replaceIssueBlock(content string, position int, replacement string) (string, error) {
	blocks := parseIssueBlocks(content, "")
	if position < 0 || position >= len(blocks) {
		return content, fmt.Errorf("issue position %d is out of range", position)
	}
	block := blocks[position]
	suffix := strings.TrimLeft(content[block.end:], "\r\n")
	updated := content[:block.start] + strings.TrimSpace(replacement)
	if suffix != "" {
		updated += "\n\n" + suffix
	}
	return updated, nil
}

func updateIssueTitle(block, title string) (string, error) {
	title = strings.TrimSpace(title)
	if title == "" || strings.ContainsAny(title, "\r\n") {
		return block, errors.New("issue title is required and must fit on one line")
	}
	heading := issueHeadingPattern.FindStringSubmatchIndex(block)
	if heading == nil {
		return block, errors.New("issue heading is missing")
	}
	return block[:heading[2]] + title + block[heading[3]:], nil
}

func updateIssueLimitDate(block string, limitDate *string) (string, error) {
	if limitDate != nil {
		if _, err := time.Parse("2006-01-02", *limitDate); err != nil {
			return block, errors.New("limit_date must use YYYY-MM-DD")
		}
		if match := limitDatePattern.FindStringSubmatchIndex(block); match != nil {
			return block[:match[2]] + *limitDate + block[match[3]:], nil
		}
		heading := issueHeadingPattern.FindStringIndex(block)
		if heading == nil {
			return block, errors.New("issue heading is missing")
		}
		return block[:heading[1]] + "\n\n**Limit date:** " + *limitDate + block[heading[1]:], nil
	}
	if match := limitDatePattern.FindStringIndex(block); match != nil {
		return block[:match[0]] + block[match[1]:], nil
	}
	return block, nil
}

func updateIssueDescription(block, description string) (string, error) {
	heading := issueHeadingPattern.FindStringIndex(block)
	if heading == nil {
		return block, errors.New("issue heading is missing")
	}
	subissuesStart := len(block)
	if subissues := subissuesHeadingPattern.FindStringIndex(block[heading[1]:]); subissues != nil {
		subissuesStart = heading[1] + subissues[0]
	}
	middle := block[heading[1]:subissuesStart]
	limitLine := ""
	if match := limitDatePattern.FindString(middle); match != "" {
		limitLine = strings.TrimSpace(match)
	}
	var replacement strings.Builder
	if limitLine != "" {
		replacement.WriteString("\n\n")
		replacement.WriteString(limitLine)
	}
	if strings.TrimSpace(description) != "" {
		replacement.WriteString("\n\n")
		replacement.WriteString(strings.TrimSpace(description))
	}
	if subissuesStart < len(block) {
		replacement.WriteString("\n\n")
		replacement.WriteString(strings.TrimSpace(block[subissuesStart:]))
	}
	return block[:heading[1]] + replacement.String(), nil
}

func updateIssueSubissues(block string, subissues []Subissue) string {
	sectionStart := len(block)
	if section := subissuesHeadingPattern.FindStringIndex(block); section != nil {
		sectionStart = section[0]
	}
	prefix := strings.TrimRight(block[:sectionStart], "\r\n")
	if len(subissues) == 0 {
		return prefix
	}
	return prefix + "\n\n" + strings.TrimPrefix(SerializeIssueBlock(Issue{Subissues: subissues}), "### \n\n")
}

func updateIssueBlock(block string, current Issue, update IssueUpdate) (string, error) {
	updated := strings.TrimSpace(block)
	var err error
	if strings.TrimSpace(update.Title) != current.Title {
		updated, err = updateIssueTitle(updated, update.Title)
		if err != nil {
			return block, err
		}
	}
	currentDate, updateDate := "", ""
	if current.LimitDate != nil {
		currentDate = *current.LimitDate
	}
	if update.LimitDate != nil {
		updateDate = *update.LimitDate
	}
	if currentDate != updateDate || hasIssueValidation(current, "limit_date") {
		updated, err = updateIssueLimitDate(updated, update.LimitDate)
		if err != nil {
			return block, err
		}
	}
	if strings.TrimSpace(update.Description) != current.Description {
		updated, err = updateIssueDescription(updated, update.Description)
		if err != nil {
			return block, err
		}
	}
	if !sameSubissues(current.Subissues, update.Subissues) {
		updated = updateIssueSubissues(updated, update.Subissues)
	}
	return updated, nil
}

func MoveMTFIssue(content string, position int, status IssueStatus) (string, error) {
	if !validIssueStatus(status) {
		return content, fmt.Errorf("invalid issue status %q", status)
	}
	blocks := parseIssueBlocks(content, "")
	if position < 0 || position >= len(blocks) {
		return content, fmt.Errorf("issue position %d is out of range", position)
	}
	block := blocks[position]
	if block.issue.Status == status {
		return content, nil
	}
	raw := strings.TrimSpace(content[block.start:block.end])
	before := strings.TrimRight(content[:block.start], "\r\n")
	after := strings.TrimLeft(content[block.end:], "\r\n")
	without := before
	if without != "" && after != "" {
		without += "\n\n"
	}
	without += after
	return appendIssueToStatus(without, status, raw), nil
}

func DeleteMTFIssue(content string, position int) (string, error) {
	blocks := parseIssueBlocks(content, "")
	if position < 0 || position >= len(blocks) {
		return content, fmt.Errorf("issue position %d is out of range", position)
	}
	block := blocks[position]
	before := strings.TrimRight(content[:block.start], "\r\n")
	after := strings.TrimLeft(content[block.end:], "\r\n")
	if before == "" {
		return after, nil
	}
	if after == "" {
		return before, nil
	}
	return before + "\n\n" + after, nil
}

func ToggleMTFSubissue(content string, issuePosition, subissuePosition int, completed bool) (string, error) {
	blocks := parseIssueBlocks(content, "")
	if issuePosition < 0 || issuePosition >= len(blocks) {
		return content, fmt.Errorf("issue position %d is out of range", issuePosition)
	}
	block := blocks[issuePosition]
	raw := content[block.start:block.end]
	heading := subissuesHeadingPattern.FindStringIndex(raw)
	if heading == nil {
		return content, errors.New("Subissues section is missing")
	}
	matches := checkboxPattern.FindAllStringSubmatchIndex(raw[heading[1]:], -1)
	if subissuePosition < 0 || subissuePosition >= len(matches) {
		return content, fmt.Errorf("subissue position %d is out of range", subissuePosition)
	}
	markStart := block.start + heading[1] + matches[subissuePosition][2]
	markEnd := block.start + heading[1] + matches[subissuePosition][3]
	mark := " "
	if completed {
		mark = "x"
	}
	return content[:markStart] + mark + content[markEnd:], nil
}

func hasIssueValidation(issue Issue, field string) bool {
	for _, validation := range issue.ValidationErrors {
		if validation.Field == field {
			return true
		}
	}
	return false
}

func sameSubissues(left, right []Subissue) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		if left[index] != right[index] {
			return false
		}
	}
	return true
}

func atomicWriteText(path, content string) error {
	temporary, err := os.CreateTemp(filepath.Dir(path), ".micro-note-*.tmp")
	if err != nil {
		return err
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)
	if _, err := temporary.WriteString(content); err != nil {
		temporary.Close()
		return err
	}
	if err := temporary.Chmod(0644); err != nil {
		temporary.Close()
		return err
	}
	if err := temporary.Sync(); err != nil {
		temporary.Close()
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	return os.Rename(temporaryPath, path)
}
