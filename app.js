const ocrFile = document.getElementById("ocrFile");
const lerCupomBtn = document.getElementById("lerCupom");
const ocrStatus = document.getElementById("ocrStatus");

lerCupomBtn.addEventListener("click", async () => {
  if (!ocrFile.files.length) {
    alert("Selecione ou tire foto do cupom");
    return;
  }

  ocrStatus.innerText = "Lendo cupom...";
  const file = ocrFile.files[0];

  const formData = new FormData();
  formData.append("file", file);
  formData.append("apikey", "helloworld");
  formData.append("language", "por");

  try {
    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    const texto = data.ParsedResults?.[0]?.ParsedText || "";

    // Valor
    const valorMatch = texto.match(/(\d+[.,]\d{2})/);
    if (valorMatch) {
      document.getElementById("valor").value =
        valorMatch[1].replace(",", ".");
    }

    // Força despesa + realizado
    document.getElementById("tipo").value = "despesa";
    document.getElementById("status").value = "realizado";

    // Descrição
    document.getElementById("descricao").value =
      texto.split("\n")[0]?.substring(0, 50) || "Cupom";

    ocrStatus.innerText = "Cupom lido com sucesso ✅";

  } catch (e) {
    console.error(e);
    ocrStatus.innerText = "Erro ao ler cupom ❌";
  }
});
