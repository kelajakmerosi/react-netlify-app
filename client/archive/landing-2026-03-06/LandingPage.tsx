import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks'
import styles from './LandingPage.module.css'

type LangKey = 'uz' | 'en'

type LandingContent = {
  nav: {
    lessons: string
    exams: string
    library: string
    trust: string
  }
  actions: {
    login: string
    openApp: string
    start: string
    browse: string
    learnMore: string
    openLibrary: string
    startExam: string
    subscribe: string
  }
  hero: {
    eyebrow: string
    title: string
    description: string
    stats: Array<{ label: string; value: string }>
  }
  pillars: Array<{ title: string; description: string }>
  categories: {
    title: string
    items: Array<{ title: string; description: string; href: string }>
  }
  learning: {
    eyebrow: string
    title: string
    description: string
    cards: Array<{ title: string; description: string; href: string; meta: string }>
  }
  exams: {
    eyebrow: string
    title: string
    description: string
    cards: Array<{ title: string; description: string; href: string; meta: string }>
  }
  library: {
    eyebrow: string
    title: string
    description: string
    cards: Array<{ title: string; description: string; href: string; meta: string }>
  }
  trust: {
    eyebrow: string
    title: string
    description: string
    points: string[]
  }
  testimonials: {
    eyebrow: string
    title: string
    items: Array<{ name: string; role: string; quote: string }>
  }
  footer: {
    title: string
    description: string
    emailPlaceholder: string
  }
}

const heroImage = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80'
const examImage = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80'
const libraryImage = 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1200&q=80'

const LANDING_COPY: Record<LangKey, LandingContent> = {
  uz: {
    nav: {
      lessons: 'Darslar',
      exams: 'Imtihonlar',
      library: 'Kutubxona',
      trust: 'Nega biz',
    },
    actions: {
      login: 'Kirish',
      openApp: 'Ilovani ochish',
      start: 'Boshlash',
      browse: 'Yo‘nalishlarni ko‘rish',
      learnMore: 'Batafsil',
      openLibrary: 'Kutubxonani ochish',
      startExam: 'Imtihonni boshlash',
      subscribe: 'Obuna bo‘lish',
    },
    hero: {
      eyebrow: 'Kelajak Merosi',
      title: 'O‘qish, imtihon va materiallarni bitta aniq tizimda boshqaring.',
      description:
        'Kelajak Merosi o‘quvchi uchun keyingi qadamni aniq ko‘rsatadi: darsni davom ettirish, attestatsiya imtihoniga tayyorlanish va kerakli materiallarni bir joydan topish.',
      stats: [
        { label: 'Yo‘nalish', value: 'Darslar' },
        { label: 'Natija', value: 'Imtihonlar' },
        { label: 'Resurs', value: 'Kutubxona' },
      ],
    },
    pillars: [
      {
        title: 'Tuzilgan darslar',
        description: 'Fanni bosqichma-bosqich o‘rganing va qayerda to‘xtagan bo‘lsangiz, o‘sha joydan davom eting.',
      },
      {
        title: 'Attestatsiya tayyorgarligi',
        description: 'Vaqtli imtihonlar, o‘tish mezonlari va natijalarni tahlil qilish bilan real tayyorgarlik.',
      },
      {
        title: 'Materiallar kutubxonasi',
        description: 'Sotib olingan to‘plamlar, fayllar va qo‘shimcha o‘quv resurslari bir joyda saqlanadi.',
      },
    ],
    categories: {
      title: 'Platformadagi asosiy bo‘limlar',
      items: [
        { title: 'Darslar', description: 'Fanlar, mavzular va bosqichma-bosqich o‘rganish.', href: '/subjects' },
        { title: 'Imtihonlar', description: 'Attestatsiya va tayyorlov imtihonlari.', href: '/exams' },
        { title: 'Materiallar', description: 'Yuklab olinadigan to‘plamlar va qo‘llanmalar.', href: '/materials' },
        { title: 'Kutubxona', description: 'Siz ochgan va egalik qiladigan materiallar.', href: '/materials/library' },
      ],
    },
    learning: {
      eyebrow: 'Dars jarayoni',
      title: 'O‘quv jarayoni chalg‘itmaydi, keyingi qadamni ko‘rsatadi.',
      description:
        'Dashboard, fanlar va mavzular bir xil vizual tizimda ishlaydi. Shuning uchun kirganingizdan keyin yangi interfeys emas, tanish jarayonni ko‘rasiz.',
      cards: [
        { title: 'Davom etish', description: 'Oxirgi faol mavzudan bir tugma bilan davom eting.', href: '/dashboard', meta: 'Dashboard bilan bog‘langan' },
        { title: 'Fanlar bo‘yicha o‘qish', description: 'Har bir fan bo‘yicha jarayon va tugallanish foizini ko‘ring.', href: '/subjects', meta: 'Tartibli o‘quv oqimi' },
        { title: 'Tavsiya qilingan keyingi qadam', description: 'Platforma keyingi foydali darsni yoki mavzuni taklif qiladi.', href: '/dashboard', meta: 'Progressga asoslangan' },
      ],
    },
    exams: {
      eyebrow: 'Imtihonlar',
      title: 'Imtihonlar sotib olish uchun emas, natija ko‘rish uchun qurilgan.',
      description:
        'Imtihon katalogi, checkout, urinish va natija sahifalari bir-biriga bog‘langan. Foydalanuvchi nimani olishini, qancha vaqt ketishini va keyin nima bo‘lishini darhol tushunadi.',
      cards: [
        { title: 'Attestatsiya demo exam', description: 'Savollar soni, davomiylik va o‘tish foizi bir qarashda ko‘rinadi.', href: '/exams', meta: 'Aniq qaror zonasi' },
        { title: 'To‘lovdan imtihongacha', description: 'Checkout va imtihon boshlanishi bir izchil oqim sifatida ishlaydi.', href: '/exams', meta: 'Chalg‘itmaydigan oqim' },
        { title: 'Natija va qayta urinish', description: 'Foydalanuvchi natija, o‘tgan/o‘tmagan holat va keyingi harakatni ko‘radi.', href: '/exams', meta: 'Yakun aniq ko‘rinadi' },
      ],
    },
    library: {
      eyebrow: 'Materiallar',
      title: 'Kutubxona sotib olingan narsani boshqarish uchun qurilgan.',
      description:
        'Marketing kartasi va fayl boshqaruvi bitta blokda aralashmaydi. Avval to‘plam holati, keyin fayllar va amallar ko‘rsatiladi.',
      cards: [
        { title: 'Material katalogi', description: 'Sotib olish uchun qisqa va tushunarli kartalar.', href: '/materials', meta: 'Bir dominant CTA' },
        { title: 'Ochilgan packlar', description: 'Kutubxonada egalik holati va fayllar ajratilgan holda ko‘rinadi.', href: '/materials/library', meta: 'Egalik holati aniq' },
        { title: 'Resurslar bilan ishlash', description: 'Foydalanuvchi qidiruvsiz kerakli faylni topadi.', href: '/materials/library', meta: 'Amaliy foydalanish' },
      ],
    },
    trust: {
      eyebrow: 'Nega biz',
      title: 'Bir xil uslub, bir xil mantiq, bir xil mahsulot hissi.',
      description:
        'Landing, auth, dashboard, katalog va kutubxona bitta mahsulot sifatida ishlashi kerak. Shu sababli biz bezak emas, ierarxiya va foydalanish tezligini asos qilib oldik.',
      points: [
        'Bitta aksent rang: binafsha. Bu faol holat, CTA va progress uchun ishlatiladi.',
        'Bitta fon tizimi: yumshoq kulrang fon, oq sirtlar, toza matn.',
        'Bitta karta mantiqi: foydalanuvchi har sahifada yangi UI tilini o‘rganmaydi.',
      ],
    },
    testimonials: {
      eyebrow: 'Fikrlar',
      title: 'O‘quvchilar nimani foydali deb biladi',
      items: [
        {
          name: 'Mohh Jumah',
          role: 'Senior Developer',
          quote: 'Kelajak Merosi tarqoq darslar o‘rniga aniq o‘quv yo‘lini berdi. Imtihon oqimi jiddiy va foydali his qilinadi.',
        },
        {
          name: 'John Mark',
          role: 'Data Analyst',
          quote: 'Platforma tinch, tartibli va ishonchli. Har safar keyingi qadamim nima ekanini bilaman.',
        },
      ],
    },
    footer: {
      title: 'Yangilanishlardan xabardor bo‘ling',
      description: 'Yangi imtihonlar, materiallar va platforma yangiliklari haqida birinchi bo‘lib bilib boring.',
      emailPlaceholder: 'Email manzilingiz',
    },
  },
  en: {
    nav: {
      lessons: 'Lessons',
      exams: 'Exams',
      library: 'Library',
      trust: 'Why us',
    },
    actions: {
      login: 'Login',
      openApp: 'Open app',
      start: 'Get started',
      browse: 'Explore tracks',
      learnMore: 'Learn more',
      openLibrary: 'Open library',
      startExam: 'Start exam',
      subscribe: 'Subscribe',
    },
    hero: {
      eyebrow: 'Kelajak Merosi',
      title: 'Lessons, exams, and study materials in one disciplined learning system.',
      description:
        'Kelajak Merosi helps learners continue lessons, prepare for attestation exams, and unlock the right materials without switching between disconnected tools.',
      stats: [
        { label: 'Track', value: 'Lessons' },
        { label: 'Proof', value: 'Exams' },
        { label: 'Resources', value: 'Library' },
      ],
    },
    pillars: [
      {
        title: 'Structured lessons',
        description: 'Study subject by subject and continue exactly where you left off.',
      },
      {
        title: 'Exam readiness',
        description: 'Timed exams, pass thresholds, and practical result review for real preparation.',
      },
      {
        title: 'Material library',
        description: 'Purchased packs, files, and downloadable resources kept in one clear place.',
      },
    ],
    categories: {
      title: 'Core product areas',
      items: [
        { title: 'Lessons', description: 'Subjects, topics, and structured study.', href: '/subjects' },
        { title: 'Exams', description: 'Attestation and preparation exams.', href: '/exams' },
        { title: 'Materials', description: 'Downloadable packs and guides.', href: '/materials' },
        { title: 'Library', description: 'Your unlocked and owned resources.', href: '/materials/library' },
      ],
    },
    learning: {
      eyebrow: 'Learning flow',
      title: 'The product shows the next step instead of adding noise.',
      description:
        'Dashboard, subjects, and topics use the same visual language. After sign-in, users move into a familiar flow instead of learning a different interface.',
      cards: [
        { title: 'Continue learning', description: 'Resume the last useful topic with one clear action.', href: '/dashboard', meta: 'Connected to dashboard' },
        { title: 'Study by subject', description: 'Track completion and momentum across every subject.', href: '/subjects', meta: 'Ordered learning flow' },
        { title: 'Recommended next step', description: 'The app suggests the next practical lesson based on progress.', href: '/dashboard', meta: 'Progress driven' },
      ],
    },
    exams: {
      eyebrow: 'Exams',
      title: 'Exam pages are built for decision clarity, not marketplace clutter.',
      description:
        'Catalog, checkout, attempt, and result pages are connected. Users understand what they get, how long it takes, and what happens next.',
      cards: [
        { title: 'Attestation demo exam', description: 'Question count, duration, and pass threshold are visible immediately.', href: '/exams', meta: 'Clear decision area' },
        { title: 'From payment to attempt', description: 'Checkout flows directly into the start of the exam experience.', href: '/exams', meta: 'One coherent flow' },
        { title: 'Result and retry', description: 'Users see their result, status, and next action without confusion.', href: '/exams', meta: 'Clean completion state' },
      ],
    },
    library: {
      eyebrow: 'Materials',
      title: 'The library is built to use owned resources, not resell them again.',
      description:
        'Store cards and file management do not compete in the same surface. Users first see pack status, then the files and actions they can take.',
      cards: [
        { title: 'Material catalog', description: 'Short, readable cards built for quick purchase decisions.', href: '/materials', meta: 'Single dominant CTA' },
        { title: 'Unlocked packs', description: 'Library views separate ownership state from file browsing.', href: '/materials/library', meta: 'Ownership is obvious' },
        { title: 'Resource access', description: 'Users find the file they need without fighting the layout.', href: '/materials/library', meta: 'Utility first' },
      ],
    },
    trust: {
      eyebrow: 'Why it works',
      title: 'One accent, one background system, one product language.',
      description:
        'Landing, auth, dashboard, catalog, and library should feel like one product. That means hierarchy, consistency, and speed matter more than decoration.',
      points: [
        'One accent color: purple for active states, progress, and primary actions.',
        'One background system: soft mist backgrounds, white surfaces, clear text.',
        'One card logic: users should not relearn the interface on every page.',
      ],
    },
    testimonials: {
      eyebrow: 'Reviews',
      title: 'What learners find useful',
      items: [
        {
          name: 'Mohh Jumah',
          role: 'Senior Developer',
          quote: 'Kelajak Merosi gave me a disciplined learning path instead of scattered lessons. The exam flow feels serious and useful.',
        },
        {
          name: 'John Mark',
          role: 'Data Analyst',
          quote: 'The platform is calm, structured, and easy to trust. I always know what my next step is.',
        },
      ],
    },
    footer: {
      title: 'Stay updated',
      description: 'Get updates about new exams, materials, and platform improvements.',
      emailPlaceholder: 'Your email address',
    },
  },
}

const trackVisuals = [
  { image: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=900&q=80' },
  { image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80' },
  { image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80' },
  { image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80' },
]

const examVisuals = [
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1516321310764-8d32dc84c8fd?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1000&q=80',
]

const libraryVisuals = [
  'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1000&q=80',
]

const revealSelector = '[data-reveal]'

export function LandingPage() {
  const { user, isGuest } = useAuth()
  const { lang } = useLang()
  const copy = LANDING_COPY[(lang === 'uz' || lang === 'en' ? lang : 'en') as LangKey]
  const pillarIcons = [GraduationCap, ClipboardCheck, LibraryBig]
  const categoryIcons = [BookOpen, ClipboardCheck, LibraryBig, FolderOpen]
  const learningIcons = [LayoutDashboard, BookOpen, TrendingUp]
  const examIcons = [ShieldCheck, ClipboardCheck, TrendingUp]
  const libraryIcons = [Sparkles, FolderOpen, LibraryBig]

  const appHref = useMemo(
    () => (path: string, mode: 'login' | 'signup' = 'signup') => (user || isGuest ? path : `/auth?mode=${mode}`),
    [isGuest, user],
  )

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const elements = Array.from(document.querySelectorAll<HTMLElement>(revealSelector))
    if (reduceMotion) {
      elements.forEach((element) => element.classList.add(styles.revealVisible))
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    elements.forEach((element, index) => {
      element.style.setProperty('--reveal-delay', `${Math.min(index * 40, 220)}ms`)
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header} data-reveal>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandMark}>KM</span>
            <span className={styles.brandName}>Kelajak Merosi</span>
          </Link>

          <nav className={styles.nav} aria-label="Landing navigation">
            <a href="#lessons">{copy.nav.lessons}</a>
            <a href="#exams">{copy.nav.exams}</a>
            <a href="#library">{copy.nav.library}</a>
            <a href="#trust">{copy.nav.trust}</a>
          </nav>

          <div className={styles.headerActions}>
            <Link to={appHref('/auth', 'login')} className={styles.textAction}>{copy.actions.login}</Link>
            <Link to={appHref('/dashboard')} className={styles.primaryAction}>{user || isGuest ? copy.actions.openApp : copy.actions.start}</Link>
          </div>
        </header>

        <main className={styles.main}>
          <section className={styles.hero} data-reveal>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
              <h1 className={styles.heroTitle}>{copy.hero.title}</h1>
              <p className={styles.heroDescription}>{copy.hero.description}</p>

              <div className={styles.heroActions}>
                <Link to={appHref('/dashboard')} className={styles.primaryAction}>{copy.actions.start}</Link>
                <Link to={appHref('/subjects')} className={styles.secondaryAction}>{copy.actions.browse}</Link>
              </div>

              <div className={styles.heroStats}>
                {copy.hero.stats.map((item) => (
                  <div key={item.label} className={styles.heroStat}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.heroVisualWrap}>
              <div className={styles.heroVisual}>
                <img src={heroImage} alt="Kelajak Merosi learning environment" className={styles.heroImage} />
              </div>
              <Link to={appHref('/dashboard')} className={styles.floatingCta} aria-label={copy.actions.openApp}>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className={styles.pillars} data-reveal>
            {copy.pillars.map((pillar, index) => {
              const Icon = pillarIcons[index] || BookOpen
              return (
                <article key={pillar.title} className={styles.pillarCard}>
                  <span className={styles.pillarIcon}><Icon size={18} aria-hidden="true" /></span>
                  <h2>{pillar.title}</h2>
                  <p>{pillar.description}</p>
                </article>
              )
            })}
          </section>

          <section id="lessons" className={styles.section} data-reveal>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.sectionEyebrow}>{copy.nav.lessons}</p>
                <h2>{copy.categories.title}</h2>
              </div>
              <p className={styles.sectionIntro}>{copy.learning.description}</p>
            </div>
            <div className={styles.trackGrid}>
              {copy.categories.items.map((item, index) => (
                <Link key={item.title} to={appHref(item.href)} className={styles.trackCard}>
                  <img src={trackVisuals[index]?.image} alt={item.title} className={styles.trackImage} />
                  <div className={styles.trackOverlay}>
                    <span className={styles.trackIcon}>
                      {(() => {
                        const Icon = categoryIcons[index] || BookOpen
                        return <Icon size={16} aria-hidden="true" />
                      })()}
                    </span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.journeySection} data-reveal>
            <div className={styles.journeyIntro}>
              <p className={styles.sectionEyebrow}>{copy.learning.eyebrow}</p>
              <h2>{copy.learning.title}</h2>
              <p>{copy.learning.description}</p>
              <Link to={appHref('/dashboard')} className={styles.primaryAction}>{copy.actions.openApp}</Link>
            </div>
            <div className={styles.journeyRail}>
              <div className={styles.journeySteps}>
                {copy.learning.cards.map((card, index) => {
                  const Icon = learningIcons[index] || BookOpen
                  return (
                    <Link key={card.title} to={appHref(card.href)} className={styles.journeyStep}>
                      <span className={styles.journeyStepIcon}><Icon size={18} aria-hidden="true" /></span>
                      <div className={styles.journeyStepBody}>
                        <div className={styles.journeyStepMeta}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <strong>{card.meta}</strong>
                        </div>
                        <h3>{card.title}</h3>
                        <p>{card.description}</p>
                      </div>
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  )
                })}
              </div>

              <div className={styles.journeyPreview}>
                <p className={styles.previewEyebrow}>Dashboard</p>
                <strong>{copy.learning.cards[0]?.title}</strong>
                <p>{copy.learning.cards[0]?.description}</p>
                <div className={styles.previewStats}>
                  {copy.hero.stats.map((item) => (
                    <div key={item.label} className={styles.previewStat}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="exams" className={styles.splitSection} data-reveal>
            <div className={styles.splitCopy}>
              <p className={styles.sectionEyebrow}>{copy.exams.eyebrow}</p>
              <h2>{copy.exams.title}</h2>
              <p>{copy.exams.description}</p>
              <Link to={appHref('/exams')} className={styles.primaryAction}>{copy.actions.startExam}</Link>
            </div>
            <div className={styles.splitVisual}>
              <img src={examImage} alt={copy.exams.title} className={styles.splitImage} />
              <div className={styles.floatingBadge}>
                <ShieldCheck size={18} aria-hidden="true" />
                <div>
                  <strong>80%</strong>
                  <span>Pass threshold flow</span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.editorialSection} data-reveal>
            <div className={styles.editorialVisual}>
              <img src={examVisuals[1]} alt={copy.exams.title} className={styles.editorialImage} />
            </div>
            <div className={styles.editorialCopy}>
              <p className={styles.sectionEyebrow}>{copy.exams.eyebrow}</p>
              <h2>{copy.exams.title}</h2>
              <p>{copy.exams.description}</p>
              <div className={styles.detailList}>
                {copy.exams.cards.map((card, index) => {
                  const Icon = examIcons[index] || ShieldCheck
                  return (
                    <Link key={card.title} to={appHref(card.href)} className={styles.detailItem}>
                      <span className={styles.detailIcon}><Icon size={18} aria-hidden="true" /></span>
                      <div className={styles.detailBody}>
                        <strong>{card.title}</strong>
                        <span>{card.meta}</span>
                        <p>{card.description}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>

          <section id="library" className={styles.splitSection} data-reveal>
            <div className={styles.splitVisual}>
              <img src={libraryImage} alt={copy.library.title} className={styles.splitImage} />
              <div className={styles.floatingBadge}>
                <Sparkles size={18} aria-hidden="true" />
                <div>
                  <strong>Library</strong>
                  <span>Owned resources, clearly arranged</span>
                </div>
              </div>
            </div>
            <div className={styles.splitCopy}>
              <p className={styles.sectionEyebrow}>{copy.library.eyebrow}</p>
              <h2>{copy.library.title}</h2>
              <p>{copy.library.description}</p>
              <Link to={appHref('/materials/library')} className={styles.secondaryAction}>{copy.actions.openLibrary}</Link>
            </div>
          </section>

          <section className={styles.resourceSection} data-reveal>
            <div className={styles.resourceSummary}>
              <p className={styles.sectionEyebrow}>{copy.library.eyebrow}</p>
              <h2>{copy.library.title}</h2>
              <p>{copy.library.description}</p>
              <div className={styles.resourceMock}>
                <img src={libraryVisuals[0]} alt={copy.library.cards[0]?.title} className={styles.resourceMockImage} />
                <div className={styles.resourceMockBody}>
                  <strong>{copy.library.cards[0]?.title}</strong>
                  <span>{copy.library.cards[0]?.meta}</span>
                </div>
              </div>
            </div>
            <div className={styles.resourceList}>
              {copy.library.cards.map((card, index) => {
                const Icon = libraryIcons[index] || Sparkles
                return (
                  <Link key={card.title} to={appHref(card.href)} className={styles.resourceItem}>
                    <span className={styles.resourceIcon}><Icon size={18} aria-hidden="true" /></span>
                    <div className={styles.resourceBody}>
                      <strong>{card.title}</strong>
                      <span>{card.meta}</span>
                      <p>{card.description}</p>
                    </div>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          </section>

          <section id="trust" className={styles.trustSection} data-reveal>
            <div className={styles.trustCopy}>
              <p className={styles.sectionEyebrow}>{copy.trust.eyebrow}</p>
              <h2>{copy.trust.title}</h2>
              <p>{copy.trust.description}</p>
            </div>
            <div className={styles.trustList}>
              {copy.trust.points.map((point, index) => (
                <div key={point} className={styles.trustPoint}>
                  <span className={styles.trustBullet} aria-hidden="true">
                    {index === 0 ? <Star size={14} aria-hidden="true" /> : index === 1 ? <ShieldCheck size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
                  </span>
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.testimonialSection} data-reveal>
            <div className={styles.testimonialLead}>
              <p className={styles.sectionEyebrow}>{copy.testimonials.eyebrow}</p>
              <h2>{copy.testimonials.title}</h2>
              <p>{copy.trust.description}</p>
            </div>
            <div className={styles.testimonialGrid}>
              {copy.testimonials.items.map((item) => (
                <article key={item.name} className={styles.testimonialCard}>
                  <div className={styles.testimonialHead}>
                    <div className={styles.avatar}><Quote size={18} aria-hidden="true" /></div>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.role}</span>
                    </div>
                  </div>
                  <p>{item.quote}</p>
                </article>
              ))}
            </div>
          </section>
        </main>

        <footer className={styles.footer} data-reveal>
          <div className={styles.footerCopy}>
            <h2>{copy.footer.title}</h2>
            <p>{copy.footer.description}</p>
          </div>
          <form className={styles.footerForm}>
            <input type="email" placeholder={copy.footer.emailPlaceholder} aria-label={copy.footer.emailPlaceholder} />
            <button type="button">{copy.actions.subscribe}</button>
          </form>
        </footer>
      </div>
    </div>
  )
}

export default LandingPage
