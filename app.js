
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
      const regex = new RegExp(pattern, "g");

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

function onChange() {
  const rules = getRules();
  const inputText = document.getElementById("textarea_input").value;

  const output = applyRegexReplacements(inputText, rules);

  document.getElementById("textarea_output").value = output;
}

// listeners tabla
document.querySelectorAll(".cell").forEach(input => {
  input.addEventListener("input", onChange);
});

// listener textarea
document
  .getElementById("textarea_input")
  .addEventListener("input", onChange);