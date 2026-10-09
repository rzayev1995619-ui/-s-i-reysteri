# İşçi reyestri

İşçilərin şəxsi məlumatlarını, kvota, vəzifə, məzuniyyət, təhsil və əmək haqqı məlumatlarını bir yerdə saxlamaq üçün veb proqram. Excel-dəki «İşçilərin şəxsi məlumatlarının doldurulması» kartı əsasında hazırlanıb.

Proqramı quraşdırmaq və ya build etmək lazım deyil. Fayllar GitHub Pages-də birbaşa işləyir.

## İmkanlar

- **İşçilər siyahısı.** Kartın bütün sahələri 6 bölmədə, 53 sütunda göstərilir. Bölmələri gizlətmək və göstərmək olar.
- **Övladlar siyahısı.** Bütün işçilərin övladları ayrıca siyahıdadır. Yaşa görə süzmək olar: məktəbəqədər, 14 yaşadək, 16 yaşadək.
- **Filtrlər:** axtarış (ad və ya FİN), departament, vəzifə, mağazada tutduğu şöbə, iş yeri, status (açılışda «Aktiv»), kvotalılar, ŞV müddəti bitənlər.
- **Yeni işçi kartı.** Excel formasının bütün sahələri var. Şəkil yükləmək olar, övladlar sətir-sətir yazılır (ən çox 10).
- **Avtomatik hesablamalar** Excel-dəki düsturlarla aparılır:
  - ŞV etibarlılıq tarixi (verilmə tarixi + 3651 gün)
  - yaş
  - məzuniyyətin cəmi
  - gəlir vergisi, DSMF, işsizlik, İ.T.S və net
- **Yoxlamalar.** Məcburi sahələr boş qala bilməz. FİN 7 simvol olmalıdır. Eyni FİN iki dəfə yazıla bilməz.
- **Xitam et.** Tarix və səbəb seçilir, işçi «İnaktiv» olur. Kartı silinmir. 6 saniyə ərzində «Geri al» etmək olar, sonradan «Bərpa et» ilə yenidən aktiv etmək olar.
- **Excel-ə çıxar.** Hazırkı filtrə uyğun işçilər və övladlar `.xlsx` faylına iki vərəqdə yazılır.
- **Ehtiyat nüsxə və bərpa.** Bütün məlumatlar JSON faylına endirilir və həmin fayldan geri yüklənir.

## Məlumatlar harada saxlanılır?

Məlumatlar istifadəçinin **öz brauzerində** saxlanılır (`localStorage`). Bunun nəticələri:

- Proqramı GitHub Pages-də açan hər kəs öz boş reyestrini görür. Məlumatlarınız GitHub-a və ya internetə göndərilmir.
- Başqa kompüterdə və ya başqa brauzerdə məlumatlar görünmür. Köçürmək üçün «Ehtiyat nüsxə» ilə fayl endirin, digər kompüterdə «Bərpa et» ilə yükləyin.
- Brauzerin keşi və saytların məlumatları təmizlənərsə, reyestr silinə bilər. **Ehtiyat nüsxəni müntəzəm götürün.**

Bir neçə əməkdaş eyni reyestrlə işləməlidirsə, ortaq verilənlər bazası lazımdır. Bunun üçün `saveRecords()` və `loadRecords()` funksiyalarını server API-si ilə əvəz etmək kifayətdir, məsələn Supabase və ya Firebase ilə.

> ⚠️ Şəxsi məlumatlar (FİN, ünvan, əlillik, əmək haqqı) həssasdır. Repozitoriyaya real işçi məlumatları olan JSON və ya Excel faylı **yükləməyin**. Public repozitoriyada hər kəs onları görə bilər.

## GitHub-a yükləmək və GitHub Pages-də açmaq

### Brauzer ilə, proqram quraşdırmadan

1. GitHub-da daxil olun və **New repository** seçin. Ad yazın, məsələn `isci-reyestri`, sonra **Create repository** basın.
2. Açılan səhifədə **uploading an existing file** linkini seçin.
3. Bu qovluğun bütün məzmununu (`index.html`, `styles.css`, `js/` qovluğu, `README.md`) pəncərəyə sürüşdürün və **Commit changes** basın.
4. **Settings → Pages** bölməsinə keçin. **Source** üçün «Deploy from a branch» seçin, **Branch** üçün `main` və `/ (root)` seçin, sonra **Save** basın.
5. 1–2 dəqiqə sonra proqram bu ünvanda açılacaq: `https://<istifadəçi-adınız>.github.io/isci-reyestri/`

### Git ilə

```bash
cd isci-reyestri
git init
git add .
git commit -m "İşçi reyestri"
git branch -M main
git remote add origin https://github.com/<istifadəçi-adınız>/isci-reyestri.git
git push -u origin main
```

Sonra yuxarıdakı 4-cü addımı edin (Settings → Pages).

## Kompüterdə işə salmaq

`index.html` faylına iki dəfə klikləmək kifayətdir. Excel ixracı üçün internet lazımdır, çünki SheetJS kitabxanası CDN-dən yüklənir.

İstəsəniz, lokal server ilə də aça bilərsiniz:

```bash
python -m http.server 8000
# sonra brauzerdə: http://localhost:8000
```

## Fayl quruluşu

```
index.html      səhifənin skeleti, kart forması və xitam pəncərəsi
styles.css      görünüş
js/data.js      siyahılar (şöbələr, təhsil, xitam səbəbləri), kartın sahələri, sütunlar, düsturlar, nümunə məlumatlar
js/app.js       proqramın məntiqi: render, filtrlər, forma, xitam, Excel, ehtiyat nüsxə
```

## Dəyişiklik etmək

| Nə dəyişmək istəyirsiniz | Harada |
|---|---|
| «Mağazada tutduğu şöbə» siyahısı | `js/data.js` → `SOBELER` |
| Xitam səbəbləri | `js/data.js` → `XITAM_SEBEBLER` |
| Formaya yeni sahə | `js/data.js` → `FORM_SECTIONS` (sahə) və `emptyRecord()` (ilkin dəyər) |
| Siyahıya yeni sütun | `js/data.js` → `GROUPS` |
| Vergi və ayırma düsturları | `js/data.js` → `payroll()` |
