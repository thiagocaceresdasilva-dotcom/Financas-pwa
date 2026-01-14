const $ = (id) => document.getElementById(id);

let MONTH = null;
let CATS = [];
let RULES = [];

/* ---------- Utils ---------- */
function brl(v){ return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function monthNow(){
  const d=new Date(); const m=String(d.getMonth()+1).padStart(2,"0");
  return `${d.getFullYear()}-${m}`;
}
function todayISO(){
  const d=new Date(); const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function monthKeyFromDate(dateStr){ return String(dateStr||"").slice(0,7); }
function clampDay(year, month1based, day){
  const last=new Date(year, month1based, 0).getDate();
  return Math.max(1, Math.min(Number(day||1), last));
}
function dateForMonthDay(monthKey, day){
  const [y,m]=monthKey.split("-").map(Number);
  const safe=clampDay(y,m,day);
  const mm=String(m).padStart(2,"0");
  const dd=String(safe).padStart(2,"0");
  return `${y}-${mm}-${dd}`;
}
function catName(id){
  const c=CATS.find(x=>x.id===id);
  return c ? c.name : "Sem categoria";
}
function sumBy(list,type){
  return list.filter(e=>e.type===type).reduce((a,e)=>a+Number(e.amount||0),0);
}

/* ---------- DOM ---------- */
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
const btnGenerateFixos = $("btnGenerateFixos");

const catForm = $("catForm");
const catNameInput = $("catName");
const catType = $("catType");
const catsExpense = $("catsExpense");
const catsIncome = $("catsIncome");

const btnExport = $("btnExport");
const fileImport = $("fileImport");

/* ---------- Seed ---------- */
async function seedIfNeeded(){
  const cats = await getAll("categories");
  if (cats.length === 0){
    const defaults = [
      {id: uid(), type:"expense", name:"Moradia"},
      {id: uid(), type:"expense", name:"Mercado"},
      {id: uid(), type:"expense", name:"Transporte"},
      {id: uid(), type:"expense", name:"Saúde"},
      {id: uid(), type:"expense", name:"Lazer"},
      {id: uid(), type:"income",  name:"Salário"},
      {id: uid(), type:"income",  name:"Outras Receitas"}
    ];
    for (const c of defaults) await put("categories", c);
  }
}

/* ---------- Load ---------- */
async function loadAll(){
  CATS = await getAll("categories");
  RULES = await getAll("rules");
  renderCategorySelects();
  renderCategories();
  renderRules();
}

function renderCategorySelects(){
  const exp = CATS.filter(c=>c.type==="expense");
  const inc = CATS.filter(c=>c.type==="income");

  function fill(sel, list){
    sel.innerHTML = "";
    for (const c of list){
      const o=document.createElement("option");
      o.value=c.id; o.textContent=c.name;
      sel.appendChild(o);
    }
  }

  // lançamento: mostra ambos (income+expense), mas trocamos conforme tipo
  const listForEntry = entryType.value === "income" ? inc : exp;
  fill(entryCategory, listForEntry);

  // regras: conforme tipo
  const listForRule = ruleType.value === "income" ? inc : exp;
  fill(ruleCategory, listForRule);
}

function renderCategories(){
  catsExpense.innerHTML = "";
  catsIncome.innerHTML = "";

  for (const c of CATS.filter(x=>x.type==="expense")){
    catsExpense.appendChild(catLi(c));
  }
  for (const c of CATS.filter(x=>x.type==="income")){
    catsIncome.appendChild(catLi(c));
  }
}

function catLi(c){
  const li=document.createElement("li");
  li.className="item";
  li.innerHTML = `
    <div class="item__left">
      <div class="item__title">${c.name}</div>
      <div class="item__meta">${c.type === "income" ? "Receita" : "Despesa"}</div>
    </div>
    <button class="btnDanger" data-del-cat="${c.id}">Excluir</button>
  `;
  li.querySelector("[data-del-cat]").onclick = async () => {
    await del("categories", c.id);
    await loadAll();
    await renderMonth();
  };
  return li;
}

/* ---------- Entries ---------- */
async function getEntriesByMonth(monthKey){
  const all = await getAll("entries");
  return all.filter(e => e.monthKey === monthKey);
}

function entryLi(e){
  const li=document.createElement("li");
  li.className="item";

  const valCls = e.type==="income" ? "item__value item__value--income" : "item__value item__value--expense";
  const sign = e.type==="income" ? "+" : "-";

  li.innerHTML = `
    <div class="item__left">
      <div class="item__title">${e.note || "(sem descrição)"}</div>
      <div class="item__meta">${e.date} • ${catName(e.categoryId)}${e.ruleId ? " • fixo" : ""}</div>
    </div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div class="${valCls}">${sign} ${brl(e.amount)}</div>
      <button class="btnDanger" data-del="${e.id}">X</button>
    </div>
  `;
  li.querySelector("[data-del]").onclick = async () => {
    await del("entries", e.id);
    await renderMonth();
  };
  return li;
}

async function renderMonth(){
  const entries = await getEntriesByMonth(MONTH);

  const planned = entries.filter(e=>e.status==="planned");
  const settled = entries.filter(e=>e.status==="settled");

  // KPIs
  const rInc = sumBy(settled, "income");
  const rExp = sumBy(settled, "expense");
  const pInc = sumBy(planned, "income") + sumBy(settled, "income"); // previsto total = previstos + realizados
  const pExp = sumBy(planned, "expense") + sumBy(settled, "expense");

  realIncome.textContent = brl(rInc);
  realExpense.textContent = brl(rExp);
  realBalance.textContent = brl(rInc - rExp);

  planIncome.textContent = brl(pInc);
  planExpense.textContent = brl(pExp);
  planBalance.textContent = brl(pInc - pExp);

  // listas
  plannedList.innerHTML="";
  settledList.innerHTML="";

  planned
    .sort((a,b)=>String(a.date).localeCompare(String(b.date)))
    .forEach(e=>plannedList.appendChild(entryLi(e)));

  settled
    .sort((a,b)=>String(a.date).localeCompare(String(b.date)))
    .forEach(e=>settledList.appendChild(entryLi(e)));
}

/* ---------- Rules (Fixos) ---------- */
function renderRules(){
  rulesList.innerHTML = "";
  const ordered = [...RULES].sort((a,b)=>Number(a.day||1)-Number(b.day||1));

  for (const r of ordered){
    const li=document.createElement("li");
    li.className="item";

    const sign = r.type==="income" ? "+" : "-";
    const valCls = r.type==="income" ? "item__value item__value--income" : "item__value item__value--expense";

    li.innerHTML = `
      <div class="item__left">
        <div class="item__title">${r.title}</div>
        <div class="item__meta">Dia ${r.day} • ${catName(r.categoryId)} • ${r.isActive ? "Ativo" : "Inativo"}</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <div class="${valCls}">${sign} ${brl(r.amount)}</div>
        <button class="btn btn--ghost" data-toggle="${r.id}">${r.isActive ? "Desativar" : "Ativar"}</button>
        <button class="btnDanger" data-del-rule="${r.id}">X</button>
      </div>
    `;

    li.querySelector("[data-toggle]").onclick = async () => {
      r.isActive = !r.isActive;
      await put("rules", r);
      await loadAll();
      await renderMonth();
    };

    li.querySelector("[data-del-rule]").onclick = async () => {
      await del("rules", r.id);
      await loadAll();
      await renderMonth();
    };

    rulesList.appendChild(li);
  }
}

async function generateFixosForMonth(){
  const actives = RULES.filter(r=>r.isActive);
  let created = 0;

  for (const r of actives){
    const exists = await existsEntryForRuleMonth(r.id, MONTH);
    if (exists) continue;

    const e = {
      id: uid(),
      type: r.type,
      status: "planned",
      date: dateForMonthDay(MONTH, r.day),
      monthKey: MONTH,
      amount: Number(r.amount),
      categoryId: r.categoryId,
      note: r.title,
      ruleId: r.id,
      createdAt: new Date().toISOString()
    };

    await put("entries", e);
    created++;
  }

  await renderMonth();
  alert(created ? `Fixos gerados: ${created}` : "Nada a gerar (já existe para este mês).");
}

/* ---------- Events ---------- */
entryType.addEventListener("change", () => renderCategorySelects());
ruleType.addEventListener("change", () => renderCategorySelects());

monthPicker.addEventListener("change", async () => {
  MONTH = monthPicker.value || monthNow();
  await renderMonth();
});

entryForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const amount = Number(entryAmount.value || 0);
  if (!amount || amount <= 0) {
    alert("Informe um valor maior que zero.");
    return;
  }

  const date = entryDate.value || todayISO();

  const e = {
    id: uid(),
    type: entryType.value,
    status: entryStatus.value,
    date,
    monthKey: MONTH || monthKeyFromDate(date) || monthNow(),
    amount,
    categoryId: entryCategory.value || null,
    note: (entryNote.value || "").trim(),
    ruleId: null,
    createdAt: new Date().toISOString()
  };

  // garante mês consistente com o monthPicker (se quiser travar no mês atual, mantenha assim)
  e.monthKey = MONTH;

  await put("entries", e);

  entryAmount.value = "";
  entryNote.value = "";

  await renderMonth();
});

ruleForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const amount = Number(ruleAmount.value || 0);
  const day = Number(ruleDay.value || 1);
  if (!amount || amount <= 0) return alert("Valor do fixo inválido.");

  const r = {
    id: uid(),
    type: ruleType.value,
    title: (ruleTitle.value || "").trim(),
    amount,
    day,
    categoryId: ruleCategory.value || null,
    isActive: !!ruleActive.checked,
    createdAt: new Date().toISOString()
  };

  if (!r.title) return alert("Informe um nome para o fixo.");

  await put("rules", r);

  ruleTitle.value = "";
  ruleAmount.value = "";
  ruleDay.value = "5";
  ruleActive.checked = true;

  await loadAll();
  await renderMonth();
});

btnGenerateFixos.addEventListener("click", async () => {
  await loadAll(); // garante RULES atualizado
  await generateFixosForMonth();
});

catForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const c = {
    id: uid(),
    name: (catNameInput.value || "").trim(),
    type: catType.value,
    createdAt: new Date().toISOString()
  };
  if (!c.name) return alert("Informe o nome da categoria.");

  await put("categories", c);
  catNameInput.value = "";

  await loadAll();
  await renderMonth();
});

/* ---------- Export / Import ---------- */
btnExport.addEventListener("click", async () => {
  const data = await exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `financas-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

fileImport.addEventListener("change", async () => {
  const f = fileImport.files?.[0];
  if (!f) return;

  try{
    const txt = await f.text();
    const data = JSON.parse(txt);
    await importAll(data);
    await loadAll();
    await renderMonth();
    alert("Importação concluída!");
  } catch(err){
    alert("Falha ao importar. Verifique se é um JSON de backup do app.");
  } finally {
    fileImport.value = "";
  }
});

/* ---------- Boot ---------- */
(async function boot(){
  await openDB();
  await seedIfNeeded();

  MONTH = monthNow();
  monthPicker.value = MONTH;
  entryDate.value = todayISO();

  await loadAll();
  await renderMonth();
})();
