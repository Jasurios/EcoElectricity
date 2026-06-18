import { TYPE_CFG } from './constants.js'
import styles from './Stats.module.css'

const T2 = {
  en: {
    title: 'Power Plant Statistics',
    plants: 'Power plants', capacity: 'Total capacity', countries: 'Countries', largest: 'Largest plant',
    byType: 'Capacity by type', topCountries: 'Top countries by capacity',
  },
  ru: {
    title: 'Статистика по странам',
    plants: 'Электростанций', capacity: 'Суммарная мощность', countries: 'Стран', largest: 'Крупнейшая станция',
    byType: 'Мощность по типам', topCountries: 'Топ стран по мощности',
  },
}

function groupByType(plants) {
  const map = new Map()
  for (const p of plants) {
    const cur = map.get(p.type) ?? { type: p.type, capacity: 0, count: 0 }
    cur.capacity += p.capacity
    cur.count += 1
    map.set(p.type, cur)
  }
  return [...map.values()].sort((a, b) => b.capacity - a.capacity)
}

function groupByCountry(plants, lang) {
  const map = new Map()
  for (const p of plants) {
    const enNames = p.country.split('/').map(s => s.trim())
    const ruNames = (p.countryRu || p.country).split('/').map(s => s.trim())
    enNames.forEach((enName, i) => {
      const cur = map.get(enName) ?? { key: enName, label: enName, capacity: 0, count: 0 }
      cur.capacity += p.capacity
      cur.count += 1
      cur.label = lang === 'ru' ? (ruNames[i] || enName) : enName
      map.set(enName, cur)
    })
  }
  return [...map.values()].sort((a, b) => b.capacity - a.capacity)
}

function donutSegments(typeData, totalCapacity, radius = 42) {
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return typeData.map(t => {
    const pct = totalCapacity ? t.capacity / totalCapacity : 0
    const length = pct * circumference
    const seg = { ...t, pct, dasharray: `${length} ${circumference - length}`, dashoffset: -offset }
    offset += length
    return seg
  })
}

export default function StatsPanel({ plants, lang, onClose }) {
  const tr = T2[lang]
  const typeData = groupByType(plants)
  const countryData = groupByCountry(plants, lang)
  const totalCapacity = plants.reduce((sum, p) => sum + p.capacity, 0)
  const totalGW = (totalCapacity / 1000).toFixed(1)
  const largest = plants.reduce((max, p) => (!max || p.capacity > max.capacity ? p : max), null)
  const largestName = largest ? (lang === 'ru' ? largest.nameRu : largest.name) : ''
  const segments = donutSegments(typeData, totalCapacity)
  const topCountries = countryData.slice(0, 9)
  const maxCountryCapacity = topCountries[0]?.capacity ?? 1

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>✕</button>

        <h2 className={styles.title}>{tr.title}</h2>

        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{plants.length}</span>
            <span className={styles.statLabel}>{tr.plants}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{totalGW}<span className={styles.statUnit}> GW</span></span>
            <span className={styles.statLabel}>{tr.capacity}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{countryData.length}</span>
            <span className={styles.statLabel}>{tr.countries}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAccent}`}>
            <span className={styles.statNumSmall}>{largestName}</span>
            <span className={styles.statLabel}>{tr.largest} · {largest?.capacity.toLocaleString()} MW</span>
          </div>
        </div>

        <div className={styles.columns}>
          <div className={styles.col}>
            <h3 className={styles.colTitle}>{tr.byType}</h3>
            <div className={styles.donutWrap}>
              <svg viewBox="0 0 100 100" width="180" height="180">
                <g transform="translate(50,50) rotate(-90)">
                  {segments.map(s => (
                    <circle key={s.type} r="42" cx="0" cy="0" fill="none"
                      stroke={(TYPE_CFG[s.type] ?? TYPE_CFG.hydro).color} strokeWidth="14"
                      strokeDasharray={s.dasharray} strokeDashoffset={s.dashoffset} />
                  ))}
                </g>
              </svg>
              <div className={styles.donutCenter}>
                <span className={styles.donutNum}>{totalGW}</span>
                <span className={styles.donutUnit}>GW</span>
              </div>
            </div>
            <div className={styles.legend}>
              {typeData.map(t => {
                const cfg = TYPE_CFG[t.type] ?? TYPE_CFG.hydro
                const pct = totalCapacity ? Math.round((t.capacity / totalCapacity) * 100) : 0
                return (
                  <div className={styles.legendRow} key={t.type}>
                    <span className={styles.legendDot} style={{ background: cfg.color }} />
                    <span className={styles.legendLabel}>{cfg[lang]}</span>
                    <span className={styles.legendPct}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className={styles.col}>
            <h3 className={styles.colTitle}>{tr.topCountries}</h3>
            <div className={styles.bars}>
              {topCountries.map(c => (
                <div className={styles.barRow} key={c.key}>
                  <span className={styles.barLabel}>{c.label}</span>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(c.capacity / maxCountryCapacity) * 100}%` }} />
                  </div>
                  <span className={styles.barValue}>{(c.capacity / 1000).toFixed(1)} GW</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
