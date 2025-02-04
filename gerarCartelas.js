const fs = require("fs");

function gerarCartelas(quantidade) {
    const cartelas = [];

    for (let i = 1; i <= quantidade; i++) {
        let numeros = new Set();

        while (numeros.size < 15) {
            numeros.add(Math.floor(Math.random() * 90) + 1); // Gera números entre 1 e 90
        }

        cartelas.push({ id: i, numeros: [...numeros].sort((a, b) => a - b) });
    }

    return cartelas;
}

// Quantidade de cartelas a gerar
const totalCartelas = 100; // Pode ajustar esse valor conforme necessário
const cartelasGeradas = gerarCartelas(totalCartelas);

// Salvar no arquivo `cartelas.json`
fs.writeFileSync("cartelas.json", JSON.stringify(cartelasGeradas, null, 2));

console.log(`✅ ${totalCartelas} cartelas geradas e salvas em cartelas.json`);
