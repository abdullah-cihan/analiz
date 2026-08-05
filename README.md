# 📊 İnteraktif Veri Analiz ve Görselleştirme Paneli

Tamamen istemci tarafında (client-side) çalışan, dinamik filtreleme ve gelişmiş grafikler sunan, hızlı ve güvenli bir veri analiz dashboard'udur. JSON veya Excel verilerinizi anında anlamlı içgörülere dönüştürür.

[![Live Demo](https://img.shields.io/badge/demo-Live%20Preview-success?style=for-the-badge)](https://abdullah-cihan.github.io/analiz/)

## 🚀 Özellikler

- **Gelişmiş Veri Görselleştirme:** Bar, Çizgi, Alan, Radar, Kutupsal, Dağılım, Baloncuk, Pasta ve Halka gibi çok çeşitli grafik türlerini destekler. (ApexCharts ve Chart.js entegrasyonu).
- **Dinamik Filtreleme & Gruplama:** Verilerinizi dilediğiniz sütuna göre gruplayabilir, çoklu dinamik filtreler ekleyerek çapraz analizler yapabilirsiniz.
- **Ham Veri Yönetimi (Editor):** Verilerinizi tablo (Grid) görünümünde inceleyebilir, hücrelerde anında değişiklik yapıp "Kaydet & Yenile" ile grafikleri güncelleyebilirsiniz. Düzenlenmiş veriyi `.xlsx` olarak indirebilirsiniz (SheetJS entegrasyonu).
- **Metin ve Duygu Analizi:** Geri bildirim, yorum veya açık uçlu sorular için kelime bulutu (WordCloud) oluşturur ve kural tabanlı (pozitif/negatif) duygu analizi yapar.
- **Isı Haritası (Heatmap):** Sorular ve cevaplar arası korelasyonları ve çapraz ilişkileri gösteren etkileşimli ısı haritaları oluşturur.
- **Güvenli Paylaşım (PIN & İzin Korumalı):** Yaptığınız analizleri, filtreleri ve grafik görünümlerini LZ-String ile sıkıştırarak URL üzerinden tek tıkla paylaşabilirsiniz.
  - İsteğe bağlı 4 haneli PIN şifrelemesi eklenebilir.
  - "Ham Veri" ve "Görüşler" sekmeleri paylaşılan bağlantıda gizlenebilir.
  - Zenginleştirilmiş paylaşım için **Yönetici Notu** ve dinamik **QR Kod** desteği.
- **Raporlama & Dışa Aktarım:** Hazırladığınız analiz tablolarını anında PDF veya PNG formatında profesyonel raporlara dönüştürerek indirebilirsiniz.

## 🛠️ Teknolojiler ve Kütüphaneler

Bu proje tamamen Statik Web Teknolojileri kullanılarak inşa edilmiştir. Sunucu tabanlı bir işlem gerektirmez, verileriniz sadece tarayıcınızda işlenir (100% Gizlilik ve Güvenlik).

* **Arayüz (UI):** HTML5, Vanilla JavaScript, TailwindCSS (CDN)
* **Grafik Motorları:** [ApexCharts](https://apexcharts.com/), [Chart.js](https://www.chartjs.org/)
* **Veri Okuma ve İndirme:** [SheetJS](https://sheetjs.com/) (XLSX)
* **PDF Oluşturma:** html2pdf.js, jsPDF
* **Kelime Bulutu:** wordcloud2.js
* **URL Sıkıştırma (Paylaşım):** [lz-string](https://pieroxy.net/blog/pages/lz-string/index.html)
* **QR Kod Oluşturucu:** [QRious](https://github.com/neocotic/qrious)

## 💻 Kurulum ve Kullanım

Proje statik dosyalardan (HTML, CSS, JS) oluştuğu için herhangi bir derleme aracına (Node.js, npm, Webpack vb.) veya sunucu kurulumuna ihtiyaç duymaz.

1. Repoyu bilgisayarınıza klonlayın veya `.zip` olarak indirin:
   ```bash
   git clone https://github.com/abdullah-cihan/analiz.git
   ```
2. Klasör içerisindeki `index.html` dosyasına çift tıklayarak tarayıcınızda (Chrome, Edge, Firefox vb.) açın.
3. Kendi veri setinizi yükleyin ve analize başlayın!

> **Not:** Eğer GitHub Pages üzerinden barındırıyorsanız, projeniz direkt olarak internet üzerinden erişime açıktır.

## 📂 Proje Yapısı

```text
analiz/
├── css/
│   └── style.css            # Özel arayüz stilleri ve animasyonlar
├── js/
│   ├── main.js              # Temel logic, dosya yükleme, UI yönetimi ve güvenli paylaşım
│   ├── ui.js                # Grafik çizimi, tablo yönetimi ve DOM manipülasyonu
│   └── sentiment.js         # Kelime bulutu ve duygu analizi motoru
├── index.html               # Uygulamanın ana şablonu
└── README.md                # Proje dökümantasyonu
```

## 📄 Lisans
Bu proje açık kaynaklıdır ve eğitim/kişisel kullanım amaçlı geliştirilmiştir. Serbestçe kullanılabilir ve değiştirilebilir.