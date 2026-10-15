fetch('http://localhost:3001/api/vendas-margem-comparativo-3meses')
  .then(res => res.json())
  .then(data => {
    console.log("Meses:", data.meses);
    console.log("Departamentos:", data.departamentos?.length);
    console.log("Top Dept:", data.departamentos?.[0]?.departamento);
    process.exit(0);
  })
  .catch(err => {
    console.error("Fetch err:", err.message);
    process.exit(1);
  });
