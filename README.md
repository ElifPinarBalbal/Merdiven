
<h1 align="center">Merdiven Project: Borsa İstanbul (BIST) için açık kaynak hisse robotu</h1>

Merhaba 👋


Merdiven Bot'a hoşgeldiniz. Merdiven, Türkiye'nin (*Ağustos 2025 için*) ilk **Yapay Zeka ile Haber Analizi ve Algoritmik İşlem** (teknik indikatörler) kullanarak tam otomatik biçimde işlem yapabilen açık kaynak robotudur.

<div align="center">
<img src="https://github.com/user-attachments/assets/1e7ebef0-260d-44f1-b4b1-7646c0575072" alt="INTRO" width="250">
</div>



İçindekiler:
1. [Bio İletişim](#1-bi̇o--i̇leti̇şi̇m)
   
2. [Modüller ve Sistem](#2-modüller-si̇stem)
	- [I. AlgoLab + DenizBank](#i-algolab--denizbank-web-sitesi)
	- [II. İndikatörler](#ii-i̇ndikatörler)
	- [III. Telegram](#iii-telegram)
	- [IV. Haberler Manşetler](#iv-haberler-manşetler)

3. [Kurulum](#3-kurulum)

\
👇
> [!CAUTION]
> 
> ## ‼️ DİKKAT: SORUMSUZLUK KAYDI ‼️ YATIRIM TAVSİYESİ DEĞİLDİR. ‼️
> Bu projede yer alan ve sayılanlarla sınırlı olmamakla birlikte herhangi bir kod satırı, modül, strateji, algoritma, veri ve çeşitli adlara sahip olabilecek diğer ürünler **yatırım tavsiyesi niteliğinde değildir**. 
>
> **Yatırım kararlarınızı YALNIZCA KENDİNİZ ALABİLİR, VAR OLAN HERHANGİ BİR ALGORİTMA - ROBOTA devredemezsiniz ve devretmemelisiniz.**
>
> Size sunulmuş bu proje **YALNIZCA EĞİTİM AMAÇLI OLUP**, çift taraflı veya tek taraflı herhangi bir ticari kazanç amaçlamadığı gibi **KULLANIMDAN DOĞAN TÜM SORUMLULUK YALNIZCA SİZE AİTTİR**.
>
> * **SİZE HERHANGİ BİR KÂR VADETMİYORUZ.**
> * **GELİR ELDE EDECEĞİNİZİ VADETMİYORUZ.**
> * **ROBOTUN ÇALIŞTIĞINI / ÇALIŞIR VAZİYETTE OLDUĞUNU İDDİA ETMİYORUZ.**
> * <ins>**KOD HATASI (BUG) - SAĞLAYICI HATASI GİBİ OLASI SORUNLAR YÜZÜNDEN PARA / NAKİT KAYBETMEYECEĞİNİZİ GARANTİ ETMİYORUZ.**</ins>
>
> *Aynı şekilde projede yer alan modüllerden herhangi biri **TAVSİYE / ÜRÜN TANITIMI NİTELİĞİNDE OLMAYIP,** bu modüllerde yararlanılan ürünler - markaların da **KULLANIMLA İLGİLİ HİÇBİR SORUMLULUKLARI BULUNMAMAKTADIR**.*
> 
> Bize, ilgili markalara ve ürünlere hiçbir sorumluluk iddiası yöneltilemeyecektir.

---

\
Merdiven Project, birkaç farklı modülü bir arada kullanarak size tam otomasyon sağlar.

Kısaca Merdiven, bağlı banka hesabınızı kullanarak (1) güncel manşet ve KAP haberlerini yapay zeka ile okur, analiz eder; (2) teknik indikatörlerin sinyallerini izler ve sizin için işlem kararı alır. Bu kararlara çok kısıtlı bir süre içinde müdahale etmez iseniz işlemler otomatik olarak gerçekleşir **(emir gönderilir)**.

Projenin nasıl çalıştığını anlamak için bu notun tamamını okumanızı öneririz. Ancak merak ettiğiniz ve burada yer almayan her konu için bize ayrı ayrı ulaşmaktan lütfen çekinmeyin 😄.
\
\
❤️ Umarız tüm öğrencilere, yazılım dünyasına, yatırımcılara ve ilgililere faydası dokunur.

<div>
<img width="400" alt="Screenshot 2025-11-06 at 23 05 59" src="https://github.com/user-attachments/assets/edca7a77-8f0f-4389-8efa-6d4e98da4d05" />
</div>

<div>
<img width="200" alt="Screenshot 2025-11-06 at 23 08 30" src="https://github.com/user-attachments/assets/82e3831f-573c-41bb-8f30-88fc45d5635d" />
<img width="200" alt="Screenshot 2025-11-06 at 23 09 22" src="https://github.com/user-attachments/assets/e11ae5f4-dc05-4994-a862-ad0fa9534b63" />
</div>


<div>
<img src="https://github.com/user-attachments/assets/0f6f9e03-407c-45ea-a3c5-8bf458415a6b" alt="FROTO" width="200">
<img src="https://github.com/user-attachments/assets/9d277318-db4c-4a9f-9c5f-ffbebfd09817" alt="FAST-TRANSACTIONS" width="200">
<img src="https://github.com/user-attachments/assets/d794cc99-6bc6-4be1-bd06-f4d3a04ac7ca" alt="HABERLER" width="200">
<img src="https://github.com/user-attachments/assets/0aaa767a-81c4-49fc-ac84-0c40cd08318e" alt="BYPASSES" width="200">
</div>

\
👇
> [!WARNING]
> ### ⛔️ **KISITLANMIŞ MODÜLLER** ⛔️
> \
> Merdiven Project, bünyesinde birkaç modül barındırmaktadır. Bunlardan biri de Kamuyu Aydınlatma Platformu ("KAP") bildirimlerini Yapay Zeka ile analiz eden KAP Modülüdür.
> 
> ➡️ **KAP MODÜLÜ** yasal sebeplerden ötürü (3. taraf izni ve API kapılarının **ücretli olarak sunulması** sebebiyle) public proje içerisinde **SUNULMAMIŞTIR**.
> 
> > *KAP web sitesinin arayüzü bu projenin başlangıç tarihi (Ocak-Mart 2025) itibariyle yenilenmiştir. Bu sebeple internette var olan API geçitleri güncel (ve muhtemelen yasal) değildir. Anlık olarak KAP, API hizmeti sunsa da bu hizmet **yalnızca geçmiş KAP bildirimlerine** yönelik olduğundan güncel olarak uygulanma / kullanma imkanı bulunmamaktadır. Ekibimizce mevcut API hizmetinin (henüz herhangi bir ücretli abonelik sistemi bulunmasa da) ücretli olarak sunulacağı tahmin edilmektedir. Bu nedenlerle KAP modulü bu projede sunulmamıştır.*

\
Araştırmalarımıza göre yapay zeka kullanan (haberler ve KAP) modüller için mevcut en iyi yapay zeka sağlayıcısı (Ağustos 2025) **OpenAI** olarak önerilmektedir. OpenAI API'ın sağladığı *GPT-4.1 ve GPT-4.1-mini* mevcut projede kullanılmaktadır. (Web search özelliği hariç).

*Denenen diğer alternatifler: Gemini 2.5-Flash (Önerilmemektedir).*

\
🙌
#### BOTU ÇALIŞTIRMAK İÇİN SAHİP OLMANIZ GEREKENLER: 
|                |ÖNERİLEN                          |MİNİMUM                         |
|----------------|-------------------------------|-----------------------------|
|Yazılım Bilgisi|`NodeJS (iyi derecede), fetch, axios, SQL, ngrok`            |NodeJS gerekli ve yeterlidir.|
|İngilizce|`Robot İngilizce dilindedir.`|Robot İngilizce dilindedir.|
|Server          |`7 / 24, Türkiye içinde, Linux - Centos olmalıdır.`            |Sunucunuz yok ise de test / öğrenmek amacıyla çalıştırabilirsiniz.|
|DenizBank / AlgoLab hesabı          |`Canlı Veri ve Derinlik sözleşmeleriniz olmalıdır.`|Merdiven yalnızca bu ürünlerle çalışabilir.|
|Borsa Bilgisi / Deneyimi|`Özellikle BIST dinamikleri hakkında bilgi sahibi olmanız önerilir.`|Deneyiminiz yoksa yalnızca keşif / öğrenme amaçlı çalıştırın.|
|Telegram|`Telegram Botları ve sunulan API içindeki methodlar hakkında bilgi sahibi olmalısınız.`|Telegram hesabınız bulunmalı ve Bot hesabı oluşturmalısınız.|
|OpenAI (ChatGPT)|`OpenAI API deneyiminiz olması önerilir. Min. 20$ bakiye de önerilir.`|OpenAI API (Key) hesabınız olması gereklidir. Minimum 10$ bakiye yüklemeniz gerekecektir.|
|TradingView Hesabı|`Ekstra Koruma (YahooFinance çalışmadığında backup) için önerilir.`|Gerekli değildir.|
|Teknik İndikatörler|`Stochastic + Bollinger Bands + Trailing Stoploss`|Bilmeniz gerekli değildir.|


\
Hacim ve özellik olarak epey büyük bir yelpazede olduğundan bu projeyi size her başlığını ayrı ayrı açıklayarak sunmak isteriz. Böylece ihtiyacınız olan / ilham almak istediğiniz kısım ile ilgili merak ettiklerinizi de bu kısımlardan okuyabilirsiniz.

> Tanıtım ve Kurulum için hazırladığımız videoları izleyerek Merdiven'i
> daha iyi anlayabilir, kurulumda adım adım takip edebilirsiniz.


# 1. BİO & İLETİŞİM
Merdiven Project 3 Bilkentli tarafından hazırlanmış ve kodlanmıştır. Lütfen bizlerle iletişime geçmekten çekinmeyin.

@ElifPinarBalbal - Developer

@ardaokyay - Developer

[![Elif](https://i.ibb.co/QqWD6TZ/1.png)](https://www.linkedin.com/in/elifpinarbalbal/)

[![Arda](https://i.ibb.co/qMBmM89Z/2.png)](https://www.linkedin.com/in/ardaokyay/)

[![Demir](https://i.ibb.co/SwvjKxxs/3.png)](https://www.linkedin.com/in/hdemirergun/)


# 2. MODÜLLER: SİSTEM

Bu başlık altında Merdiven Project'te bulunan her bir modülü detaylı olarak açıklayacağız. [Kurulum için 3. başlığa bakınız.](#3-kurulum)


> [!NOTE]
> Merdiven Project pek çok farklı modülün bir arada çalıştığı bir robottur. Robotun nasıl çalıştığını anlamak için her bir modülün amacını - nasıl çalıştığını anlamak da önemlidir.
> \
> Burada yazan her açıklama yalnızca genel bilgilendirme içindir. Detaylı bilgileri hazırladığımız videoda paylaştık.
> \
> Ayrıca modülleri teker teker incelemeden önce botun kurgulanmasına da kısaca değinmek isteriz:

## ÖN AÇIKLAMALAR

Botun (ve sistemin) kurgulanması çerçevesinde **riski dağıtmak** için birkaç kural tanımladık. Böylece mevcut bakiyeyi (cash) tek bir hisseye yatırmak (ve muhtemelen doğacak başka fırsatları kaçırmak) yerine, **alım limiti kuralı** oluşturduk.

\
Bu kurala göre, her bir hisse kodu (örn. THYAO) için **en fazla 500-TL** lik lot alımı yapılabilir. Ancak, elde kalan (500 liradan arta kalan) miktar lot fiyatının yarısını geçiyorsa bir lot daha alınabilir. Böylece sınırı 500TL'ye sabitlemek yerine daha dinamik bir sınır çizdik. Bu nedenle örneğin 503TL, 497TL gibi rakamlarla karşılaşılabilir. (Simülasyon çalışmalarımızda 3.000-TL bakiye ile 500-TL sınır belirlenmiştir, bunları dilediğiniz gibi değiştirebilirsiniz).

> Merdiven Project aynı anda onlarca hisseyi takip edebildiğinden riski dağıtmak ve kullanıcının etkileşimi / takibi açısından **en azından bakiyeye oranla 1 / 6'luk bir oran** belirlenmesini tavsiye ederiz.

\
Merdiven Bot; [İndikatör Modülü](#ii-i̇ndikatörler) için BIST50 hisselerini takip ederken, Haberler / KAP Modülü BIST100 hisselerini takip ediyor. Eğer kullanıcı haberler / KAP bildirimleri nedeniyle elinde BIST50'de olmayan ancak BIST100 içinde olan bir hisse alırsa, bu halde İndikatör Modülü BIST50 + bu hisse için de incelemeye devam eder.
> İndikatörler 15 dakikalık aralıklardaki (15-minute interval) mumlar için hesaplama yapar.


## I. AlgoLab + DenizBank [(Web Sitesi)](https://www.algolab.com.tr/Anasayfa)
AlgoLab, DenizBank'ın sunduğu bir algoritmik işlem ürünüdür. AlgoLab tek başına RSI, Stochastic gibi teknik indikatörleri kullanarak otomatik işlem yapabileceğiniz bir platformdur. *Ancak yapay zeka destekli haber analizi sunmamaktadır.*


AlgoLab aynı zamanda **[API Hizmeti](https://www.algolab.com.tr/ApiService)** de sunmaktadır. İşte bu API hizmeti, tamamen özelleştirilmiş bir hisse robotu tasarlayabilmemiz için en temel desteği sunmaktadır. ([API kütüphanesi için tıklayın](https://www.algolab.com.tr/Api/)).

> Bizim Türkiye'de bulabildiğimiz **tek ücretsiz API hizmeti AlgoLab'inki oldu**. Dolayısıyla bu hizmet için DenizBank'a çok teşekkür ederiz ❤️.


AlgoLab API:

- WSS ile canlı veri,
- Emir iletimi / iyileştirme / iptali
- Portföy bilgisi
	
	gibi pek çok  hizmet sunmaktadır. Bu geçitler kodumuzun **yatırım hesabı ile iletişim kurmasını sağlayacaktır.**


Merdiven Project, sunulan API hizmeti vasıtasıyla iki temel işlev gerçekleştirmektedir:
1. **Canlı Veri ile 15 dakikalık mum üretimi.**
	
	*Çünkü TradingView gibi siteler size canlı veri - canlı mum sağlamamaktadır (paket satın almadığınız takdirde)*.
	
	*Böylece canlı 15 dakikalık mumlar ile istediğimiz indikatörü kendimiz hesaplayarak canlı veri ile birlikte canlı mum - canlı teknik indikatörleri de görüntüleyebiliyoruz*.
2. **Robot emirlerinin iletimi.**
	
	*Robotun verdiği AL - SAT sinyallerini emir haline getirerek DenizBank yatırım hesabımıza iletebiliyoruz*.

	*Bununla beraber portföyümüzü eşzamanlı tutarak yerel bir database dosyasında da saklayabiliyoruz*.


### SIRALI İLETİM
AlgoLab API etkileşim - iletimi **5 saniyede bir ile sınırlı tutmuştur** ([bkz. Standart Şartname](https://www.algolab.com.tr/Api/)).
\
Bu nedenle AL - SAT - PORTFÖY BİLGİSİ vb. **tüm AlgoLab istekleri bir sıraya (*request queue*) konulmalıdır**. İstekler bu sıraya göre sırayla gönderilmelidir. Biz gönderim süresini her ihtimale karşılık 5.1 saniye olarak tuttuk.

\
AlgoLab iletim sırası 5 adet iletim türü içermektedir (*[AlgoLab API'ndaki adlarıyla](https://www.algolab.com.tr/Api/)*):
1. ORDER - Al / Sat emri (limit değil - piyasa türünden)
	*➡️ Emir Gönderim*
2. CHECK - Emirlerin gerçekleşip gerçekleşmediğinin kontrolü
	*➡️ Hisse Günlük İşlemler*
3. CASH_CHECK - İşlem limiti
	*➡️ Alt Hesap Bilgileri*
4. PORTFOLIO_CHECK - Portföydeki hisse adetleri  / bilgisi
	*➡️ Hisse Portföy Bilgisi*
5. CANCEL - Emir iptali
	*➡️ Hisse Emri İptal Etme*

\
Biz iletim sırasını:
- her 5 ORDER sonunda 1 CHECK olacak şekilde,
- her ORDER'ın sonunda mutlaka CHECK olacak şekilde,
- her dakika başında ise art arda öncelikli iletim olarak CASH_CHECK ve PORTFOLIO_CHECK olacak şekilde kurguladık.

Örneğin:

*ORDER, ORDER, ORDER, ORDER, ORDER, CHECK, ORDER, ORDER, CHECK* bir iletim sırası örneği olabilir.

> [!NOTE]
> #### ORDER QUEUE 
> Ayrıca **AL - SAT EMİRLERİ** için de bir **priority queue** oluşturduk. Buna göre, sıradaki al veya sat emirleri (1) hacimlerine göre - aradaki farkın 200-TL'den büyük olmasına göre ve (2) priority *(örneğin indikatörlerden gelen priority ile haberlerden gelen priority değeri farklı olmak üzere)* değerine göre aralarında sıralanmaktadır.
>  
>  
>  Bu sıraya göre iletim sırasındaki (*request queue*) sıra bir ORDER ise, bu öncelik sırasına göre (*order queue*) hangi emir ilk sıradaysa bu gönderilir.

> [!NOTE]
> #### PHANTOM / GHOST DATABASE
> CASH_CHECK ve PORTFOLIO_CHECK yerel database'i **alınan verilerle eşitler.**
> 
> 
> Ancak bu iki iletim her dakikada gelene kadar - botun işlem limitleri ve sahip olunan hisseler bakımından ihtiyaç duyduğu bilgiye derhal erişebilmesi bakımından **database'de işlemler sanki derhal gerçekleştirilmiş gibi işlenir**.
>  
>  
>  Bu durum ise database eşitlenene kadar; bakiye oynamalarına, kar - zarar hesaplamalarında hataya, portföyde yanılsamaya sebep olabilir.
>  <details><summary>Daha fazla açıklama için tıklayın.</summary>
>  
>  - Öncelikle her (Telegram üzerinden verilen) emir *orders.json* a kaydedilir.
>  - orders.json, bizim *orders queue*yu takip etmemizi - hangi emrin henüz gönderilmediğini - hangisinin gönderildiğini ve karşılığında AlgoLab tarafından bir referans kodu atandığını - hangi emrin başarısız olduğunu - hangi emrin gerçekleştiğini .... vs. takip etmemizi sağlayan, **bütün emirleri tuttuğumuz ve *request queueda* CHECK sonucunda gerçekleştiğinden / silindiğinden emin olduğumuz orderları sildiğimiz bir dosyadır.**
>  - AlgoLab, emir iletimi sonucunda başarıyla iletilen emirlere **referans kodu atar**. (Eğer bakiye yetersiz ise vs. refCode atamadan direk emri siler).
>  - CHECK iletimi bize o seansta (o gün) gönderdiğimiz bütün emirleri referans kodlarıyla takip edebilmemizi sağlayan bir fonksiyondur. Bize emrin gerçekleşip gerçekleşmediğini - ne kadar lotunun gerçekleştiğini vs. gösterir.
>  - Yani her emir CHECK sonucunda referans kodları karşılaştırılarak gerçekleşti / silindi bilgisi alınan emirler orders.json dan silinir.
> 
> - Biz, kullanıcı tarafından iletilen emirleri **doğrudan database'e işlemek yerine, database bilgisi ile orders.json bilgisini kıyaslayarak final output veriyoruz.** Yani orders.json'dan henüz silinmemiş bütün emirler database'e ekleniyor.
> - Her CHECK sonunda sildiğimiz orderları ise **database'e işliyoruz.** Böylece phantom database yaratarak *dakikada bir gönderdiğimiz CASH_CHECK ve PORTFOLIO_CHECK iletimlerine kadar* database'i kendimiz oluşturmaya çalışıyoruz. Böylece örn. bir haber geldiğinde, henüz database eşitlenmemiş olsa bile bot, elinde hangi hisselerin olduğunu - işlem limiti *(bu bilgiler tamamen aynı olmasa bile, örn. işlem limiti 10 - 20 TL değişebilse bile)* bilgilerine erişebiliyor - buna göre haberi analiz ediyor.
> - İletilip de silinmemiş emirler (refCode atanmış olsun veya olmasın) 15dk sonunda orders.json dan silinir. (Eğer seans saatleri dışında emir iletilmiş ise emrin gönderim tarihi bir sonraki seans başlama tarihi (geleceğe dönük) olarak belirlenir - böylece emir üzerinden 15dk geçip geçmediği de bu tarihe göre hesaplanır).
> </details>


## II. İndikatörler

Merdiven Project haber analizinin yanında algoritmik işlem desteği de sunmaktadır. Bu algoritmik işlemler teknik indikatörler ile yapılmaktadır. Projenin bu halinde tarafımızca seçilen teknik indikatörler: **Stochastic + Bollinger Bands** ve **Trailing Stoploss**tur. *(Bu indikatörler trend reversal indikatörleridir, yani bir hissenin overbought veya oversold olduğunun tespiti için kullanılırlar.)*


Mevcut kodlamada ilgili indikatörlerde öncelikle şu tanımlamaları yapalım:

 - **Clear Upward Crossover (K>D crossover):** prevK < prevD ve K > D
 - **Clear Downward Crossover (K<D crossover):** prevK > prevD ve K < D
 - **Touching Lower Band:** (close <= BB-Lower) ya da (close(previous) <= BB-Lower(previous))
 - **Touching Upper Band:** (close >= BB-Upper) ya da (close(previous) >= BB-Upper(previous))
 - **Oversold Threshold:** prevK <= 20 ve prevD <= 20
 - **Overbought Threshold:** prevK >= 80 ve prevD >= 20

 AL - SAT sinyalleri için değerler şu şekildedir:
 
 - AL sinyalinin verilmesi için aşağıdaki tüm koşulların beraber sağlanması gerekir:
	 - %K, %D'nin üstüne **clear upward crossover** yapar
	 - Price, **touching lower band** koşulunu sağlar.
	 - **Oversold threshold** sağlanır.

 - SAT sinyalinin verilmesi için aşağıdaki tüm koşulların beraber sağlanması gerekir:
	 - %K, %D'nin altına **clear downward crossover** yapar
	 - Price, **touching upper band** koşulunu sağlar.
	 - **Overbought threshold** sağlanır.


- Trailing Stoploss için, her dakika yapılan bir kontrol ile eğer hissenin son fiyatı TS puanının %3 ve altına inmişse SAT

Bazı teknik indikatörlerin hesaplanabilmesi için **geçmiş mum verisi de gereklidir**. *Stochastic indikatörü buna örnektir.* Ancak **AlgoLab bu geçmiş mum verisini sağlamamaktadır**. Dolayısıyla Merdiven Project bu iki API'dan da yararlanmaktadır (her iki API da **unofficial - yani gayriresmidir!**):

* YahooFinance ([yahoo-finance-2](https://github.com/gadicc/node-yahoo-finance2/tree/devel)) ➡️ Authentication gerekmemektedir.
* TradingView ([Tradingview API](https://github.com/Mathieu2301/TradingView-API)) ➡️
	* Authentication (özellikle cookie bilgisi) gerekmektedir. Dolayısıyla TradingView hesabınız olması önerilir.
	* YahooFinance'in çalışmadığı durumlarda (*aksaklık - gecikme vs.*) yedek - backup olarak kullanılmaktadır.

\
AlgoLab WSS'den alınan canlı veri ile inşa edilen 15 dakikalık mumlar ile bu geçmiş mumlar birleştirilerek indikatörler hesaplanır.

Neticede robot **canlı indikatör verisi elde eder**. Belirlenen eşiklerle de otomatik olarak AL veya SAT sinyali üretir.


> **BYPASS SİSTEMİ**
>  
>  İndikatörler yalnızca sayılarla yapılan hesaplamalara dayandığından gerçek pazarı - beklentiyi - talebi yansıtmamaktadır.
>  \
>   Bu nedenle **haber analizinden elde edilen sonuçlar ile** bu indikatör analizlerinin vereceği sonuçlara BYPASS uygulanabilir. Bunun anlamı şudur: İndikatörün tek başına **alım - satım kararı verebilmesini belirli bir süreliğine engeller**. Ancak kullanıcı isterse işlemi hala gerçekleştirebilir.
>    
>   \
>   Örneğin: Piyasaları KÖTÜ *(BEARISH)* etkileyecek bir haber geldi diyelim. Yapay zeka bu haberi analiz ederek BEARISH BYPASS uygulanmasına karar verebilir. BEARISH BYPASS ise belirli bir süreliğine (örneğin 12 saatliğine) **robotun indikatörler ile yeni bir hisse almasına engel olur**.
>   \
>   Detaylı açıklama için [Haber Analizi](#iv-haberler-manşetler) modülünü inceleyin.


## III. Telegram

Merdiven Project, kullanıcı arayüzü ve etkileşimini sağlamak için **Telegram Bot API** kullanır. *(Genel bilgi için [burayı](https://core.telegram.org/api), mevcut metodlar için [burayı](https://core.telegram.org/bots/api#available-methods) tıklayın).* Bu tercihi kullanıcının bot çalışırken uzaktan telefonu ile anlık bildirimlere cevap verebilmesini sağlamak için yaptık. Böylece kullanıcı gelen bildirimlere anlık tepki verebilir, istemediği bir hissenin alımını durdurabilir, istediği bir hisseyi *banka uygulamasına girmek için dakikalarca beklemek yerine 10 saniye gibi kısa bir sürede* alabilir, botu uzaktan durdurabilir ve gerekli tüm müdahaleleri anında yapabilir.

\
Telegram'ın sunduğu Bot API hizmeti **ücretsizdir**, ancak birkaç kısıtlamaya tabidir. Bu kısıtlamalar hakkında [detaylı bilgi için tıklayınız.](https://limits.tginfo.me/en)
> Mesela kısıtlamalar nedeniyle oluşturduğunuz Botu bir Telegram grubuna ekleyemezsiniz (çünkü dakikada mesaj limitini mutlaka aşacaktır). Bunun yerine Botun kayıtlı user id'lere teker teker mesaj atmasını sağladık.


> Aslında Telegram Bot API - NodeJS için bir [topluluk kütüphanesi](https://github.com/yagop/node-telegram-bot-api) de bulunmaktadır (ayrıca epey de günceldir). Ancak biz bu kütüphane yerine *ben kütüphaneyi sonradan keşfettiğim için*:
> * Axios
> * Fetch
> * ngrok (HTTPS istediği için)
> * Webhook bağlantısı (gelen mesajları dinlemek için)
	> kurarak Telegram Botunu çalıştırıyoruz.


### KULLANICI ETKİLEŞİMİ
Merdiven Bot kullanıcı müdahalesi olmadan işlem yapılabilmesi için tasarlanmıştır. Ancak belirli durumlarda (örneğin yapay zekanın yanlış analizi sonucu) istenmeyen işlemlerin otomatik gerçekleşmesinin önüne geçilebilmesi için, kullanıcının sisteme müdahalesi mümkün kılınmıştır.

Merdiven Bot, gerek yapay zeka analizleri ve gerekse indikatör takibinde (eğer mevcut bir bypass varsa) otomatik işlemleri **önerilere** dönüştürür.

> [!TIP]
> 
> <details><summary>Örnekler için tıklayın</summary><ol>
> 
> * **NOTICE: OTOMATİK İŞLEMLER**
>  **Otomatik işlemlerde,** işlem için verilen süre dolduktan sonra işlem otomatik olarak gerçekleştirilir. (Örneğin AL emri verilir, BYPASS uygulanır vs.).
>   * Örnek: *İndikatörden gelen AL notice'i*
>   \
>  <a><img src="https://i.ibb.co/99ykTRnH/Screenshot-2025-07-25-at-02-39-49.png" alt="Notice Example" width="300"></a>
> 
>    * Örnek: *BEARISH bir haber gelmiş, ve Yapay Zeka bu haberin kötü etkisinden emin (confident_score çok yüksek).*
>    \
>    <a><img src="https://i.ibb.co/Xxp6b68x/Screenshot-2025-07-27-at-01-28-17.png" alt="Notice Example" width="300"></a>
>  
>  * **NOTIFICATION: ÖNERİLER**
> **Önerilerde,** kullanıcıya verilen süre içinde kullanıcı öneri ile etkileşime geçerek işlemi gerçekleştirebilir. *Ancak belirli bir süre sonra işlem için geçerlilik süresi dolar, yani kullanıcının yanlışlıkla işlemi gerçekleştirmesi önlenir. Kullanıcı bu geçerlilik süresi dolduktan sonra o işlemi yenileyerek mevcut fiyat bilgisiyle işlemi tekrar gerçekleştirebilir*.
>    * Örnek: *BULLISH bir haber gelmiş, ancak yapay zeka analizi yeterince confident değil.*
> \
> <a><img src="https://i.ibb.co/HDPJGcDB/Screenshot-2025-07-25-at-02-43-30.png" alt="Notification Example" width="300"></a></ol></details>
> 


## IV. Haberler (Manşetler)

İndikatörlerin yanı sıra (bu indikatörler yalnızca teknik hesaplamalara dayandığından) Merdiven Project **yapay zeka kullanarak haber / manşet analizi de yapmaktadır**.
> Dikkat: Haber / manşet analizi *KAP Bildirimleri Analizi <ins>değildir!</ins>* [KAP Analizi için bu başlığa bakın.](#v-kap-bildirimleri)

\
Haber kaynağı olarak piyasadaki en güvenilir ve özel haber kaynaklarından biri olan ➡️ [Patronlar Dünyası](https://www.patronlardunyasi.com/)nı tercih ettik. Patronlar Dünyası'na ve bu değerli web sitesine katkısı olan herkese ayrı ayrı teşekkür ederiz.
> [!TIP]
> Eğer başka bir haber kaynağı kullanmak isterseniz, bu haber kaynağının **RSS feedi** sunduğundan emin olun. Aksi halde *fetch / scrape* yasal olmayabilir.

\
Aslında araştırmamıza göre haberler hisse fiyatları üzerinde anlık olarak bir değişime *genellikle* sebep olmamaktadır. ✍️ Zaten çoğu haber (manşet) [KAP Bildirimleri](#v-kap-bildirimleri) baz alınarak yapılmaktadır. Arada genellikle 1 ila 12 saat fark olabilmektedir. Ancak öyle haberler de var ki, bunlar ne KAP Bildirimi olarak ne de başka bir haber kaynağında yer almamaktadır, ayrıca bazı haberler genel - piyasayı etkileyebilecek ölçüde olabilmektedir.

\
Merdiven Project ilgili haber kaynağındaki güncel haberleri her dakika başında çeker ve bunları **iki ayrı yapay zekadan geçirir**.



1. **FİLTRELEME İŞLEMİ:**
	
	
	Öncelikle haber tüm detaylarıyla birlikte (*yani tarih, başlık, açıklamalar, link vs.*) **ucuz** bir yapay zeka modeline verilir. Bu ucuz yapay zeka modeline ise haberin **gerçekten de incelemeye değer olup olmadığının tespiti** istenir. Böylece hiçbir haber (kategorilerine göre) çöpe atılmazken, maliyetten de büyük bir tasarruf sağlanmış olur.
	
	
2. **ANALİZ:**
	
	
	İlk filtreden geçen haberler şimdi **daha pahalı ve gelişmiş bir modele** input olarak verilir ve analiz istenir. Yapay zeka modelinden istenen analiz (1) genel pazar analizi, (2) kullanıcının portföyündeki hisselere yönelik analiz ve (3) diğer hisselerin etki analizi şeklinde talep edilir.
	
	\
	🙌
> [!IMPORTANT]
> Yapay zeka her iki adımda da OUTPUT olarak bir **JSON object** döndürür. Böylece kodumuz ile LLM yapay zeka modelinin analizi arasındaki iletişim sağlanmış olur.
>  
>  
>  AI'ın verdiği JSON object outputu *deneme-yanılma yöntemiyle oluşturduğumuz* bir **karar diyagramından** (decision diagram) geçer. Böylece alınacak eylem yapay zeka analizi sonucunda belirlenir.
>  
>  
>  Yapay zekadan JSON object olarak vereceği outputta belli başlı (hisse bazında) skorlar istenir. Bunlardan bazıları: *confidence_score, overall_impact_on_market, impact_score, relevance_score ...*
>
> (Detaylı bilgi için mutlaka aşağıdaki diyagramı kontrol edin).
> 
>   
>  \
>  **Karar Diyagramlarımıza göz atmak isterseniz tıklayarak tam halini görüntüleyebilirsiniz.**
>  
>  <a href="https://www.canva.com/design/DAGuT32GcA4/8DrvwJWKRK_wUX_DkIG87g/view?utm_content=DAGuT32GcA4&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=ha01ba944e2"><img src="https://i.ibb.co/N6bCH2d7/News-DC-preview.png" alt="Notification Example" width="300"></a>

\
<ins>1️⃣ - **HİSSE KARARLARI**</ins>
\
Özetle, yapay zekanın output olarak verdiği JSON objectinden elde edilen skorlar kullanılarak, hissenin halihazırda kullanıcı portföyünde olup olmadığına göre bir formül seçilerek **ağırlıklı skor** hesaplanır. Yine bu ağırlıklı skor hissenin elde olup olmadığına göre farklı aralıklarda 3 tür işlemin yapılmasına yol açabilir:

1. **Database'e Kaydet** - Haberi hissenin sembolüyle eşleştirir ve o hissenin haber veritabanına (daha sonraki haberlerde kullanılmak üzere) kaydeder.
2. **[Bildirim Gönder (Notify)]((#iii-telegram))** - Ağırlıklı skor eşiği aşmadığı için herhangi otomatik bir işlem (AL-SAT) yapma. Bunun yerine kullanıcıya bildirim gönder.
3. **İşlemi Gerçekleştir** - Yapay zeka kendi analizinde güçlü bir özgüven (confident_score) gösterir ve büyük bir etki tahmini (impact_score) yapar ise artık işlemi otomatik olarak gerçekleştir (yani bir [notice](#iii-telegram) gönder). **Otomatik olarak AL veya SAT işlemini gerçekleştir.**

	3.1. (Eğer haber *BEARISH* ise) - 24 saatlik [İndikatör Bypass](#bypass-si̇stemi̇) uygula.

\
<ins>2️⃣ - **GENEL PAZAR KARARLARI (MARKET)**</ins>
\
Eğer genel pazarı etkileyebilecek iyi veya kötü bir haber geldiyse, yapay zekadan bunu da analiz etmesi ve bir skor tahmini istenir. Böylece piyasaları genel olarak etkileyebilecek **siyasi haberler, faiz haberleri gibi** haberlerin anında müdahale etmesi sağlanır. Böylece yapay zeka yine 2 işleme yol açabilir:

Her ihtimalde süreler 🕒 max. 24 saat olacak şekilde:

1. **Bullish Market Bypass** - Eğer gelen haber olumlu ise (ve piyasalar olumlu etkilenecek ise) bir süreliğine kullanıcı portföyündeki hisselerin tamamına bypass uygulanır.
2. **Bearish Market Bypass** - Gelen haber olumsuz ise kullanıcının elinde olmayan bütün hisselere bypass uygulanır. Böylece [İndikatörlerin](#ii-i̇ndikatörler) otomatik ALIM yapması engellenir.

	2.1.  (Eğer haber *BEARISH* - olumsuz ise ve süre olarak 24 saat belirlenmişse) - Gelen haber muhtemelen epey kötü bir haber olacağından, (1) tüm noticeler / emirler iptal edilir - (2) **eldeki bütün hisseler derhal satılır** - (3) **bot kendini kapatır**.

> [!NOTE]
> Buraya kadar yaptığımız tüm açıklamaları diyagramı takip ederek okur iseniz anlaşılması daha kolay olacaktır 🙋



### <ins>BYPASS SİSTEMİ</ins>
BYPASS mekanizması **her hisse sembolü için, belirli bir süreye kadar işler**.


Yani, *örneğin THYAO için 12 saatlik bir BYPASS aktif edilirse, 12 saat sonra bu THYAO için BYPASS otomatik olarak kalkar*. Her hissenin süresi ayrı ayrı işler.


BYPASS, [Teknik İndikatörlerin](ii-i̇ndikatörler) algoritmik işlem yapmasını kısıtlayıcı bir önlemdir. Eğer bir hisse sembolü için İndikatör - AL diyor ise, ancak bu sembol için bir BYPASS aktif ise, AL işlemi kullanıcıya Telegram üzerinden ***Buy Notice (Otomatik İşlem) olarak değil,*** **Buy Notification (Bildirim) olarak iletilir** [(notice - notification için bkz)](#iii-telegram). Böylece kullanıcı ister bildirimi görmezden gelir, isterse işlemi gerçekleştirir.


Bypass sistemini; teknik indikatörlerin (algoritmik işlemin) haberler ile bir arada, bir ahenk içinde çalışmasını sağlayacağını öngördüğümüz bir sistem olarak tasarladık. Böylece algoritmik işlemlerin piyasa dinamiklerine (ve değişken talep-arz çizgilerine) daha duyarlı olacağı düşüncesindeyiz.

> Daha çok haberler ile uygulansa da, BYPASS Sisteminin uygulandığı diğer durumlar da şunlardır:
> * Trailing Stoploss ile bir hisse satıldığında
> * İndikatör modülü ile aynı mumda 30'dan fazla hisse için AL sinyali gelirse (30'dan fazla hisse underpriced olamayacağı öngörüsündeyiz).


## V. KAP Bildirimleri

> ‼️ **DİKKAT**: En başta yer alan uyarıyı tekrar etmek isteriz, KAP Bildirimleri için yapay zeka analiz modülüne projenin public versiyonunda **yasal sebeplerden ötürü yer verilmemiştir**.

\
[Kamuyu Aydınlatma Platformu ("KAP"),](https://www.kap.org.tr/tr) halka arz yapan, ihraç eden vs. şirketlerin yatırımcıları / nitelikli yatırımcıları ve genel olarak kamuyu aydınlatmak için bildirimde bulunmaları zorunlu olan bir platformdur. Her şirket, finansal tabloları - sürdürülebilirlik raporları gibi önem arz eden belgeleri KAP'a yüklemek, bunun yanında ise önemli nitelikte olabilecek (*piyasada pay fiyatını etkileyebilecek*) olayları **Özel Durum Açıklamaları (ÖDA)** başlığı altında bu platforma bildirmek zorundadır.


* Her şirket kendi adına, kendi sembolü altında bildirim yapar. (örn. THYAO kendi sembolü altında bildirir).
* Eğer bildirim birkaç şirketle ilgili ise, (örneğin birleşme-devralma vs.) ilgili şirket sembolleri de bildirimde sunulur.
* Genellikle önemli / okunabilir kısım "Açıklamalar" başlığı altında yer alan birkaç paragrafta bulunur.
* Bazı bildirimler yanlış yayınlanabilir, bunlar için daha sonrasında düzeltme bildirimleri de yayınlanır.

\
İşte Merdiven Project, bu KAP Bildirimlerini de her dakika kontrol ederek BIST100 içerisinde yer alan şirketlere ait bildirimleri yapay zekaya verir. Analiz aynı [Haberler Modülünde](#iv-haberler-manşetler) olduğu gibi gerçekleşir. Output olarak alınan JSON objectindeki skorlar karar grafiğine verilir.

> Karar grafiği için tıklayın:
> 
> <a href="https://www.canva.com/design/DAGuT32GcA4/8DrvwJWKRK_wUX_DkIG87g/view?utm_content=DAGuT32GcA4&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=ha01ba944e2"><img src="https://i.ibb.co/qFxHnY0x/KAP-DC.png" alt="Notification Example" width="300"></a>


> [!WARNING]
> ## 🛑 **AI PROMPTLARI HAKKINDA**
> 
> \
> Merdiven Project'in bu public versiyonunda **AI analizi için JSON formatı bulunsa da, bazı sebeplerden ötürü <ins>promptlar bulunmamaktadır.</ins>**
>  
>  Bu nedenle promptlarınızı ilgili bölümlerde **kendiniz yazmalısınız**. Bunun için [OpenAI'ın prompt cookbookunu](https://cookbook.openai.com/examples/gpt4-1_prompting_guide) tavsiye ediyoruz. (Detaylı açıklama için lütfen videolardaki ilgili bölümleri izleyin).

## VI. Watchdog

Merdiven Project **dışa bağımlı bir projedir.** Bu nedenle koddaki hatalar bir yana, dışardan alınan herhangi bir hizmetin herhangi bir sebeple aksaması botun çökmesine sebep olabilir. Ancak buraya kadar açıkladığımız herhangi bir modülde gerçekleşecek en ufak aksama bile size ***pahalıya patlayabilir :-)***

\
İşte bu nedenle bottaki herhangi bir aksama durumunda **botu kapatıyoruz.** Botun kapanması (yani çökmesi) halinde sisteme giriş yaparak botu tekrar başlatabilirsiniz. Ancak unutmayın ki, tekrar başlattığınızda size tekrar sms gelecek ve bunu girmeniz gerekecektir.

### SMS Doğrulama Sistemi
<details><summary>AlgoLab API her giriş için <ins>SMS doğrulama</ins> istemektedir. Bunun her yeniden başlatma için nasıl çözüleceği ile ilgili bilgi almak için tıklayın.</summary><ol>

\
✍️
* Öncelikle, **AlgoLab API** geçerli bir hash ile işlem yapabilmeniz için **[SMS Doğrulama Sistemi](https://www.algolab.com.tr/Api/)** kullanmaktadır. Yani kullanıcı TCKN ve şifresi ile giriş yaptığında (kullanıcıya token verildiğinde, bu token ile) kullanıcıya gönderilen SMS tekrar AlgoLab API'ya gönderilmelidir, bu da size geçerli bir hash verecektir.
* Bu hash **Session Refresh** methodu ile devamlı olarak valid (geçerli) tutulabilmektedir. Session Refresh'i biz her dakika çağırmaktayız (ancak 5 - 10 dakika da yeterli olacaktır).

\
<ins>**Size gelecek SMS kodu her seferinde elinizle tekrar girilmelidir.**</ins>
</ol></details>


---

# 3. KURULUM

> ‼️ Dikkat: Buraya kadar yapılan açıklamaları kurulumdan önce okumanızı tavsiye ediyoruz. Çünkü bot sistemi biraz karışık ve çok fazla modül bir arada çalışmaktadır. *Yani botu kurmak demek mükemmel bir sistemin çalışmaya başlayacağı anlamına gelmez!*
>  
>  🤓 [Modülleri okumak için buraya tıklayın.](#2-mod%C3%BCller-si%CC%87stem)


[Botu çalıştırmak için sahip olmanız gerekenler](#botu-çaliştirmak-i̇çi̇n-sahi̇p-olmaniz-gerekenler) tablosunu inceleyin. Merdiven Project **yazılım bilgisine sahip olanların yararlanması için sunulmuştur.** Yani yazılım bilginiz olmadan robotu çalıştırmanız önerilmez.


Botun kurulumunu 4 başlık altında inceliyoruz:

[ 1 ] - Telegram Setup

[ 2 ] - AlgoLab (DenizBank) Setup

[ 3 ] - OpenAI Setup

[ 4 ] - Repo'yu Klonlayın + .env Oluşturun

## Telegram Setup
1. Öncelikle Telegram API ile iletişim kurabilmek için HTTPS bağlantısı gerekmektedir. Bu HTTPS bağlantısını [ngrok](https://ngrok.com/) kullanarak sağlayabiliriz. Ngrok ücretsiz bir şekilde bize HTTPS (secure) tünel ve public ip sağlayarak API ile iletişim kurmamızı mümkün kılıyor.
2. **Ngrok hesabı oluşturun.** Web sitesinde yer alan adımları takip edin. (Özellikle *Run the following command to add your authtoken* komutunu girmeyi unutmayın).

	Şöyle bir komut:
	`ngrok config add-authtoken [çok uzun bir token]`
	
4. **Telegram Botu oluşturun.** Telegram Botu oluşturmak her kullanıcı için ücretsiz ve çok kolay. @BotFather adlı kullanıcıya (bu bir ***resmi Telegram kullanıcısıdır,*** Bot hesabı oluşturmak için kullanılıyor) mesaj atın ve Botunuzu oluşturun. Botun vereceği API Token'ı kopyalayın. [Bu videodan yararlanabilirsiniz.](https://www.youtube.com/watch?v=COLDiMlmcoI)
	 
	 Şöyle bir API TOKEN olması lazım: `27389472938:Hsdhpoewf972HSDJSxhJAH`

Botunuz hazır olduğunda tokenını saklayın. Bunu en son adımda .env dosyasına yerleştireceğiz.

## AlgoLab (DenizBank) Setup

1. DenizBank hesabı oluşturun. (Mobil uygulamadan kimlik tarama vs. ile yapabilirsiniz). Aynı şekilde hisseleriniz için bir yatırım hesabı da oluşturun.

> [!IMPORTANT]
>
> ‼️ **DİKKAT**
> 
> Yatırım hesabı oluştururken bankanın sizin nasıl bir yatırımcı olduğunuzu tespit edebilmesi için **zorunlu bir anket yapılmaktadır**. [AlgoLab SSS'e](https://www.algolab.com.tr/Sss) göre:
> 
> 
> *Algoritmik işlem yapılabilmesi için DenizBank İnternet Bankacılığı üzerinden kolayca tamamlayabileceğiniz Uygunluk Testi ve Yerindelik Testi <ins>**(sonuçları en az yüksek riskli)**</ins> ve Algoritmik İşlemler Sözleşmesi gereklidir. Hızlı Emir Gönder aracını kullanabilmeniz için yalnızca Uygunluk Testiniz (en az orta riskli) olması yeterlidir.*
> 
> 
> Yani bu anketi ilgili sonucu elde edecek biçimde doldurmanız önem arz etmektedir.

2. https://www.algolab.com.tr/Anasayfa ya gidin. DenizBank hesabınız ile giriş yapın. (TCKN ve bankacılık şifrenizle).
3. AlgoLab DenizBank'ın algoritmik işlem ürünüdür. Bu ürünü kullanabilmek için **birkaç sözleşme imzalamanız, yani yetki almanız gereklidir.** AlgoLab'in sunduğu diğer ürünlerden (API hizmeti gibi) yararlanabilmek için de bu sözleşmelerin tam ve eksiksiz olması gerekir. (Özellikle **canlı veri - derinlik sözleşmeleri**ni lütfen atlamayın).
4. Sözleşmeleri AlgoLab'e giriş yaptıktan sonra -> Profilim -> Başvurularım sayfasından imzalayabilirsiniz. **Sözleşmenizin karşı taraftan da kabul edilmesi gerekmektedir.** Bu işlem ise 1 gün - 1 hafta kadar sürebilmektedir. Tüm sözleşmeler onaylandıktan sonra bu şekilde gözükmelidir:

	<img src="https://i.ibb.co/spbJfJFJ/Screenshot-2025-07-31-at-13-11-19.png" width=400>

6. API Sözleşmeniz de onaylandıktan sonra AlgoLab hesabınızda yine Profilim bölümünde size **API Key** verilmiş olacaktır. Yine bunu da saklayın, en son adımda .env'e kaydedeceğiz.

## OpenAI Setup

1. Yapay zeka analizleri için Merdiven Project OpenAI kullanmaktadır. *Siz dilerseniz Gemini gibi alternatifleri de değerlendirebilirsiniz. Ancak bizim deneyimimize göre BIST dinamiklerine en duyarlı - en gelişmiş tercih GPT 4.1 modelleri olacaktır.*
2. https://auth.openai.com/log-in linkine gidin. OpenAI hesabı oluşturun / giriş yapın.
3. OpenAI hesabınıza kredi kartı tanımlayın. **Bakiye yükleyin.** (*En son minimum bakiye 5$ dı, ancak bu fiyata **KDV (VAT) DAHİL OLMADIĞI İÇİN** biraz daha pahalı olacaktır.*)
4. OpenAI API Key'inizi oluşturun. Bu API Key'i de sakladığınızdan emin olun. Bunu da .env'e yerleştireceğiz.

## Final Setup

1. Gerekli bütün API Key / Tokenları elde ettiğinizde, AlgoLab hesabınız da hazırsa, artık botun kurulumuna geçebiliriz.
2. Bu projeyi (yani içindeki dosyaları) masaüstünüze kopyalayın / klonlayın.
3. Bilgisayarınızda NodeJS kurulu olduğundan (npm komutu çalıştığından) emin olun. *Terminalde deneyebilirsiniz*.
4. Projeyi kopyaladığınız klasörün içinde terminal açın. Veya direk terminal açarak `cd \proje\klasorunuz\nerede\ise\` yazabilirsiniz.
5. `npm install` yazın.

7. İşlem tamamlandığında artık **.env dosyası oluşturabiliriz**. Bunun için projenin bulunduğu klasörde `.env` adında bir dosya oluşturun. Bu gizli bir dosya olacağından görüntüleme ayarlarından vs. emin olun. Yeni oluşturduğunuz env dosyasına aşağıdakini aynen yapıştırın ve bütün API Key / Tokenlarınızı ekleyin:
	
``` bash
ALGOLAB_USERNAME=[TC Kimlik Numaranız]

ALGOLAB_PASSWORD=[DenizBank Şifreniz]

ALGOLAB_API_KEY=[AlgoLab API Keyiniz]

OPENAI_API_KEY=[OpenAI API Key]

TELEGRAM_BOT_API_KEY=[Telegram Botunuzun API Token]

TELEGRAM_AUTHORIZED_IDS=[Telegram Kullanıcı IDniz]

TRADINGVIEW_TOKEN=[TradingView Token]

TRADINGVIEW_SIGNATURE=[TradingView Signature]

BUY_LIMIT=[Hisse Başı Maksimum Alım Limiti]

IS_LIVE=true

NGROK_AUTHTOKEN=[Ngrok Authtoken]
```

7. İnternet bağlantınız olduğundan - *Türkiye'de olduğunuzdan (VPN vs. olmamalı)* - emin olduktan sonra artık botu çalıştırabiliriz. Ancak Telegram için bir yetkilendirme işlemi yapmalıyız, bunun için botu önce bir defa çalıştırarak daha sonra yeniden başlatacağız. Aşağıdaki adımları takip edin:

8. `npm run start` yazın.
9. Biraz bekledikten sonra, DenizBank'ta tanımlı telefon numaranıza **SMS Kodu** gelmiş olmalı. Bu SMS kodunu terminale girin ve ENTER'a basın (gönderin).  *Hash saved mesajını alırsanız her şey yolunda demektir*.
10. İlk çalıştırdığınızda Telegram Botunuz için **yetkili kullanıcıları belirlememiz gerekiyor.** Bunları belirlemek için Telegram'dan botunuza mesaj atın ve terminali izleyin. Botunuza mesajı attığınızda **terminalde bu mesajın içeriğini ve kimin attığını (kullanıcı adı, ID vs.) göreceksiniz.** Buradan bu kullanıcı ID'sini alın ve kaydedin. Console'a gelecek log şöyle gözükecektir:
``` j
{
  update_id: 596188034,
  message: {
    message_id: 7594,
    from: {
      id: 7575757575,
      is_bot: false,
      first_name: 'Arda',
      last_name: 'Okyay',
      username: '',
      language_code: 'en'
    },
    chat: {
      id: 7575757575,
      first_name: 'Arda',
      last_name: 'Okyay',
      username: '',
      type: 'private'
    },
    date: 1753925785,
    text: 'merhaba',
    entities: [ [Object] ]
  }
}
```
11. Bu outputtan **chat -> id** veya **from -> id** kısmındaki ID yi kopyalayın.

13. .env dosyanız içindeki **TELEGRAM_AUTHORIZED_IDS** kısımlarına bu ID'leri yerleştirin. *Eğer birden fazla ID koyacaksanız hepsini virgül (,) ile ayırın. Örn. 1234123,53459843*
14. Botunuzu kapatıp tekrar açabilirsiniz. *Kapatmak için Ctrl + C'ye basabilirsiniz.* 

\
Botunuzu kullanacak kaç kişi varsa bunların hepsi Botunuzla (/start komutu ile) interactionda bulunmalı. *Telegram kuralları gereği botlar eğer kullanıcılar o botla henüz interactionda bulunmadıysa **ilk interaction bottan olamaz.*** Mesaj atan kullanıcıların Telegram ID'lerini (terminaldeki outputlar vasıtasıyla) alın ve .env dosyasındaki `TELEGRAM_AUTHORIZED_IDS` kısımlarına yerleştirin.
 
 
> Aynı anda en fazla **5 kullanıcı öneriyoruz.** Daha fazlası botun aksamasına sebep olabilir. Bkz. [Telegram Limitleri](https://limits.tginfo.me/en)
> 
> *Lütfen authorizedId olarak group - channel denemeyin. Buradaki mesaj limitleri çok kısıtlı olduğundan çalışması mümkün değil.*

\
Detaylı kurulum videosunu izlemeyi unutmayın ☺️...


Sevgilerimizle ...
