"use client"

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";

export default function Locutor() {
  const [rodada, setRodada] = useState({
    id: 1,
    bolas: [],
    premio: { linha: 20, bingo: 200, duploBingo: 30 },
    cartelas: [],
    vencedoresLinha: [] // ✅ Definir um valor inicial seguro
  });
  const [bola, setBola] = useState("");
  const [socket, setSocket] = useState(null);

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
      setRodada({
        id: data?.id || 1,
        bolas: data?.bolas || [],
        premio: data?.premio || { linha: 20, bingo: 200, duploBingo: 30 },
        cartelas: data?.cartelas || [],
        vencedoresLinha: data?.vencedoresLinha || [] // ✅ Garante que sempre será um array
      });
    });

    setSocket(newSocket);

    return () => {
      console.log("🔌 Desconectando do WebSocket...");
      newSocket.disconnect();
    };
  }, []);

  const enviarBola = () => {
    if (bola.trim() && !rodada.bolas.includes(parseInt(bola))) {
      socket.emit("novaBola", parseInt(bola));
      setBola("");
    }
  };

  const novaRodada = () => {
    socket.emit("novaRodada");
  };

  return (
    <div className="p-5 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎤 Painel do Locutor</h1>
      <p>Rodada Atual: <strong>{rodada.id}</strong></p>

      <div className="bg-gray-100 p-3 rounded mt-4">
        <h2 className="text-xl font-semibold">Premiação</h2>
        <p>🟩 Linha: R$ {rodada.premio.linha}</p>
        <p>🔵 Bingo: R$ {rodada.premio.bingo}</p>
        <p>🟠 Duplo Bingo: R$ {rodada.premio.duploBingo}</p>
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-semibold">Vencedores da Linha</h2>
        {rodada.vencedoresLinha?.length > 0 ? ( // ✅ Usa `?.length` para evitar erro
          <ul>
            {rodada.vencedoresLinha.map((cartelaId, i) => (
              <li key={i} className="bg-green-400 text-white p-2 rounded mt-1">
                🎉 Cartela {cartelaId} completou uma linha!
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Nenhuma cartela completou uma linha ainda...</p>
        )}
      </div>

      <div className="mt-4">
        <input
          type="number"
          value={bola}
          onChange={(e) => setBola(e.target.value)}
          placeholder="Digite a bola sorteada"
          className="border p-2 rounded w-full"
        />
        <button onClick={enviarBola} className="mt-2 bg-green-500 text-white p-2 w-full rounded">
          Sortear Bola
        </button>
      </div>

      <button onClick={novaRodada} className="mt-4 bg-red-500 text-white p-2 w-full rounded">
        Nova Rodada
      </button>
    </div>
  );
}
