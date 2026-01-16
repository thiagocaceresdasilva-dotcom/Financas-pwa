// ============================
// OCR CUPOM FISCAL (SEM SALVAR FOTO)
// ============================
(() => {
  const fileInput = document.getElementById("receiptFile");
  const scanBtn = document.getElementById("scanReceipt");
  const statusEl = document.getElementById("ocrStatus");
  const preview = document.getElementById("receiptPreview");

  const typeEl = document.getElementById("entryType");
  const statusEntryEl = document.getElementById("entryStatus");
  const dateEl = document.getElementById("entryDate");
  const amountEl = document.getElementById("entryAmount");
  const descEl = document.getElementById("entryDescription");

  if (!scanBtn) return;

  scanBtn.onclick = async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      alert("Selecione ou tire a foto do cupom.");
      return;
    }

    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";

    statusEl.textContent = "Lendo cupom...";

    try {
      const { data } = await Tesseract.recognize(file, "por", {
        logger: m => {
          if (m.status === "recognizing text") {
            statusEl.textContent = `OCR ${Math.round(m.progress * 100)}%`;
          }
        }
      });

      const text = data.text || "";

      const total = extractTotal(text);
      const date = extractDate(text);
      const store = extractStore(text);

      typeEl.value = "expense";
      statusEntryEl.value = "realized";

      if (total) amountEl.value = total;
      if (date) dateEl.value = date;
      if (store) descEl.value = store;

      statusEl.textContent = "Cupom lido! Confira e salve.";

    } catch (err) {
      console.error(err);
      alert("Erro ao ler cupom. Tente novamente com mais luz.");
      statusEl.textContent = "";
    }
  };

  function extractTotal(text) {
    const values = [...text.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})/g)]
      .map(v => Number(v[1].replace(/\./g, "").replace(",", ".")))
      .filter(v => v > 0);
    if (!values.length) return "";
    return Math.max(...values).toFixed(2);
  }

  function extractDate(text) {
    const m = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (!m) return "";
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  function extractStore(text) {
    const line = text.split("\n").find(l => l.length > 5);
    return line ? line.trim().slice(0, 40) : "";
  }
})();
