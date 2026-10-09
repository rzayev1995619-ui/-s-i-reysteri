/* İşçi reyestri — tətbiqin məntiqi */
"use strict";

const STORE_KEY = "isci-reyestri:v1";
const UI_KEY = "isci-reyestri:ui:v1";
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

/* ---------- Yaddaş ---------- */
function loadRecords() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.map(r => Object.assign(emptyRecord(), r)) : [];
  } catch (e) { return []; }
}
function saveRecords() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(records)); return true; }
  catch (e) { showToast("Yadda saxlamaq olmadı: brauzerin yaddaşı doludur (şəkilləri kiçildin və ya ehtiyat nüsxə alın)."); return false; }
}
function loadUi() { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { return {}; } }
function saveUi() { try { localStorage.setItem(UI_KEY, JSON.stringify({ hidden: ui.hidden })); } catch (e) { /* vacib deyil */ } }

let records = loadRecords();
const ui = Object.assign({ view: "isci", status: "aktiv", q: "", dep: "", vez: "", sobe: "", isyeri: "", seg: "all", kseg: "all", sel: null, hidden: {} }, { hidden: loadUi().hidden || {} });

/* ---------- Hesablanmış görünüş ---------- */
function derive(d) {
  const t = todayD();
  const end = svEnd(d.svV);
  const days = end ? Math.round((end - t) / 864e5) : null;
  const svStatus = days == null ? "ok" : days < 0 ? "bad" : days <= 90 ? "soon" : "ok";
  const p = payroll(d);
  const kids = (d.ovladlar || []).map(k => ({ ad: k.ad, cins: k.cins || "—", dogum: k.dogum, dogumT: fd(pd(k.dogum)), yas: age(pd(k.dogum), t) }));
  const kvotaKeys = ["veteran", "sehid", "istirakci", "elillik", "kockun", "mehbus", "usaq2", "tek", "elilUsaq"];
  const dash = v => (v === "" || v == null) ? "—" : v;
  return Object.assign({}, d, {
    ini: initials(d.ad), svStatus,
    seriya: (d.seriyaPre + " " + (d.seriyaNo || "")).trim(),
    svVT: fd(pd(d.svV)), svEndT: end ? (svStatus === "bad" ? fd(end) + " · bitib" : svStatus === "soon" ? fd(end) + " · " + days + " gün" : fd(end)) : "—",
    dogumT: fd(pd(d.dogum)), yas: age(pd(d.dogum), t) ?? "—",
    qeyd: dash(d.qeyd), unvan: dash(d.unvan), ev: dash(d.ev), mail: dash(d.mail), mobil: dash(d.mobil),
    sobeAd: dash(d.sobeAd), derece: dash(d.derece), muessise: dash(d.muessise), ixtisas: dash(d.ixtisas),
    kids, ovladSay: kids.length, ovlad14: kids.filter(k => k.yas != null && k.yas < 14).length,
    hasKvota: kvotaKeys.some(k => d[k] && d[k] !== X),
    statusT: d.aktiv ? "Aktiv" : "İnaktiv", cixisT: d.cixis ? fd(pd(d.cixis)) : "—", xitamT: !d.aktiv && d.xitam ? d.xitam : "—",
    qebulT: fd(pd(d.qebul)), stajT: num(d.stajIl) + " il " + num(d.stajAy) + " ay " + num(d.stajGun) + " gün",
    mezToplam: num(d.esas) + num(d.elave) + num(d.usaqMez) + num(d.zerer),
    tarifT: money(num(d.tarif)), elaveMaasT: money(num(d.elaveMaas)), toplamT: money(p.toplam), yemekT: money(p.yemek), izkartT: money(num(d.izkart)),
    gvT: money(p.gv), dsT: money(p.ds), isT: money(p.is), itsT: money(p.its), netT: money(p.net), netN: p.net
  });
}

function cellHtml(kind, v, r) {
  const s = esc(v);
  switch (kind) {
    case "yn": return v === X || v === "—" ? `<span class="no">${s}</span>` : `<span class="pill yes">${s}</span>`;
    case "sv": return r.svStatus === "ok" ? `<span class="c-m">${s}</span>` : `<span class="pill ${r.svStatus}">${s}</span>`;
    case "st": return `<span class="pill ${r.aktiv ? "act" : "inact"}">${s}</span>`;
    default: return `<span class="c-${kind}">${s}</span>`;
  }
}

/* ---------- Filtrlər ---------- */
function statusOk(r) { return ui.status === "hamisi" || (ui.status === "aktiv") === !!r.aktiv; }
function commonOk(r) {
  if (ui.dep && r.dep !== ui.dep) return false;
  if (ui.vez && r.vezife !== ui.vez) return false;
  if (ui.sobe && r.sobe !== ui.sobe) return false;
  if (ui.isyeri && r.isyeri !== ui.isyeri) return false;
  return true;
}
function employees(all) {
  const q = lc(ui.q.trim());
  return all.filter(r => statusOk(r) && commonOk(r)
    && (!q || lc(r.ad).includes(q) || lc(r.fin).includes(q))
    && (ui.seg !== "kvota" || r.hasKvota)
    && (ui.seg !== "sv" || r.svStatus !== "ok"));
}
function allKids(all) {
  const out = [];
  all.forEach(r => r.kids.forEach(k => out.push(Object.assign({}, k, { parent: r.ad, pfin: r.fin, vezife: r.vezife, dep: r.dep, sobe: r.sobe, isyeri: r.isyeri, pid: r.id, aktiv: r.aktiv }))));
  return out;
}
function kidsFiltered(kids) {
  const q = lc(ui.q.trim());
  const lim = { u6: 6, u14: 14, u16: 16 }[ui.kseg];
  return kids.filter(k => statusOk(k) && commonOk(k)
    && (!q || lc(k.ad).includes(q) || lc(k.parent).includes(q) || lc(k.pfin).includes(q))
    && (!lim || (k.yas != null && k.yas < lim)));
}
function uniqSorted(key) {
  const set = [];
  records.forEach(r => { const v = r[key]; if (v && !set.includes(v)) set.push(v); });
  return set.sort((a, b) => a.localeCompare(b, "az"));
}

/* ---------- Render ---------- */
function render() {
  const all = records.map(derive);
  const pool = all.filter(statusOk);
  const kidsAll = allKids(all);
  const kidsPool = kidsAll.filter(statusOk);

  // Tablar
  $("#tabs").innerHTML = [["isci", "İşçilər", pool.length], ["ovlad", "Övladlar", kidsPool.length]].map(([id, l, n]) =>
    `<button type="button" class="tab" data-action="tab" data-v="${id}" aria-selected="${ui.view === id}">${l} <span class="count">${n}</span></button>`).join("");

  // Filtr seçimləri
  fillSelect($("#fDep"), uniqSorted("dep"), "Bütün departamentlər", ui.dep);
  fillSelect($("#fVez"), uniqSorted("vezife"), "Bütün vəzifələr", ui.vez);
  fillSelect($("#fSobe"), SOBELER, "Bütün şöbələr", ui.sobe);
  fillSelect($("#fIsyeri"), uniqSorted("isyeri"), "Bütün iş yerləri", ui.isyeri);
  $("label[for=fDep]").textContent = ui.view === "ovlad" ? "Valideynin departamenti" : "Departament";
  $("label[for=fVez]").textContent = ui.view === "ovlad" ? "Valideynin vəzifəsi" : "Vəzifə";
  $("#stLbl").textContent = ui.view === "ovlad" ? "Valideynin statusu" : "Status";
  $("#q").placeholder = ui.view === "ovlad" ? "Övladın və ya valideynin adı, FİN" : "Ad, soyad və ya FİN";

  const sAll = all.length, sAkt = all.filter(r => r.aktiv).length;
  const st = $("#statusSeg"); st.className = "seg status";
  st.innerHTML = [["aktiv", "Aktiv", sAkt], ["inaktiv", "İnaktiv", sAll - sAkt], ["hamisi", "Hamısı", sAll]].map(([v, l, n]) =>
    `<button type="button" data-action="status" data-v="${v}" aria-pressed="${ui.status === v}">${l} · ${n}</button>`).join("");

  const quick = ui.view === "isci"
    ? [["all", "Hamısı"], ["kvota", "Kvotalılar"], ["sv", "ŞV müddəti"]].map(([v, l]) => `<button type="button" data-action="seg" data-v="${v}" aria-pressed="${ui.seg === v}">${l}</button>`)
    : [["all", "Hamısı"], ["u6", "Məktəbəqədər (6-dək)"], ["u14", "14 yaşadək"], ["u16", "16 yaşadək"]].map(([v, l]) => `<button type="button" data-action="kseg" data-v="${v}" aria-pressed="${ui.kseg === v}">${l}</button>`);
  $("#quickSeg").innerHTML = quick.join("");
  $("#quickLbl").textContent = ui.view === "isci" ? "Sürətli filtr" : "Yaş";

  $("#groupRow").hidden = ui.view !== "isci";
  $("#groupToggles").innerHTML = GROUPS.map(g =>
    `<button type="button" class="chip" data-action="group" data-v="${g.id}" aria-pressed="${!ui.hidden[g.id]}">${esc(g.label)}<span class="n">${g.cols.length}</span></button>`).join("");

  // Datalist-lər
  [["dl-vezife", "vezife"], ["dl-dep", "dep"], ["dl-isyeri", "isyeri"]].forEach(([id, k]) => { $("#" + id).innerHTML = uniqSorted(k).map(v => `<option value="${esc(v)}">`).join(""); });

  if (ui.view === "isci") renderEmployees(all, pool); else renderKids(kidsAll, kidsPool);
}

function fillSelect(sel, values, allLabel, current) {
  const opts = [`<option value="">${esc(allLabel)}</option>`].concat(values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`));
  sel.innerHTML = opts.join("");
  sel.value = values.includes(current) ? current : "";
}

function stat(k, v, cls) { return `<div class="stat ${cls || ""}"><div class="k">${k}</div><div class="v">${v}</div></div>`; }

function renderEmployees(all, pool) {
  const fond = pool.reduce((s, r) => s + (r.aktiv ? r.netN : 0), 0);
  $("#stats").innerHTML =
    stat("Cəmi işçi", pool.length) +
    stat("Kvotaya düşənlər", pool.filter(r => r.hasKvota).length) +
    stat("ŞV müddəti bitir / bitib (90 gün)", pool.filter(r => r.svStatus !== "ok").length, "warn") +
    stat("Aylıq net fond (aktivlər, yemək pulu ilə)", money(fond) + " ₼");

  const rows = employees(all);
  const groups = GROUPS.filter(g => !ui.hidden[g.id]);
  const nCols = groups.reduce((s, g) => s + g.cols.length, 0) + 1;
  $("#shownLabel").textContent = `${rows.length} / ${pool.length} işçi göstərilir`;
  $("#colLabel").textContent = `${nCols} sütun · cədvəli sağa sürüşdürün`;

  let h = `<thead><tr><th class="name" rowspan="2">Ad Soyad Ata adı</th>`;
  h += groups.map(g => `<th colspan="${g.cols.length}" class="edge">${esc(g.label)}</th>`).join("") + `</tr><tr>`;
  groups.forEach(g => g.cols.forEach((c, i) => {
    const cls = [c[1].length > 18 ? "hw" : "nowrap", i === g.cols.length - 1 ? "edge" : "", (c[2] === "n" || c[2] === "b") ? "r" : ""].join(" ");
    h += `<th class="${cls}">${esc(c[1])}</th>`;
  }));
  h += `</tr></thead><tbody>`;
  rows.forEach(r => {
    h += `<tr class="${r.id === ui.sel ? "sel" : ""}"><td class="name"><div class="namecell">` +
      `<div class="avatar" aria-hidden="true">${r.foto ? `<img src="${r.foto}" alt="">` : esc(r.ini)}</div>` +
      `<button type="button" class="linkbtn" data-action="select" data-id="${r.id}">${esc(r.ad)}</button>` +
      (r.aktiv ? `<button type="button" class="btn small danger-outline" data-action="xitam" data-id="${r.id}" aria-label="${esc(r.ad)} — xitam et">Xitam et</button>`
               : `<span class="tag-done">Xitam edilib</span>`) +
      `</div></td>`;
    groups.forEach(g => g.cols.forEach((c, i) => {
      const cls = [i === g.cols.length - 1 ? "edge" : "", (c[2] === "n" || c[2] === "b") ? "r" : ""].join(" ");
      h += `<td class="${cls}">${cellHtml(c[2], r[c[0]], r)}</td>`;
    }));
    h += `</tr>`;
  });
  h += `</tbody>`;
  $("#grid").innerHTML = h;

  const empty = $("#empty");
  if (!records.length) {
    empty.hidden = false;
    empty.innerHTML = `<div>Reyestr boşdur. «Yeni işçi» ilə ilk kartı əlavə edin.</div><button type="button" class="btn" data-action="sample">Nümunə məlumatları yüklə</button>`;
  } else if (!rows.length) {
    empty.hidden = false; empty.textContent = "Filtrə uyğun işçi tapılmadı.";
  } else empty.hidden = true;

  renderPanel(all.find(r => r.id === ui.sel));
}

function renderPanel(r) {
  const panel = $("#panel");
  if (!r || ui.view !== "isci") { panel.hidden = true; return; }
  panel.hidden = false;
  const p = payroll(r);
  const kv = (k, v, full) => `<div class="${full ? "full" : ""}"><div class="k">${k}</div><div>${v}</div></div>`;
  const sec = (title, body) => `<section class="psec"><h3>${title}</h3>${body}</section>`;
  const yn = v => cellHtml("yn", v, r);
  const sv = cellHtml("sv", r.svEndT, r);
  panel.innerHTML =
    `<div class="panel-head"><div class="big" aria-hidden="true">${r.foto ? `<img src="${r.foto}" alt="">` : esc(r.ini)}</div>` +
    `<div class="who"><strong>${esc(r.ad)}</strong><span>${esc(r.vezife)} · ${esc(r.isyeri)}</span></div>` +
    `<button type="button" class="icon-btn light" data-action="close-panel" aria-label="Kartı bağla"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg></button></div>` +
    `<div class="panel-body">` +
    sec("Şəxsi məlumatlar", `<div class="kv">` +
      kv("FİN / Seriya", `<span class="mono">${esc(r.fin)} · ${esc(r.seriya)}</span>`) + kv("Cins", esc(r.cins)) +
      kv("Doğum tarixi", `${esc(r.dogumT)} (${esc(r.yas)} yaş)`) + kv("ŞV verilmə", esc(r.svVT)) + kv("ŞV etibarlılıq", sv) +
      kv("Mobil", esc(r.mobil)) + kv("Ev", esc(r.ev)) + kv("Mail", esc(r.mail), true) +
      kv("Qeydiyyat ünvanı", esc(r.qeyd), true) + kv("Yaşayış ünvanı", esc(r.unvan), true) + `</div>`) +
    sec("Kvota", `<div class="kv">` +
      kv("Ailə vəziyyəti", esc(r.aile)) + kv("14 yaşadək övlad", r.ovlad14) +
      kv("Müharibə veteranı", yn(r.veteran)) + kv("Müharibə iştirakçısı", yn(r.istirakci)) + kv("Şəhid ailə üzvü", yn(r.sehid)) +
      kv("Əlillik", yn(r.elillik)) + kv("Məcburi köçkünlük", yn(r.kockun)) + kv("Məhbusluq", yn(r.mehbus)) +
      kv("2+ uşaq (16 yaşadək)", yn(r.usaq2)) + kv("Uşağı təkbaşına böyüdür", yn(r.tek)) + kv("Əlil uşaq / ailə üzvü", yn(r.elilUsaq), true) + `</div>`) +
    sec("Övladlar", r.kids.length ? r.kids.map(k => `<div class="kid-line"><span>${esc(k.ad)}</span><span>${esc(k.cins)} · ${esc(k.dogumT)} · ${esc(k.yas ?? "—")} yaş</span></div>`).join("") : `<div class="muted small">Övlad qeyd olunmayıb</div>`) +
    sec("Vəzifə", `<div class="kv">` +
      kv("Status", cellHtml("st", r.statusT, r)) + kv("İşdən çıxma", esc(r.cixisT)) +
      (r.aktiv ? "" : kv("Xitam səbəbi", esc(r.xitamT) + (r.xitamQeyd ? ` · ${esc(r.xitamQeyd)}` : ""), true)) +
      kv("Vəzifənin adı", esc(r.vezife)) + kv("Şöbə", esc(r.sobeAd)) + kv("Mağazada tutduğu şöbə", esc(r.sobe)) + kv("Departament", esc(r.dep)) +
      kv("İş yeri", esc(r.isyeri)) + kv("Qəbul tarixi", esc(r.qebulT)) + kv("Əvvəlki staj", esc(r.stajT), true) + `</div>`) +
    sec("Məzuniyyət (gün)", `<div class="kv">` + kv("Əsas", r.esas) + kv("Əlavə", r.elave) + kv("Uşağa görə", r.usaqMez) + kv("Zərərə görə", r.zerer) + kv("Toplam", `<strong>${r.mezToplam}</strong>`, true) + `</div>`) +
    sec("Təhsil", `<div class="kv">` + kv("Dərəcə", esc(r.derece)) + kv("İxtisas", esc(r.ixtisas)) + kv("Müəssisə", esc(r.muessise), true) + `</div>`) +
    sec("Əmək haqqı (aylıq, ₼)", `<div class="kv">` +
      kv("Tarif + əlavə", `<span class="mono">${money(p.toplam)}</span>`) + kv("Yemək pulu", `<span class="mono">${money(p.yemek)}</span>`) +
      kv("Gəlir vergisi", `<span class="mono">−${money(p.gv)}</span>`) + kv("DSMF 3%", `<span class="mono">−${money(p.ds)}</span>`) +
      kv("İşsizlik 0,5%", `<span class="mono">−${money(p.is)}</span>`) + kv("İ.T.S 2%", `<span class="mono">−${money(p.its)}</span>`) +
      kv("İz kart bonus", `<span class="mono">${esc(r.izkartT)}</span>`) + kv("Net", `<strong class="mono">${money(p.net)}</strong>`) + `</div>`) +
    `<div class="panel-btns">` +
      `<button type="button" class="btn primary" data-action="edit" data-id="${r.id}">Kartı aç</button>` +
      (r.aktiv ? `<button type="button" class="btn danger-outline" data-action="xitam" data-id="${r.id}">Xitam et</button>`
               : `<button type="button" class="btn" data-action="restore" data-id="${r.id}">Bərpa et (aktiv et)</button>`) +
      `<button type="button" class="btn" data-action="delete" data-id="${r.id}">Sil</button>` +
    `</div></div>`;
}

function renderKids(kidsAll, kidsPool) {
  $("#stats").innerHTML =
    stat("Cəmi övlad", kidsPool.length) +
    stat("14 yaşadək", kidsPool.filter(k => k.yas != null && k.yas < 14).length) +
    stat("16 yaşadək", kidsPool.filter(k => k.yas != null && k.yas < 16).length) +
    stat("Övladı olan işçi", new Set(kidsPool.map(k => k.pid)).size);
  const rows = kidsFiltered(kidsAll);
  $("#shownLabel").textContent = `${rows.length} / ${kidsPool.length} övlad göstərilir`;
  $("#colLabel").textContent = "Valideynin adına klikləyin — işçi kartı açılır";
  const yn = b => b ? `<span class="pill yes">Bəli</span>` : `<span class="no">Xeyr</span>`;
  let h = `<thead><tr><th colspan="7" class="edge">Övlad</th><th colspan="5">Valideyn (işçi)</th></tr><tr>` +
    `<th class="r">№</th><th class="nowrap">Övladının Ad Soyadı ata adı</th><th>Cins</th><th class="nowrap">Doğum tarixi</th><th class="r">Yaş</th><th class="nowrap">14 yaşadək</th><th class="nowrap edge">16 yaşadək</th>` +
    `<th class="nowrap">Ad Soyad Ata adı</th><th>FİN</th><th>Status</th><th>Vəzifə</th><th class="nowrap">İş yeri</th></tr></thead><tbody>`;
  rows.forEach((k, i) => {
    h += `<tr><td class="r c-n">${i + 1}</td><td><strong class="c-t">${esc(k.ad)}</strong></td><td>${esc(k.cins)}</td><td class="c-m">${esc(k.dogumT)}</td><td class="r c-n">${esc(k.yas ?? "—")}</td>` +
      `<td>${yn(k.yas != null && k.yas < 14)}</td><td class="edge">${yn(k.yas != null && k.yas < 16)}</td>` +
      `<td><button type="button" class="linkbtn green" data-action="open-parent" data-id="${k.pid}">${esc(k.parent)}</button></td>` +
      `<td class="c-m">${esc(k.pfin)}</td><td><span class="pill ${k.aktiv ? "act" : "inact"}">${k.aktiv ? "Aktiv" : "İnaktiv"}</span></td><td class="c-t">${esc(k.vezife)}</td><td class="c-t">${esc(k.isyeri)}</td></tr>`;
  });
  $("#grid").innerHTML = h + `</tbody>`;
  const empty = $("#empty");
  empty.hidden = rows.length > 0;
  empty.textContent = "Filtrə uyğun övlad tapılmadı.";
  $("#panel").hidden = true;
}

/* ---------- Bildiriş ---------- */
let toastT = null;
function showToast(text, undoFn) {
  const t = $("#toast");
  $("#toastText").textContent = text;
  const ub = $("#toastUndo");
  ub.hidden = !undoFn;
  ub.onclick = undoFn ? () => { undoFn(); } : null;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, undoFn ? 6000 : 3500);
}

/* ---------- Kart forması ---------- */
let editingId = 0;
let formFoto = "";

function buildForm() {
  let h = "";
  FORM_SECTIONS.forEach(sec => {
    h += `<section class="fsec"><h3>${esc(sec.label)}</h3>`;
    if (sec.kids) {
      h += `<div class="kids-box"><div class="ttl">Övladlar</div><div class="kids-table"><table><thead><tr>` +
        `<th style="width:32px">№</th><th>Övladının Ad Soyadı ata adı</th><th style="width:130px">Cins</th><th style="width:170px">Doğum tarixi</th><th style="width:50px">Yaş</th><th style="width:52px"><span class="sr">Sil</span></th>` +
        `</tr></thead><tbody id="kidsBody"></tbody></table></div>` +
        `<button type="button" class="add-kid" id="addKid">+ Övlad əlavə et <span class="muted" id="kidCount"></span></button></div>`;
    }
    h += `<div class="fgrid">`;
    sec.fields.forEach(f => {
      const full = f.wide ? " full" : "";
      const star = f.req ? `<span class="req"> *</span>` : "";
      if (f.type === "calc") {
        h += `<div class="field${full}"><span class="lbl">${esc(f.label)} <span class="auto-tag">· avtomatik</span></span><div class="calc${f.strong ? " strong" : ""}" id="${f.key}" aria-live="polite">—</div></div>`;
      } else if (f.type === "select") {
        h += `<div class="field${full}" data-field="${f.key}"><label for="f_${f.key}">${esc(f.label)}${star}</label><select id="f_${f.key}" name="${f.key}">` +
          f.options.map(o => `<option value="${esc(o)}">${o === "" ? "— seçin —" : esc(o)}</option>`).join("") + `</select></div>`;
      } else {
        const extra = (f.type === "number" ? ` min="0" step="any" inputmode="decimal"` : "") + (f.max ? ` maxlength="${f.max}"` : "") + (f.list ? ` list="${f.list}"` : "") + (f.ph ? ` placeholder="${esc(f.ph)}"` : "");
        h += `<div class="field${full}" data-field="${f.key}"><label for="f_${f.key}">${esc(f.label)}${star}</label><input id="f_${f.key}" name="${f.key}" type="${f.type}"${extra} autocomplete="off"></div>`;
      }
    });
    h += `</div></section>`;
  });
  $("#formBody").innerHTML = h;
  $("#addKid").addEventListener("click", () => { const kids = readKids(true); if (kids.length < 10) { kids.push({ ad: "", cins: "", dogum: "" }); renderKidRows(kids); } });
}

function renderKidRows(kids) {
  $("#kidsBody").innerHTML = kids.map((k, i) => {
    const n = i + 1;
    return `<tr data-k="${i}"><td class="c-n">${n}</td>` +
      `<td><input type="text" data-kf="ad" aria-label="${n}-ci övladın adı" value="${esc(k.ad)}"></td>` +
      `<td><select data-kf="cins" aria-label="${n}-ci övladın cinsi">${["", "Kişi", "Qadın"].map(o => `<option value="${o}"${o === k.cins ? " selected" : ""}>${o || "—"}</option>`).join("")}</select></td>` +
      `<td><input type="date" data-kf="dogum" aria-label="${n}-ci övladın doğum tarixi" value="${esc(k.dogum)}"></td>` +
      `<td class="c-n" data-kyas>—</td>` +
      `<td><button type="button" class="icon-btn" data-kdel="${i}" aria-label="${n}-ci övladı sil"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg></button></td></tr>`;
  }).join("");
  $("#kidCount").textContent = `(${kids.length} / 10)`;
  $("#addKid").disabled = kids.length >= 10;
  updateCalcs();
}

function readKids(keepEmpty) {
  return $$("#kidsBody tr").map(tr => ({
    ad: $("[data-kf=ad]", tr).value.trim(), cins: $("[data-kf=cins]", tr).value, dogum: $("[data-kf=dogum]", tr).value
  })).filter(k => keepEmpty || k.ad);
}

function readForm() {
  const o = {};
  FORM_SECTIONS.forEach(s => s.fields.forEach(f => { if (f.type !== "calc") o[f.key] = $("#f_" + f.key).value; }));
  return o;
}

function updateCalcs() {
  const f = readForm();
  const t = todayD();
  const end = svEnd(f.svV);
  $("#c_svEnd").textContent = end ? fd(end) : "—";
  const a = age(pd(f.dogum), t);
  $("#c_yas").textContent = a == null ? "—" : a;
  $$("#kidsBody tr").forEach(tr => { const y = age(pd($("[data-kf=dogum]", tr).value), t); $("[data-kyas]", tr).textContent = y == null ? "—" : y; });
  $("#c_ovlad14").textContent = readKids().filter(k => { const y = age(pd(k.dogum), t); return y != null && y < 14; }).length;
  $("#c_mez").textContent = (num(f.esas) + num(f.elave) + num(f.usaqMez) + num(f.zerer)) + " gün";
  const p = payroll(f);
  $("#c_toplam").textContent = money(p.toplam);
  $("#c_gv").textContent = money(p.gv);
  $("#c_ds").textContent = money(p.ds);
  $("#c_is").textContent = money(p.is);
  $("#c_its").textContent = money(p.its);
  $("#c_net").textContent = money(p.net);
}

function setFoto(src) {
  formFoto = src || "";
  $("#fotoImg").hidden = !formFoto;
  if (formFoto) $("#fotoImg").src = formFoto; else $("#fotoImg").removeAttribute("src");
  $("#fotoPh").style.display = formFoto ? "none" : "";
  $("#fotoDel").hidden = !formFoto;
}

function openForm(rec) {
  editingId = rec ? rec.id : 0;
  const r = Object.assign(emptyRecord(), rec || {});
  $("#formTitle").textContent = rec ? "Kartı redaktə et" : "Yeni işçi kartı";
  FORM_SECTIONS.forEach(s => s.fields.forEach(f => {
    if (f.type === "calc") return;
    const el = $("#f_" + f.key);
    let v = r[f.key] == null ? "" : String(r[f.key]);
    if (f.type === "select" && !f.options.includes(v)) v = f.options[0];
    el.value = v;
  }));
  setFoto(r.foto);
  renderKidRows(r.ovladlar.length ? r.ovladlar.map(k => Object.assign({}, k)) : [{ ad: "", cins: "", dogum: "" }, { ad: "", cins: "", dogum: "" }]);
  clearFormErrors();
  $("#formDlg").showModal();
  $("#formBody").scrollTop = 0;
  $("#f_ad").focus();
}

function clearFormErrors() {
  $$("#formBody .field.invalid").forEach(el => el.classList.remove("invalid"));
  const m = $("#formMsg"); m.className = "foot-msg"; m.innerHTML = `<span class="req">*</span> işarəli sahələr məcburidir`;
}

function saveForm(ev) {
  ev.preventDefault();
  clearFormErrors();
  const f = readForm();
  const kids = readKids();
  const errs = [], bad = new Set();
  FORM_SECTIONS.forEach(s => s.fields.forEach(c => { if (c.req && !String(f[c.key] || "").trim()) { errs.push(`${c.label} doldurulmayıb`); bad.add(c.key); } }));
  const fin = f.fin.trim().toUpperCase();
  if (fin && !/^[A-Z0-9]{7}$/.test(fin)) { errs.push("FİN 7 simvoldan (hərf və rəqəm) ibarət olmalıdır"); bad.add("fin"); }
  if (fin && records.some(r => r.fin === fin && r.id !== editingId)) { errs.push("Bu FİN ilə işçi artıq reyestrdə var"); bad.add("fin"); }
  if (f.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.mail.trim())) { errs.push("Mail ünvanı düzgün deyil"); bad.add("mail"); }
  if (f.dogum && f.qebul && f.dogum >= f.qebul) { errs.push("İşə qəbul tarixi doğum tarixindən sonra olmalıdır"); bad.add("qebul"); }
  kids.forEach((k, i) => { if (!k.dogum) errs.push(`${i + 1}-ci övladın doğum tarixi doldurulmayıb`); });

  if (errs.length) {
    bad.forEach(k => { const el = $(`[data-field="${k}"]`); if (el) el.classList.add("invalid"); });
    const m = $("#formMsg"); m.className = "foot-msg err"; m.setAttribute("role", "alert");
    m.innerHTML = `<strong>Yadda saxlamaq olmadı:</strong><ul>${errs.map(e => `<li>${esc(e)}</li>`).join("")}</ul>`;
    const first = $("#formBody .field.invalid input, #formBody .field.invalid select"); if (first) first.focus();
    return;
  }

  const prev = records.find(r => r.id === editingId);
  const now = new Date().toISOString();
  const rec = Object.assign(emptyRecord(), prev || {}, {
    ad: f.ad.trim(), fin, cins: f.cins, seriyaPre: f.seriyaPre, seriyaNo: f.seriyaNo.trim(), svV: f.svV, dogum: f.dogum,
    qeyd: f.qeyd.trim(), unvan: f.unvan.trim(), mobil: f.mobil.trim(), ev: f.ev.trim(), mail: f.mail.trim(), foto: formFoto,
    ovladlar: kids,
    aile: f.aile, veteran: f.veteran, istirakci: f.istirakci, sehid: f.sehid, elillik: f.elillik, kockun: f.kockun, mehbus: f.mehbus, usaq2: f.usaq2, tek: f.tek, elilUsaq: f.elilUsaq,
    vezife: f.vezife.trim(), sobeAd: f.sobeAd.trim(), sobe: f.sobe, dep: f.dep.trim(), isyeri: f.isyeri.trim(), qebul: f.qebul,
    stajIl: num(f.stajIl), stajAy: num(f.stajAy), stajGun: num(f.stajGun),
    esas: num(f.esas), elave: num(f.elave), usaqMez: num(f.usaqMez), zerer: num(f.zerer),
    derece: f.derece, muessise: f.muessise.trim(), ixtisas: f.ixtisas.trim(),
    tarif: num(f.tarif), elaveMaas: num(f.elaveMaas), yemek: num(f.yemek), izkart: num(f.izkart),
    yenilenib: now
  });
  if (prev) {
    records = records.map(r => r.id === prev.id ? rec : r);
  } else {
    rec.id = records.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    rec.aktiv = true; rec.yaradilib = now;
    records.push(rec);
  }
  if (!saveRecords()) return;
  $("#formDlg").close();
  Object.assign(ui, { view: "isci", sel: rec.id, status: rec.aktiv ? "aktiv" : "inaktiv", q: "", dep: "", vez: "", sobe: "", isyeri: "", seg: "all" });
  $("#q").value = "";
  render();
  showToast(prev ? `Kart yeniləndi: ${rec.ad}` : `Yeni işçi reyestrə əlavə edildi: ${rec.ad}`);
}

/* Şəkli kiçildib saxlayırıq ki, brauzer yaddaşı dolmasın */
function loadPhoto(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 240, s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      setFoto(c.toDataURL("image/jpeg", 0.82));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- Xitam ---------- */
let xitamId = 0;
function openXitam(id) {
  const r = records.find(x => x.id === id);
  if (!r || !r.aktiv) return;
  xitamId = id;
  $("#xitamTitle").textContent = r.ad;
  $("#xitamSub").textContent = `${r.vezife} · ${r.isyeri} · qəbul: ${fd(pd(r.qebul))}`;
  $("#xDate").value = iso(todayD());
  $("#xDate").min = r.qebul || "";
  $("#xReason").innerHTML = `<option value="">— seçin —</option>` + XITAM_SEBEBLER.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  $("#xNote").value = "";
  $("#xitamErr").hidden = true;
  $("#xitamDlg").showModal();
  $("#xReason").focus();
}
function confirmXitam(ev) {
  ev.preventDefault();
  const r = records.find(x => x.id === xitamId);
  if (!r) return;
  const date = $("#xDate").value, reason = $("#xReason").value, note = $("#xNote").value.trim();
  let err = "";
  if (!date) err = "İşdən çıxma tarixini seçin.";
  else if (r.qebul && date < r.qebul) err = `İşdən çıxma tarixi işə qəbul tarixindən (${fd(pd(r.qebul))}) əvvəl ola bilməz.`;
  else if (!reason) err = "Xitam səbəbini seçin.";
  if (err) { const e = $("#xitamErr"); e.textContent = err; e.hidden = false; return; }
  const before = Object.assign({}, r);
  records = records.map(x => x.id === r.id ? Object.assign({}, x, { aktiv: false, cixis: date, xitam: reason, xitamQeyd: note, yenilenib: new Date().toISOString() }) : x);
  saveRecords();
  $("#xitamDlg").close();
  render();
  showToast(`${r.ad} — xitam edildi, İnaktiv siyahısına keçdi`, () => {
    records = records.map(x => x.id === before.id ? before : x);
    saveRecords(); render();
    showToast(`Xitam geri alındı: ${before.ad}`);
  });
}

/* ---------- Excel, ehtiyat nüsxə ---------- */
function exportXlsx() {
  if (!window.XLSX) { showToast("Excel kitabxanası yüklənmədi — internet bağlantısını yoxlayın."); return; }
  const all = records.map(derive);
  const rows = employees(all);
  const cols = GROUPS.flatMap(g => g.cols);
  const head = ["Ad Soyad Ata adı"].concat(cols.map(c => c[1]));
  const body = rows.map(r => {
    const p = payroll(r);
    const raw = { tarifT: num(r.tarif), elaveMaasT: num(r.elaveMaas), toplamT: p.toplam, yemekT: p.yemek, izkartT: num(r.izkart), gvT: p.gv, dsT: p.ds, isT: p.is, itsT: p.its, netT: p.net };
    return [r.ad].concat(cols.map(c => {
      if (c[0] in raw) return r2(raw[c[0]]);
      if (c[0] === "svEndT") return fd(svEnd(r.svV));
      return r[c[0]];
    }));
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([head].concat(body));
  ws["!cols"] = head.map((h, i) => ({ wch: i === 0 ? 32 : Math.min(30, Math.max(10, h.length + 2)) }));
  XLSX.utils.book_append_sheet(wb, ws, "İşçilər");
  const kids = kidsFiltered(allKids(all)).filter(k => rows.some(r => r.id === k.pid) || ui.view === "ovlad");
  const ks = XLSX.utils.aoa_to_sheet([["Övladının Ad Soyadı ata adı", "Cins", "Doğum tarixi", "Yaş", "14 yaşadək", "16 yaşadək", "Valideyn", "Valideynin FİN", "Vəzifə", "Departament", "İş yeri", "Status"]]
    .concat(kids.map(k => [k.ad, k.cins, k.dogumT, k.yas, k.yas < 14 ? B : X, k.yas < 16 ? B : X, k.parent, k.pfin, k.vezife, k.dep, k.isyeri, k.aktiv ? "Aktiv" : "İnaktiv"])));
  ks["!cols"] = [{ wch: 32 }, { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 32 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ks, "Övladlar");
  XLSX.writeFile(wb, `isci-reyestri-${iso(todayD())}.xlsx`);
  showToast(`Excel faylı hazırlandı: ${rows.length} işçi, ${kids.length} övlad`);
}

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function backup() {
  download(`isci-reyestri-ehtiyat-${iso(todayD())}.json`, JSON.stringify({ app: "isci-reyestri", version: 1, exported: new Date().toISOString(), records }, null, 2), "application/json");
  showToast(`Ehtiyat nüsxə endirildi: ${records.length} işçi`);
}
function restore(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const list = Array.isArray(data) ? data : data.records;
      if (!Array.isArray(list)) throw new Error("format");
      if (!confirm(`Faylda ${list.length} işçi var. Hazırkı ${records.length} işçinin yerinə yazılsın?`)) return;
      records = list.map(r => Object.assign(emptyRecord(), r));
      saveRecords(); ui.sel = null; render();
      showToast(`Bərpa edildi: ${records.length} işçi`);
    } catch (e) { showToast("Bu fayl reyestrin ehtiyat nüsxəsi deyil."); }
  };
  reader.readAsText(file);
}

/* ---------- Hadisələr ---------- */
document.addEventListener("click", ev => {
  const btn = ev.target.closest("[data-action]");
  if (!btn) return;
  const a = btn.dataset.action, v = btn.dataset.v, id = Number(btn.dataset.id);
  switch (a) {
    case "new": openForm(null); break;
    case "edit": openForm(records.find(r => r.id === id)); break;
    case "select": ui.sel = id; render(); break;
    case "close-panel": ui.sel = null; render(); break;
    case "xitam": openXitam(id); break;
    case "restore": {
      const r = records.find(x => x.id === id);
      if (r && confirm(`${r.ad} yenidən aktiv edilsin?`)) {
        records = records.map(x => x.id === id ? Object.assign({}, x, { aktiv: true, cixis: "", xitam: "", xitamQeyd: "" }) : x);
        saveRecords(); ui.status = "aktiv"; render(); showToast(`${r.ad} yenidən aktivdir`);
      }
      break;
    }
    case "delete": {
      const r = records.find(x => x.id === id);
      if (r && confirm(`${r.ad} reyestrdən tamamilə silinsin? Bunu geri qaytarmaq olmaz.\n(İşdən çıxıbsa, «Xitam et» istifadə edin.)`)) {
        records = records.filter(x => x.id !== id); saveRecords(); ui.sel = null; render(); showToast(`Silindi: ${r.ad}`);
      }
      break;
    }
    case "tab": ui.view = v; render(); break;
    case "status": ui.status = v; render(); break;
    case "seg": ui.seg = v; render(); break;
    case "kseg": ui.kseg = v; render(); break;
    case "group": ui.hidden[v] = !ui.hidden[v]; saveUi(); render(); break;
    case "open-parent": ui.view = "isci"; ui.sel = id; { const r = records.find(x => x.id === id); if (r && !statusOk(r)) ui.status = "hamisi"; } render(); break;
    case "export-xlsx": exportXlsx(); break;
    case "backup": backup(); break;
    case "sample": records = sample(); saveRecords(); ui.sel = 1; render(); showToast("Nümunə məlumatlar yükləndi"); break;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  buildForm();
  $("#q").addEventListener("input", e => { ui.q = e.target.value; render(); });
  $$("select[data-filter]").forEach(s => s.addEventListener("change", e => { ui[s.dataset.filter] = e.target.value; render(); }));
  $("#restoreInput").addEventListener("change", e => { if (e.target.files[0]) restore(e.target.files[0]); e.target.value = ""; });

  const form = $("#empForm");
  form.addEventListener("submit", saveForm);
  form.addEventListener("input", updateCalcs);
  form.addEventListener("change", updateCalcs);
  $("#kidsBody").addEventListener("click", e => {
    const d = e.target.closest("[data-kdel]");
    if (!d) return;
    const kids = readKids(true); kids.splice(Number(d.dataset.kdel), 1); renderKidRows(kids);
  });
  $("#fotoInput").addEventListener("change", e => { loadPhoto(e.target.files[0]); e.target.value = ""; });
  $("#fotoDel").addEventListener("click", () => setFoto(""));
  $("#xitamForm").addEventListener("submit", confirmXitam);
  $$("dialog [data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));

  // Başqa tabda dəyişiklik olanda siyahını yenilə
  window.addEventListener("storage", e => { if (e.key === STORE_KEY) { records = loadRecords(); render(); } });

  render();
});
