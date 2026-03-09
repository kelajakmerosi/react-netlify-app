import { 
  BookOpen,
  Calculator, 
  Zap, 
  Dna, 
  FlaskConical,
  Sigma,
} from 'lucide-react'
import type { Subject, LocaleKey, TopicStatus, ModuleTrack, Topic, Question, SubjectModule } from '../types'

// ─── Subjects & Topics data ───────────────────────────────
const SUBJECT_SEEDS: Array<Omit<Subject, 'modules'>> = [
  {
    id: 'math',
    icon: <Calculator size={22} strokeWidth={2.35} />,
    color: '#3f68f7',
    gradient: 'linear-gradient(135deg,#315df0,#4f83ff)',
    topics: [
      {
        id: 'algebra-basics',
        videoId: 'NybHckSEQBI',
        questions: [
          { id:1, text:'2x + 5 = 13 tenglamada x = ?', options:['3','4','5','6'], answer:1 },
          { id:2, text:'3(x - 2) = 9 bo\'lsa x = ?',    options:['3','4','5','6'], answer:2 },
          { id:3, text:'x² = 16 bo\'lsa x = ?',          options:['2','4','8','16'], answer:1 },
          { id:4, text:'2x - 3 = 7 bo\'lsa x = ?',       options:['4','5','6','7'], answer:1 },
          { id:5, text:'5x = 25 bo\'lsa x = ?',           options:['3','4','5','6'], answer:2 },
          { id:6, text:'x/4 = 3 bo\'lsa x = ?',           options:['8','10','12','14'], answer:2 },
          { id:7, text:'4x + 2 = 18 bo\'lsa x = ?',       options:['3','4','5','6'], answer:1 },
          { id:8, text:'x - 7 = 5 bo\'lsa x = ?',         options:['10','11','12','13'], answer:2 },
          { id:9, text:'(x+3)(x-3) = ?',                   options:['x²-9','x²+9','x²-6','x²+6'], answer:0 },
          { id:10,text:'2(x+3) = 14 bo\'lsa x = ?',        options:['3','4','5','6'], answer:1 },
          { id:11, text:'Rasmli algebra mashqida 4 + x = 9 bo\'lsa x nechaga teng?', imageUrl:'/quiz-media/algebra-1600.jpg', options:['3','4','5','6'], answer:2 },
          { id:12, text:'Rasmli topshiriqda 3x = 15 bo\'lsa x = ?', imageUrl:'/quiz-media/algebra-1600.jpg', options:['3','4','5','6'], answer:2 },
        ],
      },
      {
        id: 'geometry',
        videoId: 'WqzK3UAXaHs',
        questions: [
          { id:1, text:'To\'g\'ri burchakli uchburchakda katetlar 3 va 4. Gipotenuza = ?', options:['5','6','7','8'], answer:0 },
          { id:11, text:'Rasmda ko\'rsatilgan asboblar ichida burchak o\'lchash uchun qaysi biri ishlatiladi?', imageUrl:'/quiz-media/geometry-1600.jpg', options:['Sirkul','Transportir','Kalkulyator','Qalamdon'], answer:1 },
          { id:2, text:'Doira yuzi π·r², r=5 bo\'lsa = ?', options:['25π','10π','5π','50π'], answer:0 },
          { id:3, text:'Kvadrat perimetri 20. Tomoni = ?', options:['4','5','6','8'], answer:1 },
          { id:4, text:'Uchburchak burchaklari yig\'indisi = ?', options:['90°','180°','270°','360°'], answer:1 },
          { id:5, text:'To\'g\'ri to\'rtburchak 6×4. Yuzi = ?', options:['20','24','28','32'], answer:1 },
          { id:6, text:'Doira diametri 10. Radiusi = ?', options:['3','4','5','6'], answer:2 },
          { id:7, text:'Kub qirrasi 3. Hajmi = ?', options:['9','18','27','36'], answer:2 },
          { id:8, text:'Parallelogramm: asos=8, h=5. Yuzi = ?', options:['35','40','45','50'], answer:1 },
          { id:9, text:'Teng yonli uchburchak: tomon=6. Perimetri = ?', options:['12','15','18','21'], answer:2 },
          { id:10,text:'Trapetsiya: asoslar 4 va 6, h=3. Yuzi = ?', options:['12','15','18','21'], answer:1 },
          { id:12,text:'Rasmga qarab uchburchak chizishda eng mos qizil asbob qaysi?', imageUrl:'/quiz-media/geometry-1600.jpg', options:['Transportir','Uchburchak lineyka','Oddiy lineyka','Silgi'], answer:1 },
          { id:13,text:'Rasmli geometriya mashqida doira markazini topishda qaysi asbob foydali?', imageUrl:'/quiz-media/geometry-1600.jpg', options:['Sirkul','Kalkulyator','Qog\'oz stikeri','Bo\'yoq'], answer:0 },
        ],
      },
      {
        id: 'statistics',
        videoId: 'uhxtUt_-GyM',
        questions: [
          { id:1, text:'1,2,3,4,5 sonlar o\'rtachasi = ?', options:['2','3','4','5'], answer:1 },
          { id:2, text:'Moda qanday tushuncha?', options:['O\'rtacha','Ko\'p uchraydigan','Eng katta','Eng kichik'], answer:1 },
          { id:3, text:'2,4,6,8,10 ning mediasi = ?', options:['4','5','6','7'], answer:2 },
          { id:4, text:'Ehtimollik 0 dan ... gacha', options:['0.5','1','2','10'], answer:1 },
          { id:5, text:'Standart og\'ish nima o\'lchaydi?', options:['O\'rtacha','Tarqalish','Yig\'indi','Ko\'paytma'], answer:1 },
          { id:6, text:'10 ta son, yig\'indi=80. O\'rtacha = ?', options:['6','7','8','9'], answer:2 },
          { id:7, text:'Normal taqsimot shakli = ?', options:['To\'g\'ri chiziq','Qo\'ng\'iroq','Parabola','Giperbola'], answer:1 },
          { id:8, text:'Korrelyatsiya 0 bo\'lsa bog\'liqlik = ?', options:['Kuchli','O\'rtacha','Yo\'q','Manfiy'], answer:2 },
          { id:9, text:'Gistogramma nimani ko\'rsatadi?', options:['Chiziqli bog\'liqlik','Chastota taqsimoti','O\'rtacha','Dispersiya'], answer:1 },
          { id:10,text:'Dispersiya bu standart og\'ishning...', options:['Yarmi','Kvadrati','Ildizi','Ko\'paytmasi'], answer:1 },
        ],
      },
    ],
  },
  {
    id: 'physics',
    icon: <Zap size={22} strokeWidth={2.35} />,
    color: '#0c95d8',
    gradient: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
    topics: [
      {
        id: 'mechanics',
        videoId: 'ZM8ECpBuQYE',
        questions: [
          { id:1, text:'Nyutonning 2-qonuni: F = ?', options:['m+a','m·a','m/a','a/m'], answer:1 },
          { id:2, text:'Tezlik SI birligi = ?', options:['km/s','m/s','cm/s','mm/s'], answer:1 },
          { id:3, text:'Erkin tushish tezlanishi g ≈ ?', options:['8 m/s²','9.8 m/s²','10.8 m/s²','11 m/s²'], answer:1 },
          { id:4, text:'Kinetik energiya: Ek = ?', options:['mv','mv²','½mv²','2mv²'], answer:2 },
          { id:5, text:'Impuls: p = ?', options:['m+v','m·v','m/v','v/m'], answer:1 },
          { id:6, text:'Ish birligi = ?', options:['Vatt','Nyuton','Joul','Pascal'], answer:2 },
          { id:7, text:'Quvvat: P = ?', options:['F·t','F·v','m·v','m·a'], answer:1 },
          { id:8, text:'Bosim: P = ?', options:['F·S','F/S','S/F','F+S'], answer:1 },
          { id:9, text:'Arximed kuchi: FA = ?', options:['ρgV','mgV','ρmV','ρg'], answer:0 },
          { id:10,text:'Tok kuchi birligi = ?', options:['Vatt','Volt','Amper','Om'], answer:2 },
        ],
      },
      {
        id: 'thermodynamics',
        videoId: 'v3pYRn5j7oI',
        questions: [
          { id:1, text:'Issiqlik o\'tkazish turlari nechtа?', options:['2','3','4','5'], answer:1 },
          { id:2, text:'Absolyut nol temperatura = ?', options:['-100°C','-173°C','-273°C','-373°C'], answer:2 },
          { id:3, text:'0°C = ? Kelvin', options:['173 K','273 K','373 K','473 K'], answer:1 },
          { id:4, text:'Ideal gaz qonuni: PV = ?', options:['nRT','nmT','nRV','mRT'], answer:0 },
          { id:5, text:'Termodinamikaning 1-qonuni: ΔU = ?', options:['Q-A','Q+A','A-Q','Q·A'], answer:0 },
          { id:6, text:'Issiqlik sig\'imi birligi = ?', options:['J/mol','J/(kg·K)','J/K','W/m'], answer:1 },
          { id:7, text:'Stefan-Boltzmann T ga bog\'liq: ...', options:['To\'g\'ri','Teskari','T⁴ ga','T² ga'], answer:2 },
          { id:8, text:'Entropiya nimani o\'lchaydi?', options:['Energiya','Tartibsizlik','Temperatura','Bosim'], answer:1 },
          { id:9, text:'Karnot FIK: η = ?', options:['1-T2/T1','T2/T1','T1/T2','1+T2/T1'], answer:0 },
          { id:10,text:'Issiqlik o\'tkazuvchanlik birligi = ?', options:['W/(m·K)','J/(m·K)','W/m²','J/K'], answer:0 },
        ],
      },
      {
        id: 'electromagnetism',
        videoId: 'ruqmvwyMRho',
        questions: [
          { id:1, text:'Om qonuni: I = ?', options:['U·R','U/R','R/U','U+R'], answer:1 },
          { id:2, text:'Elektr quvvati: P = ?', options:['U+I','U·I','U/I','I/U'], answer:1 },
          { id:3, text:'Kondensator sig\'imi birligi = ?', options:['Farad','Genri','Veber','Tesla'], answer:0 },
          { id:4, text:'Kulон qonuni: F ∝ ?', options:['r','r²','1/r','1/r²'], answer:3 },
          { id:5, text:'Magnit induksiya birligi = ?', options:['Tesla','Veber','Farad','Genri'], answer:0 },
          { id:6, text:'Lenz qoidasi qaysi hodisa?', options:['Refraktsiya','Induksiya','Difraksiya','Interferensiya'], answer:1 },
          { id:7, text:'Elektromagnit to\'lqin tezligi = ?', options:['3·10⁶','3·10⁷','3·10⁸','3·10⁹'], answer:2 },
          { id:8, text:'Transformator: U1/U2 = ?', options:['n1/n2','n2/n1','n1·n2','n1+n2'], answer:0 },
          { id:9, text:'Elektr sig\'imi: C = ?', options:['Q·U','Q/U','U/Q','Q+U'], answer:1 },
          { id:10,text:'Aktiv qarshilik birligi = ?', options:['Farad','Genri','Om','Amper'], answer:2 },
        ],
      },
    ],
  },
  {
    id: 'biology',
    icon: <Dna size={22} strokeWidth={2.35} />,
    color: '#10936a',
    gradient: 'linear-gradient(135deg,#10b981,#34d399)',
    topics: [
      {
        id: 'cell-biology',
        videoId: 'URUJD5NEXC8',
        questions: [
          { id:1, text:'Hujayra "energiya stantsiyasi" qaysi organoid?', options:['Yadro','Mitoxondriya','Ribosoma','Lizosoma'], answer:1 },
          { id:11, text:'Rasmda markazdagi yadro atrofida joylashgan katta tuzilma qaysi?', imageUrl:'/quiz-media/cell-diagram.svg', options:['Hujayra membranasi','Sitoplazma','Yadro','Mitoxondriya'], answer:2 },
          { id:2, text:'DNK nima?', options:['Oqsil','Yog\'','Nukleotid','Uglerod'], answer:2 },
          { id:3, text:'Fotosintez qayerda sodir bo\'ladi?', options:['Mitoxondriya','Yadro','Xloroplast','Vakuola'], answer:2 },
          { id:4, text:'Oqsil sintezi qayerda?', options:['Ribosoma','Golji','ER','Yadro'], answer:0 },
          { id:5, text:'Membrana asosiy komponenti = ?', options:['Oqsil','DNK','Fosfolipid','Uglerod'], answer:2 },
          { id:6, text:'Mitoz bo\'linish natijasi = ?', options:['1 hujayra','2 hujayra','4 hujayra','8 hujayra'], answer:1 },
          { id:7, text:'Meyoz bo\'linish qanday hujayralar uchun?', options:['Somatik','Jinsiy','Nerv','Qon'], answer:1 },
          { id:8, text:'Lizosoma funktsiyasi = ?', options:['Energiya','Sintez','Hazm qilish','Transport'], answer:2 },
          { id:9, text:'ATP qayerda sintez bo\'ladi?', options:['Yadro','Xloroplast','Mitoxondriya','Ribosoma'], answer:2 },
          { id:10,text:'O\'simlik hujayrasi farqi?', options:['Membrana','Yadro','Hujayra devori','Ribosoma'], answer:2 },
        ],
      },
      {
        id: 'genetics',
        videoId: 'CBezq1fFUEA',
        questions: [
          { id:1, text:'Mendel qonunlari nechtа?', options:['1','2','3','4'], answer:2 },
          { id:2, text:'Dominant belgi nima?', options:['Yashirin','Ustun','Retsessiv','O\'zgarmas'], answer:1 },
          { id:3, text:'Inson xromosom soni = ?', options:['44','46','48','50'], answer:1 },
          { id:4, text:'Genotip nima?', options:['Tashqi ko\'rinish','Gen tarkibi','Mutatsiya','Fenotip'], answer:1 },
          { id:5, text:'RNK turlari nechtа?', options:['2','3','4','5'], answer:1 },
          { id:6, text:'Mutatsiya nima?', options:['Normal o\'zgarish','DNK o\'zgarishi','Fenotip o\'zgarishi','Evolyutsiya'], answer:1 },
          { id:7, text:'Krossingover nima?', options:['Murosasa','Xromosoma almashinuvi','Gen duplikatsiyasi','Mutatsiya'], answer:1 },
          { id:8, text:'Aa × Aa chatishuvida Aa nisbati = ?', options:['1/4','2/4','3/4','4/4'], answer:1 },
          { id:9, text:'Jinsiy xromosomalar = ?', options:['A va B','X va Y','P va Q','M va N'], answer:1 },
          { id:10,text:'Klonlash nima?', options:['Jinsiy ko\'payish','Identik nusxa','Mutatsiya','Gibridizatsiya'], answer:1 },
        ],
      },
      {
        id: 'ecology',
        videoId: 'bzCLME1xMus',
        questions: [
          { id:1, text:'Ekotizim tarkibi = ?', options:['Faqat o\'simliklar','Faqat hayvonlar','Tirik va nojonli tabiat','Faqat mikroorganizmlar'], answer:2 },
          { id:2, text:'Oziq zanjiri boshlanadi...', options:['Iste\'molchilardan','Ishlab chiqaruvchilardan','Parchalovchilardan','Xo\'jayindan'], answer:1 },
          { id:3, text:'Fotoavtotrof organizmlar = ?', options:['Hayvonlar','O\'simliklar','Zamburug\'lar','Viruslar'], answer:1 },
          { id:4, text:'Biosfera nima?', options:['Faqat tuproq','Barcha tirik organizmlar muhiti','Faqat okean','Atmosfera'], answer:1 },
          { id:5, text:'Simbioz nima?', options:['Raqobat','O\'zaro manfaatli yashash','Parazitizm','Yirtqich-o\'lja'], answer:1 },
          { id:6, text:'CO2 ortishi qanday ta\'sir?', options:['Sovutish','Isish effekti','O\'zgarmaydi','Kislorod ko\'payadi'], answer:1 },
          { id:7, text:'Ekologik piramida nimani ko\'rsatadi?', options:['Populyatsiya','Energiya o\'tkazilishi','Xilma-xillik','Tarqalish'], answer:1 },
          { id:8, text:'Biogeokimyoviy tsiklga misol?', options:['Suv aylanishi','Evolyutsiya','Mutatsiya','Fotosintez'], answer:0 },
          { id:9, text:'Keystone tur nima?', options:['Ko\'p sonli','Muhim ta\'sir ko\'rsatuvchi','Endemik','Parazit'], answer:1 },
          { id:10,text:'Biom nima?', options:['Bitta organizm','Yirik ekologik zona','Kichik ekotizim','Tur populyatsiyasi'], answer:1 },
        ],
      },
    ],
  },
  {
    id: 'chemistry',
    icon: <FlaskConical size={22} strokeWidth={2.35} />,
    color: '#e67d13',
    gradient: 'linear-gradient(135deg,#f59e0b,#fb923c)',
    topics: [
      {
        id: 'periodic-table',
        videoId: '0RRVV4Diomg',
        questions: [
          { id:1, text:'Vodorodning atom raqami = ?', options:['0','1','2','3'], answer:1 },
          { id:11, text:'Rasmda kattalashtirilgan element qaysi atom raqamni ko\'rsatmoqda?', imageUrl:'/quiz-media/periodic-table.svg', options:['1','2','6','8'], answer:0 },
          { id:2, text:'Kislorod kimyoviy belgisi = ?', options:['K','Ki','O','Ox'], answer:2 },
          { id:3, text:'Davriy jadval nechta davrdan?', options:['5','6','7','8'], answer:2 },
          { id:4, text:'Inert gazlar qaysi guruhda?', options:['I','VII','VIII','VI'], answer:2 },
          { id:5, text:'Oltingugurt atom raqami = ?', options:['14','15','16','17'], answer:2 },
          { id:6, text:'Eng yengil element = ?', options:['Geliy','Vodorod','Litiy','Berilliy'], answer:1 },
          { id:7, text:'Temir kimyoviy belgisi = ?', options:['Te','Ti','Fe','Ir'], answer:2 },
          { id:8, text:'Galogenlar qaysi guruhda?', options:['VI A','VII A','VIII A','V A'], answer:1 },
          { id:9, text:'Oltin kimyoviy belgisi = ?', options:['Ol','Au','Ag','Go'], answer:1 },
          { id:10,text:'Eng ko\'p tarqalgan element = ?', options:['Azot','Kislorod','Uglerod','Vodorod'], answer:1 },
        ],
      },
      {
        id: 'chemical-reactions',
        videoId: '8m6RtOpqvtU',
        questions: [
          { id:1, text:'Oksidlanish-qaytarilishda nima o\'zgaradi?', options:['Massa','Oksidlanish darajasi','Temperatura','Bosim'], answer:1 },
          { id:2, text:'Kislotali muhitda pH = ?', options:['pH > 7','pH = 7','pH < 7','pH = 0'], answer:2 },
          { id:3, text:'Neytrallanish: kislota + asos = ?', options:['Tuz + suv','Oksid + suv','Gaz + tuz','Metal + tuz'], answer:0 },
          { id:4, text:'Aktivatsiya energiyasi nima?', options:['Mahsulot energiyasi','Reaksiya boshlanish energiyasi','Issiqlik effekti','Qaytaruvchi energiya'], answer:1 },
          { id:5, text:'Katalizator nima qiladi?', options:['Energiya beradi','Reaksiyani tezlashtiradi','Mahsulot hosil qiladi','Reaktant bo\'ladi'], answer:1 },
          { id:6, text:'Le Chatelier printsipi nimaga?', options:['Kinetika','Muvozanat','Termodinamika','Elektrokimyo'], answer:1 },
          { id:7, text:'Molar massa birligi = ?', options:['g/mol','kg/mol','mg/mol','g/L'], answer:0 },
          { id:8, text:'Avogadro soni ≈ ?', options:['6.022·10²³','6.022·10²²','6.022·10²⁴','3.011·10²³'], answer:0 },
          { id:9, text:'Ekzotermik reaksiyada issiqlik = ?', options:['So\'riladi','Ajraladi','O\'zgarmaydi','Yo\'qoladi'], answer:1 },
          { id:10,text:'pH=3 bo\'lsa [H⁺] = ?', options:['10⁻¹','10⁻²','10⁻³','10⁻⁴'], answer:2 },
        ],
      },
      {
        id: 'organic-chemistry',
        videoId: 'bSMx0NS0XfY',
        questions: [
          { id:1, text:'Organik kimyoning asosi?', options:['Kislorod','Vodorod','Uglerod','Azot'], answer:2 },
          { id:2, text:'Metan formulasi = ?', options:['C2H6','CH4','C3H8','C2H4'], answer:1 },
          { id:3, text:'Benzol formulasi = ?', options:['C6H6','C6H12','C5H10','C7H8'], answer:0 },
          { id:4, text:'Alkan umumiy formulasi = ?', options:['CₙH₂ₙ','CₙH₂ₙ₊₂','CₙH₂ₙ₋₂','CₙHₙ'], answer:1 },
          { id:5, text:'Etanol formulasi = ?', options:['C2H5OH','CH3OH','C3H7OH','C4H9OH'], answer:0 },
          { id:6, text:'Polimer nima?', options:['Kichik molekula','Takrorlanuvchi birliklardan','Atom','Ion'], answer:1 },
          { id:7, text:'Aminokislotalar nimani tashkil qiladi?', options:['Yog\'lar','Uglevodlar','Oqsillar','Nuklein kislotalar'], answer:2 },
          { id:8, text:'Glukoza formulasi = ?', options:['C12H22O11','C6H12O6','C5H10O5','C3H6O3'], answer:1 },
          { id:9, text:'Saponifikatsiya reaksiyasi = ?', options:['Yonish','Sovun ishlab chiqarish','Polimerizatsiya','Oksidlanish'], answer:1 },
          { id:10,text:'Ester hosil bo\'lish reaksiyasi = ?', options:['Parchalanish','Eterifikatsiya','Polimerizatsiya','Galogenlanish'], answer:1 },
        ],
      },
    ],
  },
  {
    id: 'history',
    icon: <BookOpen size={22} strokeWidth={2.35} />,
    color: '#9b6b3d',
    gradient: 'linear-gradient(135deg,#8f5b2c,#bc8452)',
    topics: [
      {
        id: 'ancient-civilizations',
        videoId: 'B968I6nA9xM',
        questions: [
          { id:1, text:'Qadimgi Misr sivilizatsiyasi asosan qaysi daryo bo\'yida rivojlangan?', imageUrl:'/quiz-media/silk-road-map.svg', options:['Nil','Yanszi','Amazonka','Volga'], answer:0 },
          { id:2, text:'Mixxat yozuvi qaysi hududda paydo bo\'lgan?', options:['Mesopotamiya','Misr','Yunoniston','Xitoy'], answer:0 },
          { id:3, text:'Rim imperiyasida “senat” nima edi?', options:['Harbiy lager','Maslahat kengashi','Bozor','Ibodatxona'], answer:1 },
          { id:4, text:'Piramidalar asosan nima uchun qurilgan?', options:['Savdo ombori','Shoh qabri','Maktab','Qo\'rg\'on'], answer:1 },
          { id:5, text:'Buyuk Ipak yo\'li eng ko\'p nimani bog\'lagan?', options:['Afrika va Amerika','Xitoy va O\'rta yer dengizi','Hindiston va Avstraliya','Sibir va Yaponiya'], answer:1 },
          { id:6, text:'Afina shahrida demokratiya nimani anglatgan?', options:['Faqat podsho qarori','Fuqarolarning ishtiroki','Harbiy boshqaruv','Diniy boshqaruv'], answer:1 },
          { id:7, text:'Aleksandr Makedonskiy qaysi hududlarni zabt etgan?', options:['Faqat Yevropa','Yevropa va Osiyo qismlari','Faqat Afrika','Faqat Arabiston'], answer:1 },
          { id:8, text:'Qadimgi sivilizatsiyalarni o\'rganishda arxeologiya nimaga yordam beradi?', options:['Faqat afsonalarni yozishga','Maddiy topilmalarni talqin qilishga','Faqat xarita chizishga','Savdo qilishga'], answer:1 },
        ],
      },
      {
        id: 'world-history',
        videoId: 'xuCn8ux2gbs',
        questions: [
          { id:1, text:'Rasmda ko\'rsatilgan vaqt chizig\'ida eng so\'nggi davr qaysi?', imageUrl:'/quiz-media/history-timeline.svg', options:['Sanoat inqilobi','Uyg\'onish davri','Jahon urushlari','O\'rta asrlar'], answer:2 },
          { id:2, text:'Sanoat inqilobi avvalo qayerda kuchli boshlangan?', options:['Fransiya','Buyuk Britaniya','Hindiston','Rossiya'], answer:1 },
          { id:3, text:'Birinchi jahon urushi qaysi yillarda bo\'lib o\'tgan?', options:['1914-1918','1939-1945','1905-1910','1920-1924'], answer:0 },
          { id:4, text:'BMT qachon tuzilgan?', options:['1919','1945','1955','1961'], answer:1 },
          { id:5, text:'Sovuq urushning asosiy tomoni qaysilar edi?', options:['AQSH va SSSR','Fransiya va Germaniya','Xitoy va Yaponiya','Misr va Rim'], answer:0 },
          { id:6, text:'Matbaa texnologiyasining keng tarqalishi nimani kuchaytirdi?', options:['Ma\'lumot almashinuvi','Faqat harbiy nazoratni','Dengiz savdosini','Yer soliqlarini'], answer:0 },
          { id:7, text:'Uyg\'onish davri ko\'proq nimaga e\'tibor qaratgan?', options:['Qadimgi bilimlarni qayta tiklashga','Faqat qurollarga','Faqat diniy jazolarga','Faqat qishloq xo\'jaligiga'], answer:0 },
          { id:8, text:'Dekolonizatsiya nimani anglatadi?', options:['Imperiyalarning kengayishi','Mustamlakalarning mustaqillashuvi','Savdo blokadasi','Yangi sulola'], answer:1 },
        ],
      },
      {
        id: 'uzbek-heritage',
        videoId: 't4m8Z0u0A6M',
        questions: [
          { id:1, text:'Samarqand qaysi tarixiy obidalari bilan mashhur?', options:['Registon maydoni','Kolizey','Eyfel minorasi','Akropol'], answer:0 },
          { id:2, text:'Amir Temur qaysi davr hukmdori sifatida mashhur?', options:['XIV asr oxiri','XVIII asr','IX asr','XX asr'], answer:0 },
          { id:3, text:'Mirzo Ulug\'bek ko\'proq qaysi sohada tanilgan?', options:['Astronomiya','Dengizchilik','Arxitektura','Tibbiyot'], answer:0 },
          { id:4, text:'Ichan-Qal\'a qaysi shaharda joylashgan?', options:['Xiva','Buxoro','Termiz','Qo\'qon'], answer:0 },
          { id:5, text:'Alisher Navoiy qaysi meros bilan mashhur?', options:['Adabiyot','Kimyo','Matematika','Geologiya'], answer:0 },
          { id:6, text:'Buxoro tarixda ko\'proq nima bilan ajralib turgan?', options:['Ilm va savdo markazi','Faqat harbiy lager','Faqat dehqonchilik','Sanoat zavodlari'], answer:0 },
          { id:7, text:'Qadimgi O\'zbekiston hududidagi Ipak yo\'li nimani kuchaytirgan?', options:['Madaniy almashinuvni','Faqat soliqlarni','Faqat ko\'chmanchilikni','Faqat harbiy bosqinlarni'], answer:0 },
          { id:8, text:'Tarixiy merosni asrashning eng muhim sababi nima?', options:['Milliy xotira va identitetni saqlash','Faqat sayyohlikni','Faqat qurilish qilishni','Faqat sportni rivojlantirish'], answer:0 },
        ],
      },
    ],
  },
  {
    id: 'geometry',
    icon: <Sigma size={22} strokeWidth={2.35} />,
    color: '#6f59ef',
    gradient: 'linear-gradient(135deg,#5a48db,#8b78ff)',
    topics: [
      {
        id: 'plane-geometry',
        videoId: 'WqzK3UAXaHs',
        questions: [
          { id:1, text:'Rasmli topshiriqda burchak o\'lchash uchun qaysi asbob ishlatiladi?', imageUrl:'/quiz-media/geometry-1600.jpg', options:['Transportir','Sirkul','Kalkulyator','Qalam'], answer:0 },
          { id:2, text:'Uchburchak ichki burchaklari yig\'indisi = ?', options:['90°','180°','270°','360°'], answer:1 },
          { id:3, text:'Kvadratning barcha tomonlari qanday bo\'ladi?', options:['Har xil','Faqat 2 tasi teng','Barchasi teng','Faqat diagonallari teng'], answer:2 },
          { id:4, text:'Aylana diametri 12 bo\'lsa radius = ?', options:['4','5','6','8'], answer:2 },
          { id:5, text:'To\'g\'ri to\'rtburchak yuzi qanday topiladi?', options:['a + b','2(a+b)','a × b','a ÷ b'], answer:2 },
          { id:6, text:'Teng yonli uchburchakda qaysi tomonlar teng?', options:['Faqat asoslar','Yon tomonlar','Barcha tomonlar emas','Faqat balandliklar'], answer:1 },
          { id:7, text:'Perimetri 24 bo\'lgan kvadratning tomoni = ?', options:['4','5','6','8'], answer:2 },
          { id:8, text:'Parallel chiziqlar qanday kesishadi?', options:['Har doim kesishadi','Ba\'zan kesishadi','Kesishmaydi','Faqat 90° da kesishadi'], answer:2 },
          { id:9, text:'Rasmli geometriya kartasidagi uchburchak asbobi nimaga kerak?', imageUrl:'/quiz-media/geometry-1600.jpg', options:['Burchak va chiziq chizish','Massani o\'lchash','Haroratni ko\'rish','Tenglama yechish'], answer:0 },
        ],
      },
      {
        id: 'solid-geometry',
        videoId: 'Zn6fW1xQ4WQ',
        questions: [
          { id:1, text:'Kubning nechta qirrasi bor?', options:['8','10','12','14'], answer:2 },
          { id:2, text:'Kub hajmi formulasi = ?', options:['a²','6a²','a³','2a³'], answer:2 },
          { id:3, text:'Silindrning 2 ta ... bor.', options:['cho\'qqisi','asoslari','diagonali','burchagi'], answer:1 },
          { id:4, text:'Shar sirtida burchak bormi?', options:['Ha, 2 ta','Ha, 1 ta','Yo\'q','Faqat markazida'], answer:2 },
          { id:5, text:'To\'g\'ri burchakli parallelepiped hajmi = ?', options:['a+b+c','a×b×c','2(a+b+c)','ab+bc'], answer:1 },
          { id:6, text:'Konusning nechta asosi bor?', options:['0','1','2','3'], answer:1 },
          { id:7, text:'Rasmli topshiriqda fazoviy shakl modelini qurishda qaysi asbob foydali?', imageUrl:'/quiz-media/geometry-1600.jpg', options:['Lineyka','Termometr','Mikroskop','Kompas'], answer:0 },
          { id:8, text:'Prizma nomi odatda nimaga qarab beriladi?', options:['Rangiga','Asos shakliga','Balandligiga','Hajmiga'], answer:1 },
          { id:9, text:'Kubning barcha yuzlari qanday shakl?', options:['Uchburchak','Kvadrat','To\'g\'ri to\'rtburchak','Aylana'], answer:1 },
        ],
      },
      {
        id: 'coordinate-geometry',
        videoId: 'dR4fQ0XxH4Y',
        questions: [
          { id:1, text:'Koordinata tekisligida (0,0) nuqta nima deyiladi?', options:['Kesma','Koordinata boshi','Vektor','Diagonali'], answer:1 },
          { id:2, text:'(3, 5) nuqtada x koordinata = ?', options:['3','5','8','0'], answer:0 },
          { id:3, text:'Nuqta y o\'qi ustida bo\'lsa x qiymati odatda = ?', options:['1','-1','0','5'], answer:2 },
          { id:4, text:'Masofa formulasi qaysi teoremaga tayanadi?', options:['Pifagor','Arximed','Nyuton','Gauss'], answer:0 },
          { id:5, text:'A(1,2) va B(1,7) orasidagi masofa = ?', options:['3','4','5','6'], answer:2 },
          { id:6, text:'Qaysi chiziq x o\'qiga parallel?', options:['y = 4','x = 4','y = x','x + y = 1'], answer:0 },
          { id:7, text:'Qaysi chiziq y o\'qiga parallel?', options:['y = 4','x = 4','y = x','y = 2x'], answer:1 },
          { id:8, text:'Rasmli koordinata mashqida shaklni tekislikka ko\'chirish uchun qaysi vosita yordam beradi?', imageUrl:'/quiz-media/geometry-1600.jpg', options:['Katakli koordinata tarmog\'i','Mikroskop','Barometr','Probirka'], answer:0 },
          { id:9, text:'O\'rta nuqta formulasi nimani topadi?', options:['Kesmaning markazini','Yuzani','Perimetrni','Burchakni'], answer:0 },
        ],
      },
    ],
  },
]

const withAssessmentMeta = (topic: Topic): Topic => ({
  ...topic,
  estimatedMinutes: topic.estimatedMinutes ?? 12,
  questions: topic.questions.map((q: Question, idx) => {
    const difficulty: Question['difficulty'] =
      idx < 4 ? 'easy' : idx < 8 ? 'medium' : 'hard'

    return {
      ...q,
      difficulty,
      concept: q.concept ?? topic.id,
      explanation: q.explanation ?? `Correct answer: ${q.options[q.answer]}. Revisit this part of the lesson before retrying.`,
    }
  }),
})

const buildModules = (subjectId: string, topics: Topic[]): SubjectModule[] => {
  const pivot = Math.max(1, Math.ceil(topics.length / 2))

  return [
    {
      id: `${subjectId}-foundation`,
      track: 'foundation' as ModuleTrack,
      topicIds: topics.slice(0, pivot).map(t => t.id),
    },
    {
      id: `${subjectId}-practice`,
      track: 'practice' as ModuleTrack,
      topicIds: topics.slice(pivot).map(t => t.id),
    },
  ].filter(module => module.topicIds.length > 0)
}

export const SUBJECTS: Subject[] = SUBJECT_SEEDS.map((subject) => {
  const topics = subject.topics.map(withAssessmentMeta)
  return {
    ...subject,
    topics,
    modules: buildModules(subject.id, topics),
  }
})

// ─── Topic & Subject name maps ────────────────────────────
export const TOPIC_NAMES: Record<LocaleKey, Record<string, string>> = {
  uz: {
    'algebra-basics':'Algebra asoslari','geometry':'Geometriya','statistics':'Statistika',
    'plane-geometry':'Tekislik geometriyasi','solid-geometry':'Fazoviy geometriya','coordinate-geometry':'Koordinata geometriyasi',
    'mechanics':'Mexanika','thermodynamics':'Termodinamika','electromagnetism':'Elektromagnitizm',
    'cell-biology':'Hujayra biologiyasi','genetics':'Genetika','ecology':'Ekologiya',
    'periodic-table':'Davriy jadval','chemical-reactions':'Kimyoviy reaksiyalar','organic-chemistry':'Organik kimyo',
    'ancient-civilizations':'Qadimgi sivilizatsiyalar','world-history':'Jahon tarixi','uzbek-heritage':'O\'zbek merosi',
  },
  en: {
    'algebra-basics':'Algebra Basics','geometry':'Geometry','statistics':'Statistics',
    'plane-geometry':'Plane Geometry','solid-geometry':'Solid Geometry','coordinate-geometry':'Coordinate Geometry',
    'mechanics':'Mechanics','thermodynamics':'Thermodynamics','electromagnetism':'Electromagnetism',
    'cell-biology':'Cell Biology','genetics':'Genetics','ecology':'Ecology',
    'periodic-table':'Periodic Table','chemical-reactions':'Chemical Reactions','organic-chemistry':'Organic Chemistry',
    'ancient-civilizations':'Ancient Civilizations','world-history':'World History','uzbek-heritage':'Uzbek Heritage',
  },
  ru: {
    'algebra-basics':'Основы алгебры','geometry':'Геометрия','statistics':'Статистика',
    'plane-geometry':'Планиметрия','solid-geometry':'Стереометрия','coordinate-geometry':'Координатная геометрия',
    'mechanics':'Механика','thermodynamics':'Термодинамика','electromagnetism':'Электромагнетизм',
    'cell-biology':'Клеточная биология','genetics':'Генетика','ecology':'Экология',
    'periodic-table':'Периодическая таблица','chemical-reactions':'Химические реакции','organic-chemistry':'Органическая химия',
    'ancient-civilizations':'Древние цивилизации','world-history':'Всемирная история','uzbek-heritage':'Наследие Узбекистана',
  },
}

export const SUBJECT_NAMES: Record<LocaleKey, Record<string, string>> = {
  uz: { math:'Matematika', physics:'Fizika', biology:'Biologiya', chemistry:'Kimyo', history:'Tarix', geometry:'Geometriya' },
  en: { math:'Mathematics', physics:'Physics', biology:'Biology', chemistry:'Chemistry', history:'History', geometry:'Geometry' },
  ru: { math:'Математика', physics:'Физика', biology:'Биология', chemistry:'Химия', history:'История', geometry:'Геометрия' },
}

export const MODULE_NAMES: Record<LocaleKey, Record<ModuleTrack, string>> = {
  uz: {
    foundation: 'Asosiy blok',
    practice: 'Amaliy mustahkamlash',
  },
  en: {
    foundation: 'Foundation Module',
    practice: 'Practice Module',
  },
  ru: {
    foundation: 'Базовый модуль',
    practice: 'Практический модуль',
  },
}

// ─── Status config ────────────────────────────────────────
export const STATUS_COLORS: Record<TopicStatus, string> = {
  completed:  '#2563eb',
  inprogress: '#0f9a6c',
  onhold:     '#d97706',
  locked:     '#7d8aa5',
}

export const OPTION_LABELS = ['A','B','C','D'] as const

// ─── Mock auth credentials ────────────────────────────────
export const MOCK_CREDENTIALS = {
  identifiers: ['user','user@edu.uz'],
  password:    '1234',
}
