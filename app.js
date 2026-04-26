/* To-Do App - app.js */
"use strict";

// Constants
const STORAGE_KEY    = "todo_tasks";
const THEME_KEY      = "todo_theme";
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// State
let tasks            = [];
let currentFilter    = "all";
let searchQuery      = "";
let currentSort      = "date-desc";
let currentTagFilter = "all";
let dragSrcId        = null;
let undoStack        = null;
let undoTimer        = null;

// DOM Refs
const taskInput         = document.getElementById("taskInput");
const addBtn            = document.getElementById("addBtn");
const prioritySelect    = document.getElementById("prioritySelect");
const dueDateInput      = document.getElementById("dueDateInput");
const tagInput          = document.getElementById("tagInput");
const repeatSelect      = document.getElementById("repeatSelect");
const searchInput       = document.getElementById("searchInput");
const sortSelect        = document.getElementById("sortSelect");
const tagFilterSel      = document.getElementById("tagFilter");
const taskList          = document.getElementById("taskList");
const taskCounter       = document.getElementById("taskCounter");
const emptyState        = document.getElementById("emptyState");
const emptyMessage      = document.getElementById("emptyMessage");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const filterTabs        = document.querySelectorAll(".tab");
const themeToggle       = document.getElementById("themeToggle");
const undoToast         = document.getElementById("undoToast");
const undoBtn           = document.getElementById("undoBtn");
const undoMessage       = document.getElementById("undoMessage");
const countAll          = document.getElementById("countAll");
const countPending      = document.getElementById("countPending");
const countCompleted    = document.getElementById("countCompleted");

// LocalStorage
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(tasks)) tasks = [];
    tasks = tasks.map(t => ({
      priority:  "medium",
      dueDate:   null,
      tag:       null,
      subtasks:  [],
      repeat:    null,
      createdAt: t.id,
      ...t
    }));
  } catch {
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Theme
function loadTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19";
  themeToggle.setAttribute("aria-label", "Switch to " + (theme === "dark" ? "light" : "dark") + " mode");
  localStorage.setItem(THEME_KEY, theme);
}

// Core Operations
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  tasks.push({
    id:        Date.now(),
    createdAt: Date.now(),
    text:      trimmed,
    completed: false,
    priority:  prioritySelect.value,
    dueDate:   dueDateInput.value  || null,
    tag:       tagInput.value.trim() || null,
    subtasks:  [],
    repeat:    repeatSelect.value  || null
  });
  saveTasks();
  render();
  taskInput.value      = "";
  dueDateInput.value   = "";
  tagInput.value       = "";
  prioritySelect.value = "medium";
  repeatSelect.value   = "";
  taskInput.focus();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  if (task.completed && task.repeat) {
    const next = Object.assign({}, task, {
      id:        Date.now() + 1,
      createdAt: Date.now() + 1,
      completed: false,
      subtasks:  task.subtasks.map(s => Object.assign({}, s, { id: Date.now() + Math.random(), completed: false }))
    });
    if (task.dueDate) {
      const d = new Date(task.dueDate + "T00:00:00");
      if (task.repeat === "daily")  d.setDate(d.getDate() + 1);
      if (task.repeat === "weekly") d.setDate(d.getDate() + 7);
      next.dueDate = d.toISOString().split("T")[0];
    }
    tasks.push(next);
  }
  saveTasks();
  render();
}

function deleteTask(id) {
  undoStack = { tasks: JSON.parse(JSON.stringify(tasks)) };
  showUndo("Task deleted");
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function clearCompleted() {
  undoStack = { tasks: JSON.parse(JSON.stringify(tasks)) };
  showUndo("Completed tasks cleared");
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
}

function editTask(id, newText) {
  const trimmed = newText.trim();
  if (!trimmed) return;
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.text = trimmed;
  saveTasks();
  render();
}

// Subtasks
function addSubtask(taskId, text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return false;
  task.subtasks.push({ id: Date.now(), text: trimmed, completed: false });
  saveTasks();
  render();
  return true;
}

function toggleSubtask(taskId, subtaskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const sub = task.subtasks.find(s => s.id === subtaskId);
  if (sub) { sub.completed = !sub.completed; saveTasks(); render(); }
}

function deleteSubtask(taskId, subtaskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
  saveTasks();
  render();
}

// Undo
function showUndo(message) {
  clearTimeout(undoTimer);
  undoMessage.textContent = message;
  undoToast.style.display = "flex";
  undoTimer = setTimeout(function() { undoToast.style.display = "none"; undoStack = null; }, 5000);
}

function undo() {
  if (!undoStack) return;
  tasks = undoStack.tasks;
  undoStack = null;
  clearTimeout(undoTimer);
  undoToast.style.display = "none";
  saveTasks();
  render();
}

// Filter, Sort & Search
function setFilter(filter) {
  currentFilter = filter;
  filterTabs.forEach(function(tab) {
    var active = tab.dataset.filter === filter;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active);
  });
  render();
}

function getProcessedTasks() {
  var result = tasks.slice();
  if (currentFilter === "pending")   result = result.filter(function(t) { return !t.completed; });
  if (currentFilter === "completed") result = result.filter(function(t) { return  t.completed; });
  if (currentTagFilter !== "all")    result = result.filter(function(t) { return t.tag === currentTagFilter; });
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    result = result.filter(function(t) {
      return t.text.toLowerCase().includes(q) ||
        (t.tag && t.tag.toLowerCase().includes(q)) ||
        t.subtasks.some(function(s) { return s.text.toLowerCase().includes(q); });
    });
  }
  result.sort(function(a, b) {
    switch (currentSort) {
      case "date-asc": return a.createdAt - b.createdAt;
      case "alpha":    return a.text.localeCompare(b.text);
      case "priority": return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      case "due":
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      default: return b.createdAt - a.createdAt;
    }
  });
  return result;
}

function syncTagFilter() {
  var tags = [];
  tasks.forEach(function(t) { if (t.tag && tags.indexOf(t.tag) === -1) tags.push(t.tag); });
  tags.sort();
  tagFilterSel.innerHTML = '<option value="all">All tags</option>';
  tags.forEach(function(tag) {
    var opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    tagFilterSel.appendChild(opt);
  });
  if (tags.indexOf(currentTagFilter) === -1) currentTagFilter = "all";
  tagFilterSel.value = currentTagFilter;
}

// Drag & Drop
function handleDragStart(e, id) {
  dragSrcId = id;
  e.dataTransfer.effectAllowed = "move";
  setTimeout(function() {
    var el = taskList.querySelector("[data-id='" + id + "']");
    if (el) el.classList.add("dragging");
  }, 0);
}

function handleDragOver(e, id) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  if (dragSrcId === id) return;
  taskList.querySelectorAll(".task-item").forEach(function(el) { el.classList.remove("drag-over"); });
  var target = taskList.querySelector("[data-id='" + id + "']");
  if (target) target.classList.add("drag-over");
}

function handleDrop(e, targetId) {
  e.preventDefault();
  if (!dragSrcId || dragSrcId === targetId) return;
  var srcIdx = tasks.findIndex(function(t) { return t.id === dragSrcId; });
  var tgtIdx = tasks.findIndex(function(t) { return t.id === targetId; });
  if (srcIdx === -1 || tgtIdx === -1) return;
  var moved = tasks.splice(srcIdx, 1)[0];
  tasks.splice(tgtIdx, 0, moved);
  dragSrcId = null;
  saveTasks();
  render();
}

function handleDragEnd() {
  dragSrcId = null;
  taskList.querySelectorAll(".task-item").forEach(function(el) { el.classList.remove("dragging", "drag-over"); });
}

// Render
function render() {
  var processed = getProcessedTasks();
  countAll.textContent       = tasks.length;
  countPending.textContent   = tasks.filter(function(t) { return !t.completed; }).length;
  countCompleted.textContent = tasks.filter(function(t) { return  t.completed; }).length;
  var pendingCount = tasks.filter(function(t) { return !t.completed; }).length;
  taskCounter.textContent = pendingCount === 1 ? "1 task left" : pendingCount + " tasks left";
  clearCompletedBtn.style.visibility = tasks.some(function(t) { return t.completed; }) ? "visible" : "hidden";
  syncTagFilter();
  if (processed.length === 0) {
    taskList.innerHTML = "";
    emptyState.hidden = false;
    emptyMessage.textContent = getEmptyMessage();
    return;
  }
  emptyState.hidden = true;
  var fragment = document.createDocumentFragment();
  processed.forEach(function(task) { fragment.appendChild(createTaskElement(task)); });
  taskList.innerHTML = "";
  taskList.appendChild(fragment);
}

// Task Element Builder
function createTaskElement(task) {
  var li = document.createElement("li");
  li.className = "task-item priority-" + task.priority + (task.completed ? " is-done" : "");
  li.dataset.id = task.id;
  li.draggable = true;
  li.addEventListener("dragstart", function(e) { handleDragStart(e, task.id); });
  li.addEventListener("dragover",  function(e) { handleDragOver(e, task.id); });
  li.addEventListener("drop",      function(e) { handleDrop(e, task.id); });
  li.addEventListener("dragend",   handleDragEnd);

  var dragHandle = document.createElement("span");
  dragHandle.className = "drag-handle";
  dragHandle.textContent = "\u283F";
  dragHandle.setAttribute("aria-hidden", "true");

  var checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", "Mark \"" + task.text + "\" as " + (task.completed ? "pending" : "completed"));
  checkbox.addEventListener("change", function() { toggleTask(task.id); });

  var body = document.createElement("div");
  body.className = "task-body";

  var textSpan = document.createElement("span");
  textSpan.className = "task-text";
  textSpan.textContent = task.text;
  textSpan.title = "Double-click to edit";
  textSpan.addEventListener("dblclick", function() { startEditing(textSpan, task); });

  var metaRow = document.createElement("div");
  metaRow.className = "task-meta-row";

  if (task.priority !== "medium") {
    var pb = document.createElement("span");
    pb.className = "priority-badge priority-" + task.priority;
    pb.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    metaRow.appendChild(pb);
  }
  if (task.dueDate) {
    var overdue = isDueOverdue(task);
    var soon    = !overdue && isDueSoon(task);
    var db = document.createElement("span");
    db.className = "due-badge" + (overdue ? " overdue" : soon ? " due-soon" : "");
    db.textContent = "Due: " + formatDate(task.dueDate);
    metaRow.appendChild(db);
  }
  if (task.tag) {
    var tb = document.createElement("span");
    tb.className = "tag-badge";
    tb.textContent = task.tag;
    metaRow.appendChild(tb);
  }
  if (task.repeat) {
    var rb = document.createElement("span");
    rb.className = "repeat-badge";
    rb.textContent = task.repeat;
    metaRow.appendChild(rb);
  }

  var subtasksArea   = buildSubtasksArea(task);
  var subtasksToggle = buildSubtasksToggle(task, subtasksArea);

  body.appendChild(textSpan);
  body.appendChild(metaRow);
  body.appendChild(subtasksToggle);
  body.appendChild(subtasksArea);

  var delBtn = document.createElement("button");
  delBtn.className = "delete-btn";
  delBtn.textContent = "\xD7";
  delBtn.setAttribute("aria-label", "Delete task: " + task.text);
  delBtn.addEventListener("click", function() { deleteTask(task.id); });

  li.appendChild(dragHandle);
  li.appendChild(checkbox);
  li.appendChild(body);
  li.appendChild(delBtn);
  return li;
}

function buildSubtasksArea(task) {
  var area = document.createElement("div");
  area.className = "subtasks-area";
  area.style.display = "none";

  if (task.subtasks.length > 0) {
    var subList = document.createElement("ul");
    subList.className = "subtask-list";
    task.subtasks.forEach(function(sub) {
      var subLi    = document.createElement("li");
      subLi.className = "subtask-item" + (sub.completed ? " is-done" : "");
      var subCheck = document.createElement("input");
      subCheck.type = "checkbox";
      subCheck.className = "subtask-checkbox";
      subCheck.checked = sub.completed;
      subCheck.addEventListener("change", function() { toggleSubtask(task.id, sub.id); });
      var subText  = document.createElement("span");
      subText.className = "subtask-text";
      subText.textContent = sub.text;
      var subDel   = document.createElement("button");
      subDel.className = "subtask-delete-btn";
      subDel.textContent = "\xD7";
      subDel.setAttribute("aria-label", "Delete subtask: " + sub.text);
      subDel.addEventListener("click", function() { deleteSubtask(task.id, sub.id); });
      subLi.appendChild(subCheck);
      subLi.appendChild(subText);
      subLi.appendChild(subDel);
      subList.appendChild(subLi);
    });
    area.appendChild(subList);
  }

  var inputRow  = document.createElement("div");
  inputRow.className = "subtask-input-row";
  var subInput  = document.createElement("input");
  subInput.type = "text";
  subInput.className = "subtask-input";
  subInput.placeholder = "Add subtask...";
  subInput.maxLength = 100;
  var subAddBtn = document.createElement("button");
  subAddBtn.className = "subtask-add-btn";
  subAddBtn.textContent = "+";
  subAddBtn.setAttribute("aria-label", "Add subtask");
  subAddBtn.addEventListener("click", function() { if (addSubtask(task.id, subInput.value)) subInput.value = ""; });
  subInput.addEventListener("keydown", function(e) { if (e.key === "Enter") subAddBtn.click(); });
  inputRow.appendChild(subInput);
  inputRow.appendChild(subAddBtn);
  area.appendChild(inputRow);
  return area;
}

function buildSubtasksToggle(task, area) {
  var btn = document.createElement("button");
  btn.className = "subtasks-toggle-btn";
  var done  = task.subtasks.filter(function(s) { return s.completed; }).length;
  var total = task.subtasks.length;
  function label() {
    var isOpen = area.style.display !== "none";
    var arrow = isOpen ? "\u25BE" : "\u25B8";
    return total > 0 ? arrow + " " + done + "/" + total + " subtask" + (total !== 1 ? "s" : "") : arrow + " Add subtask";
  }
  btn.textContent = label();
  btn.setAttribute("aria-expanded", "false");
  btn.addEventListener("click", function() {
    var isOpen = area.style.display !== "none";
    area.style.display = isOpen ? "none" : "flex";
    btn.textContent = label();
    btn.setAttribute("aria-expanded", String(!isOpen));
  });
  return btn;
}

// Inline Editing
function startEditing(span, task) {
  var input   = document.createElement("input");
  input.type  = "text";
  input.className = "task-edit-input";
  input.value = task.text;
  input.maxLength = 200;
  span.replaceWith(input);
  input.focus();
  input.select();
  function commit() {
    var newText = input.value.trim();
    if (newText && newText !== task.text) editTask(task.id, newText);
    else render();
  }
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter")  input.blur();
    if (e.key === "Escape") { input.value = task.text; input.blur(); }
  });
}

// Date Helpers
function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isDueOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate + "T00:00:00") < new Date(new Date().toDateString());
}

function isDueSoon(task) {
  if (!task.dueDate || task.completed) return false;
  var diff = (new Date(task.dueDate + "T00:00:00") - new Date(new Date().toDateString())) / 86400000;
  return diff >= 0 && diff <= 2;
}

function getEmptyMessage() {
  if (searchQuery)                   return "No tasks match \"" + searchQuery + "\"";
  if (tasks.length === 0)            return "No tasks yet. Add one above!";
  if (currentFilter === "pending")   return "No pending tasks. All done!";
  if (currentFilter === "completed") return "No completed tasks yet.";
  return "Nothing here.";
}

// Event Listeners
addBtn.addEventListener("click", function() { addTask(taskInput.value); });
taskInput.addEventListener("keydown", function(e) { if (e.key === "Enter") addTask(taskInput.value); });
filterTabs.forEach(function(tab) { tab.addEventListener("click", function() { setFilter(tab.dataset.filter); }); });
clearCompletedBtn.addEventListener("click", clearCompleted);
themeToggle.addEventListener("click", function() {
  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
});
undoBtn.addEventListener("click", undo);
searchInput.addEventListener("input",  function(e) { searchQuery      = e.target.value.trim(); render(); });
sortSelect.addEventListener("change",  function(e) { currentSort      = e.target.value;        render(); });
tagFilterSel.addEventListener("change", function(e) { currentTagFilter = e.target.value;       render(); });

document.addEventListener("keydown", function(e) {
  if (e.key === "/" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); taskInput.focus(); }
});

// PWA Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("./sw.js").catch(function() {});
  });
}

// Boot
undoToast.style.display = "none";
loadTheme();
loadTasks();
render();