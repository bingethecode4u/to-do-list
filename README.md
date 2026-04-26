# ✅ My Tasks — To-Do List App

A clean, fast, fully functional to-do list app built with **vanilla HTML, CSS, and JavaScript**.
No frameworks, no dependencies — open `index.html` in any browser and it just works.

---

## 🚀 Features

| Feature | Details |
|---|---|
| **Add tasks** | Type and press `Enter` or click **Add** |
| **Complete tasks** | Click the checkbox to toggle done/undone |
| **Delete tasks** | Hover a task and click **×** |
| **Persistent storage** | Saved to `localStorage` — survives refresh |
| **Filter view** | Switch between **All**, **Pending**, **Completed** |
| **Task counter** | Live count of remaining tasks |
| **Clear done** | One-click removal of all completed tasks |

---

## 🗂️ Project Structure

```
to-do-list/
├── index.html   # App shell & semantic HTML
├── style.css    # All visual styles (CSS variables, responsive)
└── app.js       # State management, localStorage, DOM rendering
```

---

## ⚙️ How to Run

No install. No build step.

```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

Or drag-and-drop `index.html` into any browser tab.

---

## 🧱 Data Model

Each task is stored in `localStorage` under the key `todo_tasks` as a JSON array:

```json
[
  { "id": 1745645123456, "text": "Go to gym", "completed": false },
  { "id": 1745645987654, "text": "Read a book", "completed": true }
]
```

---

## 🛠️ Tech Stack

- **HTML5** — semantic structure
- **CSS3** — custom properties, flexbox, keyframe animations
- **JavaScript ES6+** — vanilla, zero libraries

---

## 📄 License

MIT — free to use, modify, and distribute.
