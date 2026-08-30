# Micro Note

A keyboard-driven Markdown note-taking app for the desktop, built for Vimmers.

Built with [Wails](https://wails.io/) (Go + React), [Milkdown](https://milkdown.dev/), and Tailwind CSS.

## Features

- **Vim mode** — full Vim keybindings inside the editor via Milkdown's Vim plugin
- **Vim-style file tree navigation** — `h/j/k/l` to move, `a` to create, `r` to rename, `d` to delete, `y/p/x` to copy/paste/cut
- **Space leader shortcuts** — `Space+E` to toggle the sidebar, and more
- **Issue tracking** — lightweight Kanban board using `.mtf` files stored alongside your notes
- **Full-screen toggle** — distraction-free writing
- **Search** — fuzzy file search across the workspace
- **JSON config** — override keybindings via `~/.config/micro-note/config.json`

## Requirements

- [Go](https://go.dev/) 1.21+
- [Wails CLI](https://wails.io/docs/gettingstarted/installation) v2
- Node.js 18+ and npm

Install the Wails CLI:

```sh
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

## Development

```sh
wails dev
```

This starts the Go backend and the Vite dev server together with hot reload.

## Build

```sh
wails build
```

The compiled app is written to `build/bin/`.

## Keybindings

### App

| Action | Default |
|---|---|
| Toggle sidebar / focus tree | `Space E` |
| New file | `Cmd N` |
| Open folder | `Cmd O` |
| Focus editor | `Cmd I` |
| Close file | `Cmd W` |
| Toggle full screen | `Cmd Shift F` |
| Toggle Vim mode | `Cmd Shift V` |
| Open cheat sheet | `Cmd ,` |

### File tree (when tree is focused)

| Action | Key |
|---|---|
| Move up / down | `k` / `j` |
| Expand / collapse | `l` / `h` |
| Open file | `Enter` |
| New file | `a` |
| Rename | `r` |
| Delete | `d` |
| Cut / Copy / Paste | `x` / `y` / `p` |

### Vim mode (editor)

| Action | Key |
|---|---|
| Enter insert mode | `i` |
| Enter visual mode | `v` / `V` |
| Return to normal mode | `Esc` / `Ctrl C` |

## Configuration

Keybindings can be overridden by creating `~/.config/micro-note/config.json`:

```json
{
  "keybindings": {
    "toggleSidebar": "Space+E",
    "newFile": "Cmd+N",
    "openDirectory": "Cmd+O",
    "focusEditor": "Cmd+I",
    "closeFile": "Cmd+W",
    "toggleFullscreen": "Cmd+Shift+F",
    "toggleVimMode": "Cmd+Shift+V",
    "openSettings": "Cmd+,"
  }
}
```

Only the keys you specify are overridden; the rest keep their defaults.

## License

MIT
