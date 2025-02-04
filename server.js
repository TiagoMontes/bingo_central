const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// 📌 Carregar cartelas
const cartelasPath = path.join(process.cwd(), "public", "cartelas.json");
let cartelas = [];

try {
    if (fs.existsSync(cartelasPath)) {
        cartelas = JSON.parse(fs.readFileSync(cartelasPath, "utf-8"));
        console.log(`✅ Cartelas carregadas! Total: ${cartelas.length}`);
    } else {
        console.error("❌ ERRO: O arquivo cartelas.json não foi encontrado!");
    }
} catch (error) {
    console.error("❌ ERRO ao carregar cartelas.json:", error);
}

let rodadaAtual = {
    id: 1,
    bolas: [],
    premio: {
        linha: 20,
        bingo: 200,
        duploBingo: 30
    },
    cartelas: cartelas,
    vencedoresLinha: [] // 📌 Lista de vencedores da linha
};

// 📌 Função para verificar se uma cartela ganhou a linha
function verificarLinha(cartela, bolasSorteadas) {
    const linhas = [
        cartela.numeros.slice(0, 5),  // Primeira linha (5 primeiros números)
        cartela.numeros.slice(5, 10), // Segunda linha (5 números do meio)
        cartela.numeros.slice(10, 15) // Terceira linha (5 últimos números)
    ];

    return linhas.some((linha) => linha.every((num) => bolasSorteadas.includes(num)));
}

// 📌 WebSocket para comunicação em tempo real
io.on("connection", (socket) => {
    console.log(`🟢 Novo usuário conectado! ID: ${socket.id}`);
    socket.emit("atualizarRodada", rodadaAtual);

    // 📌 Registrar nova bola sorteada
    socket.on("novaBola", (bola) => {
        if (!rodadaAtual.bolas.includes(parseInt(bola))) {
            rodadaAtual.bolas.push(parseInt(bola));

            // 📌 Verificar se alguma cartela ganhou a linha
            rodadaAtual.cartelas.forEach((cartela) => {
                if (!rodadaAtual.vencedoresLinha.includes(cartela.id) && verificarLinha(cartela, rodadaAtual.bolas)) {
                    rodadaAtual.vencedoresLinha.push(cartela.id);
                }
            });

            io.emit("atualizarRodada", rodadaAtual);
        }
    });

    // 📌 Iniciar nova rodada
    socket.on("novaRodada", () => {
        rodadaAtual = {
            id: rodadaAtual.id + 1,
            bolas: [],
            premio: rodadaAtual.premio,
            cartelas: cartelas,
            vencedoresLinha: []
        };
        io.emit("atualizarRodada", rodadaAtual);
    });

    socket.on("disconnect", () => {
        console.log(`🔴 Usuário desconectado! ID: ${socket.id}`);
    });
});

server.listen(3001, () => {
    console.log("✅ Servidor WebSocket rodando na porta 3001");
});
