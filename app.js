/* ==========================
   FINANÇAS PWA (COMPLETO)
   - Previsto x Realizado
   - Fixos mensais (regras)
   - Categorias
   - Lançamentos manuais
   - Export/Import (JSON)
   Requer db.js completo (openDB, uid, put, getAll, del, exportAll, importAll,
   getEntriesByStatusMonth, existsEntryForRuleMonth)
========================== */

const $ = (id) => document.getElementById(id);

let MONTH = null;
let CATS = [];
let RULES = [];

/* ---------- Utils ---------- */
function brl(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function parseBRL(text) {
  if (!text) return null;
  const t = String(text).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
function monthNowISO() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function todayISO() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthKeyFromDate(dateStr) {
  return String(dateStr).slice(0, 7);
}
function clampDay(year, month1based, day) {
  const last = new Date(year, month1based, 0).getDate();
  return Math.max(1, Math.min(day, last));
}
function dateForMonthDay(monthKey, day) {
  const [y, m] = monthKey.split("-").map(Number);
  const safe = clampDay(y, m, day);
  const pad = (x) => String(x).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(safe)}`;
}
function sumBy(list, type) {
  return list.filter(e => e.type === type).reduce((acc, e) => acc + Number(e.amount || 0), 0);
}
function catNameById(catId) {
  const c = CATS.find(x => x.id === catId);
  return c ? c.name : "Sem categoria";
}
function badge(type) {
  const cls = type === "income" ? "badge badge--income" : "badge badge--expense";
  const label = type === "income" ? "Receita" : "Despesa";
  return `<span class="${cls}">${label}</span>`;
}

/* ---------- DOM refs ---------- */
const monthPicker = $("monthPicker");

const realIncome = $("realIncome");
const realExpense = $("realExpense");
const realBalance = $("realBalance");
const planIncome = $("planIncome");
const planExpense = $("planExpense");
const planBalance = $("planBalance");

const plannedList = $("plannedList");
const settledList = $("settledList");

const entryForm = $("entryForm");
const entryType = $("entryType");
const entryStatus = $("entryStatus");
const entryDate = $("entryDate");
const entryAmount = $("entryAmount");
const entryCategory = $("entryCategory");
const entryNote = $("entryNote");

const ruleForm = $("ruleForm");
const ruleType = $("ruleType");
const ruleTitle = $("ruleTitle");
const ruleAmount = $("ruleAmount");
const ruleDay = $("ruleDay");
const ruleCategory = $("ruleCategory");
const ruleActive = $("ruleActive");
const rulesList = $("rulesList");

const catForm = $("catForm");
const catName = $("catName");
const catType = $("catType");
const catsExpense = $("catsExpense");
const catsIncome = $("catsIncome");

const btnExport = $("btnExport");
const fileImport = $("fileImport");

/* ---------- Tabs ---------- */
document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(b => b.classList.remove("chip--active"));
    btn.classList.add("chip--active");

    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab
