/*

The decision policy for our machine learning indicator model.
(Without any effect from news / disclosures).

Current rules:
- BUY/SELL action is ALLOWED even if the bar is locked (ceiling / floor).
- JUMP action IS NOT ALLOWED (both for jump_to and jump_from) if the bar is locked.

*/

import { isBypassed } from "../news_main/bypass/bypass.js";
import { liveGetCash, liveCalculateBuyQuantity } from "../algolab/portfolio/lib/portfolioService.js";

const EPS = 1e-12;
const BUY_LIMIT = parseInt(process.env.BUY_LIMIT, 10);

export function computeJumpScore(deltaEV, S = 0.002) {
  return 50 + 50 * Math.tanh(deltaEV / (S + EPS));
}

// Use prev_session_close ± limitPct, plus a tiny epsilon and optional near-limit band.
function isLockedOrNear(row, limitPct, nearEps = 0) {
  const prev = Number(row.prev_session_close);
  if (!(prev > 0)) return false;

  const up = prev * (1 + limitPct);
  const dn = prev * (1 - limitPct);

  const hi = Number(row.high);
  const lo = Number(row.low);
  const cl = Number(row.close);

  // hard lock detection
  const atUp = hi >= up * (1 - 1e-6);
  const atDn = lo <= dn * (1 + 1e-6);

  if (atUp || atDn) return true;

  // optional near-lock detection (match Colab "near_limit")
  if (nearEps > 0) {
    const distUp = Math.abs(up - cl) / prev;
    const distDn = Math.abs(cl - dn) / prev;
    if (Math.min(distUp, distDn) <= nearEps) return true;
  }
  return false;
}


function symbolPayload(sym, by) {
  const r = by[sym] || {};
  return {
    symbol: sym,
    MLscore: r.score,
    signal: r.signal,
    ev_raw: r.ev_raw,
    ev_new: r.ev_new,
    p_buy: r.p_buy,
    p_sell: r.p_sell,
    p_hold: r.p_hold,
  };
}

function suffixIfBypassed(base, bypassNote) {
  return bypassNote ? `${base}_NOTIFY` : base;
}

// Get held quantity from 'owned' (Set or Map)
function getHeldQty(owned, symbol) {
  if (owned instanceof Map) {
    const q = Number(owned.get(symbol));
    return Number.isFinite(q) ? q : 0;
  }
  // If only a Set is provided, quantity is unknown → treat as 0 to be safe.
  return 0;
}

// Affordability check for a prospective jump (from → to)
// - Uses BUY_LIMIT (assumed defined in your env / scope)
// - ghostCash = proceeds from selling 'from' (qty * price[from] * (1 - perSide))
async function canAffordJump({ owned, from, to, priceFrom, priceTo, perSide }) {
  const baseCash = await liveGetCash();
  const heldQty  = getHeldQty(owned, from);

  if (!(heldQty > 0)) {
    return {
      ok: false,
      qty: 0,
      ghostCash: 0,
      proceeds: 0,
      baseCash,
      estCost: 0,
      reason: "no_position_qty",
    };
  }

  const proceeds = heldQty * priceFrom * (1 - perSide);
  const ghostCash = proceeds;

  const { quantityToBuy } = await liveCalculateBuyQuantity(to, BUY_LIMIT, ghostCash, true);
  const qty = Number(quantityToBuy) || 0;
  const estCost = qty * priceTo * (1 + perSide);

  return { ok: qty > 0, qty, ghostCash, proceeds, baseCash, estCost };
}

export async function decidePolicy({
  snapshot,
  owned = new Set(),
  cashTRY = NaN,
  perTickerCapTRY = NaN,
  params = {},
  cooldownMap, // optional Map<string, number>
}) {
  const actions = [];
  const logs = [];

  if (!snapshot || !snapshot.bySymbol) {
    logs.push("POLICY: empty snapshot");
    return { actions, logs };
  }

  const by = snapshot.bySymbol;
  const exclude = params.excludeSymbols instanceof Set ? params.excludeSymbols : new Set();

  const fee = snapshot.frictions?.fee_pct ?? 0.003;
  const slp = snapshot.frictions?.slippage_pct ?? 0.0005;
  const perSide = fee + slp;

  const jumpBuffer = params.jumpBuffer ?? snapshot.jump?.buffer ?? 0.00075;
  const jumpScaleS = snapshot.jump?.scale_S ?? 0.002;

  const requireBuyForNew = params.requireBuyForNew ?? true;
  const maxJumpsPerBar   = Number.isFinite(params.maxJumpsPerBar) ? params.maxJumpsPerBar : 0; // 0=unlimited
  const jumpCooldownBars = Number.isFinite(params.jumpCooldownBars) ? params.jumpCooldownBars : 0;
  const cooldownAffectsFrom = params.cooldownAffectsFrom ?? true;

  const limitPct = params.limitPct ?? 0.095;      // keep consistent with Colab
  const nearEps  = params.nearEps  ?? 0.001;      // match Colab NEAR_LIMIT_EPS (optional)

  const onlyWhenCashShort = params.onlyWhenCashShort ?? false;
  const maxNewBuysPerBar  = Number.isFinite(params.maxNewBuysPerBar) ? params.maxNewBuysPerBar : Infinity;

  // Cooldown tick down
  if (jumpCooldownBars > 0 && cooldownMap instanceof Map) {
    for (const [s, k] of cooldownMap.entries()) {
      if (k <= 1) cooldownMap.delete(s);
      else cooldownMap.set(s, k - 1);
    }
  }

  // Build convenience maps
  const price = {};
  const sig = {};
  const evHeld = {};
  const evNew = {};
  const locked = {};
  const bypassNote = {};

  for (const s of Object.keys(by)) {
    price[s] = by[s].close;
    sig[s] = by[s].signal;
    evHeld[s] = by[s].ev_raw;
    evNew[s] = by[s].ev_new;
    locked[s] = isLockedOrNear(by[s], limitPct, nearEps);
    const b = isBypassed(s) || by[s].bypassed || false;
    bypassNote[s] = b === true ? "This symbol is bypassed." : (typeof b === "string" ? b : "");
  }

  const tradable = (s) =>
    !exclude.has(s) &&
    price[s] > 0;

  //const oneLotCost = (p) => p * (1 + fee + slp);

  // Normalize to a Set for local simulation regardless of owned being Set or Map
  const ownedNow = owned instanceof Map ? new Set(owned.keys()) : new Set(owned);

  // Optional jump gate: if we can afford at least one new (non-locked) name under cap, skip jumps
  let skipJumpsThisBar = false;
  if (onlyWhenCashShort && Number.isFinite(cashTRY) && Number.isFinite(perTickerCapTRY)) {
    let canAffordAny = false;
    for (const s of Object.keys(by)) {
      if (ownedNow.has(s)) continue;
      if (!tradable(s)) continue;
      if (locked[s]) continue;
      if (evNew[s] == null) continue;
      // Call your real sizing routine with ghostCash = 0
      const { quantityToBuy } = await liveCalculateBuyQuantity(s, BUY_LIMIT, 0);
      const qty = Number(quantityToBuy) || 0;
      const estCost = qty * price[s] * (1 + perSide);

      if (qty > 0 && estCost <= cashTRY && estCost <= perTickerCapTRY) {
        canAffordAny = true;
        break;
      }
    }
    if (canAffordAny) {
      logs.push("POLICY: cash can fund at least one new entry — skipping jumps this bar.");
      skipJumpsThisBar = true;
    }
  }

  // Helper: best candidate destination (by ev_new), excluding locked & churned names
  const bestCandidate = (excludeSet) => {
    let best = null;
    for (const s of Object.keys(by)) {
      if (excludeSet.has(s)) continue;
      if (!tradable(s)) continue;
      if (locked[s]) continue;
      if (!(evNew[s] > jumpBuffer)) continue;
      if (!best || evNew[s] > evNew[best]) best = s;
    }
    return best; // ticker or null
  };

  // Prevent same-bar nonsense loops
  const barSold = new Set();
  const barBought = new Set();

  // 0) JUMPS from forced SELL names first
  let jumpsLeft = maxJumpsPerBar === 0 ? Number.POSITIVE_INFINITY : maxJumpsPerBar;

  const forced = Array.from(ownedNow).filter((s) => sig[s] === "SELL" && !locked[s]);
  for (const from of forced) {
    if (jumpsLeft <= 0) break;
    if (skipJumpsThisBar) break;
    if (jumpCooldownBars > 0 && cooldownMap instanceof Map && cooldownMap.has(from)) continue;

    const excludeSet = new Set([from, ...barSold, ...barBought]);
    const to = bestCandidate(excludeSet);
    if (!to) continue;

    const deltaEV = (evNew[to] - (evHeld[from] ?? 0)) - perSide;
    if (deltaEV > jumpBuffer) {
      // 🔄 CHANGED: affordability gate now uses 'owned' Map for quantity (no liveGetStock)
      let aff;
      try {
        aff = await canAffordJump({
          owned,
          from, to,
          priceFrom: price[from],
          priceTo:   price[to],
          perSide
        });
      } catch (e) {
        logs.push(`JUMP_SKIP ${from}→${to}: affordability check error (${e?.message ?? e})`);
        continue;
      }


      // 🔄 CHANGED: if BUY will certainly fail, emit only SELL (no JUMP)
      if (!aff.ok) {
        const note = bypassNote[from];
        const sellAction = suffixIfBypassed("SELL", note); // 🔧 ADDED
        let reason = `JUMP_BUY_FAIL → SELL_ONLY\n` +                 // 🔧 ADDED
                     `ΔEV=${(deltaEV*10000).toFixed(2)}bp | ` +
                     `dest=${to} unaffordable (ghostCash≈₺${(aff?.ghostCash ?? 0).toFixed(2)})`;
        if (note) reason += `\nThere is an active bypass.\n\n${note}`;

        actions.push({                                           // 🔧 ADDED
          action: sellAction,
          reason,
          symbol: symbolPayload(from, by),
        });
        logs.push(`🔻 SELL ${from} (JUMP_BUY_FAIL)`);            // 🔧 ADDED

        // 🔧 ADDED: update local state to avoid duplicate SELL later in phase 2
        ownedNow.delete(from);
        barSold.add(from);
        if (jumpCooldownBars > 0 && cooldownMap instanceof Map && cooldownAffectsFrom) {
          cooldownMap.set(from, jumpCooldownBars);
        }
        continue; // 🔧 ADDED: do not emit a JUMP
      }

      const score = computeJumpScore(deltaEV, jumpScaleS);

      const anyBypassed = !!(bypassNote[from] || bypassNote[to]);
      const actionName = suffixIfBypassed("JUMP", anyBypassed);
      let reason = `JUMP ${from} → ${to} | ΔEV=${(deltaEV*10000).toFixed(2)}bp | score=${score.toFixed(1)}`;
      if (bypassNote[from]) reason += `\nThere is an active bypass.\n\n${bypassNote[from]}`;
      if (bypassNote[to])   reason += `\nThere is an active bypass.\n\n${bypassNote[to]}`;
      // 🔧 ADDED: affordability context
      reason += `\nAFFORD_OK x${aff.qty} using ghostCash≈₺${aff.ghostCash.toFixed(2)} (est spend≈₺${aff.estCost.toFixed(2)})`;

      actions.push({
        action: actionName,
        reason,
        symbol: {
          jumpFrom: symbolPayload(from, by),
          jumpTo:   { ...symbolPayload(to, by), deltaEV },
        },
      });
      logs.push(`🔁 ${reason}`);

      // Update local state to avoid loops
      ownedNow.delete(from);
      ownedNow.add(to);
      barSold.add(from);
      barBought.add(to);
      if (jumpCooldownBars > 0 && cooldownMap instanceof Map) {
        cooldownMap.set(to, jumpCooldownBars);
        if (cooldownAffectsFrom) cooldownMap.set(from, jumpCooldownBars);
      }
      jumpsLeft -= 1;
    }
  }

  // 1) JUMPS by EV for remaining held names (weakest first), skipping locked-from
  const heldWeakFirst = Array.from(ownedNow)
    .filter((s) => sig[s] !== "SELL")
    .map((s) => ({ s, ev: evHeld[s] ?? -1e9 }))
    .sort((a, b) => a.ev - b.ev);

  for (const h of heldWeakFirst) {
    if (jumpsLeft <= 0) break;
    if (skipJumpsThisBar) break;
    const from = h.s;
    if (locked[from]) continue;
    if (jumpCooldownBars > 0 && cooldownMap instanceof Map && cooldownMap.has(from)) continue;

    const excludeSet = new Set([from, ...barSold, ...barBought]);
    const to = bestCandidate(excludeSet);
    if (!to) continue;

    const deltaEV = (evNew[to] - (evHeld[from] ?? 0)) - perSide;
    if (deltaEV > jumpBuffer) {
      
      let aff;
      try {
        aff = await canAffordJump({
          owned,
          from, to,
          priceFrom: price[from],
          priceTo:   price[to],
          perSide
        });
      } catch (e) {
        logs.push(`JUMP_SKIP ${from}→${to}: affordability check error (${e?.message ?? e})`);
        continue;
      }


      // 🔄 CHANGED: if BUY will certainly fail, emit only SELL (no JUMP)
      if (!aff.ok) {
        const note = bypassNote[from];
        const sellAction = suffixIfBypassed("SELL", note); // 🔧 ADDED
        let reason = `JUMP_BUY_FAIL → SELL_ONLY\n` +                 // 🔧 ADDED
                     `ΔEV=${(deltaEV*10000).toFixed(2)}bp | ` +
                     `dest=${to} unaffordable (ghostCash≈₺${(aff?.ghostCash ?? 0).toFixed(2)})`;
        if (note) reason += `\nThere is an active bypass.\n\n${note}`;

        actions.push({                                           // 🔧 ADDED
          action: sellAction,
          reason,
          symbol: symbolPayload(from, by),
        });
        logs.push(`🔻 SELL ${from} (JUMP_BUY_FAIL)`);            // 🔧 ADDED

        // 🔧 ADDED: update local state to avoid duplicate SELL later in phase 2
        ownedNow.delete(from);
        barSold.add(from);
        if (jumpCooldownBars > 0 && cooldownMap instanceof Map && cooldownAffectsFrom) {
          cooldownMap.set(from, jumpCooldownBars);
        }
        continue; // 🔧 ADDED: do not emit a JUMP
      }

      const score = computeJumpScore(deltaEV, jumpScaleS);

      const anyBypassed = !!(bypassNote[from] || bypassNote[to]);
      const actionName = suffixIfBypassed("JUMP", anyBypassed);
      let reason = `JUMP ${from} → ${to} | ΔEV=${(deltaEV*10000).toFixed(2)}bp | score=${score.toFixed(1)}`;
      if (bypassNote[from]) reason += `\nThere is an active bypass.\n\n${bypassNote[from]}`;
      if (bypassNote[to]) reason += `\nThere is an active bypass.\n\n${bypassNote[to]}`;
      // 🔧 ADDED: affordability context
      reason += `\nAFFORD_OK x${aff.qty} using ghostCash≈₺${aff.ghostCash.toFixed(2)} (est spend≈₺${aff.estCost.toFixed(2)})`;

      actions.push({
        action: actionName,
        reason,
        symbol: {
          jumpFrom: symbolPayload(from, by),
          jumpTo:   { ...symbolPayload(to, by), deltaEV },
        },
      });
      logs.push(`🔁 ${reason}`);

      ownedNow.delete(from);
      ownedNow.add(to);
      barSold.add(from);
      barBought.add(to);
      if (jumpCooldownBars > 0 && cooldownMap instanceof Map) {
        cooldownMap.set(to, jumpCooldownBars);
        if (cooldownAffectsFrom) cooldownMap.set(from, jumpCooldownBars);
      }
      jumpsLeft -= 1;
    }
  }

  // 2) Remaining forced SELLs (no jump executed), skip locked-from
  for (const s of ownedNow) {
    if (sig[s] === "SELL") {
      //if (locked[s]) continue; // cannot sell at limit
      const note = bypassNote[s];
      const actionName = suffixIfBypassed("SELL", note);
      let reason = "FORCED_SELL";
      if (note) reason += `\nThere is an active bypass.\n\n${note}`;

      actions.push({
        action: actionName,
        reason,
        symbol: symbolPayload(s, by),
      });
      logs.push(`🔻 SELL ${s} (forced)`);
    }
  }

  // 3) NEW entries from BUY signals (post-jump), respecting requireBuyForNew + lock
  const candidates = Object.keys(by)
    .filter((s) => !ownedNow.has(s))
    //.filter((s) => tradable(s) && !locked[s])
    .filter((s) => tradable(s))
    .sort((a, b) => (evNew[b] ?? -1e9) - (evNew[a] ?? -1e9));

  try {
    const baseCash = await liveGetCash();
    let remainingCash = baseCash;
    for (const s of candidates) {
      if (requireBuyForNew && sig[s] !== "BUY") continue;
      if ((evNew[s] ?? -1e9) <= jumpBuffer) continue;

      const px = price[s];
      if (!(px > 0)) continue;

      const ghostCash = -(baseCash - remainingCash);
      const { quantityToBuy } = await liveCalculateBuyQuantity(s, BUY_LIMIT, ghostCash);
      const qty = Number(quantityToBuy) || 0;
      const estCost = qty * px * (1 + perSide);

      if (qty <= 0 || estCost > remainingCash + 1e-9) {
        logs.push(`BUY_SKIP ${s}: unaffordable (qty=${qty}, need≈₺${estCost.toFixed(2)}, cash≈₺${remainingCash.toFixed(2)}), price=${px}`);
        continue;
      }

      const note = bypassNote[s];
      const actionName = suffixIfBypassed("BUY", note);
      let reason = "NEW_entry";
      if (note) reason += `\nThere is an active bypass.\n\n${note}`;
      reason += `\nAFFORD_OK x${qty} @≤₺${px.toFixed(2)} (≈₺${estCost.toFixed(2)} used; cash→₺${(remainingCash - estCost).toFixed(2)})`;

      actions.push({
        action: actionName,
        reason,
        symbol: symbolPayload(s, by),
      });
      logs.push(`🟢 BUY ${s} (qty=${qty})`);
      remainingCash -= estCost;
    }
  } catch (err) {
    logs.push(`BUY_PASS: affordability check failed globally (${err?.message ?? err}) — no BUY gating applied`);
  }

  return { actions, logs };
}
