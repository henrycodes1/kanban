const board = document.querySelector(".board");
const toast = document.getElementById("toast");

const listsData = {
  list1: { title: "To Do", tasks: [] },
  list2: { title: "In Progress", tasks: [] },
  list3: { title: "Done", tasks: [] }
};

// === Load from Local Storage or initialize ===
function loadBoard() {
  const saved = JSON.parse(localStorage.getItem("kanbanData")) || {};
  board.innerHTML = "";

  for (const id in listsData) {
    const title = listsData[id].title;
    const tasks = saved[id] || [];
    const listEl = createList(title, id, tasks);
    board.appendChild(listEl);
  }

  updateAnalytics();
}

// === Create List UI ===
function createList(title, id, tasks = []) {
  const list = document.createElement("div");
  list.className = "list";
  list.id = id;

  const heading = document.createElement("h2");
  heading.textContent = title;
  list.appendChild(heading);

  tasks.forEach(task => {
    const card = createCard(task);
    list.appendChild(card);
  });

  addDragListeners(list);
  return list;
}

// === Create Card UI ===
function createCard(task) {
  const card = document.createElement("div");
  card.className = "card";
  card.id = task.id;
  card.setAttribute("draggable", "true");
  card.dataset.task = JSON.stringify(task);

  const span = document.createElement("span");
  span.textContent = task.text;

  const historyBtn = document.createElement("button");
  historyBtn.className = "delete-btn";
  historyBtn.innerHTML = `<i class="fas fa-clock"></i>`;
  historyBtn.onclick = () => openHistoryModal(task);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "✖";
  deleteBtn.onclick = () => {
    card.remove();
    saveToLocalStorage();
    updateAnalytics();
    showToast("Task deleted");
  };

  span.ondblclick = () => openEditModal(task.text, span);

  card.append(span, historyBtn, deleteBtn);
  card.addEventListener("dragstart", dragStart);
  card.addEventListener("dragend", dragEnd);

  return card;
}

// === Drag Events ===
function dragStart(e) {
  e.dataTransfer.setData("text/plain", this.id);
}
function dragEnd() {}
function dragOver(e) { e.preventDefault(); }
function dragEnter(e) {
  e.preventDefault();
  this.classList.add("over");
}
function dragLeave() {
  this.classList.remove("over");
}
function dragDrop(e) {
  const cardId = e.dataTransfer.getData("text/plain");
  const card = document.getElementById(cardId);
  const task = JSON.parse(card.dataset.task);
  const newListName = this.querySelector("h2")?.textContent || this.id;

  addHistoryEntry(task, `moved to ${newListName}`);
  card.dataset.task = JSON.stringify(task);
  this.appendChild(card);
  this.classList.remove("over");

  saveToLocalStorage();
  updateAnalytics();
  showToast(`Moved to ${newListName}`);
}

function addDragListeners(list) {
  list.addEventListener("dragover", dragOver);
  list.addEventListener("dragenter", dragEnter);
  list.addEventListener("dragleave", dragLeave);
  list.addEventListener("drop", dragDrop);
}

// === Local Storage ===
function saveToLocalStorage() {
  const data = {};
  document.querySelectorAll(".list").forEach(list => {
    const cards = list.querySelectorAll(".card");
    data[list.id] = Array.from(cards).map(card => {
      const span = card.querySelector("span");
      const task = JSON.parse(card.dataset.task);
      task.text = span.textContent;
      return task;
    });
  });
  localStorage.setItem("kanbanData", JSON.stringify(data));
}

// === Edit Modal ===
let currentEditSpan = null;
function openEditModal(text, span) {
  currentEditSpan = span;
  document.getElementById("editInput").value = text;
  document.getElementById("editModal").classList.remove("hidden");
}

document.getElementById("cancelEdit").onclick = () => {
  document.getElementById("editModal").classList.add("hidden");
};

document.getElementById("saveEdit").onclick = () => {
  const input = document.getElementById("editInput");
  const newText = input.value.trim();
  if (newText && currentEditSpan) {
    const card = currentEditSpan.closest(".card");
    const task = JSON.parse(card.dataset.task);
    task.text = newText;
    addHistoryEntry(task, "edited");
    card.dataset.task = JSON.stringify(task);
    currentEditSpan.textContent = newText;
    saveToLocalStorage();
    updateAnalytics();
    showToast("Task updated");
  }
  document.getElementById("editModal").classList.add("hidden");
  currentEditSpan = null;
};

// === Add History Entry ===
function addHistoryEntry(task, action) {
  task.history = task.history || [];
  task.history.push({
    action,
    timestamp: new Date().toISOString()
  });
}

// === History Modal ===
function openHistoryModal(task) {
  const list = document.getElementById("historyList");
  list.innerHTML = "";
  (task.history || []).forEach(entry => {
    const div = document.createElement("div");
    div.textContent = `• ${entry.action} (${new Date(entry.timestamp).toLocaleString()})`;
    list.appendChild(div);
  });
  document.getElementById("historyModal").classList.remove("hidden");
}

document.getElementById("closeHistoryBtn").onclick = () => {
  document.getElementById("historyModal").classList.add("hidden");
};

// === Global Add Task Modal ===
document.getElementById("globalAddBtn").onclick = () => {
  document.getElementById("globalTaskModal").classList.remove("hidden");
};

document.getElementById("cancelGlobalTask").onclick = () => {
  document.getElementById("globalTaskModal").classList.add("hidden");
};

document.getElementById("submitGlobalTask").onclick = () => {
  const input = document.getElementById("globalTaskInput");
  const listId = document.getElementById("globalTaskList").value;
  const text = input.value.trim();
  if (!text) return;

  const id = `${listId}-card-${Date.now()}`;
  const task = {
    id,
    text,
    createdAt: new Date().toISOString(),
    history: [{ action: "created", timestamp: new Date().toISOString() }]
  };

  const list = document.getElementById(listId);
  const card = createCard(task);
  list.appendChild(card);

  input.value = "";
  document.getElementById("globalTaskModal").classList.add("hidden");
  saveToLocalStorage();
  updateAnalytics();
  showToast("Task added");
};

// === Theme Toggle ===
document.getElementById("themeToggleBtn").onclick = () => {
  document.body.classList.toggle("dark");
  const icon = document.querySelector("#themeToggleBtn i");
  icon.classList.toggle("fa-sun");
  icon.classList.toggle("fa-moon");
  icon.className = icon.classList.contains("fa-sun") ? "fas fa-moon" : "fas fa-sun";
};

// === Toast Notification ===
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// === Analytics ===
function updateAnalytics() {
  const todo = document.querySelectorAll("#list1 .card").length;
  const progress = document.querySelectorAll("#list2 .card").length;
  const done = document.querySelectorAll("#list3 .card").length;
  const total = todo + progress + done;
  const percent = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("todoCount").textContent = todo;
  document.getElementById("progressCount").textContent = progress;
  document.getElementById("doneCount").textContent = done;
  document.getElementById("donePercent").textContent = `${percent}%`;
}

// === Initialize Board on Page Load ===
document.addEventListener("DOMContentLoaded", loadBoard);
