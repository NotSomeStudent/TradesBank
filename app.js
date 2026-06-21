const STORAGE_KEYS = {
  user: "mockbank_user",
  data: "mockbank_data"
};

const defaultBankData = {
  checking: 8420.75,
  savings: 4060.0,
  transactions: [
    {
      id: crypto.randomUUID(),
      name: "Paycheck",
      date: "Today",
      amount: 2400,
      type: "income"
    },
    {
      id: crypto.randomUUID(),
      name: "Apple Store",
      date: "Yesterday",
      amount: -129.99,
      type: "shopping"
    },
    {
      id: crypto.randomUUID(),
      name: "Coffee",
      date: "Jun 17",
      amount: -4.8,
      type: "food"
    },
    {
      id: crypto.randomUUID(),
      name: "MockBank Savings",
      date: "Jun 15",
      amount: -250,
      type: "transfer"
    }
  ]
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const screens = {
  login: document.getElementById("loginScreen"),
  dashboard: document.getElementById("dashboardScreen")
};

const elements = {
  loginForm: document.getElementById("loginForm"),
  usernameInput: document.getElementById("usernameInput"),
  passwordInput: document.getElementById("passwordInput"),
  userName: document.getElementById("userName"),
  totalBalance: document.getElementById("totalBalance"),
  checkingBalance: document.getElementById("checkingBalance"),
  savingsBalance: document.getElementById("savingsBalance"),
  transactionsList: document.getElementById("transactionsList"),
  logoutBtn: document.getElementById("logoutBtn"),
  resetBtn: document.getElementById("resetBtn"),
  actionButtons: document.querySelectorAll("[data-action]")
};

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.user));
  } catch {
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

function getBankData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.data));
    return saved || structuredClone(defaultBankData);
  } catch {
    return structuredClone(defaultBankData);
  }
}

function saveBankData(data) {
  localStorage.setItem(STORAGE_KEYS.data, JSON.stringify(data));
}

function formatMoney(value) {
  return currencyFormatter.format(value);
}

function showScreen(screenName) {
  const isDashboard = screenName === "dashboard";

  screens.login.classList.toggle("hidden", isDashboard);
  screens.dashboard.classList.toggle("hidden", !isDashboard);
}

function renderDashboard() {
  const user = getUser();
  const data = getBankData();

  const total = data.checking + data.savings;

  elements.userName.textContent = user?.name || "User";
  elements.totalBalance.textContent = formatMoney(total);
  elements.checkingBalance.textContent = formatMoney(data.checking);
  elements.savingsBalance.textContent = formatMoney(data.savings);

  elements.transactionsList.innerHTML = data.transactions
    .map(createTransactionHTML)
    .join("");
}

function createTransactionHTML(transaction) {
  const isPositive = transaction.amount > 0;
  const amountClass = isPositive ? "positive" : "negative";
  const amountPrefix = isPositive ? "+" : "";

  return `
    <article class="transaction">
      <div class="transaction-left">
        <div class="transaction-icon">
          ${getTransactionIcon(transaction.type)}
        </div>

        <div>
          <p class="transaction-name">${escapeHTML(transaction.name)}</p>
          <p class="transaction-date">${escapeHTML(transaction.date)}</p>
        </div>
      </div>

      <p class="transaction-amount ${amountClass}">
        ${amountPrefix}${formatMoney(transaction.amount)}
      </p>
    </article>
  `;
}

function getTransactionIcon(type) {
  const icons = {
    income: "$",
    shopping: "S",
    food: "C",
    transfer: "T",
    deposit: "+",
    withdraw: "−",
    send: "↑"
  };

  return icons[type] || "•";
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return replacements[character];
  });
}

function login(event) {
  event.preventDefault();

  const name = elements.usernameInput.value.trim() || "Guest";

  saveUser({
    name,
    loggedInAt: new Date().toISOString()
  });

  elements.passwordInput.value = "";

  showScreen("dashboard");
  renderDashboard();
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.user);
  showScreen("login");
}

function resetDemoData() {
  saveBankData(structuredClone(defaultBankData));
  renderDashboard();
}

function addFakeTransaction(action) {
  const data = getBankData();

  const transaction = createFakeTransaction(action);

  if (action === "deposit") {
    data.checking += transaction.amount;
  }

  if (action === "withdraw" || action === "send") {
    data.checking += transaction.amount;
  }

  data.transactions.unshift(transaction);
  data.transactions = data.transactions.slice(0, 8);

  saveBankData(data);
  renderDashboard();
}

function createFakeTransaction(action) {
  const amount = getRandomAmount();

  const transactionMap = {
    send: {
      name: "Sent Money",
      amount: -amount,
      type: "send"
    },
    deposit: {
      name: "Mobile Deposit",
      amount,
      type: "deposit"
    },
    withdraw: {
      name: "ATM Withdrawal",
      amount: -amount,
      type: "withdraw"
    }
  };

  return {
    id: crypto.randomUUID(),
    date: "Just now",
    ...transactionMap[action]
  };
}

function getRandomAmount() {
  const amount = Math.random() * 220 + 10;
  return Math.round(amount * 100) / 100;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The app still works without offline caching.
    });
  });
}

function init() {
  if (!localStorage.getItem(STORAGE_KEYS.data)) {
    saveBankData(structuredClone(defaultBankData));
  }

  elements.loginForm.addEventListener("submit", login);
  elements.logoutBtn.addEventListener("click", logout);
  elements.resetBtn.addEventListener("click", resetDemoData);

  elements.actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      addFakeTransaction(button.dataset.action);
    });
  });

  if (getUser()) {
    showScreen("dashboard");
    renderDashboard();
  } else {
    showScreen("login");
  }

  registerServiceWorker();
}

init();
