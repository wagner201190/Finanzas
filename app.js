const STORAGE_KEY = "finanzas-pareja-app";

const defaultState = {
  transactions: [
    {
      id: crypto.randomUUID(),
      description: "Pago de renta",
      amount: 850000,
      type: "expense",
      person: "Ambos",
      category: "Hogar",
      date: "2026-03-25",
    },
    {
      id: crypto.randomUUID(),
      description: "Salario mensual",
      amount: 1600000,
      type: "income",
      person: "Yennifer",
      category: "Salario",
      date: "2026-03-24",
    },
    {
      id: crypto.randomUUID(),
      description: "Mercado de la semana",
      amount: 132400,
      type: "expense",
      person: "Li",
      category: "Comida",
      date: "2026-03-26",
    },
  ],
  goals: [
    {
      id: crypto.randomUUID(),
      name: "Viaje juntos",
      target: 2400000,
      saved: 900000,
    },
  ],
};

const state = loadState();
let editingTransactionId = null; // Guardará el ID de la transacción en edición

const currencyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

const transactionForm = document.querySelector("#transaction-form");
const goalForm = document.querySelector("#goal-form");
const goalDialog = document.querySelector("#goal-dialog");
const addGoalBtn = document.querySelector("#add-goal-btn");
const closeGoalBtn = document.querySelector("#close-goal-btn");
const clearDataBtn = document.querySelector("#clear-data-btn");

const netBalanceElement = document.querySelector("#net-balance");
const incomeTotalElement = document.querySelector("#income-total");
const expenseTotalElement = document.querySelector("#expense-total");
const personSummaryElement = document.querySelector("#person-summary");
const goalsListElement = document.querySelector("#goals-list");
const transactionListElement = document.querySelector("#transaction-list");
const budgetRulesElement = document.querySelector("#budget-rules");
const topSpendingElement = document.querySelector("#top-spending");
const categorySummaryElement = document.querySelector("#category-summary");

// Elementos dinámicos para edición en el formulario
const submitBtn = transactionForm.querySelector("button[type='submit']");
let cancelEditBtn = document.querySelector("#cancel-edit-btn");

initialize();

function initialize() {
  transactionForm.date.value = new Date().toISOString().slice(0, 10);

  // Crear botón de Cancelar edición si no existe en HTML
  if (!cancelEditBtn) {
    cancelEditBtn = document.createElement("button");
    cancelEditBtn.id = "cancel-edit-btn";
    cancelEditBtn.type = "button";
    cancelEditBtn.className = "btn-secondary";
    cancelEditBtn.textContent = "Cancelar edición";
    cancelEditBtn.style.display = "none";
    transactionForm.appendChild(cancelEditBtn);

    cancelEditBtn.addEventListener("click", resetTransactionForm);
  }

  transactionForm.addEventListener("submit", handleTransactionSubmit);
  goalForm.addEventListener("submit", handleGoalSubmit);
  addGoalBtn.addEventListener("click", () => goalDialog.showModal());
  closeGoalBtn.addEventListener("click", () => goalDialog.close());
  clearDataBtn.addEventListener("click", resetDemoData);
  goalsListElement.addEventListener("click", handleGoalActions);
  
  // Escuchar tanto editar como eliminar en el historial
  transactionListElement.addEventListener("click", handleTransactionActions);

  render();
}

function handleTransactionSubmit(event) {
  event.preventDefault();

  const formData = new FormData(transactionForm);
  const description = String(formData.get("description")).trim();
  const amount = Number(formData.get("amount"));
  const type = String(formData.get("type"));
  const person = String(formData.get("person"));
  const category = String(formData.get("category"));
  const date = String(formData.get("date"));

  if (!description || Number.isNaN(amount) || amount <= 0) {
    return;
  }

  if (editingTransactionId) {
    // Modo Edición: Actualizar registro existente
    const index = state.transactions.findIndex((t) => t.id === editingTransactionId);
    if (index !== -1) {
      state.transactions[index] = {
        id: editingTransactionId,
        description,
        amount,
        type,
        person,
        category,
        date,
      };
    }
  } else {
    // Modo Creación: Agregar nuevo registro
    const newTransaction = {
      id: crypto.randomUUID(),
      description,
      amount,
      type,
      person,
      category,
      date,
    };
    state.transactions.unshift(newTransaction);
  }

  persistState();
  resetTransactionForm();
  render();
}

function resetTransactionForm() {
  editingTransactionId = null;
  transactionForm.reset();
  transactionForm.date.value = new Date().toISOString().slice(0, 10);
  submitBtn.textContent = "Guardar movimiento";
  if (cancelEditBtn) {
    cancelEditBtn.style.display = "none";
  }
}

function handleTransactionActions(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const transactionId = target.dataset.transactionId;
  const action = target.dataset.action;

  if (!transactionId) {
    return;
  }

  if (action === "delete") {
    // Eliminar
    state.transactions = state.transactions.filter((item) => item.id !== transactionId);
    if (editingTransactionId === transactionId) {
      resetTransactionForm();
    }
    persistState();
    render();
  } else if (action === "edit") {
    // Cargar para Editar
    const transaction = state.transactions.find((item) => item.id === transactionId);
    if (!transaction) return;

    editingTransactionId = transaction.id;
    transactionForm.description.value = transaction.description;
    transactionForm.amount.value = transaction.amount;
    transactionForm.type.value = transaction.type;
    transactionForm.person.value = transaction.person;
    transactionForm.category.value = transaction.category;
    transactionForm.date.value = transaction.date;

    submitBtn.textContent = "Actualizar movimiento";
    cancelEditBtn.style.display = "inline-block";

    // Hacer scroll suave hacia el formulario
    transactionForm.scrollIntoView({ behavior: "smooth" });
  }
}

function handleGoalSubmit(event) {
  event.preventDefault();

  const formData = new FormData(goalForm);
  const goal = {
    id: crypto.randomUUID(),
    name: String(formData.get("name")).trim(),
    target: Number(formData.get("target")),
    saved: Number(formData.get("saved")),
  };

  if (!goal.name || Number.isNaN(goal.target) || goal.target <= 0 || Number.isNaN(goal.saved)) {
    return;
  }

  state.goals.unshift(goal);
  persistState();
  goalForm.reset();
  goalDialog.close();
  render();
}

function handleGoalActions(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const goalId = target.dataset.goalId;
  const action = target.dataset.action;
  if (!goalId || !action) {
    return;
  }

  const goal = state.goals.find((item) => item.id === goalId);
  if (!goal) {
    return;
  }

  const step = Math.max(goal.target * 0.1, 1);

  if (action === "add") {
    goal.saved = Math.min(goal.target, goal.saved + step);
  }

  if (action === "remove") {
    goal.saved = Math.max(0, goal.saved - step);
  }

  persistState();
  render();
}

function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY);
  state.transactions = structuredClone(defaultState.transactions);
  state.goals = structuredClone(defaultState.goals);
  resetTransactionForm();
  persistState();
  render();
}

function render() {
  const totals = calculateTotals();
  netBalanceElement.textContent = formatCurrency(totals.balance);
  incomeTotalElement.textContent = formatCurrency(totals.income);
  expenseTotalElement.textContent = formatCurrency(totals.expense);
  personSummaryElement.innerHTML = renderPersonSummary(totals.byPerson);
  budgetRulesElement.innerHTML = renderBudgetRules(totals);
  topSpendingElement.innerHTML = renderTopSpending(totals.topCategories);
  goalsListElement.innerHTML = renderGoals();
  categorySummaryElement.innerHTML = renderCategorySummary(totals.categoryExpenses);
  transactionListElement.innerHTML = renderTransactions();
}

function calculateTotals() {
  const totals = {
    income: 0,
    expense: 0,
    balance: 0,
    byPerson: {
      Yennifer: { income: 0, expense: 0 },
      Li: { income: 0, expense: 0 },
      Ambos: { income: 0, expense: 0 },
    },
    categoryExpenses: {},
    topCategories: [],
    budgetModel: [],
  };

  for (const transaction of state.transactions) {
    if (!totals.byPerson[transaction.person]) {
      totals.byPerson[transaction.person] = { income: 0, expense: 0 };
    }

    if (transaction.type === "income") {
      totals.income += transaction.amount;
      totals.byPerson[transaction.person].income += transaction.amount;
    } else {
      totals.expense += transaction.amount;
      totals.byPerson[transaction.person].expense += transaction.amount;
      totals.categoryExpenses[transaction.category] =
        (totals.categoryExpenses[transaction.category] || 0) + transaction.amount;
    }
  }

  totals.balance = totals.income - totals.expense;
  totals.topCategories = Object.entries(totals.categoryExpenses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  totals.budgetModel = buildBudgetModel(totals.income, totals.categoryExpenses);
  return totals;
}

function buildBudgetModel(income, categoryExpenses) {
  const fixedCategories = ["Hogar", "Salud", "Transporte"];
  const variableCategories = ["Comida", "Ocio", "Extra"];
  const savingsCategories = ["Ahorro"];

  const fixedSpent = sumCategories(categoryExpenses, fixedCategories);
  const variableSpent = sumCategories(categoryExpenses, variableCategories);
  const savingsSpent = sumCategories(categoryExpenses, savingsCategories);

  return [
    {
      icon: "🔒",
      title: "50% Gastos fijos esenciales",
      targetPercent: 50,
      targetAmount: income * 0.5,
      currentAmount: fixedSpent,
      description: "Hogar, salud y transporte.",
    },
    {
      icon: "🎯",
      title: "30% Gastos variables / estilo de vida",
      targetPercent: 30,
      targetAmount: income * 0.3,
      currentAmount: variableSpent,
      description: "Comida, ocio y extras.",
    },
    {
      icon: "🌱",
      title: "20% Ahorro y metas",
      targetPercent: 20,
      targetAmount: income * 0.2,
      currentAmount: savingsSpent,
      description: "Ahorro registrado dentro de la app.",
    },
  ];
}

function sumCategories(categoryExpenses, categories) {
  return categories.reduce((sum, category) => sum + (categoryExpenses[category] || 0), 0);
}

function renderPersonSummary(byPerson) {
  return Object.entries(byPerson)
    .map(([person, values]) => {
      const net = values.income - values.expense;
      return `
        <article class="summary-item">
          <div class="summary-item__row">
            <strong>${escapeHtml(person)}</strong>
            <span class="pill ${net >= 0 ? "positive" : "negative"}">${formatCurrency(net)}</span>
          </div>
          <div class="summary-item__row meta">
            <span>Ingresos: ${formatCurrency(values.income)}</span>
            <span>Gastos: ${formatCurrency(values.expense)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderBudgetRules(totals) {
  if (!totals.income) {
    return `<p class="meta">Agreguen un ingreso para activar la distribucion 50 / 30 / 20.</p>`;
  }

  return totals.budgetModel
    .map((item) => {
      const progress = item.targetAmount > 0 ? Math.min((item.currentAmount / item.targetAmount) * 100, 160) : 0;
      const statusClass = item.currentAmount <= item.targetAmount ? "positive" : "negative";
      return `
        <article class="budget-card">
          <div class="budget-card__row">
            <div>
              <p class="budget-card__icon">${item.icon}</p>
              <strong>${item.title}</strong>
            </div>
            <span class="pill ${statusClass}">${formatPercent(progress, item.targetPercent)}</span>
          </div>
          <p class="meta">${item.description}</p>
          <div class="budget-card__row meta">
            <span>Objetivo: ${formatCurrency(item.targetAmount)}</span>
            <span>Actual: ${formatCurrency(item.currentAmount)}</span>
          </div>
          <progress class="progress" value="${Math.min(progress, 100)}" max="100"></progress>
        </article>
      `;
    })
    .join("");
}

function renderTopSpending(topCategories) {
  if (!topCategories.length) {
    return `<p class="meta">Todavia no hay gastos para analizar.</p>`;
  }

  return topCategories
    .map(([category, amount], index) => {
      const labels = ["#1", "#2", "#3"];
      return `
        <article class="insight-card">
          <div class="summary-item__row">
            <strong>${labels[index]} ${escapeHtml(category)}</strong>
            <span class="pill">${formatCurrency(amount)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderGoals() {
  if (!state.goals.length) {
    return `<p class="meta">Todavia no hay metas de ahorro.</p>`;
  }

  return state.goals
    .map((goal) => {
      const progress = Math.min(100, (goal.saved / goal.target) * 100 || 0);
      return `
        <article class="goal-item">
          <div class="goal-item__row">
            <strong>${escapeHtml(goal.name)}</strong>
            <span class="pill">${progress.toFixed(0)}%</span>
          </div>
          <div class="goal-item__row meta">
            <span>${formatCurrency(goal.saved)} ahorrados</span>
            <span>Meta: ${formatCurrency(goal.target)}</span>
          </div>
          <progress class="progress" value="${progress}" max="100"></progress>
          <div class="goal-item__row goal-item__actions">
            <button class="btn-secondary" data-action="remove" data-goal-id="${goal.id}" type="button">-10%</button>
            <button class="btn-primary" data-action="add" data-goal-id="${goal.id}" type="button">+10%</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCategorySummary(categoryExpenses) {
  const entries = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    return `<p class="meta">Todavia no hay gastos por categoria para resumir.</p>`;
  }

  return entries
    .map(([category, amount]) => {
      return `
        <article class="category-card">
          <span class="category-card__name">${escapeHtml(category)}</span>
          <strong>${formatCurrency(amount)}</strong>
        </article>
      `;
    })
    .join("");
}

function renderTransactions() {
  if (!state.transactions.length) {
    return `<p class="meta">Aun no hay movimientos registrados.</p>`;
  }

  return state.transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((transaction) => {
      const sign = transaction.type === "income" ? "+" : "-";
      return `
        <article class="transaction-item">
          <div class="transaction-item__row">
            <div>
              <strong>${escapeHtml(transaction.description)}</strong>
              <p class="meta">${escapeHtml(transaction.category)} | ${escapeHtml(transaction.person)} | ${formatDate(transaction.date)}</p>
            </div>
            <div class="transaction-item__aside">
              <strong class="${transaction.type === "income" ? "positive" : "negative"}">
                ${sign}${formatCurrency(transaction.amount)}
              </strong>
              <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
                <button class="btn-ghost" data-action="edit" data-transaction-id="${transaction.id}" type="button">Editar</button>
                <button class="btn-ghost" data-action="delete" data-transaction-id="${transaction.id}" type="button">Eliminar</button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(defaultState);https://github.com/wagner201190/Finanzas/blob/main/app.js
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions
        : structuredClone(defaultState.transactions),
      goals: Array.isArray(parsed.goals) ? parsed.goals : structuredClone(defaultState.goals),
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function formatDate(dateString) {
  const formatter = new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return formatter.format(new Date(`${dateString}T12:00:00`));
}

function formatPercent(progress, targetPercent) {
  return `${Math.round(progress)}% de ${targetPercent}%`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
