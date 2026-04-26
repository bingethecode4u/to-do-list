/* ── To-Do App — app.js ───────────────────────────────────── */
"use strict";

const STORAGE_KEY = "todo_tasks";

// ── State ──────────────────────────────────────────────────
let tasks = [];
let currentFilter = "all"; // "all" | "pending" | "completed"

// ── DOM References ─────────────────────────────────────────
const taskInput          = document.getElementById("taskInput");
const addBtn             = document.getElementById("addBtn");
const taskList           = document.getElementById("taskList");
const taskCounter        = document.getElementById("taskCounter");
const emptyState         = document.getElementById("emptyState");
const emptyMessage       = document.getElementById("emptyMessage");
const clearCompletedBtn  = document.getElementById("clearCompletedBtn");
const filterTabs         = document.querySelectorAll(".tab");

// ── LocalStorage helpers ───────────────────────────────────
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(tasks)) tasks = [];
  } catch {
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ── Core Operations ────────────────────────────────────────
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  tasks.push({ id: Date.now(), text: trimmed, completed: false });
  saveTasks();
  render();

  taskInput.value = "";
  taskInput.focus();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    render();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
}

// ── Filter ─────────────────────────────────────────────────
function setFilter(filter) {
  currentFilter = filter;

  filterTabs.forEach(tab => {
    const isActive = tab.dataset.filter === filter;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive);
  });

  render();
}

function getFilteredTasks() {
  switch (currentFilter) {
    case "pending":   return tasks.filter(t => !t.completed);
    case "completed": return tasks.filter(t =>  t.completed);
    default:          return tasks;
  }
}

// ── Render ─────────────────────────────────────────────────
function render() {
  const filtered = getFilteredTasks();

  // counter always reflects ALL pending, not just filtered view
  const pendingCount = tasks.filter(t => !t.completed).length;
  taskCounter.textContent = pendingCount === 1 ? "1 task left" : `${pendingCount} tasks left`;

  // show / hide "Clear done" button based on whether any completed tasks exist
  clearCompletedBtn.style.visibility = tasks.some(t => t.completed) ? "visible" : "hidden";

  // empty state
  if (filtered.length === 0) {
    taskList.innerHTML = "";
    emptyState.hidden = false;
    emptyMessage.textContent = getEmptyMessage();
    return;
  }

  emptyState.hidden = true;

  // Build list items using a document fragment for efficiency
  const fragment = document.createDocumentFragment();

  filtered.forEach(task => {
    const li = document.createElement("li");
    li.className = "task-item" + (task.completed ? " is-done" : "");
    li.dataset.id = task.id;

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Mark "${task.text}" as ${task.completed ? "pending" : "completed"}`);
    checkbox.addEventListener("change", () => toggleTask(task.id));

    // Text
    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.setAttribute("aria-label", `Delete task: ${task.text}`);
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);
    fragment.appendChild(li);
  });

  taskList.innerHTML = "";
  taskList.appendChild(fragment);
}

function getEmptyMessage() {
  if (tasks.length === 0)       return "No tasks yet. Add one above!";
  if (currentFilter === "pending")   return "No pending tasks. All done!";
  if (currentFilter === "completed") return "No completed tasks yet.";
  return "Nothing here.";
}

// ── Event Listeners ────────────────────────────────────────
addBtn.addEventListener("click", () => addTask(taskInput.value));

taskInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addTask(taskInput.value);
});

filterTabs.forEach(tab => {
  tab.addEventListener("click", () => setFilter(tab.dataset.filter));
});

clearCompletedBtn.addEventListener("click", clearCompleted);

// ── Boot ───────────────────────────────────────────────────
loadTasks();
render();
