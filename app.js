function createRow() {
  const tr = document.createElement("tr");

  // columnas de inputs
  for (let i = 0; i < 2; i++) {
    const td = document.createElement("td");
    const input = document.createElement("input");

    input.type = "text";
    input.className = "cell";
    input.placeholder = i === 0 ? "llave" : "valor";
    input.addEventListener("input", onChange);

    td.appendChild(input);
    tr.appendChild(td);
  }

  // columna de botones
  const actionsTd = document.createElement("td");

  function makeButton(text, tooltip = "", handler = () => {}) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.dataset.tooltip = tooltip;
    btn.addEventListener("click", handler);
    return btn;
  }

  // ➕ arriba
  actionsTd.appendChild(makeButton("↑➕", "Agregar arriba", () => {
    tr.parentNode.insertBefore(createRow(), tr);
  }));

  // ➕ abajo
  actionsTd.appendChild(makeButton("↓➕", "Agregar abajo", () => {
    tr.parentNode.insertBefore(createRow(), tr.nextSibling);
  }));

  // ⬆ mover arriba
  actionsTd.appendChild(makeButton("⬆", "Mover hacia arriba", () => {
    const prev = tr.previousElementSibling;
    if (prev) {
      tr.parentNode.insertBefore(tr, prev);
      onChange();
    }
  }));

  // ⬇ mover abajo
  actionsTd.appendChild(makeButton("⬇", "Mover hacia abajo", () => {
    const next = tr.nextElementSibling;
    if (next) {
      tr.parentNode.insertBefore(next, tr);
      onChange();
    }
  }));

  // 🧹 limpiar
  actionsTd.appendChild(makeButton("🧹", "Limpiar fila", () => {
    if (confirm("¿Limpiar esta fila?")) {
      tr.querySelectorAll("input").forEach(i => i.value = "");
      onChange();
    }
  }));

  tr.appendChild(actionsTd);

  return tr;
}

function getRules() {
  const rows = document.querySelectorAll("#tabla tbody tr");
  const rules = [];

  rows.forEach(row => {
    const inputs = row.querySelectorAll("input");
    const pattern = inputs[0].value;
    const replacement = inputs[1].value;

    if (pattern) {
      rules.push({ pattern, replacement });
    }
  });

  return rules;
}

function applyRegexReplacements(text, rules) {
  let result = text;

  for (const { pattern, replacement } of rules) {
    try {
      const regex = new RegExp(pattern, "ig");

      result = result.replace(regex, (...args) => {
        const match = args[0];
        const groups = args.slice(1, -2);

        // reemplazar $1, $2, etc.
        let output = replacement;

        groups.forEach((g, i) => {
          const index = i + 1;
          output = output.replaceAll(`$${index}`, g ?? "");
        });

        return output;
      });

    } catch (e) {
      console.warn("Regex inválida:", pattern);
    }
  }

  return result;
}

async function onChange() {
  const rules = getRules();
  const inputText = document.getElementById("textarea_input").value;

  const output = applyRegexReplacements(inputText, rules);

  document.getElementById("textarea_output").value = output;

  await saveState();
}


// ---------------------------
// Estados
// ---------------------------

const STORAGE_KEY = "clean_tool_state";

// const SECRET = prompt("Ingresa un secreto:");

const TTL_MS = 1000 * 60 * 30; // 30 minutos (opcional)


let SECRET = "";

document.getElementById("unlockBtn").addEventListener("click", () => {
  // console.log("unlockBtn SECRET:", SECRET);
  SECRET = document.getElementById("passwordInput").value;

  // console.log("unlockBtn passwordInput SECRET:", SECRET);
  if (!SECRET) {
    alert("Ingresa una clave");
    return;
  }

  loadState(); // ahora sí puedes desencriptar
});


// helper
async function getKey(secret) {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(secret));

  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(text, secret) {
  const key = await getKey(secret);
  const enc = new TextEncoder();

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );

  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(cipher))
  };
}

async function decrypt(payload, secret) {
  const key = await getKey(secret);
  const dec = new TextDecoder();

  const iv = new Uint8Array(payload.iv);
  const data = new Uint8Array(payload.data);

  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return dec.decode(plain);
}

async function saveState() {
  // console.log("saveState SECRET:", SECRET);
  const data = {
    rules: getRules(),
    // input: document.getElementById("textarea_input").value
  };

  const json = JSON.stringify(data);
  const encrypted = await encrypt(json, SECRET);

  const payload = {
    encrypted,
    expiresAt: Date.now() + TTL_MS
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

async function loadState() {
  // console.log("loadState SECRET:", SECRET);
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const payload = JSON.parse(raw);

    // ⏳ expiración
    if (Date.now() > payload.expiresAt) {
      console.log("expiró");
      console.log("sessionStorage.removeItem");
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    const json = await decrypt(payload.encrypted, SECRET);
    const data = JSON.parse(json);

    const tbody = document.querySelector("#tabla tbody");
    tbody.innerHTML = "";

    data.rules.forEach(rule => {
      const row = createRow();
      const inputs = row.querySelectorAll("input");
      inputs[0].value = rule.pattern;
      inputs[1].value = rule.replacement;
      tbody.appendChild(row);
    });

    // document.getElementById("textarea_input").value = data.input || "";

    onChange();

  } catch (e) {
    console.warn("Error desencriptando, limpiando estado");
    console.warn(e);
    console.log("sessionStorage.removeItem");
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

document.getElementById("resetBtn").addEventListener("click", () => {
  sessionStorage.removeItem(STORAGE_KEY);
  location.reload();
});

// ---------------------------
// Exportar / Importar
// ---------------------------
document.getElementById("exportBtn").addEventListener("click", () => {
  const data = {
    rules: getRules(),
    // input: document.getElementById("textarea_input").value
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "clean-config.json";
  a.click();

  URL.revokeObjectURL(url);
});

document.getElementById("importFile").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);

      const tbody = document.querySelector("#tabla tbody");
      tbody.innerHTML = "";

      data.rules.forEach(rule => {
        const row = createRow();
        const inputs = row.querySelectorAll("input");
        inputs[0].value = rule.pattern;
        inputs[1].value = rule.replacement;
        tbody.appendChild(row);
      });

      // document.getElementById("textarea_input").value = data.input || "";

      onChange();

    } catch (err) {
      alert("JSON inválido");
    }
  };

  reader.readAsText(file);
});

// ---------------------------
// MAIN
// ---------------------------

// listener textarea
document
  .getElementById("textarea_input")
  .addEventListener("input", onChange);

const tbody = document.querySelector("#tabla tbody");

for (let i = 0; i < 1; i++) {
  tbody.appendChild(createRow());
}

// loadState();
