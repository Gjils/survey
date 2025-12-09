const tierOrder = ['S', 'A', 'B', 'C', 'D', 'Unassigned'];
const tierColors = {
  S: 'var(--tier-s)',
  A: 'var(--tier-a)',
  B: 'var(--tier-b)',
  C: 'var(--tier-c)',
  D: 'var(--tier-d)',
  Unassigned: 'var(--tier-unassigned)'
};

const baseParticipants = [
  'Гоша', 'Саша', 'Антон', 'Леша Борисов', 'Леша Преображенский',
  'Дима Трушин', 'Дима Герасимов', 'Стёпа', 'Анна', 'Пуфик', 'Лера', 'Эмиль', 'Даня',
  'Матвей Перминов', 'Матвей Исупов', 'Микаэл', 'Виктор', 'Денис', 'Иван Рекунов',
  'Игорь', 'Влад', 'Руслан', 'Роман', 'Андрей', 'Чечел'
];

const baseCategories = [
  'Инфантильность',
  'Привлекательность',
  'Адекватность',
  'Приятность проведения времени с...',
  'Чувство юмора',
  'Вероятность остаться в одиночестве',
  'Вероятность жениться первым',
  'Частота перепадов настроения',
  'Везучесть',
  'Склонность пиздеть',
  'Задротство',
  'Скорость влюбления',
  'Степень перфекционизма',
  'Религиозность',
  'Способности к преподаванию',
  'Вероятность внезапно пропасть',
  'Количество друзей',
  'Склонность плакать',
  'Вероятность стать фермером',
  'Романтичность',
  'Азартность',
  'Время отхода ко сну',
  'Степень ненависти к...'
];

let participants = [];
let categories = [];
let selectedCategoryId = null;
let currentDragId = null;

// DOM shortcuts
const categoryCountEl = document.getElementById('category-count');
const categoryListEl = document.getElementById('category-list');
const activeCategoryNameEl = document.getElementById('active-category-name');
const tierContainerEl = document.getElementById('tier-container');
const unassignedListEl = document.getElementById('unassigned-list');
const unassignedCountEl = document.getElementById('unassigned-count');
const resetCategoryBtn = document.getElementById('reset-category');
const exportJsonBtn = document.getElementById('export-json');
const exportCsvBtn = document.getElementById('export-csv');
const importJsonInput = document.getElementById('import-json');

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function createEmptyTiers() {
  return tierOrder.reduce((acc, t) => ({ ...acc, [t]: [] }), {});
}

function createCategory(name) {
  const newCat = { id: uuid(), name: name.trim(), tiers: createEmptyTiers() };
  newCat.tiers.Unassigned = participants.map((p) => p.id);
  return newCat;
}

function saveState() {
  const snapshot = { participants, categories, selectedCategoryId };
  localStorage.setItem('tierlist-state', JSON.stringify(snapshot));
}

function loadState() {
  const raw = localStorage.getItem('tierlist-state');
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.participants) && Array.isArray(parsed.categories)) {
      participants = parsed.participants;
      categories = parsed.categories;
      selectedCategoryId = parsed.selectedCategoryId || (categories[0]?.id ?? null);
      return true;
    }
  } catch (e) {
    console.warn('Не удалось прочитать сохранённое состояние', e);
  }
  return false;
}

function seedDefault() {
  participants = baseParticipants.map((name) => ({ id: uuid(), name }));
  categories = baseCategories.map((name) => createCategory(name));
  selectedCategoryId = categories[0].id;
}

function render() {
  renderCategories();
  renderBoard();
  saveState();
}

function renderCategories() {
  categoryCountEl.textContent = categories.length.toString();
  categoryListEl.innerHTML = '';
  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-btn' + (cat.id === selectedCategoryId ? ' active' : '');
    btn.innerHTML = `${cat.name}<small>${countPlaced(cat)}/${participants.length}</small>`;
    btn.addEventListener('click', () => {
      selectedCategoryId = cat.id;
      render();
    });
    categoryListEl.appendChild(btn);
  });
}

function countPlaced(cat) {
  const placed = tierOrder
    .filter((t) => t !== 'Unassigned')
    .reduce((acc, t) => acc + cat.tiers[t].length, 0);
  return placed;
}

function renderBoard() {
  const category = categories.find((c) => c.id === selectedCategoryId);
  if (!category) {
    activeCategoryNameEl.textContent = 'Нет категорий';
    tierContainerEl.innerHTML = '';
    unassignedListEl.innerHTML = '';
    unassignedCountEl.textContent = '0';
    return;
  }

  activeCategoryNameEl.textContent = category.name;
  tierContainerEl.innerHTML = '';

  const mainTiers = tierOrder.filter((t) => t !== 'Unassigned');
  mainTiers.forEach((tierId) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'tier';

    const header = document.createElement('div');
    header.className = 'tier-header';
    const title = document.createElement('div');
    title.textContent = `${tierId} Tier`;
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.style.background = tierColors[tierId];
    tag.textContent = tierId;

    header.appendChild(title);
    header.appendChild(tag);
    wrapper.appendChild(header);

    const list = document.createElement('div');
    list.className = 'tier-list';
    list.dataset.tierId = tierId;

    category.tiers[tierId].forEach((personId) => {
      const person = participants.find((p) => p.id === personId);
      if (!person) return;
      list.appendChild(makePersonCard(person));
    });

    enableDnd(list);
    wrapper.appendChild(list);
    tierContainerEl.appendChild(wrapper);
  });

  // Render unassigned on the right
  unassignedListEl.innerHTML = '';
  category.tiers.Unassigned.forEach((personId) => {
    const person = participants.find((p) => p.id === personId);
    if (!person) return;
    unassignedListEl.appendChild(makePersonCard(person));
  });
  enableDnd(unassignedListEl);
  unassignedCountEl.textContent = category.tiers.Unassigned.length.toString();
}

function makePersonCard(person) {
  const card = document.createElement('div');
  card.className = 'person-card';
  card.draggable = true;
  card.dataset.personId = person.id;
  card.innerHTML = `<span>${person.name}</span><span class="drag-handle">⋮⋮</span>`;

  card.addEventListener('dragstart', () => {
    currentDragId = person.id;
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => {
    currentDragId = null;
    card.classList.remove('dragging');
    syncStateFromDom();
  });

  return card;
}

function enableDnd(listEl) {
  listEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    listEl.classList.add('drag-over');
    const afterElement = getDragAfterElement(listEl, e.clientY);
    const dragging = document.querySelector('.dragging');
    if (!dragging) return;
    if (afterElement == null) {
      listEl.appendChild(dragging);
    } else {
      listEl.insertBefore(dragging, afterElement);
    }
  });

  listEl.addEventListener('dragleave', () => listEl.classList.remove('drag-over'));
  listEl.addEventListener('drop', (e) => {
    e.preventDefault();
    listEl.classList.remove('drag-over');
    syncStateFromDom();
  });
}

// Finds the DOM element that comes after the current cursor position; used to place the dragged card precisely.
function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.person-card:not(.dragging)')];
  return elements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function syncStateFromDom() {
  const category = categories.find((c) => c.id === selectedCategoryId);
  if (!category) return;
  const updated = createEmptyTiers();
  document.querySelectorAll('.tier-list').forEach((list) => {
    const tierId = list.dataset.tierId;
    updated[tierId] = [...list.children].map((child) => child.dataset.personId);
  });
  category.tiers = updated;
  renderCategories();
  saveState();
}

function resetCategory() {
  const cat = categories.find((c) => c.id === selectedCategoryId);
  if (!cat) return;
  cat.tiers = createEmptyTiers();
  cat.tiers.Unassigned = participants.map((p) => p.id);
  render();
}

function exportJson() {
  const payload = {
    generatedAt: new Date().toISOString(),
    participants,
    categories
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'tierlist.json');
}

function exportCsv() {
  const lines = ['category,rank,person,tier'];
  categories.forEach((cat) => {
    const ordered = tierOrder
      .filter((t) => t !== 'Unassigned')
      .flatMap((tier) => cat.tiers[tier].map((id) => ({ id, tier })));
    ordered.forEach((entry, idx) => {
      const person = participants.find((p) => p.id === entry.id);
      if (!person) return;
      lines.push(`"${cat.name}",${idx + 1},"${person.name}",${entry.tier}`);
    });
    // Append unassigned at the end, with empty rank to highlight незавершённость
    cat.tiers.Unassigned.forEach((id) => {
      const person = participants.find((p) => p.id === id);
      if (!person) return;
      lines.push(`"${cat.name}",,"${person.name}",Unassigned`);
    });
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'tierlist.csv');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.participants) || !Array.isArray(parsed.categories)) {
        alert('Неверная структура файла');
        return;
      }
      participants = parsed.participants;
      categories = parsed.categories;
      selectedCategoryId = categories[0]?.id ?? null;
      render();
    } catch (err) {
      alert('Не удалось прочитать JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// Event bindings
resetCategoryBtn.addEventListener('click', resetCategory);
exportJsonBtn.addEventListener('click', exportJson);
exportCsvBtn.addEventListener('click', exportCsv);
importJsonInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) handleImport(file);
  importJsonInput.value = '';
});

// Kick-off
if (!loadState()) {
  seedDefault();
}
render();
