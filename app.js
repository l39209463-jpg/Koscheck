const STORAGE_PREFIX = "kostcheck";

const categories = [
  {
    id: "tidur",
    name: "Kamar tidur",
    icon: "🛏️",
    items: ["Sprei & sarung bantal", "Bantal dan guling", "Selimut", "Hanger baju", "Keranjang pakaian kotor", "Lampu tidur"],
  },
  {
    id: "mandi",
    name: "Perlengkapan mandi",
    icon: "🧴",
    items: ["Handuk", "Sabun & sampo", "Sikat dan pasta gigi", "Sandal kamar mandi", "Gayung", "Perlengkapan skincare"],
  },
  {
    id: "pakaian",
    name: "Pakaian & pribadi",
    icon: "👕",
    items: ["Pakaian sehari-hari", "Pakaian tidur", "Pakaian dalam", "Jaket", "Payung atau jas hujan", "Obat-obatan pribadi"],
  },
  {
    id: "elektronik",
    name: "Elektronik",
    icon: "🔌",
    items: ["Charger ponsel", "Stop kontak tambahan", "Laptop & charger", "Headphone", "Kipas angin kecil"],
  },
  {
    id: "makan",
    name: "Makan & minum",
    icon: "🍽️",
    items: ["Piring dan mangkuk", "Sendok & garpu", "Gelas atau tumbler", "Kotak makan", "Alat makan kecil"],
  },
  {
    id: "penting",
    name: "Dokumen & lainnya",
    icon: "📂",
    items: ["KTP & dokumen penting", "Obat P3K", "Alat tulis", "Gembok cadangan", "Deterjen & pewangi"],
  },
];

const validItemIds = new Set(categories.flatMap((category) => category.items.map((item) => `${category.id}:${item}`)));
const loginScreen = document.querySelector("#login-screen");
const appScreen = document.querySelector("#app-screen");
const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginError = document.querySelector("#login-error");
const checklist = document.querySelector("#checklist");
const filters = document.querySelector("#category-filters");
const searchInput = document.querySelector("#search-input");

let currentEmail = "";
let selectedCategory = "semua";
let searchTerm = "";
let checkedItems = new Set();

function storageKey(kind, email) {
  return `${STORAGE_PREFIX}:${kind}:${email.toLowerCase()}`;
}

function loadCheckedItems(email) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey("checklist", email)) || "[]");
    return new Set(Array.isArray(saved) ? saved.filter((item) => validItemIds.has(item)) : []);
  } catch (error) {
    console.error("Tidak dapat membaca checklist tersimpan:", error);
    return new Set();
  }
}

function saveCheckedItems() {
  try {
    localStorage.setItem(storageKey("checklist", currentEmail), JSON.stringify([...checkedItems]));
    document.querySelector("#storage-error").hidden = true;
  } catch (error) {
    console.error("Tidak dapat menyimpan checklist:", error);
    const storageError = document.querySelector("#storage-error");
    storageError.textContent = "Penyimpanan browser gagal. Perubahan ini mungkin tidak tersimpan.";
    storageError.hidden = false;
  }
}

function displayName(email) {
  const name = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return name || "teman";
}

function renderFilters() {
  const choices = [{ id: "semua", name: "Semua barang" }, ...categories.map(({ id, name }) => ({ id, name }))];
  filters.replaceChildren(
    ...choices.map(({ id, name }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filter-chip${selectedCategory === id ? " selected" : ""}`;
      button.textContent = name;
      button.setAttribute("aria-pressed", String(selectedCategory === id));
      button.addEventListener("click", () => {
        selectedCategory = id;
        renderFilters();
        renderChecklist();
      });
      return button;
    }),
  );
}

function renderChecklist() {
  const normalizedSearch = searchTerm.toLocaleLowerCase("id");
  const visibleCategories = categories
    .filter((category) => selectedCategory === "semua" || category.id === selectedCategory)
    .map((category) => ({
      ...category,
      visibleItems: category.items.filter((item) => item.toLocaleLowerCase("id").includes(normalizedSearch)),
    }))
    .filter((category) => category.visibleItems.length > 0);

  checklist.replaceChildren(
    ...visibleCategories.map((category) => {
      const card = document.createElement("article");
      card.className = "category-card";

      const header = document.createElement("div");
      header.className = "category-header";
      const title = document.createElement("div");
      title.className = "category-title";
      const icon = document.createElement("span");
      icon.className = "category-emoji";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = category.icon;
      const name = document.createElement("span");
      name.textContent = category.name;
      title.append(icon, name);

      const count = document.createElement("span");
      count.className = "category-total";
      const selectedCount = category.items.filter((item) => checkedItems.has(`${category.id}:${item}`)).length;
      count.textContent = `${selectedCount}/${category.items.length}`;
      header.append(title, count);

      const itemList = document.createElement("div");
      itemList.className = "item-list";
      for (const item of category.visibleItems) {
        const label = document.createElement("label");
        label.className = "check-item";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checkedItems.has(`${category.id}:${item}`);
        input.setAttribute("aria-label", item);
        input.addEventListener("change", () => {
          const itemId = `${category.id}:${item}`;
          if (input.checked) checkedItems.add(itemId);
          else checkedItems.delete(itemId);
          saveCheckedItems();
          updateProgress();
          renderChecklist();
        });
        const text = document.createElement("span");
        text.textContent = item;
        label.append(input, text);
        itemList.append(label);
      }

      card.append(header, itemList);
      return card;
    }),
  );

  document.querySelector("#empty-state").hidden = visibleCategories.length !== 0;
  const visibleItemTotal = visibleCategories.reduce((total, category) => total + category.visibleItems.length, 0);
  document.querySelector("#visible-count").textContent = searchTerm
    ? `${visibleItemTotal} barang ditemukan.`
    : "Semua yang kamu butuhkan, di satu tempat.";
}

function updateProgress() {
  const totalItems = categories.reduce((total, category) => total + category.items.length, 0);
  const done = checkedItems.size;
  const percent = totalItems === 0 ? 0 : Math.round((done / totalItems) * 100);
  document.querySelector("#progress-percent").textContent = percent;
  document.querySelector("#progress-bar").style.width = `${percent}%`;
  document.querySelector("#progress-bar").setAttribute("aria-valuenow", String(percent));
  document.querySelector("#progress-count").textContent = `${done} dari ${totalItems} barang siap`;
  document.querySelector("#sidebar-count").textContent = `${done}/${totalItems}`;
  document.querySelector("#progress-message").textContent = percent === 100
    ? "Kamu siap untuk pindahan! 🎉"
    : percent >= 50
      ? "Wah, persiapanmu sudah lebih dari setengah! ✨"
      : "Setiap langkah kecil berarti ✨";
}

function showDashboard(email) {
  currentEmail = email;
  checkedItems = loadCheckedItems(email);
  const name = displayName(email);
  const initial = name.charAt(0).toLocaleUpperCase("id");
  document.querySelector("#greeting-name").textContent = name;
  document.querySelector("#sidebar-user").textContent = email;
  document.querySelector("#user-avatar").textContent = initial;
  document.querySelector("#top-avatar").textContent = initial;
  document.querySelector("#current-date").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  loginScreen.hidden = true;
  appScreen.hidden = false;
  loginError.textContent = "";
  updateProgress();
  renderFilters();
  renderChecklist();
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  const email = emailInput.value.trim().toLowerCase();
  try {
    localStorage.setItem(storageKey("user", "current"), email);
    showDashboard(email);
  } catch (error) {
    console.error("Tidak dapat menyimpan sesi demo:", error);
    loginError.textContent = "Browser tidak mengizinkan penyimpanan sesi. Coba aktifkan penyimpanan lokal.";
  }
});

document.querySelector("#toggle-password").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  button.setAttribute("aria-label", isPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
});

document.querySelector("#logout-button").addEventListener("click", () => {
  try {
    localStorage.removeItem(storageKey("user", "current"));
  } catch (error) {
    console.error("Tidak dapat menghapus sesi demo:", error);
  }
  appScreen.hidden = true;
  loginScreen.hidden = false;
  loginForm.reset();
  passwordInput.type = "password";
  emailInput.focus();
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  renderChecklist();
});

try {
  const savedEmail = localStorage.getItem(storageKey("user", "current"));
  if (savedEmail) showDashboard(savedEmail);
} catch (error) {
  console.error("Tidak dapat memulihkan sesi demo:", error);
}
