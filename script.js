// ブラウザに保存（リロード・タブを閉じても維持 / 失敗時は同一タブ内バックアップ）
const STORAGE_KEY = 'todos';

function loadTodos() {
  try {
    const localRaw = localStorage.getItem(STORAGE_KEY);
    if (localRaw !== null) {
      const parsed = JSON.parse(localRaw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) { /* 壊れたデータやプライベートモードなど */ }

  try {
    const sessRaw = sessionStorage.getItem(STORAGE_KEY);
    if (sessRaw !== null) {
      const parsed = JSON.parse(sessRaw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {}

  return [];
}

function normalizeTodo(t, index) {
  let id = t != null && t.id != null ? Number(t.id) : NaN;
  if (!id || isNaN(id)) id = Date.now() + (typeof index === 'number' ? index : 0);
  const text = String(t.text == null ? '' : t.text);
  const done = !!t.done;
  let dueDate = null;
  if (typeof t.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)) {
    dueDate = t.dueDate;
  }
  return { id: id, text: text, done: done, dueDate: dueDate };
}

function hasDueDate(t) {
  return !!(t && t.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(String(t.dueDate)));
}

/** 期限が近い順（日付文字列は YYYY-MM-DD で先頭が近い＝若い）。期限なしは常に末尾。 */
function sortTodos() {
  todos.sort(function(a, b) {
    const aOk = hasDueDate(a);
    const bOk = hasDueDate(b);
    if (!aOk && !bOk) return a.id - b.id;
    if (!aOk) return 1;
    if (!bOk) return -1;
    if (a.dueDate !== b.dueDate) {
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    return a.id - b.id;
  });
}

let todos = loadTodos().map(function(t, i) { return normalizeTodo(t, i); });
sortTodos();
let currentFilter = 'all';

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function isOverdue(dueDate, done) {
  if (done || !dueDate) return false;
  return dueDate < todayYmd();
}

function save() {
  sortTodos();
  const data = JSON.stringify(todos);
  try {
    localStorage.setItem(STORAGE_KEY, data);
  } catch (e) { /* 容量・拒否など */ }
  try {
    sessionStorage.setItem(STORAGE_KEY, data);
  } catch (e) {}
}

function addTodo() {
  const input = document.getElementById('todoInput');
  const dueEl = document.getElementById('dueInput');
  const text = input.value.trim();
  if (!text) return;

  const rawDue = dueEl.value && /^\d{4}-\d{2}-\d{2}$/.test(dueEl.value) ? dueEl.value : null;
  todos.push({
    id: Date.now(),
    text: text,
    done: false,
    dueDate: rawDue
  });
  input.value = '';
  dueEl.value = '';
  save();
  render();
}

function setDueDate(id, value) {
  const todo = todos.find(function(t) { return t.id === id; });
  if (!todo) return;
  todo.dueDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  save();
  render();
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) todo.done = !todo.done;
  save();
  render();
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  save();
  render();
}

function clearDone() {
  todos = todos.filter(t => !t.done);
  save();
  render();
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function render() {
  const list = document.getElementById('todoList');
  const activeCount = todos.filter(t => !t.done).length;

  document.getElementById('countLabel').textContent =
    `残り ${activeCount} 件`;

  const filtered = todos.filter(t => {
    if (currentFilter === 'active') return !t.done;
    if (currentFilter === 'done')   return t.done;
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty">タスクはありません</div>';
    return;
  }

  list.innerHTML = filtered.map(t => {
    const overdue = isOverdue(t.dueDate, t.done);
    const dueVal = t.dueDate ? escapeHtml(t.dueDate) : '';
    return `
    <li class="todo-item ${t.done ? 'done' : ''} ${overdue ? 'overdue' : ''}" data-id="${t.id}">
      <label class="todo-check">
        <input type="checkbox" ${t.done ? 'checked' : ''}
               onchange="toggleTodo(${t.id})"
               aria-label="完了にする" />
      </label>
      <span class="todo-text">${escapeHtml(t.text)}</span>
      <div class="todo-actions">
        <input type="date" class="todo-due-input" value="${dueVal}"
               onchange="setDueDate(${t.id}, this.value)"
               aria-label="期限" />
        <button type="button" class="delete-btn" onclick="deleteTodo(${t.id})" aria-label="このタスクを削除">削除</button>
      </div>
    </li>`;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Enterキーでも追加できる
document.getElementById('todoInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addTodo();
});

// 最初の表示
render();
