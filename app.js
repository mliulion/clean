function onChange() {
  console.log("Cambio detectado");

  // ejemplo: leer tabla
  const cells = document.querySelectorAll(".cell");
  const values = Array.from(cells).map(c => c.value);

  const inputText = document.getElementById("textarea_input").value;

  console.log("Tabla:", values);
  console.log("Input:", inputText);

  // ejemplo simple: copiar input a output
  document.getElementById("textarea_output").value = inputText;
}

// detectar cambios en inputs de la tabla
document.querySelectorAll(".cell").forEach(input => {
  input.addEventListener("input", onChange);
});

// detectar cambios en textarea_input
document
  .getElementById("textarea_input")
  .addEventListener("input", onChange);
