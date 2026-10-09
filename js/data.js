/* İşçi reyestri — sabit siyahılar, sahə təsvirləri, köməkçi funksiyalar və nümunə məlumatlar */
"use strict";

const X = "Xeyr";
const B = "Bəli";
const YN = [X, B];

const SOBELER = ["Mağaza rəhbərliyi", "Kassa", "Ət və süd məhsulları", "Orta", "Su", "Şirniyyat", "Qeyri-qida", "Anbar", "Təsərrüfat", "Nəzarət xidməti", "Azfresh", "İstehsalat", "Restoran"];
const TEHSIL = ["Ümumi orta", "Tam orta", "Peşə təhsili", "Orta ixtisas (kollec)", "Bakalavriat", "Magistratura", "Doktorantura"];
const ESAS_MEZ = ["21", "30", "35", "42", "46", "56"];
const XITAM_SEBEBLER = ["Öz təşəbbüsü ilə", "Tərəflərin razılığı ilə", "Müqavilənin müddəti bitdiyinə görə", "İşəgötürənin təşəbbüsü ilə", "Tərəflərin iradəsindən asılı olmayan hallar", "Pensiyaya çıxma", "Digər"];

/* ---------- Köməkçilər ---------- */
function pd(s) { if (!s) return null; const p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function z2(n) { return (n < 10 ? "0" : "") + n; }
function fd(d) { return d ? z2(d.getDate()) + "." + z2(d.getMonth() + 1) + "." + d.getFullYear() : "—"; }
function iso(d) { return d.getFullYear() + "-" + z2(d.getMonth() + 1) + "-" + z2(d.getDate()); }
function todayD() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function r2(n) { return Math.round(n * 100) / 100; }
function money(n) { const s = r2(n).toFixed(2).split("."); return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "," + s[1]; }
function age(d, t) { if (!d) return null; t = t || todayD(); let a = t.getFullYear() - d.getFullYear(); const m = t.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--; return a; }
function num(v) { const x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isNaN(x) ? 0 : x; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function lc(s) { return String(s || "").toLocaleLowerCase("az"); }
function initials(ad) { const p = String(ad || "").trim().split(/\s+/); return ((p[1] || "")[0] || "") + ((p[0] || "")[0] || ""); }

/* ŞV etibarlılıq: Excel-dəki =G14+3651 */
function svEnd(svV) { const d = pd(svV); return d ? new Date(d.getTime() + 3651 * 864e5) : null; }

/* Əmək haqqı — Excel düsturları (baza: vəzifə tarif maaşı E93) */
function payroll(rec) {
  const t = num(rec.tarif), el = num(rec.elaveMaas), y = num(rec.yemek);
  const gv = Math.max(0, t <= 2500 ? (t - 200) * 0.03 : (t <= 8000 ? 75 + (t - 2500) * 0.1 : 625 + (t - 8000) * 0.14));
  const ds = r2(t <= 200 ? t * 0.03 : 6 + (t - 200) * 0.1);
  const is = r2(t * 0.005);
  const its = t < 2500 ? r2(t * 0.02) : 50 + (t - 2500) * 0.005;
  const toplam = t + el;
  const net = t ? toplam - (gv + ds + is + its) + y : 0;
  return { toplam, gv: t ? gv : 0, ds: t ? ds : 0, is, its, yemek: y, net };
}

/* ---------- Kartın sahələri (Excel formasına uyğun) ---------- */
function F(key, label, type, o) { return Object.assign({ key, label, type }, o || {}); }
const FORM_SECTIONS = [
  { id: "sexsi", label: "Şəxsi məlumatların qeydiyyatı", fields: [
    F("ad", "Ad Soyad Ata adı", "text", { wide: true, req: true, ph: "Məs.: Məmmədov Əli Vaqif oğlu" }),
    F("fin", "FİN", "text", { req: true, ph: "7 simvol", max: 7 }),
    F("cins", "Cins", "select", { options: ["", "Kişi", "Qadın"], req: true }),
    F("seriyaPre", "Seriya", "select", { options: ["AZE", "AA", "AB", "AC"] }),
    F("seriyaNo", "Seriya nömrəsi", "text"),
    F("svV", "ŞV verilmə tarixi", "date", { req: true }),
    F("c_svEnd", "ŞV etibarlılıq tarixi", "calc"),
    F("dogum", "Doğum tarixi", "date", { req: true }),
    F("c_yas", "Yaş", "calc"),
    F("qeyd", "Qeydiyyat ünvanı", "text", { wide: true }),
    F("unvan", "Yaşayış ünvanı", "text", { wide: true }),
    F("mobil", "Mobil", "tel", { req: true, ph: "050 000 00 00" }),
    F("ev", "Ev", "tel"),
    F("mail", "Mail", "email")
  ] },
  { id: "kvota", label: "Kvota məlumatların qeydiyyatı", kids: true, fields: [
    F("c_ovlad14", "14 yaşadək övladlarının sayı", "calc"),
    F("aile", "Ailə vəziyyəti", "select", { options: ["Subay", "Evli", "Dul", "Boşanmış"] }),
    F("veteran", "Müharibə veteranı", "select", { options: YN }),
    F("istirakci", "Müharibə iştirakçısı", "select", { options: YN }),
    F("sehid", "Şəhid ailə üzvü", "select", { options: YN }),
    F("elillik", "Əlillik", "select", { options: [X, "1-ci qrup əlil", "2-ci qrup əlil", "3-cü qrup əlil"] }),
    F("kockun", "Məcburi köçkünlük", "select", { options: YN }),
    F("mehbus", "Məhbusluq", "select", { options: YN }),
    F("usaq2", "Öhdəsində iki və daha çox 16 yaşınadək uşağı olan", "select", { options: YN }),
    F("tek", "Məktəb yaşınadək uşağını təkbaşına böyüdən", "select", { options: YN }),
    F("elilUsaq", "Öhdəsində əlilliyi olan uşaq / 81-100% əlil ailə üzvü olan", "select", { options: YN })
  ] },
  { id: "vezife", label: "Vəzifə qeydiyyatı", fields: [
    F("vezife", "Vəzifənin adı", "text", { req: true, list: "dl-vezife" }),
    F("sobeAd", "Şöbə", "text"),
    F("sobe", "Mağazada tutduğu şöbə", "select", { options: [""].concat(SOBELER), req: true }),
    F("dep", "Departament", "text", { req: true, list: "dl-dep" }),
    F("isyeri", "İş yeri", "text", { req: true, list: "dl-isyeri" }),
    F("qebul", "İşə qəbul ediləcəyi tarix", "date", { req: true }),
    F("stajIl", "Şirkətə qədər staj — il", "number"),
    F("stajAy", "Staj — ay", "number"),
    F("stajGun", "Staj — gün", "number")
  ] },
  { id: "mez", label: "Məzuniyyət məlumatlarının qeydiyyatı", fields: [
    F("esas", "Əsas məzuniyyət", "select", { options: ESAS_MEZ }),
    F("elave", "Əlavə məzuniyyət", "number"),
    F("usaqMez", "Uşağa görə əlavə məzuniyyət", "number"),
    F("zerer", "Zərərə görə", "number"),
    F("c_mez", "Toplam", "calc", { strong: true })
  ] },
  { id: "tehsil", label: "Təhsil məlumatlarının qeydiyyatı", fields: [
    F("derece", "Təhsil dərəcəsi", "select", { options: [""].concat(TEHSIL) }),
    F("muessise", "Təhsil müəssisəsi", "text", { wide: true }),
    F("ixtisas", "İxtisas", "text")
  ] },
  { id: "maas", label: "Əmək haqqı məlumatlarının qeydiyyatı", fields: [
    F("tarif", "Vəzifə tarif maaşı (₼)", "number", { req: true }),
    F("elaveMaas", "Əmək haqqına əlavə (₼)", "number"),
    F("yemek", "Yemək pulu (₼)", "number"),
    F("izkart", "İz kart bonus (₼)", "number"),
    F("c_toplam", "Toplam", "calc"),
    F("c_gv", "Gəlir vergisi", "calc"),
    F("c_ds", "DSMF 3%", "calc"),
    F("c_is", "İşsizlik 0,5%", "calc"),
    F("c_its", "İ.T.S 2%", "calc"),
    F("c_net", "Net", "calc", { strong: true })
  ] }
];

function emptyRecord() {
  return { id: 0, ad: "", fin: "", cins: "", seriyaPre: "AZE", seriyaNo: "", svV: "", dogum: "", qeyd: "", unvan: "", mobil: "", ev: "", mail: "", foto: "",
    ovladlar: [], aile: "Subay", veteran: X, istirakci: X, sehid: X, elillik: X, kockun: X, mehbus: X, usaq2: X, tek: X, elilUsaq: X,
    vezife: "", sobeAd: "", sobe: "", dep: "", isyeri: "", qebul: "", stajIl: 0, stajAy: 0, stajGun: 0,
    esas: 21, elave: 0, usaqMez: 0, zerer: 0, derece: "", muessise: "", ixtisas: "",
    tarif: 0, elaveMaas: 0, yemek: 56, izkart: 0,
    aktiv: true, cixis: "", xitam: "", xitamQeyd: "", yaradilib: "", yenilenib: "" };
}

/* ---------- Siyahı sütunları ---------- */
/* növ: t mətn, m mono, n rəqəm, b qalın rəqəm, w uzun mətn, yn Bəli/Xeyr, sv ŞV statusu, st status */
const GROUPS = [
  { id: "sexsi", label: "Şəxsi məlumatlar", cols: [["fin", "FİN", "m"], ["cins", "Cins", "t"], ["seriya", "Seriya", "m"], ["svVT", "ŞV verilmə tarixi", "m"], ["svEndT", "ŞV etibarlılıq tarixi", "sv"], ["dogumT", "Doğum tarixi", "m"], ["yas", "Yaş", "n"], ["qeyd", "Qeydiyyat ünvanı", "w"], ["unvan", "Yaşayış ünvanı", "w"], ["mobil", "Mobil", "m"], ["ev", "Ev", "m"], ["mail", "Mail", "t"]] },
  { id: "kvota", label: "Kvota məlumatları", cols: [["ovladSay", "Övlad sayı", "n"], ["ovlad14", "14 yaşadək övlad sayı", "n"], ["veteran", "Müharibə veteranı", "yn"], ["sehid", "Şəhid ailə üzvü", "yn"], ["istirakci", "Müharibə iştirakçısı", "yn"], ["elillik", "Əlillik", "yn"], ["kockun", "Məcburi köçkünlük", "yn"], ["aile", "Ailə vəziyyəti", "t"], ["mehbus", "Məhbusluq", "yn"], ["usaq2", "2+ uşaq (16 yaşadək)", "yn"], ["tek", "Məktəbəqədər uşağı təkbaşına böyüdür", "yn"], ["elilUsaq", "Əlil uşaq / ailə üzvü himayəsi", "yn"]] },
  { id: "vezife", label: "Vəzifə", cols: [["statusT", "Status", "st"], ["cixisT", "İşdən çıxma tarixi", "m"], ["xitamT", "Xitam səbəbi", "t"], ["vezife", "Vəzifənin adı", "t"], ["sobeAd", "Şöbə", "t"], ["sobe", "Mağazada tutduğu şöbə", "t"], ["dep", "Departament", "t"], ["isyeri", "İş yeri", "t"], ["qebulT", "İşə qəbul tarixi", "m"], ["stajT", "Şirkətə qədər staj (il/ay/gün)", "m"]] },
  { id: "mez", label: "Məzuniyyət (gün)", cols: [["esas", "Əsas", "n"], ["elave", "Əlavə", "n"], ["usaqMez", "Uşağa görə əlavə", "n"], ["zerer", "Zərərə görə", "n"], ["mezToplam", "Toplam", "b"]] },
  { id: "tehsil", label: "Təhsil", cols: [["derece", "Təhsil dərəcəsi", "t"], ["muessise", "Təhsil müəssisəsi", "w"], ["ixtisas", "İxtisas", "t"]] },
  { id: "maas", label: "Əmək haqqı (₼)", cols: [["tarifT", "Vəzifə tarif maaşı", "n"], ["elaveMaasT", "Əmək haqqına əlavə", "n"], ["toplamT", "Toplam", "n"], ["yemekT", "Yemək pulu", "n"], ["izkartT", "İz kart bonus", "n"], ["gvT", "Gəlir vergisi", "n"], ["dsT", "DSMF 3%", "n"], ["isT", "İşsizlik 0,5%", "n"], ["itsT", "İ.T.S 2%", "n"], ["netT", "Net", "b"]] }
];

/* ---------- Nümunə məlumatlar (yalnız sınaq üçün) ---------- */
function sample() {
  const rows = [
    ["Səfərov Elvin Ramiz oğlu", "6KZ4P2R", "Kişi", "AZE", "14825331", "2020-12-16", "1995-10-27", "Bakı, Nərimanov r-nu", "050 412 35 18", "Subay", [], {}, "Mağaza müdiri", "Mağaza rəhbərliyi", "Pərakəndə satış", "Mağaza 01 · Nərimanov", "2023-03-01", 30, "Bakalavriat", 1200, 150],
    ["Məmmədova Aysel Rauf qızı", "5PL8Q1D", "Qadın", "AA", "3348120", "2016-11-20", "1990-04-12", "Bakı, Yasamal r-nu", "055 208 77 41", "Evli", [["Məmmədov Kənan Tural oğlu", "Kişi", "2016-05-05"], ["Məmmədova Lalə Tural qızı", "Qadın", "2020-05-05"]], { usaq2: B }, "Kassir", "Kassa", "Pərakəndə satış", "Mağaza 01 · Nərimanov", "2021-06-14", 21, "Orta ixtisas (kollec)", 407, 0],
    ["Quliyev Tural Elşən oğlu", "4RX7M9A", "Kişi", "AZE", "10294558", "2017-01-05", "1988-01-30", "Sumqayıt, 9-cu mkr", "070 331 90 02", "Evli", [["Quliyev Murad Tural oğlu", "Kişi", "2019-09-12"]], { istirakci: B }, "Qəssab", "Ət və süd məhsulları", "Pərakəndə satış", "Mağaza 02 · Sumqayıt", "2022-09-05", 30, "Peşə təhsili", 600, 50],
    ["Əliyev Rəşad Akif oğlu", "3HN5Z8C", "Kişi", "AZE", "09917264", "2016-12-01", "1979-12-03", "Bakı, Binəqədi r-nu", "050 777 21 64", "Evli", [["Əliyev Fərid Rəşad oğlu", "Kişi", "2012-03-18"], ["Əliyeva Nigar Rəşad qızı", "Qadın", "2015-07-02"]], { veteran: B, kockun: B, usaq2: B }, "Anbardar", "Anbar", "Logistika", "Mərkəzi anbar", "2019-11-11", 30, "Tam orta", 520, 80],
    ["Kərimova Səbinə Elçin qızı", "6WD3J7T", "Qadın", "AA", "2287613", "2023-06-30", "1993-05-22", "Bakı, Səbail r-nu", "055 911 48 35", "Boşanmış", [["Kərimov Ayxan Elmar oğlu", "Kişi", "2021-02-10"]], { tek: B }, "Aşpaz", "Restoran", "İstehsalat", "Mağaza 01 · Nərimanov", "2023-08-01", 30, "Peşə təhsili", 650, 0],
    ["Nəsirov Kamran Fuad oğlu", "2LS9V4E", "Kişi", "AZE", "13305872", "2016-10-28", "1985-09-14", "Bakı, Suraxanı r-nu", "070 504 66 19", "Evli", [], { elillik: "3-cü qrup əlil" }, "Təhlükəsizlik əməkdaşı", "Nəzarət xidməti", "Təhlükəsizlik", "Mağaza 03 · Xətai", "2020-04-06", 42, "Tam orta", 480, 40],
    ["Hüseynova Nərmin Vüqar qızı", "7BT2K6W", "Qadın", "AA", "4410937", "2022-02-14", "1998-07-08", "Bakı, Xətai r-nu", "051 640 12 73", "Subay", [], {}, "Satış məsləhətçisi", "Şirniyyat", "Pərakəndə satış", "Mağaza 03 · Xətai", "2024-02-19", 21, "Bakalavriat", 450, 0, "2025-08-31"]
  ];
  return rows.map((r, i) => Object.assign(emptyRecord(), {
    id: i + 1, ad: r[0], fin: r[1], cins: r[2], seriyaPre: r[3], seriyaNo: r[4], svV: r[5], dogum: r[6], unvan: r[7], qeyd: r[7], mobil: r[8], aile: r[9],
    ovladlar: r[10].map(k => ({ ad: k[0], cins: k[1], dogum: k[2] })),
    vezife: r[12], sobe: r[13], dep: r[14], isyeri: r[15], qebul: r[16], esas: r[17], derece: r[18], tarif: r[19], elaveMaas: r[20],
    aktiv: !r[21], cixis: r[21] || "", xitam: r[21] ? "Öz təşəbbüsü ilə" : ""
  }, r[11]));
}
