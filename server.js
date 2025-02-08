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

// 📌 Carregar cartelas do arquivo JSON
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

// 📌 Estado atual do jogo
let rodadaAtual = {
    id: 1,
    bolas: [],
    premio: { linha: 20, bingo: 200, duploBingo: 30 },
    cartelas: cartelas,
    vencedoresLinha: [],
    cartelasQuentes: []
};

// 📌 Função para calcular cartelas quentes e identificar vencedores
function atualizarCartelasQuentes() {
    let cartelasQuentes = [];
    let vencedoresLinha = [];

    rodadaAtual.cartelas.forEach(cartela => {
        // Divide a cartela em 3 linhas de 5 números
        const linhas = [
            cartela.numeros.slice(0, 5),  // Primeira linha
            cartela.numeros.slice(5, 10), // Segunda linha
            cartela.numeros.slice(10, 15) // Terceira linha
        ];

        let linhasQuentes = [];

        linhas.forEach((linha, index) => {
            const numerosAcertados = linha.filter(num => rodadaAtual.bolas.includes(num));
            const numerosFaltando = linha.filter(num => !rodadaAtual.bolas.includes(num));

            // Se pelo menos 1 número foi marcado, a linha já pode ser considerada "quente"
            if (numerosAcertados.length > 0) {
                linhasQuentes.push({
                    cartelaId: cartela.id,
                    linha: index + 1,
                    faltam: numerosFaltando
                });
            }

            // Se a linha já está completa, adicionamos à lista de vencedores
            if (numerosFaltando.length === 0 && !rodadaAtual.vencedoresLinha.includes(cartela.id)) {
                vencedoresLinha.push(cartela.id);
            }
        });

        // Se a cartela tiver pelo menos 1 linha quente, adicionamos todas as linhas quentes separadamente
        if (linhasQuentes.length > 0) {
            linhasQuentes.forEach(lq => cartelasQuentes.push(lq));
        }
    });

    // Ordena as linhas mais quentes pela que está mais próxima de completar
    cartelasQuentes.sort((a, b) => a.faltam.length - b.faltam.length);

    // Se não houver pelo menos 10 cartelas quentes, adicionamos cartelas aleatórias
    while (cartelasQuentes.length < 10) {
        let cartelaAleatoria = rodadaAtual.cartelas[Math.floor(Math.random() * rodadaAtual.cartelas.length)];
        let linhaAleatoria = Math.floor(Math.random() * 3);
        if (!cartelasQuentes.find(lq => lq.cartelaId === cartelaAleatoria.id && lq.linha === linhaAleatoria + 1)) {
            cartelasQuentes.push({
                cartelaId: cartelaAleatoria.id,
                linha: linhaAleatoria + 1,
                faltam: cartelaAleatoria.numeros.slice(linhaAleatoria * 5, (linhaAleatoria + 1) * 5)
            });
        }
    }

    // Atualiza o estado do jogo com as cartelas quentes e vencedores
    rodadaAtual.cartelasQuentes = cartelasQuentes.slice(0, 10); // Mantém apenas 10 itens
    rodadaAtual.vencedoresLinha.push(...vencedoresLinha);
}

let rodadaEmAndamento = false;

function iniciarSorteioAutomatico() {
    if (rodadaEmAndamento) return;
    rodadaEmAndamento = true;

    let numerosDisponiveis = Array.from({ length: 90 }, (_, i) => i + 1); // Números de 1 a 90

    const intervalo = setInterval(() => {
        if (!rodadaEmAndamento || numerosDisponiveis.length === 0) {
            clearInterval(intervalo);
            rodadaEmAndamento = false;
            return;
        }

        // Sorteia um número aleatório da lista de disponíveis
        const indiceSorteado = Math.floor(Math.random() * numerosDisponiveis.length);
        const numeroSorteado = numerosDisponiveis.splice(indiceSorteado, 1)[0]; // Remove da lista

        rodadaAtual.bolas.push(numeroSorteado);
        atualizarCartelasQuentes();

        io.emit("atualizarRodada", rodadaAtual);

        console.log(`🎱 Número sorteado: ${numeroSorteado}`);

        // Se houver um vencedor, para o sorteio
        if (rodadaAtual.vencedoresLinha.length > 0) {
            clearInterval(intervalo);
            rodadaEmAndamento = false;
            console.log("🏆 Rodada encerrada! Vencedor encontrado!");
            io.emit("rodadaEncerrada", rodadaAtual.vencedoresLinha);
        }

    }, 3000); // Sorteia um número a cada 2 segundos
}

// 📌 WebSocket para comunicação em tempo real
io.on("connection", (socket) => {
    console.log(`🟢 Novo usuário conectado! ID: ${socket.id}`);
    socket.emit("atualizarRodada", rodadaAtual);

    socket.on("comecarRodada", () => {
        rodadaAtual = {
            id: rodadaAtual.id,
            bolas: [],
            premio: rodadaAtual.premio,
            cartelas: cartelas,
            vencedoresLinha: [],
            cartelasQuentes: []
        };
        io.emit("atualizarRodada", rodadaAtual);
        iniciarSorteioAutomatico();
    });

    // 📌 Iniciar nova rodada
    socket.on("novaRodada", () => {
        rodadaAtual = {
            id: rodadaAtual.id + 1,
            bolas: [],
            premio: rodadaAtual.premio,
            cartelas: cartelas,
            vencedoresLinha: [],
            cartelasQuentes: []
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
