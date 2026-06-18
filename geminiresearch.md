Nora Web Çalışma Uygulaması Teknik ve Pedagojik Denetim RaporuNora web çalışma uygulamasının yedi temel bileşeni ile bu bileşenlerin üzerinde yapılandırıldığı Next.js, Supabase ve TypeScript teknolojilerinden oluşan sistem mimarisi, bu raporda derinlemesine bir pedagojik ve teknik denetime tabi tutulmuştur. Analizler, bilişsel bilim bulguları ve doğrulanabilir yazılım mühendisliği prensipleri çerçevesinde yürütülmüştür.Nora Temel Özelliklerinin Pedagojik ve Teknik DenetimiFeynman Modu: Oluşturucu Öğrenme ve Eğitilebilir Ajan EntegrasyonuFeynman Modu, öğrencilerin bir konuyu sanal bir karaktere anlatarak öğrendikleri pedagojik "öğreterek öğrenme" (learning-by-teaching) modelinin dijital bir uygulamasıdır. Bu yaklaşım, Logan Fiorella ve Richard E. Mayer tarafından Cambridge University Press bünyesinde yayımlanan "Learning as a Generative Activity" (https://assets.cambridge.org/97811070/69916/frontmatter/9781107069916_frontmatter.pdf) başlıklı çalışmada tanımlanan "Oluşturucu Öğrenme Teorisi" (Generative Learning Theory) üzerine kurulmuştur. Teoriye göre derin ve kalıcı öğrenme, öğrenicinin bilgiyi pasif bir şekilde almasıyla değil; çalışan bellekte bilgiyi seçme (selecting), organize etme (organizing) ve uzun süreli bellekteki ön bilgilerle bütünleştirme (integrating) süreçlerini kapsayan SOI modeliyle gerçekleşir.Kendi kendine açıklama (self-explanation) süreci, öğrencilerin mevcut zihinsel modellerindeki boşlukları fark etmelerini, kavramsal çelişkileri gidermelerini ve yeni çıkarımlar üreterek zihinsel modellerini onarmalarını sağlayan yapıcı bir bilişsel faaliyettir. Michelene Chi tarafından Arizona State University platformunda paylaşılan "Self-Explanation Learning" (https://education.asu.edu/sites/g/files/litvpz656/files/lcl/wylie_chi_selfexplanation_0.pdf) araştırması, herhangi bir dış uzman veya öğretmen müdahalesi olmaksızın sadece yapay yönlendirmelerle (prompted self-explanation) tetiklenen kendi kendine açıklama süreçlerinin, doğrudan öğretim ve açıklamalarla birleştirilmiş modellere göre bilişsel açıdan çok daha üstün sonuçlar verdiğini doğrulamaktadır. Schworm ve Renkl (2006) tarafından gerçekleştirilen kontrollü deneyler, dışarıdan doğrudan bilgi sunulmasının öğrenicinin kendi çıkarımlarını üretme çabasını bastırdığını ve derin zihinsel entegrasyonu engellediğini ortaya koymuştur.Eğitilebilir sanal ajanlar (teachable agents), öğrenicilerin başka bir varlığın öğrenme sorumluluğunu üstlendiklerinde daha yüksek motivasyon sergilediklerini açıklayan "koruma etkisi" (protégé effect) mekanizmasından yararlanır. Vanderbilt Üniversitesi bünyesindeki Teachable Agents Group tarafından geliştirilen "Betty's Brain" (https://bettysbrain.teachableagents.org/front-page/ ve https://www.vanderbilt.edu/oele/bettys-brain/) projesinde, öğrencilerin sanal bir ajan olan Betty’ye kavramlar arası neden-sonuç ilişkilerini gösteren yönlendirilmiş zihinsel haritalar (causal concept maps) aracılığıyla "öğretim yaptıkları" gözlemlenmiştir. Sistemde yer alan akıl hocası ajan Mr. Davis, Betty’nin girdiği dinamik test sonuçlarını değerlendirerek öğreniciye biçimlendirici geri bildirimler sunmakta ve öz-düzenleme (self-regulation) becerilerini geliştirmektedir. CoSL (Collaborative Science Learning) projelerinde elde edilen bulgular, sosyal olarak paylaşılan düzenleme stratejilerini (shared-regulation) kullanan öğrencilerin, bireysel çalışan akranlarına kıyasla çok daha yüksek kalıcı akademik kazanımlar elde ettiğini kanıtlamaktadır.Modern diyalog temelli yapay zekâ uygulamalarında ise Khan Academy tarafından sunulan Khanmigo (https://www.khanmigo.ai/) gibi sistemler öne çıkmaktadır. Khanmigo, geleneksel ChatGPT arayüzlerinden farklı olarak doğrudan cevap vermek yerine, öğrencileri Sokratik bir sorgulama süreciyle kendi çözümlerini bulmaya teşvik eden yönlendirmeler kullanmaktadır.Pedagojik KonseptBirincil Akademik Kaynak ve URLKanıt Gücü ve Temel BulgularSınır Koşulları ve Karşıt GörüşlerOluşturucu Öğrenme (Generative Learning)Fiorella & Mayer (2015), UCSB Mayer Lab (https://mayerlab.psych.ucsb.edu/research/generative-learning-activities-improve-understanding-lessons)Güçlü (Meta-analizler): Özetleme, haritalama, çizim ve öğretme gibi aktif bilişsel süreçler aktarılabilir bilgiyi artırır.Öğrenicilerin yeterli alan bilgisine (domain knowledge) sahip olmaması durumunda bilişsel yüklenme oluşur.Kendi Kendine Açıklama (Self-Explanation)Chi et al. (1989), Schworm & Renkl (2006) (https://education.asu.edu/sites/g/files/litvpz656/files/lcl/wylie_chi_selfexplanation_0.pdf)Güçlü (Deneysel Kanıtlar): Kendi kendine açıklama, doğrudan bilgi sunumuna kıyasla zihinsel modelleri onarmada daha etkilidir.Mantıksal çıkarım ve neden-sonuç ilişkisi barındırmayan salt ezbere dayalı konu alanlarında etkisi oldukça kısıtlıdır.Koruma Etkisi (Protégé Effect)Biswas et al. (2005), Vanderbilt OELE (https://www.vanderbilt.edu/oele/bettys-brain/)Orta-Güçlü (Sınıf İçi Deneyler): Sanal ajana öğretme sorumluluğu, motivasyonu ve öz-düzenleme takibini anlamlı şekilde artırır.Yapılandırılmış akıl hocası (mentor) iskeleleri (scaffolding) olmadığında, acemi öğrenciler yanlış zihinsel modeller geliştirebilir.Sokratik Yapay Zekâ DiyaloğuKhanmigo Platformu (https://www.khanmigo.ai/)Orta (Tasarım Analizleri): Cevap yerine ipucu sunan etkileşimli sistemler, kalıcı problem çözme becerilerini geliştirir.Büyük dil modellerinin üretebileceği mantıksal sapmalar (hallucinations) rehberlik sürecini olumsuz etkileyebilir.FSRS Aralıklı Tekrar Algoritması ve Bellek ModellemesiNora uygulamasının aralıklı tekrar altyapısı, Jarrett Ye tarafından geliştirilen ve açık kaynaklı "FSRS4Anki" (https://github.com/open-spaced-repetition/fsrs4anki) topluluğu tarafından optimize edilen Özgür Aralıklı Tekrar Zamanlayıcısı (Free Spaced Repetition Scheduler - FSRS) algoritması üzerine kurulmuştur. Algoritma, bellek araştırmacısı Piotr Woźniak’ın ortaya koyduğu "Belleğin Üç Bileşenli Modeli" (DSR) teorisini esas alır. DSR modeli, beynimizdeki bir bellek izinin durumunu üç değişkenle tanımlar: Zorluk ($D$), Kararlılık ($S$) ve Geri Çağrılabilirlik ($R$). Zorluk ($D$), bilginin yapısal karmaşıklığını $[1, 10]$ ölçeğinde temsil eder. Kararlılık ($S$), bilginin geri çağrılabilirlik ihtimalinin $\%100$’den $\%90$’a düşmesi için geçen gün bazında süreyi belirtir. Geri Çağrılabilirlik ($R$) ise bilginin belirli bir anda başarılı bir şekilde hatırlanma olasılığıdır.FSRS modelinde geri çağrılabilirlik kaybı, doğrusal olmayan bir güç yasası (power law) azalım fonksiyonu kullanılarak hesaplanır. Bu fonksiyon şu şekilde formüle edilmiştir:$$R(t) = \left( 1 + F \frac{t}{S} \right)^C$$[cite: 24]Burada $t$ son tekrardan bu yana geçen gün sayısını, $F$ ve $C$ ise eğrinin davranışını ayarlayan sabit katsayıları ifade eder. Geri çağrılabilirliğin hedef değer olan ve genellikle $\%90$ olarak belirlenen istenen tutma oranına ($R_d$) ulaştığı anı bulmak için zaman parametresi ($t$) yalnız bırakılarak sonraki tekrar aralığı ($I$) hesaplanır:$$I(R_d) = \frac{S}{F} \left( R_d^{1/C} - 1 \right)$$[cite: 24]Öğrenici sisteme ilk defa geri bildirim sunduğunda (seçenekler: $1 = \text{Again (Tekrar)}$, $2 = \text{Hard (Zor)}$, $3 = \text{Good (İyi)}$, $4 = \text{Easy (Kolay)}$), kartın ilk kararlılık ($S_0$) değeri girilen dereceye ($G$) bağlı olarak şu şekilde atanır:$$S_0(G) = w_{G-1}$$[cite: 24]Buradaki $w_0$ ile $w_3$ arasındaki parametreler, ilk kararlılık ağırlıklarını belirler. Kartın ilk zorluk derecesi ise şu formülle oluşturulur:$$D_0(G) = w_4 - e^{w_5(G-1)} + 1$$[cite: 24]Başarılı bir geri çağırmadan ($G > 1$) sonra, kartın yeni kararlılık değeri ($S'$), önceki kararlılık değerinin bir kararlılık artış katsayısı ($\alpha$) ile çarpılmasıyla bulunur:$$S' = S \times \alpha \quad \text{burada} \quad \alpha = 1 + t_d \cdot t_s \cdot t_r \cdot h \cdot b \cdot e^{w_8}$$[cite: 24]Bu formülde yer alan bileşenler şu şekildedir:Zorluk cezası: $t_d = 11 - D$ (zor kartların kararlılığının daha yavaş artmasını sağlar).Kararlılık doygunluğu: $t_s = S^{-w_9}$ (kararlılık düzeyi yükseldikçe, hafıza izini daha da kararlı hale getirmenin zorlaştığını modeller).Geri çağrılabilirlik doygunluğu: $t_r = e^{w_{10}(1-R)} - 1$ ("verimli zorluk" ilkesini temsil eder; bilgi unutulmaya ne kadar yakınken başarılı hatırlanırsa hafıza o kadar güçlenir).Hafıza kaybı (lapse, $G = 1$) durumunda ise yeni kararlılık ($S'$), önceki değerin çok üzerine çıkamayacak şekilde sınırlandırılarak güncellenir:$$S' = \min\left( f(S, D, R, w), S \right)$$[cite: 25]Bu matematiksel altyapı, 1987 yılında kısıtlı verilerle tasarlanmış olan klasik SM-2 algoritmasının en büyük dezavantajı olan "Kolaylık Cehennemi" (Ease Hell) sorununu kökten çözer. SM-2, zorluk ve kararlılık kavramlarını tek bir "Kolaylık Faktörü" (E-factor) altında birleştirdiği için, öğrenici bir karta üst üste birkaç kez "Zor" dediğinde kartın kolaylık çarpanı hızla düşer ve kart bir daha kurtulamayacağı sık aralıklı bir tekrarlama döngüsüne girer. FSRS ise zorluk ve kararlılığı tamamen ayırarak, gecikmiş veya başarısız tekrarlarda bile öğrenicinin geçmiş verilerinden çıkarılan kişisel bellek eğrisine göre en ideal aralığı atar. Anki ve RemNote (https://help.remnote.com/en/articles/9124137-the-fsrs-spaced-repetition-algorithm) verileri, FSRS kullanımının geleneksel SM-2 zamanlayıcısına kıyasla tekrarlama yükünü $\%20$ ila $\%30$ oranında azalttığını doğrulamaktadır.Algoritma SürümüGeliştirici / KaynakTemel Çalışma MekanizmasıPerformans ve Uygulama EntegrasyonuSuperMemo SM-2Piotr Woźniak (1987)Sabit çarpanlara ve E-faktörüne dayanır. Başarısız kartları doğrudan 1 gün sonrasına atar.Düşük Verimlilik: "Kolaylık Cehennemi" (Ease Hell) yaratır. Gecikmiş tekrarlarda esnek planlama sunamaz.FSRS v3 / v4Jarrett Ye, Open Spaced Repetition (2022-2023)Bellek verileriyle optimize edilebilen 17 parametreli DSR modeline dayanır. Güç yasası azalım eğrisi kullanır.Yüksek Verimlilik: İlk defa Anki v23.10 sürümünde yerleşik olarak sunulmuştur. Tekrarlama yükünü azaltır.FSRS-4.5Jarrett Ye, Open Spaced Repetition (2023)Azalım eğrisinin şekli matematiksel olarak iyileştirilmiştir.Tüm güncel Anki istemcilerinde (AnkiMobile, AnkiDroid) varsayılan gelişmiş zamanlayıcıdır.FSRS-5Jarrett Ye, Open Spaced Repetition (2024)Aynı gün yapılan çalışma kayıtlarını (same-day reviews) sonraki tahminleri iyileştirmek için eğitim aşamasına dahil eder.Kısa dönemli hafıza izlerini çok daha yüksek kararlılıkla modeller.FSRS-6Jarrett Ye, Open Spaced Repetition (2025)Öğrenicinin kişisel unutma eğrisinin düzleşme derecesini kontrol eden yeni bir optimize edilebilir parametre içerir.RemNote v6 platformu tarafından entegre edilmiştir. Şu andaki en yüksek tahmin doğruluğuna sahip zamanlayıcıdır.Karışık Çalışma Düzeni (Interleaved Study Mix) ve Bilişsel AyrımKarışık çalışma düzeni (interleaved practice), farklı konu başlıklarına veya problem türlerine ait çalışma materyallerinin tek bir oturumda ardışık olarak karıştırılarak sunulması yöntemidir (örneğin: $A-B-C-A-B-C$). Bu yöntem, aynı kategoriye ait tüm örneklerin arka arkaya çözüldüğü klasik bloklanmış çalışmaya (blocked practice) bir alternatif oluşturur (örneğin: $A-A-A-B-B-B$).Würzburg Üniversitesi'nden M. Brunmair ve T. Richter tarafından yayımlanan kapsamlı meta-analiz çalışmasında (https://www.psychologie.uni-wuerzburg.de/fileadmin/06020400/2019/Brunmair_Richter_in_press__2019_META-ANALYSIS_OF_INTERLEAVED_LEARNING.pdf) —59 bağımsız araştırmadan elde edilen 238 etki boyutu sentezlenerek— karışık çalışmanın genel etki boyutu Hedges' $g = 0.42$ olarak hesaplanmıştır. Ancak bu etki, öğrenilen malzemenin türüne göre önemli farklılıklar göstermektedir:Görsel Sanat Yapıtları/Resimler: En yüksek etkiyi gösterir (Hedges' $g = 0.67$). Farklı ressamların tarzlarının ayırt edilmesinde oldukça etkilidir.Matematiksel İşlemsel Görevler: Orta düzeyde ve anlamlı bir etki sergiler (Hedges' $g = 0.34$). Öğrencilerin sınav esnasında hangi formülü veya çözüm stratejisini seçeceklerini ayırt etmelerine yardımcı olur.Betimleyici Metinler ve Tat Duyusu: Etkisi belirsiz ve istatistiksel açıdan anlamsız bulunmuştur.Sözel Sözcük Listeleri: Karışık çalışma negatif etki üretir (Hedges' $g = -0.39$). Dil ve kelime öğreniminde bloklanmış sunum daha başarılı sonuçlar vermektedir.Karışık çalışmanın bu başarısını açıklamak üzere iki temel hipotez geliştirilmiştir:Dikkat Azalması Hipotezi (Attention Attenuation Hypothesis): Bloklanmış çalışmada öğrenicinin aynı tür bilgiyi üst üste görmesinin bilişsel dikkati zayıflattığını öne sürer. Ancak göz izleme (eye-tracking) deneyleri, bloklanmış çalışmada fiziksel dikkatin belirgin bir şekilde azalmadığını göstererek bu teoriyi desteklememiştir.Ayrımcı Kontrast Hipotezi (Discriminative Contrast Hypothesis): Bu hipoteze göre, farklı kategorilere ait örneklerin yan yana sunulması, öğreniciyi aradaki ince farkları karşılaştırmaya zorlar. Bu süreç, yüzeysel benzerlikler yerine kategorileri birbirinden ayıran kritik özellikleri belirginleştirir. Göz izleme verileri, yüksek kontrastlı sıralamaların (birbirine çok benzeyen farklı kategorilerin ardışık sunulması) en derin öğrenme çıktılarını sağladığını doğrulamaktadır.Bloklanmış Düzen:   [Kategori A -> Kategori A -> Kategori A]  --> Benzerliklere odaklanma
Karışık Düzen:      [Kategori A -> Kategori B -> Kategori C]  --> İnce farkları ayırt etme (Kontrast)
Web Araştırma Asistanı: Akademik Entegrasyonlar ve API SınırlarıNora platformunun literatür tarama asistanı, açık akademik veri sağlayıcılarının API sistemleriyle doğrudan entegre edilmelidir. Bu entegrasyonların sorunsuz çalışması için lisans modellerinin, teknik limitlerin ve performans optimizasyon yöntemlerinin incelenmesi gerekir.                  +----------------------------------------------+
                  |         Nora Web Araştırma Asistanı          |
                  +----------------------------------------------+
                    /              |             \             \
                   /               |              \             \
                  v                v               v             v
            +-----------+   +-------------+  +-----------+  +-----------+
            | OpenAlex  |   | Sem. Scholar|  | Crossref  |  | Unpaywall |
            |  (CC0)    |   |  (SPECTER)  |  | (Polite)  |  | (Açık PDF)|
            +-----------+   +-------------+  +-----------+  +-----------+
OpenAlex API: OurResearch (https://developers.openalex.org/) tarafından sunulan bu veri tabanı, küresel güneydeki yayınlar da dahil olmak üzere 240 milyondan fazla akademik çalışmayı dizinlemektedir. Veriler tamamen CC0 kamu malı lisansıyla sunulduğundan ticari amaçlarla serbestçe kullanılabilir. Günlük 1 ABD doları değerinde ücretsiz kullanım bütçesi sunan freemium modeliyle çalışır.Semantic Scholar Academic Graph (S2AG) API: Allen Institute for AI (Ai2) (https://www.semanticscholar.org/product/api) tarafından sağlanan bu servis, 200 milyondan fazla yayının yanı sıra SPECTER makale gömmelerini (embeddings) ve otomatik özetleri sunar. Kimlik doğrulaması yapılmamış genel istekler küresel bir havuzda sınırlandırıldığı için kararsız çalışır. Ücretsiz alınabilen API anahtarları ise saniyede 1 istek (1 RPS) hakkı sağlar. API üzerinden büyük çaplı veri çekilmesi yasak olup, bu durumlarda doğrudan S2AG veri setlerinin indirilmesi önerilmektedir.Crossref REST API: 180 milyondan fazla DOI kaydını ücretsiz ve API anahtarı gerektirmeden sunar. Aylık yaklaşık 1 milyar isteğe hizmet veren sistem, kararlı çalışmayı sürdürebilmek için "Polite Pool" (Kibar Havuz) uygulamasını yürütür. HTTP isteklerinin User-Agent başlığına veya sorgu parametrelerine geçerli bir e-posta adresi ekleyen istemciler, kibar kullanıcılara ayrılmış daha hızlı sunuculara yönlendirilir.Unpaywall API: OurResearch (https://unpaywall.org/products/api) tarafından yönetilen sistem, 56 milyondan fazla yasal açık erişimli makale kopyasının PDF bağlantılarını sağlar. Ücretsiz REST API, sorgu sonuna e-posta adresi eklenmesini (?email=EMAIL) zorunlu kılar ve günlük 100.000 istek sınırı uygular. Veriler CC0 lisanslıdır ve ticari entegrasyonlar için tamamen uygundur.API SağlayıcıVeri Kapsamı ve Birincil Kullanım SenaryosuLisans Modeliİstek Limitleri ve ÜcretlendirmeEn İyi Teknik UygulamalarOpenAlex API240M akademik çalışma; kavramsal sınıflandırma ve yazar profilleri.CC0 Kamu Malı. Ticari SaaS kullanımı serbesttir.Günlük 1 USD ücretsiz bütçe. Ekstra limitler için ön ödemeli veya kurumsal planlar gerekir.Sayfa başına per_page=100 parametresi kullanılmalı ve limit durumu /rate-limit endpoint'inden izlenmelidir.Semantic Scholar (S2AG) API214M yayın; makale gömmeleri, yapay zekâ özetleri ve atıf ağları.Ticari olmayan akademik kullanımlara izin verir; meta veriler CC0'dır.Anahtarsız: Küresel havuzda kısıtlı. Anahtarlı: Ücretsiz 1 RPS.İsteklerde x-api-key başlığı kullanılmalı ve büyük sorgularda S2AG veri setleri indirilmelidir.Crossref REST API180M DOI kaydı; yayın meta verileri ve açık atıf listeleri.CC0 Meta Veri. Ücretsiz kullanım hakkı sunar.Sınırlandırılmamıştır; limitler X-Rate-Limit-Limit başlığından okunabilir.İsteklere e-posta adresi (mailto) eklenerek "Polite Pool" avantajlarından yararlanılmalıdır.Unpaywall API56M açık erişimli yayın; abonelik gerektirmeyen PDF yollarını bulma.CC0 Meta Veri. Ücretsiz ve açık kaynaklıdır.Günlük 100.000 istek limiti bulunur.Sorgulara geçerli bir e-posta parametresi eklenmeli ve dönen veri yerel önbellekte tutulmalıdır.Akademik Makale RAG Sistemi: PDF Ayıklama Araçları ve Değerlendirme ÇerçeveleriBilgi Geri Kazanımıyla Artırılmış Üretim (RAG) mimarisinin kalitesini doğrudan belirleyen PDF veri ayıklama aşamasında, JavaScript tabanlı araçlar ile derin öğrenme destekli Python kütüphaneleri arasında bir seçim yapılmalıdır.               +-------------------------------------------+
               |            Nora PDF RAG İş hattı          |
               +-------------------------------------------+
                 /                       |               \
                /                        |                \
               v                         v                 v
       +---------------+         +---------------+   +-----------+
       |   unpdf JS    |         |  Docling /    |   |   Grobid  |
       |  (Sunucusuz   |         |  Unstructured |   |  (Docker  |
       |   Uç, MIT)    |         | (Ağır Python) |   |  Servisi) |
       +---------------+         +---------------+   +-----------+
PDF Ayıklama Teknolojilerinin Karşılaştırmalı DeğerlendirmesiDocling (IBM): IBM Research tarafından geliştirilen bu açık kaynaklı ve MIT lisanslı kütüphane, DocLayNet ve TableFormer gibi yapay zekâ modellerini kullanarak karmaşık tablolarda ve çok sütunlu dokümanlarda $\%97.9$ hücre doğruluğu ile okuma sırasını korur. Ancak sistem kaynaklarını yoğun şekilde tüketir; 1.7GB bellek ve 1GB'ı aşan kurulum boyutu gerektirir. CPU üzerinde saniyede yalnızca 0.26 dosya işleyebildiği için uzun belgelerde 150 dakikaya varan zaman aşımı hatalarına yol açabilir.Unstructured: Apache-2.0 lisanslı bir veri hazırlama aracıdır. OCR kabiliyetleri güçlü olsa da, çok sayfalı belgelerde saniyede 51 ila 141 saniyeye varan yüksek işlem süreleri sergiler. Ayrıca karmaşık sütun geçişlerinde metin kaymalarına neden olabilmekte ve 1.3GB bellek alanı tüketmektedir.Grobid: Bilimsel yayınların TEI XML formatına dönüştürülmesinde uzmanlaşmış makine öğrenimi tabanlı bir kütüphanedir. Makale başlığı, yazarlar, referanslar ve ana bölümlerin ayıklanmasında Docling'e kıyasla oldukça hızlı çalışmaktadır. Ancak entegrasyonu için ayrı bir Docker konteynerinin ayağa kaldırılması ve yönetilmesi gerekmektedir.unpdf: Node.js, Cloudflare Workers ve tarayıcı ortamlarında yerel olarak çalışabilen, MIT lisanslı hafif bir TypeScript kütüphanesidir. Mozilla’nın PDF.js v5.6.205 sürümünü sunucusuz uç ortamlara uygun olarak paketler. Metin ve temel bağlantı ayıklama işlemleri için altyapı maliyeti gerektirmemesi açısından idealdir. Ancak gelişmiş tablo analizi, OCR veya görsel okuma düzeni algılama yetenekleri bulunmamaktadır.pdf-parse-new: Orijinal pdf-parse kütüphanesinin modern bir sürümü olup, çok çekirdekli sistemlerde (multiprocessing) otomatik iş yükü seçimi yapar. Saf metin ayıklamada hızlı olsa da, yapay zekâ tabanlı görsel düzen analizi sunmaz.Ragas Değerlendirme Çerçevesi AnaliziRagas (Retrieval Augmented Generation Assessment) kütüphanesi, RAG sistemlerinin doğruluğunu ölçmek için LLM tabanlı metrikler (Faithfulness - İnançlılık, Answer Relevance - Cevap Uygunluğu, Context Recall - Bağlam Geri Çağırma) sunan Apache-2.0 lisanslı bir Python paketidir. Ragas entegrasyonu Nora mimarisinde iki temel kısıt oluşturur:Sunucu Maliyetleri: Ragas Python >=3.9 gerektirdiği için Next.js sunucusuz mimarisine doğrudan entegre edilemez. AWS ECS veya Google Cloud Run üzerinde barındırılacak harici bir Python mikroservisi gerektirir.Yapay Zekâ API Maliyetleri: Ragas değerlendirme aşamasında GPT-4o gibi modelleri yargıç olarak kullandığından, test senaryolarının sürekli çalıştırılması yüksek API kullanım maliyetlerine yol açar.Video Çalışma Odası: Transkript Çıkarma ve IP Engelleme SorunlarıVideo çalışma odasında YouTube videolarından otomatik transkript çıkarılması süreci, YouTube altyapısının uyguladığı güvenlik engelleri nedeniyle teknik kısıtlamalara tabidir.       +-------------------------------------------------------------+
       |               Video Çalışma Odası Sunucu Katmanı            |
       +-------------------------------------------------------------+
              |                                            |
              v                                            v
     [ Python Ortamı ]                            [ Node.js/Next.js ]
  * youtube-transcript-api                    * @playzone/youtube-transcript
  * Bulut IP'lerinde ENGELLENİR                * Yerel XML akışlarını işler
  * RequestBlocked Hatası Fırlatır            * Konut Tipi Dönen Proxy desteği
youtube-transcript-api (Python): Tarayıcı simülasyonu veya resmi API anahtarı kullanmadan transkript verilerini çeken popüler bir kütüphanedir. Ancak YouTube, bulut sağlayıcılarına (AWS, GCP, Azure vb.) ait IP bloklarından gelen istekleri tamamen engellemektedir. Kod bulut ortamında çalıştırıldığında doğrudan RequestBlocked veya IpBlocked istisnaları fırlatılır.TypeScript/Node.js Alternatifleri: Bu engeli aşmak için Next.js sunucu katmanında @playzone/youtube-transcript (https://github.com/PlayZone30/youtube-transcript-api-js) veya @egoist/youtube-transcript-plus (https://www.npmjs.com/package/@egoist/youtube-transcript-plus) kütüphaneleri kullanılmalıdır. Bu kütüphaneler YouTube'un yerel sayfa akışlarından transkript verilerini ayıklar.Proxy Entegrasyonu: İlgili kütüphaneler harici HTTP/HTTPS tünelleme yapılandırmalarını yerleşik olarak destekler.residential Proxy Kullanımı:* Webshare gibi servislerden sağlanan konut tipi dönen proxy (rotating residential proxy) ağları sisteme entegre edilerek engellemeler tamamen aşılabilir.Önbellekleme Katmanı: InMemoryCache veya disk tabanlı FsCache önbellek yapıları kullanılarak aynı videolar için tekrar tekrar YouTube'a istek atılmasının önüne geçilir ve sistem güvenliği artırılır.Akademik Takvim Planlayıcısı: Zamansal Sırt Hattı ve Bilişsel Yük DengesiAkademik Takvim Planlayıcısı, öğrencilerin sınav tarihlerini aralıklı tekrar programlarıyla uyumlu hale getirerek bilişsel yükü dengelemeyi amaçlar.Zamansal Sırt Hattı (Temporal Ridgeline) AraştırmasıPlanlayıcının zamanlama algoritması, Nicholas Cepeda, Harold Pashler, Edward Vul, Doug Rohrer ve John Wixted (2008) tarafından yayımlanan "Spacing Effects in Learning: A Temporal Ridgeline of Optimal Retention" (https://laplab.ucsd.edu/articles/Cepeda%20et%20al%202008_psychsci.pdf) çalışmasına dayanmaktadır. Araştırma kapsamında 1.350'den fazla katılımcı üzerinde yapılan deneyler sonucunda, ilk çalışma ile gözden geçirme (review) arasındaki zaman farkı (interstudy gap) ve son test tarihi (retention interval - RI) arasındaki non-lineer ilişki haritalandırılmıştır.Elde edilen bulgular şunlardır:Her bir hedef test tarihi için başarıyı en üst düzeye çıkaran benzersiz bir "en ideal aralık" (optimal gap) mevcuttur. Test süresi uzadıkça, iki çalışma arasında bırakılması gereken ideal süre de uzar.Bu ideal aralık, hedef test süresine oranlandığında azalan bir grafik sergiler. Sınav 1 hafta (7 gün) sonra ise ideal ilk ara yaklaşık $\%20$ ila $\%40$ (1-2 gün) olmalıdır. Sınav 1 yıl (365 gün) sonra ise bu oran $\%5$ ila $\%10$ (yaklaşık 21 gün) düzeyine geriler.                Son Sınav Başarı Oranı
                    ^
                    |          En İdeal Aralık (Optimal Gap)
                    |               *
                    |             *   *
                    |            *     *  --> Aşırı aralıkta yavaş düşüş
                    |           *       *
                    |          *         *
                    |     ____*___________*_____
                    +----------------------------------->
                      0 gün (Cramming)   İdeal Gün    Aşırı Aralık
Takvim ve Yük Dengeleme Algoritması Tasarım EsaslarıAsimetrik Performans Eğrisi: Cepeda ve ekibinin araştırmaları, aralığın idealden daha kısa tutulmasının (cramming/tıkıştırma) başarıyı dikey bir düşüşle baltaladığını, ancak aralığın ideal süreden daha uzun tutulmasının başarıda çok daha küçük ve tolere edilebilir kayıplara yol açtığını kanıtlamıştır. Bu nedenle planlama algoritması, şüpheye düşülen durumlarda aralıkları daraltmak yerine her zaman daha geniş tutacak şekilde yapılandırılmalıdır.Kısıtlamalar: Bildirimsel bellek alanlarında (olgular, kelimeler, kavramlar) spacing etkisi son derece güçlüyken, motor becerilerin öğrenilmesinde bu etki kalıcı bir öğrenme avantajı sağlamaz.Sınav Dönemi Yük Yönetimi: Sınav tarihi yaklaştığında maksimum tekrar aralığını yapay olarak sınırlamak (capping maximum interval) kartların birikmesine ve verimsiz bir iş yüküne neden olur. Bunun yerine, hedef hatırlama oranı ($R_d$) parametresi $\%95$ veya $\%97$ seviyelerine çıkarılmalıdır. FSRS bu yeni hedefe göre tekrar aralıklarını matematiksel olarak en güvenli şekilde daraltacaktır.Teknoloji Yığını ve Lisans Uyumluluk AnaliziNora uygulamasının Next.js (Edge Runtime), Supabase (PostgreSQL) ve TypeScript tabanlı teknik mimarisi, lisanslama riskleri ve altyapı maliyetleri açısından analiz edilmiştir.Yazılım Lisansı Denetimi ve Copyleft Bulaşma RiskiUygulamada kullanılan bağımlılıkların lisans uyumluluk durumları ve SaaS dağıtım riskleri aşağıda detaylandırılmıştır.[Müşteri Tarayıcısı] ---> (Next.js Edge API / unpdf - MIT: Güvenli)
                             |
                             v
                  [Supabase PostgreSQL]
                    * pgvector (PostgreSQL: Güvenli) [cite: 75]
                    * pg_textsearch BM25 (MIT/BSD: Güvenli) [cite: 76]
                             |
                             v
              [Python Mikrosistem Katmanı]
                * Docling (MIT: Ağır Bellek & CPU) [cite: 56, 57]
                * Ragas (Apache 2.0: API Token Maliyetleri) [cite: 64, 65]
ts-fsrs (MIT Lisansı): Tamamen izin veren (permissive) bir lisans yapısına sahip olup ticari kapalı kaynak SaaS projelerinde güvenle kullanılabilir. Node.js >=20.0.0 çalışma zamanı gereksinimini karşılamalıdır.unpdf (MIT Lisansı): Herhangi bir copyleft bulaşma riski barındırmaz. Ancak bünyesinde barındırdığı sunucusuz PDF.js v5.x derlemesi, Node.js < 22 sürümlerinde çalıştırıldığında hata fırlatılmasına yol açabilen Promise.withResolvers API'sini kullanmaktadır. Bu nedenle sunucusuz uç çalışma ortamında gerekli polyfill önlemleri alınmalıdır.ragas (Apache-2.0 Lisansı): Ticari kullanıma uygun olmakla birlikte, kod üzerinde yapılan değişikliklerin belirtilmesi ve patent haklarının korunması gibi standart koşullar içerir.Docling (MIT Lisansı): IBM Research tarafından MIT lisansıyla açık kaynak olarak sunulmuştur. Ancak sistem gereksinimleri (1.7GB RAM, CPU yavaşlığı) nedeniyle sunucusuz Next.js fonksiyonlarında çalıştırılmamalıdır.Copyleft Bulaşma Riski Analizi (GPL/AGPL/CC-BY-SA): Projede kullanılan temel kütüphanelerde AGPL veya GPL tabanlı kısıtlayıcı lisanslara rastlanmamıştır. Ancak PDF dönüştürme ve işleme adımlarında kullanılan bazı eski Python kütüphaneleri (örneğin pdf-extract gibi xpdf bağımlılığı içeren araçlar) GPL lisans kısıtlamaları barındırmaktadır ve kapalı kaynak SaaS mimarilerinde kullanılmamalıdır.Supabase Üzerinde Hibrit Arama ve RRF Mimarisinin YapılandırılmasıGeleneksel vektör tabanlı veri sorgulamaları (semantic search), arama sorgusu içerisindeki sürüm numaraları, fonksiyon isimleri veya özel kod parçacıklarında başarısız olabilmektedir. Bu zafiyeti gidermek amacıyla, Supabase üzerinde BM25 algoritmasını kullanan pg_textsearch eklentisi ile pgvector eklentisini entegre eden Karşılıklı Sıra Füzyonu (Reciprocal Rank Fusion - RRF) mimarisi kurulmalıdır.Aşağıdaki SQL betiği, ilgili eklentileri aktif hale getirmekte, tablo şemasını oluşturmakta, indeksleri yapılandırmakta ve RRF tabanlı hibrit aramayı çalıştıran PL/pgSQL fonksiyonunu veri tabanı katmanında tanımlamaktadır:SQL-- pgvector eklentisinin aktif edilmesi
create extension if not exists vector;

-- PostgreSQL 17+ üzerinde gelişmiş BM25 araması sağlayan pg_textsearch eklentisinin kurulması
create extension if not exists pg_textsearch;

-- Akademik makale parçalarının tutulacağı tablonun oluşturulması
create table if not exists nora_makale_parcalari (
    id uuid primary key default gen_random_uuid(),
    makale_basligi text not null,
    doi_numarasi text,
    parca_icerigi text not null,
    -- Klasik tam metin araması için saklanan tsvector kolonu
    tam_metin_vektoru tsvector generated always as (to_tsvector('turkish', parca_icerigi)) stored,
    -- OpenAI text-embedding-3-large için 1536 boyutlu embedding kolonu
    vektor_gömme vector(1536) not null
);

-- Hızlı kelime eşleştirmeleri için GIN indeksinin kurulması
create index if not exists makale_fts_idx on nora_makale_parcalari using GIN (tam_metin_vektoru);

-- HNSW indeksi ile kosinüs benzerliği aramalarının optimize edilmesi
create index if not exists makale_hnsw_idx on nora_makale_parcalari 
using hnsw (vektor_gömme vector_cosine_ops) 
with (m = 16, ef_construction = 64);

-- Reciprocal Rank Fusion (RRF) hibrit arama fonksiyonu
create or replace function nora_hibrit_arama_rrf(
    sorgu_metni text,
    sorgu_vektoru vector(1536),
    limit_degeri int default 10,
    rrf_k_sabit int default 50
)
returns table (
    id uuid,
    makale_basligi text,
    parca_icerigi text,
    doi_numarasi text,
    rrf_skoru float4
) as $$
begin
    return query
    with kelime_siralamasi as (
        select 
            m.id,
            -- ts_rank_cd ile kelime yoğunluğuna göre sıralama endeksi alma
            row_number() over (order by ts_rank_cd(m.tam_metin_vektoru, plainto_tsquery('turkish', sorgu_metni)) desc) as sira_no
        from nora_makale_parcalari m
        where m.tam_metin_vektoru @@ plainto_tsquery('turkish', sorgu_metni)
        limit 50
    ),
    vektor_siralamasi as (
        select 
            m.id,
            -- Kosinüs uzaklığı operatörü (<=>) ile yakınlık sıralaması alma
            row_number() over (order by m.vektor_gömme <=> sorgu_vektoru) as sira_no
        from nora_makale_parcalari m
        order by m.vektor_gömme <=> sorgu_vektoru
        limit 50
    )
    select 
        mp.id,
        mp.makale_basligi,
        mp.parca_icerigi,
        mp.doi_numarasi,
        -- RRF formülünün uygulanarak skorların birleştirilmesi
        coalesce(1.0 / (rrf_k_sabit + k.sira_no), 0.0) +
        coalesce(1.0 / (rrf_k_sabit + v.sira_no), 0.0)::float4 as rrf_skoru
    from nora_makale_parcalari mp
    left join kelime_siralamasi k on mp.id = k.id
    left join vektor_siralamasi v on mp.id = v.id
    where k.id is not null or v.id is not null
    order by rrf_skoru desc
    limit limit_degeri;
end;
$$ language plpgsql;
Next.js Sunucusuz Uç Rotası Üzerinde TS-FSRS EntegrasyonuNora uygulamasında bellek zamanlama güncellemelerinin istemci tarafında düşük gecikmeyle (low latency) çalışabilmesi için Next.js API rotası Edge Runtime uyumlu olarak tasarlanmalıdır.Aşağıda TypeScript ile yazılmış olan Next.js uç rotası (Edge Route Handler) örneği sunulmuştur:TypeScriptimport { NextRequest, NextResponse } from 'next/server';
import { fsrs, createEmptyCard, Rating, generatorParameters, type FSRSParameters, type Card } from 'ts-fsrs';

// Fonksiyonun Cloudflare Workers veya Vercel Edge üzerinde çalışmasını zorunlu kılma
export const runtime = 'edge';

interface ZamanlamaGirdisi {
  kartDurumu?: Card;
  derece: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
}

export async function POST(req: NextRequest) {
  try {
    const veri = (await req.json()) as ZamanlamaGirdisi;
    const { kartDurumu, derece } = veri;

    // FSRS-4.5 parametrelerinin yapılandırılması
    const parametreler: FSRSParameters = generatorParameters({
      request_retention: 0.90, // Hedef hatırlama başarısı oranı %90
      maximum_interval: 36500, // Tekrar aralığı üst sınırı 100 yıl
    });

    const fsrsZamanlayici = fsrs(parametreler);

    // Kart durumu gönderilmemişse yeni bir kart nesnesi başlatılması
    const aktifKart: Card = kartDurumu 
      ? {
          ...kartDurumu,
          due: new Date(kartDurumu.due),
          last_review: kartDurumu.last_review ? new Date(kartDurumu.last_review) : undefined,
        }
      : createEmptyCard();

    // Derece girdisinin FSRS derecelendirme tipine eşlenmesi
    let secilenDerece: Rating;
    switch (derece) {
      case 'AGAIN':
        secilenDerece = Rating.Again;
        break;
      case 'HARD':
        secilenDerece = Rating.Hard;
        break;
      case 'GOOD':
        secilenDerece = Rating.Good;
        break;
      case 'EASY':
        secilenDerece = Rating.Easy;
        break;
      default:
        secilenDerece = Rating.Good;
    }

    const su an = new Date();

    // Kartın bir sonraki tekrarlama durumunun hesaplanması
    const yeniDurum = fsrsZamanlayici.next(aktifKart, su an, secilenDerece);

    // Supabase entegrasyonu için tarih verilerinin milisaniyeye dönüştürülerek döndürülmesi
    return NextResponse.json({
      kart: {
        ...yeniDurum.card,
        due: yeniDurum.card.due.getTime(),
        last_review: yeniDurum.card.last_review?.getTime() ?? null,
      },
      log: {
        ...yeniDurum.log,
        due: yeniDurum.log.due.getTime(),
        review: yeniDurum.log.review.getTime(),
      }
    });
  } catch (hata: any) {
    return NextResponse.json(
      { error: 'FSRS zamanlama hesaplaması başarısız oldu', details: hata.message },
      { status: 500 }
    );
  }
}
Sonuç ve Stratejik TavsiyelerNora web çalışma uygulamasının pedagojik ve teknik denetimi sonucunda elde edilen veriler ışığında şu mimari kararların alınması önerilmektedir:Feynman Modu ve Eğitilebilir Ajan Yapılandırması: Yapay zekâ ajanı, öğrencileri doğrudan sonuca ulaştırmayacak şekilde sınırlandırılmalı ve "Betty's Brain" modelindeki gibi biçimlendirici, öz-düzenlemeyi teşvik edici bir Sokratik diyalog akışıyla donatılmalıdır.Aralıklı Tekrar Altyapısı: Geleneksel SM-2 kütüphaneleri yerine FSRS-4.5/5/6 tabanlı bellek modeline geçilmeli ve sınav dönemlerindeki yoğunluğu yönetmek için aralıklara müdahale etmek yerine hedef hatırlama oranı ($R_d$) geçici olarak yükseltilmelidir.Karışık Çalışma Düzeni: Matematiksel ve görsel analiz içeren çalışma kartları sistem tarafından otomatik olarak birbirleriyle karıştırılmalı; ancak sözel listeler ve doğrudan kelime ezberi içeren kart grupları bloklanmış (sequential) olarak sunulmalıdır.PDF Okuma ve RAG Katmanı: Sunucusuz Edge fonksiyonlarında hafif metin çekişleri için unpdf kütüphanesi kullanılmalı; ancak makale içindeki karmaşık tabloların ve grafiklerin analiz edilmesi gereken senaryolarda işlem yükü Next.js dışına çıkarılarak GPU destekli bağımsız bir Docker servisi üzerinden çalışan Docling motoruna delege edilmelidir.Video Analiz Servisi ve Engellemeler: YouTube üzerinden veri çekme adımlarında yaşanabilecek IP engellemelerini aşmak için sunucu katmanında @playzone/youtube-transcript kütüphanesi tünellenmiş konut tipi dönen proxy ağları ile desteklenmelidir.