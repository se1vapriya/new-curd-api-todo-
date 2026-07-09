const API_BASE = "/todos";

const titleInput = document.getElementById("title-input");
const newDescInput = document.getElementById("new-description-input");
const addBtn = document.getElementById("add-btn");
const refreshBtn = document.getElementById("refresh-btn");
const searchInput = document.getElementById("search-input");
const listEl = document.getElementById("todo-list");
const loadingEl = document.getElementById("loading");
const emptyStateEl = document.getElementById("empty-state");
const errorEl = document.getElementById("error");
const pageDateEl = document.getElementById("page-date");
const pageSummaryEl = document.getElementById("page-summary");
const navEl = document.querySelector(".sidebar__nav");
const blockTemplate = document.getElementById("todo-block-template");
const logoutBtn = document.getElementById("logout-btn");

const countAllEl = document.getElementById("count-all");
const countActiveEl = document.getElementById("count-active");
const countCompletedEl = document.getElementById("count-completed");

let todos = [];
let currentFilter = "all";
let searchQuery = "";
let editingId = null;

pageDateEl.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

async function apiRequest(path, options) {
  const res = await fetch(path, options);
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

// ---------- Read ----------

async function loadTodos() {
  loadingEl.hidden = false;
  clearError();
  try {
    todos = await apiRequest(API_BASE);
  } catch (err) {
    showError(`Could not load todos: ${err.message}`);
    todos = [];
  } finally {
    loadingEl.hidden = true;
    render();
  }
}

// ---------- Create ----------

async function createTodo(title, description) {
  clearError();
  try {
    const created = await apiRequest(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || null, completed: false }),
    });
    todos.push(created);
    render();
  } catch (err) {
    showError(`Could not create todo: ${err.message}`);
  }
}

// ---------- Update ----------

async function updateTodo(id, patch) {
  const existing = todos.find((t) => t.id === id);
  if (!existing) return;
  clearError();
  try {
    const updated = await apiRequest(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: existing.title,
        description: existing.description,
        completed: existing.completed,
        ...patch,
      }),
    });
    todos = todos.map((t) => (t.id === id ? updated : t));
    render();
  } catch (err) {
    showError(`Could not update todo: ${err.message}`);
    render();
  }
}

// ---------- Delete ----------

async function deleteTodo(id) {
  clearError();
  try {
    await apiRequest(`${API_BASE}/${id}`, { method: "DELETE" });
    todos = todos.filter((t) => t.id !== id);
    render();
  } catch (err) {
    showError(`Could not delete todo: ${err.message}`);
  }
}

function filteredTodos() {
  let result = todos;
  if (currentFilter === "active") result = result.filter((t) => !t.completed);
  if (currentFilter === "completed") result = result.filter((t) => t.completed);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
    );
  }
  return result;
}

function updateCounts() {
  const active = todos.filter((t) => !t.completed).length;
  const completed = todos.length - active;
  countAllEl.textContent = todos.length || "";
  countActiveEl.textContent = active || "";
  countCompletedEl.textContent = completed || "";
  pageSummaryEl.textContent = todos.length
    ? `${active} active, ${completed} completed`
    : "No todos yet";
}

function render() {
  listEl.innerHTML = "";
  const visible = filteredTodos();

  emptyStateEl.hidden = visible.length !== 0;
  updateCounts();

  for (const todo of visible) {
    listEl.appendChild(renderBlock(todo));
  }
}

function renderBlock(todo) {
  const node = blockTemplate.content.cloneNode(true);
  const block = node.querySelector(".block");
  const checkbox = node.querySelector(".block__checkbox-input");
  const title = node.querySelector(".block__title");
  const desc = node.querySelector(".block__desc");
  const editTitle = node.querySelector(".block__edit-title");
  const editDesc = node.querySelector(".block__edit-desc");
  const editBtn = node.querySelector(".block__btn-edit");
  const deleteBtn = node.querySelector(".block__btn-delete");
  const saveBtn = node.querySelector(".block__btn-save");
  const cancelBtn = node.querySelector(".block__btn-cancel");

  block.classList.toggle("completed", todo.completed);
  block.classList.toggle("block--editing", todo.id === editingId);

  checkbox.checked = todo.completed;
  title.textContent = todo.title;
  desc.textContent = todo.description || "";
  editTitle.value = todo.title;
  editDesc.value = todo.description || "";

  checkbox.addEventListener("change", () => {
    updateTodo(todo.id, { completed: checkbox.checked });
  });

  editBtn.addEventListener("click", () => {
    editingId = todo.id;
    render();
  });

  cancelBtn.addEventListener("click", () => {
    editingId = null;
    render();
  });

  deleteBtn.addEventListener("click", () => {
    if (!confirm(`Delete "${todo.title}"?`)) return;
    deleteTodo(todo.id);
  });

  const save = () => {
    const newTitle = editTitle.value.trim();
    if (!newTitle) {
      showError("Title cannot be empty.");
      return;
    }
    editingId = null;
    updateTodo(todo.id, { title: newTitle, description: editDesc.value.trim() || null });
  };

  saveBtn.addEventListener("click", save);

  editTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      editingId = null;
      render();
    }
  });

  editDesc.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      editingId = null;
      render();
    }
  });

  return node;
}

function handleCreate() {
  const title = titleInput.value.trim();
  if (!title) {
    showError("Title cannot be empty.");
    titleInput.focus();
    return;
  }
  const description = newDescInput.value.trim();
  createTodo(title, description);
  titleInput.value = "";
  newDescInput.value = "";
  titleInput.focus();
}

addBtn.addEventListener("click", handleCreate);

titleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleCreate();
});

newDescInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleCreate();
});

refreshBtn.addEventListener("click", loadTodos);

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim();
  render();
});

navEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".sidebar__item");
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  [...navEl.children].forEach((c) => c.classList.toggle("active", c === btn));
  render();
});

logoutBtn.addEventListener("click", async () => {
  try {
    await fetch("/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
});

loadTodos();
