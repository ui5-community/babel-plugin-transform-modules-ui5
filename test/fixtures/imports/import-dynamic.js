
async function getItAA() {
  const SAPModule = await import("sap/SAPModule");
  return SAPModule.default;
}

function getItThen() {
  return import("my/Module").then(MyModule => {
    return MyModule.default;
  });
}
