import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import s from './LandingPage.module.css'
import { ThemeToggle } from '../components/ui/ThemeToggle'

const IMG = '/landing-elearning/img'

/* ── Carousel auto-play ──────────────────────────────────── */
function useAutoSlide(total: number, interval = 10_000) {
  const [idx, setIdx] = useState(0)
  const timer = useRef(0)

  const reset = useCallback(() => {
    clearInterval(timer.current)
    timer.current = window.setInterval(() => setIdx((i) => (i + 1) % total), interval)
  }, [total, interval])

  useEffect(() => {
    reset()
    return () => clearInterval(timer.current)
  }, [reset])

  const go = useCallback(
    (next: number) => {
      setIdx(((next % total) + total) % total)
      reset()
    },
    [total, reset],
  )
  return { idx, go }
}

/* ── Anonymous user SVG placeholder (task 3) ─────────────── */
const ANON_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23d5d3e8'/%3E%3Ccircle cx='60' cy='44' r='22' fill='%236a5cf2'/%3E%3Cellipse cx='60' cy='104' rx='36' ry='30' fill='%236a5cf2'/%3E%3C/svg%3E"

/* ── Landing Page Component ──────────────────────────────── */
export function LandingPage() {
  const navigate = useNavigate()
  const hero = useAutoSlide(2, 12_000)
  const testimonial = useAutoSlide(4, 8_000)
  const [showTop, setShowTop] = useState(false)
  const heroStyle = { borderRadius: '0 0 18px 18px', overflow: 'hidden' } as const

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={s.page}>
      {/* ─── Navbar ─── */}
      <nav className={s.navbar}>
        <a href="#home" className={s.brand}>
          <i className="fa fa-book" /> Kelajak Merosi
        </a>
        <input type="checkbox" id="nav-toggle" className={s.navToggle} />
        <label htmlFor="nav-toggle" className={s.navBurger} aria-label="Menyuni ochish">
          <span /><span /><span />
        </label>
        <div className={s.navLinks}>
          <a href="#home">Bosh sahifa</a>
          <a href="#about">Biz haqimizda</a>
          <a href="#courses">Yo'nalishlar</a>
          <a href="#team">Ustozlar</a>
          <a href="#testimonials">Fikrlar</a>
          <a href="#contact">Aloqa</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ThemeToggle />
          <button className={s.cta} onClick={() => navigate('/auth?mode=signup')}>
            Boshlash <i className="fa fa-arrow-right" />
          </button>
        </div>
      </nav>

      {/* ─── Hero Carousel (task 1: top border-radius 0) ─── */}
      <section id="home" className={s.hero} style={heroStyle}>
        {[1, 2].map((n) => (
          <div key={n} className={`${s.heroSlide} ${s[`heroSlide${n}`]} ${hero.idx === n - 1 ? s.heroSlideActive : ''}`}>
            <img
              className={s.heroImage}
              src={`${IMG}/${n === 1 ? 'carousel-2.jpg' : 'carousel-1.jpg'}`}
              alt={n === 1 ? 'Kelajak Merosi platformasi' : "O'zbekcha o'quv tajribasi"}
              loading={n === 1 ? 'eager' : 'lazy'}
              fetchPriority={n === 1 ? 'high' : 'auto'}
            />
            <div className={s.heroOverlay}>
              <div className={s.heroInner}>
                <div className={s.heroContent}>
                  {n === 1 ? (
                    <>
                      <h6>Tartibli ta'lim platformasi</h6>
                      <h1>Dars, imtihon va materiallarni bitta oqimda boshqaring</h1>
                      <p>Kelajak Merosi foydalanuvchiga keyingi qadamni aniq ko'rsatadi: darsni davom ettirish, attestatsiya imtihonini topshirish va kerakli materiallarni kutubxonadan topish.</p>
                      <div className={s.heroBtns}>
                        <a href="#about" className={s.btnPrimary}>Batafsil</a>
                        <button className={s.btnLight} onClick={() => navigate('/auth?mode=signup')}>Ro'yxatdan o'tish</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h6>O'zbekcha o'quv tajribasi</h6>
                      <h1>Natija ko'rinadigan o'qish tizimi</h1>
                      <p>Dashboard, fanlar, imtihon katalogi va materiallar kutubxonasi bir xil mantiqda ishlaydi. Foydalanuvchi har sahifada yangi interfeysni o'rganishga majbur bo'lmaydi.</p>
                      <div className={s.heroBtns}>
                        <button className={s.btnPrimary} onClick={() => navigate('/dashboard')}>Ilovani ochish</button>
                        <a href="#courses" className={s.btnLight}>Bo'limlarni ko'rish</a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <button className={`${s.heroArrow} ${s.heroArrowPrev}`} aria-label="Oldingi" onClick={() => hero.go(hero.idx - 1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6 9 12l6 6" />
          </svg>
        </button>
        <button className={`${s.heroArrow} ${s.heroArrowNext}`} aria-label="Keyingi" onClick={() => hero.go(hero.idx + 1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </section>

      {/* ─── Service cards ─── */}
      <section className={s.section}>
        <div className={s.container}>
          <div className={s.serviceGrid}>
            {[
              { icon: 'fa-book-open', title: 'Darslar', desc: "Fanlar, mavzular va progress bilan bosqichma-bosqich o'qish jarayoni.", to: '/subjects' },
              { icon: 'fa-graduation-cap', title: 'Imtihonlar', desc: 'Attestatsiya va tayyorlov imtihonlari aniq mezonlar bilan.', to: '/exams' },
            ].map((s2) => (
              <div key={s2.title} className={s.serviceCard} onClick={() => navigate(s2.to)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(s2.to)}>
                <i className={`fa fa-3x ${s2.icon}`} />
                <h5>{s2.title}</h5>
                <p>{s2.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About (task 2: proper layout) ─── */}
      <section id="about" className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h6 className={s.sectionLabel}>Biz haqimizda</h6>
            <h2>Kelajak Merosi'ga xush kelibsiz</h2>
          </div>
          <div className={s.aboutGrid}>
            <div className={s.aboutImg}>
              <img src={`${IMG}/about.jpg`} alt="Kelajak Merosi haqida" loading="lazy" />
            </div>
            <div className={s.aboutText}>
              <p>Kelajak Merosi - bu darslar, attestatsiya imtihonlari va materiallar kutubxonasini birlashtirgan tartibli o'quv platformasi. Biz dekor emas, tushunarlilik va natijaga yo'naltirilgan tajribani ustun qo'yamiz.</p>
              <p>Foydalanuvchi kirgan zahoti nimani o'qishi, nimani sotib olishi yoki qaysi imtihonni boshlashi kerakligini aniq tushunishi kerak. Shu sababli barcha sahifalar bir xil mantiqda ishlaydi.</p>
              <div className={s.aboutFeatures}>
                {[
                  'Progressga asoslangan dashboard',
                  'Uzbek tilidagi foydalanuvchi oqimi',
                  'Vaqtli attestatsiya imtihonlari',
                  'Material pack va kutubxona',
                  "Qayta urinish va natija ko'rinishi",
                  'Bitta mahsulot, bitta mantiq',
                ].map((f) => (
                  <span key={f}><i className="fa fa-arrow-right" /> {f}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Yo'nalishlar ─── */}
      <section id="courses" className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h6 className={s.sectionLabel}>Yo'nalishlar</h6>
            <h2>Platforma bo'limlari</h2>
          </div>
          <div className={s.catGrid}>
            <div className={s.catMain}>
              <div className={s.catRow}>
                <a className={s.catCard} href="/subjects" onClick={(e) => { e.preventDefault(); navigate('/subjects') }}>
                  <img src={`${IMG}/cat-1.jpg`} alt="Darslar" loading="lazy" />
                  <span className={s.catBadge}><strong>Darslar</strong><small>Fanlar va mavzular</small></span>
                </a>
              </div>
              <div className={s.catRow2}>
                <a className={s.catCard} href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard') }}>
                  <img src={`${IMG}/cat-3.jpg`} alt="Dashboard" loading="lazy" />
                  <span className={s.catBadge}><strong>Dashboard</strong><small>Davom etish va tavsiyalar</small></span>
                </a>
              </div>
            </div>
            <a className={s.catSide} href="/auth?mode=signup" onClick={(e) => { e.preventDefault(); navigate('/auth?mode=signup') }}>
              <img src={`${IMG}/cat-4.jpg`} alt="Ro'yxatdan o'tish" loading="lazy" />
              <span className={s.catBadge}><strong>Ro'yxatdan o'tish</strong><small>Platformaga tez kirish</small></span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── Ommabop oqimlar (task 4: consistent cards) ─── */}
      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h6 className={s.sectionLabel}>Ommabop oqimlar</h6>
            <h2>Platformadagi asosiy foydalanuvchi yo'llari</h2>
          </div>
          <div className={s.courseGrid}>
            {[
              {
                img: 'course-1.jpg',
                title: "Dashboard'dan davom etish",
                desc: "Oxirgi mavzudan davom etish va keyingi tavsiyani ko'rish",
                tags: [['fa-chart-line', 'Progress'], ['fa-clock', 'Faoliyat']],
                link: '/dashboard',
                linkLabel: 'Ochish',
              },
              {
                img: 'java.jpg',
                title: 'Attestatsiya imtihoni',
                desc: "Savollar soni, davomiylik va o'tish foizi bir qarashda",
                tags: [['fa-stopwatch', 'Vaqtli'], ['fa-percent', "80% me'yor"]],
                link: '/exams',
                linkLabel: "Ko'rish",
              },
              {
                img: 'course-3.jpg',
                title: 'Fanlar katalogi',
                desc: "Barcha fanlar, progress va keyingi darslar bir oqimda ko'rinadi",
                tags: [['fa-book-open', 'Fanlar'], ['fa-chart-line', 'Progress']],
                link: '/subjects',
                linkLabel: 'Ochish',
              },
            ].map((c) => (
              <div key={c.title} className={s.courseCard}>
                <div className={s.courseImg}>
                  <img src={`${IMG}/${c.img}`} alt={c.title} loading="lazy" />
                </div>
                <div className={s.courseBody}>
                  <h4>{c.title}</h4>
                  <p>{c.desc}</p>
                </div>
                <div className={s.courseFoot}>
                  {c.tags.map(([icon, label]) => (
                    <span key={label}><i className={`fa ${icon}`} /> {label}</span>
                  ))}
                  <span className={s.courseLink} onClick={() => navigate(c.link)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(c.link)}>
                    <i className="fa fa-arrow-right" /> {c.linkLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Ustozlar (task 3: anonymous avatars) ─── */}
      <section id="team" className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h6 className={s.sectionLabel}>Ustozlar</h6>
            <h2>Ekspert mentorlar</h2>
          </div>
          <div className={s.teamGrid}>
            {[
              { name: 'Shahzod Karimov', role: 'Matematika va attestatsiya' },
              { name: 'Madina Ismoilova', role: 'Dasturlash va amaliy loyiha' },
              { name: 'Bekzod Yoqubov', role: 'Analitika va yechim tahlili' },
              { name: 'Dilnoza Xasanova', role: 'Materiallar va metodika' },
            ].map((t) => (
              <div key={t.name} className={s.teamCard}>
                <div className={s.teamAvatar}>
                  <img src={ANON_AVATAR} alt={t.name} />
                </div>
                <div className={s.teamInfo}>
                  <h5>{t.name}</h5>
                  <small>{t.role}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Fikrlar ─── */}
      <section id="testimonials" className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h6 className={s.sectionLabel}>Fikrlar</h6>
            <h2>O'quvchilar nima deydi?</h2>
          </div>
          <div className={s.testimonialWrap}>
            {[
              { name: 'Selena', role: 'Talaba', text: "Platforma menga qaysi darsdan davom etishni o'ylab o'tirmasdan darhol ish boshlash imkonini berdi." },
              { name: 'Cris Levon', role: 'Talaba', text: "Imtihon sahifalarida ortiqcha bezak yo'q. Savollar soni, vaqt va keyingi harakat darhol tushunarli." },
              { name: 'Magnus Carlson', role: 'Talaba', text: 'Materiallar kutubxonasida pack va fayllar ajratilgani sabab kerakli resursni tez topaman.' },
              { name: 'Nyra Carl', role: 'Talaba', text: "Bitta tizim ichida dars, imtihon va materiallar ishlagani uchun mahsulot ishonchli ko'rinadi." },
            ].map((t, i) => (
              <div key={t.name} className={`${s.testimonialItem} ${testimonial.idx === i ? s.testimonialActive : ''}`}>
                <img src={ANON_AVATAR} alt={t.name} loading="lazy" />
                <h5>{t.name}</h5>
                <span>{t.role}</span>
                <div className={s.testimonialText}>
                  <p>{t.text}</p>
                </div>
              </div>
            ))}
            <div className={s.testimonialDots}>
              {[0, 1, 2, 3].map((i) => (
                <button key={i} className={testimonial.idx === i ? s.dotActive : ''} onClick={() => testimonial.go(i)} aria-label={`${i + 1}-fikr`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer (task 5: no trailing blank space) ─── */}
      <footer id="contact" className={s.footer}>
        <div className={s.container}>
          <div className={s.footerGrid}>
            <div>
              <h4>Tezkor havolalar</h4>
              <a href="#about">Biz haqimizda</a>
              <a href="#courses">Yo'nalishlar</a>
              <span className={s.footerLink} onClick={() => navigate('/auth?mode=signup')} role="link" tabIndex={0}>Ro'yxatdan o'tish</span>
              <span className={s.footerLink} onClick={() => navigate('/dashboard')} role="link" tabIndex={0}>Dashboard</span>
            </div>
            <div>
              <h4>Aloqa</h4>
              <p><i className="fa fa-map-marker-alt" /> Toshkent, O'zbekiston</p>
              <p><i className="fa fa-phone-alt" /> +998 90 000 00 00</p>
              <p><i className="fa fa-envelope" /> support@kelajakmerosi.uz</p>
              <div className={s.socials}>
                <a href="#home" aria-label="Telegram"><i className="fab fa-telegram-plane" /></a>
                <a href="#home" aria-label="Instagram"><i className="fab fa-instagram" /></a>
                <a href="#home" aria-label="YouTube"><i className="fab fa-youtube" /></a>
                <a href="#home" aria-label="LinkedIn"><i className="fab fa-linkedin-in" /></a>
              </div>
            </div>
            <div>
              <h4>Galereya</h4>
              <div className={s.gallery}>
                {['course-1.jpg', 'course-2.jpg', 'course-3.jpg', 'cat-2.jpg', 'cat-3.jpg', 'about.jpg'].map((f) => (
                  <img key={f} src={`${IMG}/${f}`} alt="Galereya" loading="lazy" />
                ))}
              </div>
            </div>
            <div>
              <h4>Yangiliklar</h4>
              <p>Yangi imtihonlar, material packlar va platforma yangilanishlari haqida xabardor bo'ling.</p>
            </div>
          </div>
        </div>
        <div className={s.copyright}>
          <div className={s.container}>
            <span>© Kelajak Merosi, barcha huquqlar himoyalangan.</span>
            <span className={s.footerMenu}>
              <a href="#home">Bosh sahifa</a>
              <a href="#about">Biz haqimizda</a>
              <a href="#testimonials">Fikrlar</a>
              <a href="#contact">Aloqa</a>
            </span>
          </div>
        </div>
      </footer>

      {/* ─── Back to top ─── */}
      {showTop && (
        <button className={s.backToTop} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Yuqoriga qaytish">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
        </button>
      )}
    </div>
  )
}

export default LandingPage
