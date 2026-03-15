import { 
  BookOpen,
  Calculator, 
  Zap, 
  Dna, 
  Monitor,
  Languages,
} from 'lucide-react'
import type { Subject, LocaleKey, TopicStatus, ModuleTrack, Topic, Question, SubjectModule } from '../types'

// ─── Section type for subject hierarchy ───────────────────
export interface SubjectSection {
  id: string
  type: 'attestation' | 'general' | 'milliy'
  title: string
  topicIds: string[]
  comingSoon?: boolean
}

// ─── Subjects & Topics data (matches kelajakmerosi.uz) ───
const SUBJECT_SEEDS: Array<Omit<Subject, 'modules'> & { sections: SubjectSection[] }> = [
  {
    id: '5',
    icon: <Calculator size={22} strokeWidth={2.35} />,
    color: '#3f68f7',
    gradient: 'linear-gradient(135deg,#315df0,#4f83ff)',
    sections: [
      { id: 'att-5', type: 'attestation', title: 'Attestatsiya', topicIds: ['1', '4'] },
      { id: '7', type: 'general', title: 'Umumiy Matematika', topicIds: ['1', '4'] },
      { id: 'mil-5', type: 'milliy', title: 'Milliy sertifikat', topicIds: [] },
    ],
    topics: [
      {
        id: '1',
        videoId: 'NybHckSEQBI',
        questions: [
          { id:1, text:'2x + 5 = 13 tenglamada x = ?', options:['3','4','5','6'], answer:1 },
          { id:2, text:'3(x - 2) = 9 bo\'lsa x = ?', options:['3','4','5','6'], answer:2 },
          { id:3, text:'x² = 16 bo\'lsa x = ?', options:['2','4','8','16'], answer:1 },
          { id:4, text:'2x - 3 = 7 bo\'lsa x = ?', options:['4','5','6','7'], answer:1 },
          { id:5, text:'5x = 25 bo\'lsa x = ?', options:['3','4','5','6'], answer:2 },
          { id:6, text:'x/4 = 3 bo\'lsa x = ?', options:['8','10','12','14'], answer:2 },
          { id:7, text:'4x + 2 = 18 bo\'lsa x = ?', options:['3','4','5','6'], answer:1 },
          { id:8, text:'x - 7 = 5 bo\'lsa x = ?', options:['10','11','12','13'], answer:2 },
          { id:9, text:'(x+3)(x-3) = ?', options:['x²-9','x²+9','x²-6','x²+6'], answer:0 },
          { id:10, text:'2(x+3) = 14 bo\'lsa x = ?', options:['3','4','5','6'], answer:1 },
        ],
      },
      {
        id: '4',
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
          { id:10, text:'Trapetsiya: asoslar 4 va 6, h=3. Yuzi = ?', options:['12','15','18','21'], answer:1 },
        ],
      },
    ],
  },
  {
    id: '6',
    icon: <Monitor size={22} strokeWidth={2.35} />,
    color: '#0c95d8',
    gradient: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
    sections: [
      { id: 'att-6', type: 'attestation', title: 'Attestatsiya', topicIds: ['5'] },
    ],
    topics: [
      {
        id: '5',
        videoId: 'ZM8ECpBuQYE',
        questions: [
          { id:1, text:'Kompyuterning asosiy vazifalari nimalardan iborat?', options:['Faqat o\'yinlar','Ma\'lumotlarni qayta ishlash','Faqat musiqa tinglash','Faqat rasm chizish'], answer:1 },
          { id:2, text:'Operatsion tizimga misol:', options:['MS Word','Windows','Google','YouTube'], answer:1 },
          { id:3, text:'RAM nima?', options:['Doimiy xotira','Tezkor xotira','Qattiq disk','Protsessor'], answer:1 },
          { id:4, text:'CPU nima?', options:['Xotira','Markaziy protsessor','Monitor','Klaviatura'], answer:1 },
          { id:5, text:'1 KB = ? bayt', options:['100','512','1024','2048'], answer:2 },
          { id:6, text:'Internet brauzeriga misol:', options:['Excel','Chrome','PowerPoint','Photoshop'], answer:1 },
          { id:7, text:'HTML nima uchun ishlatiladi?', options:['Rasm chizish','Veb-sahifa yaratish','Video montaj','Musiqa yozish'], answer:1 },
          { id:8, text:'Algoritm nima?', options:['Dastur tili','Ketma-ket buyruqlar','Kompyuter turi','Xotira turi'], answer:1 },
          { id:9, text:'Qaysi biri dasturlash tili?', options:['HTML','Python','Windows','Chrome'], answer:1 },
          { id:10, text:'Virus nima?', options:['Foydali dastur','Zararli dastur','Operatsion tizim','Brauzer'], answer:1 },
        ],
      },
    ],
  },
  {
    id: '11',
    icon: <Zap size={22} strokeWidth={2.35} />,
    color: '#e67d13',
    gradient: 'linear-gradient(135deg,#f59e0b,#fb923c)',
    sections: [
      { id: 'att-11', type: 'attestation', title: 'Attestatsiya', topicIds: ['6'] },
      { id: '8', type: 'general', title: 'Umumiy Fizika', topicIds: ['6'] },
      { id: 'mil-11', type: 'milliy', title: 'Milliy sertifikat', topicIds: [], comingSoon: true },
    ],
    topics: [
      {
        id: '6',
        videoId: 'v3pYRn5j7oI',
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
          { id:10, text:'Tok kuchi birligi = ?', options:['Vatt','Volt','Amper','Om'], answer:2 },
        ],
      },
    ],
  },
  {
    id: '12',
    icon: <Languages size={22} strokeWidth={2.35} />,
    color: '#10936a',
    gradient: 'linear-gradient(135deg,#10b981,#34d399)',
    sections: [
      { id: 'att-12', type: 'attestation', title: 'Attestatsiya', topicIds: ['7'] },
      { id: '9', type: 'general', title: 'Umumiy grammatika', topicIds: ['7'] },
      { id: 'mil-12', type: 'milliy', title: 'Milliy sertifikat', topicIds: [], comingSoon: true },
    ],
    topics: [
      {
        id: '7',
        videoId: 'URUJD5NEXC8',
        questions: [
          { id:1, text:'Gap bo\'laklari nechta?', options:['3','4','5','6'], answer:2 },
          { id:2, text:'Ega qaysi so\'roqqa javob beradi?', options:['Nima qildi?','Kim? Nima?','Qanday?','Qayerda?'], answer:1 },
          { id:3, text:'Kesim qaysi so\'roqqa javob beradi?', options:['Kim?','Qayerda?','Nima qildi?','Qanday?'], answer:2 },
          { id:4, text:'Antonim nima?', options:['O\'xshash ma\'noli','Qarama-qarshi ma\'noli','Ko\'p ma\'noli','Bir xil so\'z'], answer:1 },
          { id:5, text:'Sinonim nima?', options:['Qarama-qarshi ma\'noli','Yaqin ma\'noli','Ko\'p ma\'noli','Bir xil yozilishi'], answer:1 },
          { id:6, text:'Fe\'l nima?', options:['Ot','Sifat','Harakat bildiruvchi','Belgisi'], answer:2 },
          { id:7, text:'Sifat qanday so\'roqlarga javob beradi?', options:['Kim?','Nima qildi?','Qanday? Qanaqa?','Qayerda?'], answer:2 },
          { id:8, text:'Ravish nima bildiradi?', options:['Predmet','Belgi','Harakat belgisi','Son'], answer:2 },
          { id:9, text:'Undov so\'zlarga misol:', options:['va, bilan, ham','voh, eh, oh','u, bu, men','bir, ikki'], answer:1 },
          { id:10, text:'Qo\'shma gap nechta oddiy gapdan tuziladi?', options:['Bitta','Ikki va undan ko\'p','Faqat uchta','Nol'], answer:1 },
        ],
      },
    ],
  },
  {
    id: '13',
    icon: <Dna size={22} strokeWidth={2.35} />,
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg,#5a48db,#8b78ff)',
    sections: [
      { id: '10', type: 'general', title: 'Umumiy biologiya', topicIds: [] },
      { id: 'mil-13', type: 'milliy', title: 'Milliy sertifikat', topicIds: [], comingSoon: true },
    ],
    topics: [],
  },
  {
    id: '14',
    icon: <BookOpen size={22} strokeWidth={2.35} />,
    color: '#9b6b3d',
    gradient: 'linear-gradient(135deg,#8f5b2c,#bc8452)',
    sections: [],
    topics: [],
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
    '1':'Algebra asoslari','4':'Geometriya',
    '5':'Informatika asoslari',
    '6':'Mexanika',
    '7':'Grammatika asoslari',
  },
  en: {
    '1':'Algebra Basics','4':'Geometry',
    '5':'Computer Science Basics',
    '6':'Mechanics',
    '7':'Grammar Basics',
  },
  ru: {
    '1':'Основы алгебры','4':'Геометрия',
    '5':'Основы информатики',
    '6':'Механика',
    '7':'Основы грамматики',
  },
}

export const SUBJECT_NAMES: Record<LocaleKey, Record<string, string>> = {
  uz: { '5':'Matematika', '6':'Informatika', '11':'Fizika', '12':'Ona tili', '13':'Biologiya', '14':'Adabiyot' },
  en: { '5':'Mathematics', '6':'Computer Science', '11':'Physics', '12':'Native Language', '13':'Biology', '14':'Literature' },
  ru: { '5':'Математика', '6':'Информатика', '11':'Физика', '12':'Родной язык', '13':'Биология', '14':'Литература' },
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
