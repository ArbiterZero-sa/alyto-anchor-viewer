/* app.js — une la lógica (api.js) con la interfaz (index.html) */
import { loadAll, ANCHORS } from "./api.js";

const $ = (id) => document.getElementById(id);

/* ---------- Helpers de formato (todo texto externo se escapa) ---------- */
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dash = (v) => (v === null || v === undefined || v === "" ? "—" : esc(v));
const num = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toLocaleString("es", { maximumFractionDigits: 7 }));
const pct = (v) => (v === null || v === undefined ? "—" : num(v) + " %");
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? esc(u) : null);
const link = (u, label) => (safeUrl(u) ? `<a href="${safeUrl(u)}" target="_blank" rel="noopener">${esc(label || u)}</a>` : dash(u));
const shortKey = (k) => (k && k.length > 14 ? `${k.slice(0, 6)}…${k.slice(-6)}` : k);
const keyLink = (k) =>
  k ? `<span class="key" title="${esc(k)}"><a href="https://stellar.expert/explorer/public/account/${esc(k)}" target="_blank" rel="noopener">${esc(k)}</a></span>` : "—";
const status = (enabled) =>
  enabled === true ? '<span class="chip ok">Habilitado</span>' : enabled === false ? '<span class="chip bad">Deshabilitado</span>' : '<span class="chip">Sin dato</span>';
const rawBlock = (obj) => `<details class="raw"><summary>Ver respuesta original (JSON)</summary><pre>${esc(JSON.stringify(obj, null, 2))}</pre></details>`;

function loading(id) { $(id).innerHTML = '<div class="skeleton" role="status" aria-label="Cargando"></div>'; }

function errorBox(err, fallbackTitle) {
  if (err?.kind === "notDeclared") return `<div class="state">${esc(err.message)}</div>`;
  const tips = {
    cors: "Causa probable: el servidor no permite consultas desde el navegador (CORS) o no hay conexión. Verifica la dirección e intenta de nuevo.",
    timeout: "Prueba de nuevo en unos segundos.",
    http: "Verifica que la dirección del dominio o de la API base sea correcta.",
    parse: "El servidor respondió, pero con un formato distinto al del estándar.",
  };
  return `<div class="state error" role="alert"><strong>${esc(fallbackTitle)}</strong>${esc(err?.message || "Error desconocido")}
    <small>${esc(tips[err?.kind] || "")}</small>${err?.url ? `<small>Fuente: ${esc(err.url)}</small>` : ""}</div>`;
}

/* ---------- Render: Verificación de red ---------- */
function renderNetwork(data) {
  const band = $("network");
  const body = $("network-body");
  band.classList.remove("ok", "warn", "bad");

  if (!data.mainnet) {
    band.classList.add("bad");
    body.innerHTML = `<p class="verdict">No se pudo verificar</p><p>Sin el manifiesto SEP-1 no es posible confirmar la red declarada.</p>`;
    return;
  }
  const m = data.mainnet;
  const found = m.assets.filter((a) => a.found === true).length;
  const total = m.assets.length;
  const ok = m.declaresMainnet && total > 0 && found === total;
  band.classList.add(ok ? "ok" : m.declaresMainnet ? "warn" : "bad");

  const headline = ok
    ? "Integrado con la Red Pública de Stellar (Mainnet)"
    : m.declaresMainnet
    ? "Declara Mainnet, pero no todos los activos se confirmaron"
    : "No declara la Red Pública de Stellar";

  body.innerHTML = `
    <p class="verdict">${headline}</p>
    <p>Red declarada en el manifiesto: <span class="key">${dash(m.passphrase)}</span></p>
    <p>${total ? `Activos confirmados en Horizon (mainnet): <strong>${found} de ${total}</strong>.` : "No hay activos con emisor para comprobar."}
    ${m.error ? esc(m.error) : ""}</p>`;
}

/* ---------- Render: Organización (SEP-1) ---------- */
function renderOrg(sep1) {
  const o = sep1.organization;
  const n = sep1.network;
  const contacts = [
    o.officialEmail && ["Correo oficial", `<a href="mailto:${esc(o.officialEmail)}">${esc(o.officialEmail)}</a>`],
    o.supportEmail && ["Soporte", `<a href="mailto:${esc(o.supportEmail)}">${esc(o.supportEmail)}</a>`],
    o.phone && ["Teléfono", esc(o.phone)],
    o.twitter && ["X / Twitter", esc(o.twitter)],
    o.github && ["GitHub", esc(o.github)],
  ].filter(Boolean);

  const accounts = n.accounts.length ? n.accounts.map(keyLink).join("<br>") : "—";

  $("org-body").innerHTML = `
    <div class="org-grid">
      ${safeUrl(o.logo) ? `<img class="org-logo" src="${safeUrl(o.logo)}" alt="Logo de ${esc(o.name)}">` : ""}
      <div>
        <p class="org-name">${dash(o.name || o.dba)}</p>
        <p class="org-desc">${dash(o.description)}</p>
        <dl class="facts">
          <dt>Dominio</dt><dd>${link(o.url || sep1.sourceUrl.replace("/.well-known/stellar.toml", ""))}</dd>
          <dt>Dirección</dt><dd>${dash(o.address)}</dd>
          ${o.licenseNumber ? `<dt>Licencia</dt><dd>${esc(o.licenseNumber)} ${o.licensingAuthority ? "· " + esc(o.licensingAuthority) : ""}</dd>` : ""}
          ${contacts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}
          <dt>Clave de firma</dt><dd>${keyLink(n.signingKey)}</dd>
          <dt>Cuentas declaradas</dt><dd>${accounts}</dd>
          <dt>Manifiesto</dt><dd>${link(sep1.sourceUrl)}</dd>
        </dl>
      </div>
    </div>
    ${rawBlock(sep1.raw)}`;
}

/* ---------- Render: Activos ---------- */
function renderAssets(sep1, mainnet) {
  const list = sep1.currencies;
  if (!list.length) {
    $("assets-body").innerHTML = `<div class="state">El manifiesto no declara activos en la sección CURRENCIES.</div>`;
    return;
  }
  const verified = new Map((mainnet?.assets || []).map((a) => [`${a.code}:${a.issuer}`, a]));

  $("assets-body").innerHTML = list
    .map((c) => {
      const v = verified.get(`${c.code}:${c.issuer}`);
      const chain =
        v?.found === true ? `<span class="chip ok">Confirmado en Mainnet</span>` :
        v?.found === false ? `<span class="chip warn">No hallado en Mainnet</span>` :
        c.issuer ? `<span class="chip">Sin verificar</span>` : "";
      return `
      <article class="asset">
        <div class="code">${esc(c.code)}</div>
        <div>
          <div>${dash(c.name)}${c.desc ? ` — <span class="meta">${esc(c.desc)}</span>` : ""}</div>
          <div class="meta">Emisor: ${keyLink(c.issuer)}</div>
          ${v?.holders != null ? `<div class="meta">Cuentas con trustline: ${num(v.holders)}${v.supply ? ` · Circulante: ${num(v.supply)}` : ""}</div>` : ""}
        </div>
        <div>
          ${chain}
          <span class="chip ${c.trustlineRequired ? "warn" : ""}">${c.trustlineRequired ? "Requiere trustline" : "Sin trustline"}</span>
          ${c.anchored ? `<span class="chip">Respaldado${c.anchorAsset ? " · " + esc(c.anchorAsset) : ""}</span>` : ""}
          ${c.status ? `<span class="chip">${esc(c.status)}</span>` : ""}
        </div>
      </article>`;
    })
    .join("");
}

/* ---------- Render: SEP-24 ---------- */
function renderSep24(d) {
  const rows = [...d.deposits, ...d.withdrawals];
  const features = d.features
    ? Object.entries(d.features).map(([k, v]) => `<span class="chip ${v ? "ok" : ""}">${esc(k.replaceAll("_", " "))}: ${v ? "sí" : "no"}</span>`).join("")
    : "";

  if (!rows.length) {
    $("sep24-body").innerHTML = `<div class="state">El endpoint respondió, pero no lista activos de depósito ni retiro.</div>${rawBlock(d.raw)}`;
    return;
  }
  $("sep24-body").innerHTML = `
    <div class="scroll"><table>
      <thead><tr><th>Operación</th><th>Activo</th><th>Estado</th><th class="num">Comisión fija</th><th class="num">Comisión %</th><th class="num">Mínimo</th><th class="num">Máximo</th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr><td>${r.type === "deposit" ? "Depósito" : "Retiro"}</td><td><strong>${esc(r.code)}</strong></td><td>${status(r.enabled)}</td>
        <td class="num">${num(r.feeFixed)}</td><td class="num">${pct(r.feePercent)}</td><td class="num">${num(r.min)}</td><td class="num">${num(r.max)}</td></tr>`).join("")}
      </tbody></table></div>
    ${features ? `<p style="margin-top:.75rem">${features}</p>` : ""}
    ${d.fee ? `<p class="meta">Consulta de comisión por endpoint /fee: ${d.fee.enabled ? "disponible" : "no disponible"}</p>` : ""}
    <p class="meta"><small>Fuente: ${link(d.sourceUrl)}</small></p>
    ${rawBlock(d.raw)}`;
}

/* ---------- Render: SEP-31 ---------- */
function renderSep31(d) {
  if (!d.corridors.length) {
    $("sep31-body").innerHTML = `<div class="state">El endpoint respondió, pero no publica activos de pago transfronterizo.</div>${rawBlock(d.raw)}`;
    return;
  }
  $("sep31-body").innerHTML = `
    <div class="scroll"><table>
      <thead><tr><th>Activo</th><th>Estado</th><th class="num">Comisión fija</th><th class="num">Comisión %</th><th class="num">Mínimo</th><th class="num">Máximo</th><th>Cotización</th><th>Tipos de cliente</th></tr></thead>
      <tbody>${d.corridors.map((c) => `
        <tr><td><strong>${esc(c.code)}</strong></td><td>${status(c.enabled)}</td>
        <td class="num">${num(c.feeFixed)}</td><td class="num">${pct(c.feePercent)}</td><td class="num">${num(c.min)}</td><td class="num">${num(c.max)}</td>
        <td>${c.quotesRequired ? "Obligatoria" : c.quotesSupported ? "Disponible" : "No"}</td>
        <td>${[...c.senderTypes.map((t) => "Emisor: " + t), ...c.receiverTypes.map((t) => "Receptor: " + t)].map((t) => `<span class="chip">${esc(t)}</span>`).join("") || "—"}</td></tr>`).join("")}
      </tbody></table></div>
    <p class="meta"><small>Fuente: ${link(d.sourceUrl)}</small></p>
    ${rawBlock(d.raw)}`;
}

/* ---------- Flujo principal ---------- */
async function run() {
  const anchor = ANCHORS[$("anchor").value] || ANCHORS.alyto;

  $("loadBtn").disabled = true;
  $("stamp").textContent = "Consultando endpoints públicos…";
  ["network-body", "org-body", "assets-body", "sep24-body", "sep31-body"].forEach(loading);
  $("network").classList.remove("ok", "warn", "bad");

  let data;
  try {
    data = await loadAll(anchor);
  } catch (e) {
    $("stamp").textContent = "Error inesperado: " + e.message;
    $("loadBtn").disabled = false;
    return;
  }

  renderNetwork(data);

  if (data.sep1) { renderOrg(data.sep1); renderAssets(data.sep1, data.mainnet); }
  else {
    $("org-body").innerHTML = errorBox(data.errors.sep1, "No se pudo leer el manifiesto stellar.toml");
    $("assets-body").innerHTML = errorBox(data.errors.sep1, "Los activos dependen del manifiesto SEP-1");
  }
  data.sep24 ? renderSep24(data.sep24) : ($("sep24-body").innerHTML = errorBox(data.errors.sep24, "No se pudo consultar SEP-24 /info"));
  data.sep31 ? renderSep31(data.sep31) : ($("sep31-body").innerHTML = errorBox(data.errors.sep31, "No se pudo consultar SEP-31 /cross-border/info"));

  const okCount = [data.sep1, data.sep24, data.sep31].filter(Boolean).length;
  $("stamp").textContent = `${anchor.name} · última consulta: ${new Date().toLocaleString("es")} · ${okCount} de 3 fuentes respondieron.`;
  $("loadBtn").disabled = false;
}

// Al cambiar de Anchor, consulta automáticamente
$("anchor").addEventListener("change", run);
$("controls").addEventListener("submit", (e) => { e.preventDefault(); run(); });

run(); // carga inicial con los valores por defecto
