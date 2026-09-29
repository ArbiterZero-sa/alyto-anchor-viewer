/* =====================================================================
 * api.js  —  Developer 1: Integración de APIs y Parsing
 * Consulta los 3 endpoints públicos de Alyto y devuelve objetos listos
 * para mostrar. Solo peticiones GET públicas: sin claves privadas.
 * ===================================================================== */

// Librería de parsing TOML (smol-toml) incluida localmente en js/smol-toml.js
import { parse as parseToml } from "./smol-toml.js";

export const DEFAULTS = {
  domain: "https://alyto.app",
  apiBase: "https://api.alyto.app/api/v1/stellar",
  horizon: "https://horizon.stellar.org", // Red pública (Mainnet)
  mainnetPassphrase: "Public Global Stellar Network ; September 2015",
  timeoutMs: 12000,
};

/* Los únicos 2 Anchors que ofrece la interfaz.
 * Alyto usa las URLs fijas del enunciado; Cowrie no las tiene fijas:
 * se descubren desde su stellar.toml (TRANSFER_SERVER_SEP0024 / DIRECT_PAYMENT_SERVER). */
export const ANCHORS = {
  alyto: {
    name: "Alyto",
    domain: "https://alyto.app",
    sep24Url: "https://api.alyto.app/api/v1/stellar/anchor/info",
    sep31Url: "https://api.alyto.app/api/v1/stellar/cross-border/info",
  },
  cowrie: {
    name: "Cowrie Exchange",
    domain: "https://cowrie.exchange",
  },
};

/* ---------- Utilidades ---------- */

function cleanBase(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

/** Normaliza lo que escriba el usuario: "alyto.app" -> "https://alyto.app" */
export function normalizeDomain(input) {
  let d = cleanBase(input) || DEFAULTS.domain;
  if (!/^https?:\/\//i.test(d)) d = "https://" + d;
  return d;
}

/** Deriva el API base a partir del dominio: https://alyto.app -> https://api.alyto.app/api/v1/stellar */
export function deriveApiBase(domain) {
  const host = new URL(normalizeDomain(domain)).hostname.replace(/^www\./, "");
  return `https://api.${host}/api/v1/stellar`;
}

/** Error con tipo, para que la UI muestre un mensaje útil */
export class ApiError extends Error {
  constructor(kind, message, details = {}) {
    super(message);
    this.kind = kind; // "cors" | "timeout" | "http" | "parse" | "network"
    Object.assign(this, details);
  }
}

async function request(url, { asText = false } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEFAULTS.timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Accept: asText ? "text/plain, */*" : "application/json" },
      signal: ctrl.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError("timeout", "El servidor tardó demasiado en responder.", { url });
    }
    // Un TypeError en fetch casi siempre es CORS o falta de red
    throw new ApiError(
      "cors",
      "El navegador bloqueó la consulta (CORS) o no hay conexión.",
      { url }
    );
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new ApiError("http", `El servidor respondió ${res.status} ${res.statusText}.`, {
      url,
      status: res.status,
    });
  }
  try {
    return asText ? await res.text() : await res.json();
  } catch {
    throw new ApiError("parse", "La respuesta no tiene el formato esperado.", { url });
  }
}

/* ---------- 1) SEP-1: stellar.toml ---------- */

export async function fetchManifest(domain) {
  const url = `${normalizeDomain(domain)}/.well-known/stellar.toml`;
  const text = await request(url, { asText: true });

  let toml;
  try {
    toml = parseToml(text);
  } catch (e) {
    throw new ApiError("parse", "El archivo stellar.toml no es un TOML válido: " + e.message, { url });
  }

  const doc = toml.DOCUMENTATION || {};
  return {
    sourceUrl: url,
    raw: toml,
    organization: {
      name: doc.ORG_NAME || null,
      dba: doc.ORG_DBA || null,
      url: doc.ORG_URL || null,
      logo: doc.ORG_LOGO || null,
      description: doc.ORG_DESCRIPTION || null,
      address: doc.ORG_PHYSICAL_ADDRESS || null,
      phone: doc.ORG_PHONE_NUMBER || null,
      officialEmail: doc.ORG_OFFICIAL_EMAIL || null,
      supportEmail: doc.ORG_SUPPORT_EMAIL || null,
      twitter: doc.ORG_TWITTER || null,
      github: doc.ORG_GITHUB || null,
      keybase: doc.ORG_KEYBASE || null,
      licenseNumber: doc.ORG_LICENSE_NUMBER || null,
      licensingAuthority: doc.ORG_LICENSING_AUTHORITY || null,
    },
    network: {
      passphrase: toml.NETWORK_PASSPHRASE || null,
      signingKey: toml.SIGNING_KEY || null,
      accounts: Array.isArray(toml.ACCOUNTS) ? toml.ACCOUNTS : [],
    },
    services: {
      sep24: toml.TRANSFER_SERVER_SEP0024 || null,
      sep6: toml.TRANSFER_SERVER || null,
      sep31: toml.DIRECT_PAYMENT_SERVER || null,
      sep10: toml.WEB_AUTH_ENDPOINT || null,
      sep12: toml.KYC_SERVER || null,
      sep38: toml.ANCHOR_QUOTE_SERVER || null,
    },
    // Cada activo declarado por el anchor
    currencies: (Array.isArray(toml.CURRENCIES) ? toml.CURRENCIES : []).map((c) => ({
      code: c.code || c.code_template || "—",
      issuer: c.issuer || null,
      name: c.name || null,
      desc: c.desc || null,
      image: c.image || null,
      status: c.status || null,
      anchored: c.is_asset_anchored ?? null,
      anchorType: c.anchor_asset_type || null,
      anchorAsset: c.anchor_asset || null,
      decimals: c.display_decimals ?? null,
      regulated: c.regulated ?? false,
      // Un activo emitido por un tercero requiere trustline para poder recibirlo
      trustlineRequired: Boolean(c.issuer),
    })),
  };
}

/* ---------- 2) SEP-24: /info ---------- */

export async function fetchSep24Info(infoUrl) {
  const url = cleanBase(infoUrl);
  const data = await request(url);
  return { sourceUrl: url, raw: data, ...normalizeOperations(data.deposit, data.withdraw), fee: data.fee || null, features: data.features || null };
}

function normalizeOperations(deposit = {}, withdraw = {}) {
  const map = (obj, type) =>
    Object.entries(obj || {}).map(([code, v]) => ({
      type, // "deposit" | "withdraw"
      code,
      enabled: v?.enabled ?? null,
      feeFixed: v?.fee_fixed ?? null,
      feePercent: v?.fee_percent ?? null,
      feeMinimum: v?.fee_minimum ?? null,
      min: v?.min_amount ?? null,
      max: v?.max_amount ?? null,
    }));
  return { deposits: map(deposit, "deposit"), withdrawals: map(withdraw, "withdraw") };
}

/* ---------- 3) SEP-31: /cross-border/info ---------- */

export async function fetchSep31Info(infoUrl) {
  const url = cleanBase(infoUrl);
  const data = await request(url);
  const receive = data.receive || {};
  const corridors = Object.entries(receive).map(([code, v]) => ({
    code,
    enabled: v?.enabled ?? null,
    feeFixed: v?.fee_fixed ?? null,
    feePercent: v?.fee_percent ?? null,
    min: v?.min_amount ?? null,
    max: v?.max_amount ?? null,
    quotesSupported: v?.quotes_supported ?? null,
    quotesRequired: v?.quotes_required ?? null,
    senderTypes: v?.sep12?.sender?.types ? Object.keys(v.sep12.sender.types) : [],
    receiverTypes: v?.sep12?.receiver?.types ? Object.keys(v.sep12.receiver.types) : [],
    fields: v?.fields || null,
  }));
  return { sourceUrl: url, raw: data, corridors };
}

/* ---------- 4) Verificación de red (Mainnet) ---------- */

/** Consulta Horizon (Public Network) para confirmar que cada activo existe en Mainnet. */
export async function verifyOnMainnet(currencies) {
  const withIssuer = currencies.filter((c) => c.issuer && c.code && c.code !== "—");
  const checks = await Promise.allSettled(
    withIssuer.map(async (c) => {
      const url = `${DEFAULTS.horizon}/assets?asset_code=${encodeURIComponent(c.code)}&asset_issuer=${encodeURIComponent(c.issuer)}&limit=1`;
      const data = await request(url);
      const rec = data?._embedded?.records?.[0];
      return {
        code: c.code,
        issuer: c.issuer,
        found: Boolean(rec),
        holders: rec?.accounts?.authorized ?? rec?.num_accounts ?? null,
        supply: rec?.balances?.authorized ?? rec?.amount ?? null,
      };
    })
  );
  return checks.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { code: withIssuer[i].code, issuer: withIssuer[i].issuer, found: null, error: r.reason?.message }
  );
}

/* ---------- Función principal ---------- */

/**
 * Recibe un Anchor de ANCHORS. Lee primero el manifiesto (SEP-1) y luego
 * consulta SEP-24 y SEP-31 en paralelo. Cada fuente falla de forma independiente.
 * Devuelve: { sep1, sep24, sep31, mainnet, errors }
 */
export async function loadAll(anchor) {
  const d = normalizeDomain(anchor.domain);
  const out = { sep1: null, sep24: null, sep31: null, mainnet: null, errors: {} };

  try { out.sep1 = await fetchManifest(d); } catch (e) { out.errors.sep1 = e; }

  const svc = out.sep1?.services || {};
  const sep24Url = anchor.sep24Url || (svc.sep24 ? `${cleanBase(svc.sep24)}/info` : null);
  const sep31Url = anchor.sep31Url || (svc.sep31 ? `${cleanBase(svc.sep31)}/info` : null);

  // Si no hay URL: o el manifiesto falló (se propaga ese error) o el Anchor no declara el servicio
  const missing = (label) =>
    Promise.reject(out.sep1 ? new ApiError("notDeclared", `Este Anchor no declara ${label} en su stellar.toml.`) : out.errors.sep1);

  const [s24, s31] = await Promise.allSettled([
    sep24Url ? fetchSep24Info(sep24Url) : missing("SEP-24 (TRANSFER_SERVER_SEP0024)"),
    sep31Url ? fetchSep31Info(sep31Url) : missing("SEP-31 (DIRECT_PAYMENT_SERVER)"),
  ]);
  if (s24.status === "fulfilled") out.sep24 = s24.value; else out.errors.sep24 = s24.reason;
  if (s31.status === "fulfilled") out.sep31 = s31.value; else out.errors.sep31 = s31.reason;

  // Verificación de red: passphrase del manifiesto + existencia de activos en Horizon Mainnet
  if (out.sep1) {
    const pass = out.sep1.network.passphrase;
    out.mainnet = { passphrase: pass, declaresMainnet: pass === DEFAULTS.mainnetPassphrase, assets: [] };
    try {
      out.mainnet.assets = await verifyOnMainnet(out.sep1.currencies);
    } catch (e) {
      out.mainnet.error = e.message;
    }
  }
  return out;
}
