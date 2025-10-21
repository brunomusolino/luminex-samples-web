import React, { useState } from "react";
import { apiGet, apiPost } from "./api";

type Reason = { id: number; name: string };
type StockItem = { product_id: number; location_id: number; qty: number; part_number: string; manufacturer: string; location_label: string };

export default function App() {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [msg, setMsg] = useState<string>("");

  async function loadReasons() {
    const data = await apiGet<{ items: Reason[] }>("/api/movement-reasons");
    setReasons(data.items);
  }
  async function loadStock() {
    const data = await apiGet<{ items: StockItem[] }>("/api/stock?limit=10");
    setStock(data.items);
  }
  async function testOut() {
    if (!stock[0]) return setMsg("Carregue o estoque primeiro");
    const s = stock[0];
    const res = await apiPost<{ id: number }>("/api/movements", {
      direction: "OUT", product_id: s.product_id, location_id: s.location_id, qty: 1,
      reason_id: reasons[0]?.id ?? 1, customer: "Cliente Front", note: "OUT via UI"
    });
    setMsg(`OUT ok (id=${res.id})`);
    await loadStock();
  }

  return (
    <div style={{ fontFamily: "system-ui, Arial", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Samples — Front</h1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={loadReasons}>Carregar motivos</button>
        <button onClick={loadStock}>Carregar estoque (10)</button>
        <button onClick={testOut}>Teste OUT (1)</button>
      </div>
      {msg && <p style={{ marginTop: 12, color: "#0a7" }}>{msg}</p>}
      <h2 style={{ marginTop: 24 }}>Motivos</h2>
      <ul>{reasons.map(r => <li key={r.id}>{r.id} — {r.name}</li>)}</ul>
      <h2 style={{ marginTop: 24 }}>Estoque</h2>
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead><tr><th>Prod</th><th>PN</th><th>Fabricante</th><th>Endereço</th><th>Qtd</th></tr></thead>
        <tbody>
          {stock.map(s => (
            <tr key={`${s.product_id}-${s.location_id}`}>
              <td>{s.product_id}</td><td>{s.part_number}</td><td>{s.manufacturer}</td>
              <td>{s.location_label}</td><td style={{ textAlign: "right" }}>{s.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
