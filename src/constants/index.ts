import type { Subject, LocaleKey, TopicStatus } from '../types'

// ─── Subjects & Topics data ───────────────────────────────
export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    icon: '∑',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
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
        ],
      },
      {
        id: 'geometry',
        videoId: 'WqzK3UAXaHs',
        questions: [
          { id:1, text:'To\'g\'ri burchakli uchburchakda katetlar 3 va 4. Gipotenuza = ?', options:['5','6','7','8'], answer:0 },
          { id:2, text:'Doira yuzi π·r², r=5 bo\'lsa = ?', options:['25π','10π','5π','50π'], answer:0 },
          { id:3, text:'Kvadrat perimetri 20. Tomoni = ?', options:['4','5','6','8'], answer:1 },
          { id:4, text:'Uchburchak burchaklari yig\'indisi = ?', options:['90°','180°','270°','360°'], answer:1 },
          { id:5, text:'To\'g\'ri to\'rtburchak 6×4. Yuzi = ?', options:['20','24','28','32'], answer:1 },
          { id:6, text:'Doira diametri 10. Radiusi = ?', options:['3','4','5','6'], answer:2 },
          { id:7, text:'Kub qirrasi 3. Hajmi = ?', options:['9','18','27','36'], answer:2 },
          { id:8, text:'Parallelogramm: asos=8, h=5. Yuzi = ?', options:['35','40','45','50'], answer:1 },
          { id:9, text:'Teng yonli uchburchak: tomon=6. Perimetri = ?', options:['12','15','18','21'], answer:2 },
          { id:10,text:'Trapetsiya: asoslar 4 va 6, h=3. Yuzi = ?', options:['12','15','18','21'], answer:1 },
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
    icon: '⚛',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg,#06b6d4,#0ea5e9)',
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
    icon: '🧬',
    color: '#10b981',
    gradient: 'linear-gradient(135deg,#10b981,#059669)',
    topics: [
      {
        id: 'cell-biology',
        videoId: 'URUJD5NEXC8',
        questions: [
          { id:1, text:'Hujayra "energiya stantsiyasi" qaysi organoid?', options:['Yadro','Mitoxondriya','Ribosoma','Lizosoma'], answer:1 },
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
    icon: '⚗',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
    topics: [
      {
        id: 'periodic-table',
        videoId: '0RRVV4Diomg',
        questions: [
          { id:1, text:'Vodorodning atom raqami = ?', options:['0','1','2','3'], answer:1 },
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
]

// ─── Topic & Subject name maps ────────────────────────────
export const TOPIC_NAMES: Record<LocaleKey, Record<string, string>> = {
  uz: {
    'algebra-basics':'Algebra asoslari','geometry':'Geometriya','statistics':'Statistika',
    'mechanics':'Mexanika','thermodynamics':'Termodinamika','electromagnetism':'Elektromagnitizm',
    'cell-biology':'Hujayra biologiyasi','genetics':'Genetika','ecology':'Ekologiya',
    'periodic-table':'Davriy jadval','chemical-reactions':'Kimyoviy reaksiyalar','organic-chemistry':'Organik kimyo',
  },
  en: {
    'algebra-basics':'Algebra Basics','geometry':'Geometry','statistics':'Statistics',
    'mechanics':'Mechanics','thermodynamics':'Thermodynamics','electromagnetism':'Electromagnetism',
    'cell-biology':'Cell Biology','genetics':'Genetics','ecology':'Ecology',
    'periodic-table':'Periodic Table','chemical-reactions':'Chemical Reactions','organic-chemistry':'Organic Chemistry',
  },
  ru: {
    'algebra-basics':'Основы алгебры','geometry':'Геометрия','statistics':'Статистика',
    'mechanics':'Механика','thermodynamics':'Термодинамика','electromagnetism':'Электромагнетизм',
    'cell-biology':'Клеточная биология','genetics':'Генетика','ecology':'Экология',
    'periodic-table':'Периодическая таблица','chemical-reactions':'Химические реакции','organic-chemistry':'Органическая химия',
  },
}

export const SUBJECT_NAMES: Record<LocaleKey, Record<string, string>> = {
  uz: { math:'Matematika', physics:'Fizika', biology:'Biologiya', chemistry:'Kimyo' },
  en: { math:'Mathematics', physics:'Physics', biology:'Biology', chemistry:'Chemistry' },
  ru: { math:'Математика', physics:'Физика', biology:'Биология', chemistry:'Химия' },
}

// ─── Status config ────────────────────────────────────────
export const STATUS_COLORS: Record<TopicStatus, string> = {
  completed:  '#6366f1',
  inprogress: '#10b981',
  onhold:     '#f59e0b',
  locked:     '#8892b0',
}

export const OPTION_LABELS = ['A','B','C','D'] as const

// ─── Mock auth credentials ────────────────────────────────
export const MOCK_CREDENTIALS = {
  identifiers: ['user','user@edu.uz'],
  password:    '1234',
}
