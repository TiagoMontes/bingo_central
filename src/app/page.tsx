"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";

export default function Locutor() {
  const [rodada, setRodada] = useState({
    id: 1,
    bolas: [],
    premio: { linha: 20, bingo: 200, duploBingo: 30 },
    cartelas: [],
    vencedoresLinha: [],
    cartelasQuentes: []
  });
  const [socket, setSocket] = useState(null);
  const [rodadaFinalizada, setRodadaFinalizada] = useState(false);

  useEffect(() => {
    console.log("🔄 Tentando conectar ao WebSocket...");
    const newSocket = io(SERVER_URL, { transports: ["websocket"] });

    newSocket.on("connect", () => {
      console.log("✅ Conectado ao WebSocket!");
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Erro de conexão:", err);
    });

    newSocket.on("atualizarRodada", (data) => {
      console.log("📡 Rodada atualizada:", data);
      setRodada(data);
    });

    newSocket.on("rodadaEncerrada", (vencedores) => {
      console.log("🏆 Rodada encerrada! Vencedores:", vencedores);
      setRodadaFinalizada(true);
    });

    setSocket(newSocket);

    return () => {
      console.log("🔌 Desconectando do WebSocket...");
      newSocket.disconnect();
    };
  }, []);

  const novaRodada = () => {
    setRodadaFinalizada(false);
    socket.emit("novaRodada");
  };

  const comecarRodada = () => {
    setRodadaFinalizada(false);
    socket.emit("comecarRodada");
  };

  // Última bola sorteada
  const ultimaBola = rodada.bolas.length > 0 ? rodada.bolas[rodada.bolas.length - 1] : null;

  return (
    <div className="p-5 mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">🎤 Painel do Locutor</h1>
      <p className="text-center">Rodada Atual: <strong>{rodada.id}</strong></p>


      <main className="flex flex-row-reverse justify-center gap-8">
        {/* 🎱 Painel de Bolas Sorteadas */}
        <section className="h-full">
          <div className="mt-4 bg-gray-100 p-3 rounded-lg h-full border-2">
            <h2 className="text-lg font-semibold text-center">🎱 Bolas Sorteadas</h2>
            <div className="grid grid-cols-10 gap-2 mt-3">
              {Array.from({ length: 90 }, (_, i) => {
                const numero = i + 1;
                const jaSorteado = rodada.bolas.includes(numero);
                const eUltimaBola = numero === ultimaBola;
                return (
                  <div
                    key={numero}
                    className={`w-8 h-8 flex items-center justify-center text-white font-bold rounded-full ${
                      eUltimaBola ? "bg-green-500" : jaSorteado ? "bg-blue-500" : "bg-black"
                    }`}
                  >
                    {numero}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 bg-gray-100 p-3 rounded-lg h-full border-2">
            <h2 className="text-lg font-semibold text-center">🏆 Cartela Vencedora</h2>

            {rodada.vencedoresLinha.length > 0 ? (
              <div className="text-center mt-3">
                {rodada.vencedoresLinha.map((cartelaId, index) => {
                  // Encontra a cartela vencedora no estado
                  const cartela = rodada.cartelas.find(c => c.id === cartelaId);

                  return cartela ? (
                    <div key={index} className="mt-3 p-3 border rounded-lg bg-white">
                      <h3 className="text-lg font-semibold">🎟️ Cartela {cartela.id}</h3>
                      <div className="grid grid-cols-5 mt-2">
                        {cartela.numeros.map((num, i) => {
                          const linhaIndex = Math.floor(i / 5); // Define a linha (0, 1 ou 2)
                          const foiMarcado = rodada.bolas.includes(num);
                          const linhaVencedora = rodada.cartelasQuentes.find(
                            (q) => q.cartelaId === cartela.id && q.linha - 1 === linhaIndex
                          );

                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-center font-bold ${
                                linhaVencedora ? "bg-green-500 text-white" : foiMarcado ? "bg-blue-500 text-white" : "bg-gray-300 text-black"
                              }`}
                            >
                              {num}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p key={index} className="text-gray-500">Cartela {cartelaId} não encontrada.</p>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center mt-3">Nenhuma cartela vencedora ainda...</p>
            )}
          </div>
        </section>

        {/* 🔥 Seção das Cartelas Mais Quentes + Botões */}
        <section>
          <div className="mt-4">
            <h2 className="text-lg font-semibold">🔥 Cartelas Mais Próximas da Linha</h2>
            {rodada.cartelasQuentes?.length > 0 ? (
              <ul>
                {rodada.cartelasQuentes.map((cartela, i) => {
                  const isVencedora = rodada.vencedoresLinha.includes(cartela.cartelaId);

                  return (
                    <li
                      key={i}
                      className={`p-2 rounded mt-1 ${
                        isVencedora ? "bg-green-500 text-white" : "bg-orange-300 text-white"
                      }`}
                    >
                      🎟️ Cartela {cartela.cartelaId} - Linha {cartela.linha} {
                      isVencedora && "- VENCEDORA!!!"
                    }
                      <p className="text-sm">Falta: {cartela.faltam.join(", ")}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500">Nenhuma cartela perto de bater ainda...</p>
            )}
          </div>

          <button
            onClick={comecarRodada}
            className="mt-4 bg-blue-500 text-white p-2 w-full rounded"
            disabled={rodadaFinalizada} // Evita que a rodada seja reiniciada enquanto ainda está em andamento
          >
            Começar Rodada
          </button>

          <button onClick={novaRodada} className="mt-4 bg-red-500 text-white p-2 w-full rounded">
            Nova Rodada
          </button>
        </section>
      </main>

    </div>
  );
}
