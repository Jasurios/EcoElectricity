import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import styles from './Dashboard.module.css'
import { TYPE_CFG } from './constants.js'
import StatsPanel from './StatsPanel.jsx'

const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const AWS_TERRAIN    = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const PLANTS_URL     = '/power-plants.json'

const ICONS = {
  hydro: `<path d="M12 2C9 6 5 11 5 15a7 7 0 0014 0C19 11 15 6 12 2z" fill="white"/>`,
  nuclear: `<circle cx="12" cy="12" r="2.5" fill="white"/>
    <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="white" stroke-width="1.8" fill="none"/>
    <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="white" stroke-width="1.8" fill="none" transform="rotate(60 12 12)"/>
    <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="white" stroke-width="1.8" fill="none" transform="rotate(120 12 12)"/>`,
  coal: `<rect x="8" y="12" width="3.5" height="8" rx="1" fill="white"/>
    <rect x="12.5" y="14" width="3" height="6" rx="1" fill="white"/>
    <line x1="7" y1="20" x2="17" y2="20" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <path d="M9 12c.5-3.5 1.2-6 1.8-9" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M13 14c.4-3 .9-5 1.3-7.5" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  gas: `<path d="M12 2c-4 6-5 9-5 12a5 5 0 0010 0C17 11 16 8 12 2z" fill="white"/>
    <ellipse cx="12" cy="16" rx="2" ry="1.5" fill="rgba(255,255,255,0.4)"/>`,
  solar: `<circle cx="12" cy="12" r="3.5" fill="white"/>
    <line x1="12" y1="2" x2="12" y2="5.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="12" y1="18.5" x2="12" y2="22" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="2" y1="12" x2="5.5" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="18.5" y1="12" x2="22" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="5.6" y1="5.6" x2="7.8" y2="7.8" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="16.2" y1="16.2" x2="18.4" y2="18.4" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="5.6" y1="18.4" x2="7.8" y2="16.2" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="16.2" y1="7.8" x2="18.4" y2="5.6" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
  wind: `<circle cx="12" cy="13.5" r="2" fill="white"/>
    <path d="M12 11.5C11 8.5 7.5 5 3.5 4.5c2 3.5 5.5 6 8.5 7z" fill="white"/>
    <path d="M13 11.5C15.5 9 20.5 8.5 21.5 5c-3.5 1-7 4.5-8.5 6.5z" fill="white"/>
    <path d="M12 15.5C12.5 18.5 15 22 18.5 23.5c-1.5-3.5-4-6-6.5-8z" fill="white"/>
    <rect x="11" y="15.5" width="2" height="6" rx="1" fill="white"/>`,
}

const T = {
  en: {
    search: 'Search power plants...',
    capacity: 'Installed capacity', annual: 'Annual output',
    country: 'Country', river: 'River', built: 'Built', units: 'Units',
    active: 'Operational', construction: 'Under construction', decommissioned: 'Decommissioned',
    pollutionNote: '⚠️ Pollution zone shown on map',
    nuclearNote: '☢️ Exclusion zone shown on map',
    windNote: '🔊 Noise pollution zone shown on map',
    loading: 'Loading power plant database...',
    show: 'Show on map', stopShow: 'Stop',
    noResults: 'No power plants found',
  },
  ru: {
    search: 'Поиск электростанций...',
    capacity: 'Установленная мощность', annual: 'Выработка в год',
    country: 'Страна', river: 'Река', built: 'Год', units: 'Агрегаты',
    active: 'Действующая', construction: 'Строится', decommissioned: 'Выведена из эксплуатации',
    pollutionNote: '⚠️ Зона загрязнения на карте',
    nuclearNote: '☢️ Зона отчуждения на карте',
    windNote: '🔊 Зона шумового загрязнения на карте',
    loading: 'Загрузка базы данных электростанций...',
    show: 'Показать', stopShow: 'Стоп',
    noResults: 'Станции не найдены',
  },
}

function statusColor(status) {
  if (status === 'active') return '#10b981'
  if (status === 'construction') return '#f59e0b'
  return '#6b7280'
}

function statusLabel(status, tr) {
  if (status === 'active') return tr.active
  if (status === 'construction') return tr.construction
  return tr.decommissioned
}

function geoCircle([lng, lat], radiusKm, steps = 64) {
  const coords = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI
    const dlat = (radiusKm / 111.32) * Math.sin(a)
    const dlng = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a)
    coords.push([lng + dlng, lat + dlat])
  }
  return coords
}

function markerSize(capacity) {
  if (capacity >= 5000) return 44
  if (capacity >= 1000) return 36
  if (capacity >= 300)  return 30
  return 24
}

const ORBIT_FLY_DURATION = 1467   // 2200ms / 1.5 — 1.5x faster approach
const ORBIT_BEARING_STEP = 0.225  // 0.15deg / frame * 1.5 — 1.5x faster spin

// Flies the camera close to a plant, tilts to 70°, then keeps spinning the
// bearing indefinitely so the station is shown off from all sides.
function startOrbit(map, plant, orbitStateRef) {
  stopOrbit(map, orbitStateRef)
  const prevView = {
    center: map.getCenter(),
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
  }
  const state = { active: true, rafId: null, plantId: plant.id, prevView }
  orbitStateRef.current = state

  map.flyTo({
    center: [plant.lng, plant.lat],
    zoom: 14.5,
    pitch: 70,
    bearing: map.getBearing(),
    duration: ORBIT_FLY_DURATION,
    essential: true,
  })

  map.once('moveend', () => {
    if (orbitStateRef.current !== state) return
    let bearing = map.getBearing()
    const step = () => {
      if (orbitStateRef.current !== state) return
      bearing = (bearing + ORBIT_BEARING_STEP) % 360
      map.setBearing(bearing)
      state.rafId = requestAnimationFrame(step)
    }
    state.rafId = requestAnimationFrame(step)
  })
}

function stopOrbit(map, orbitStateRef, restore = false) {
  const state = orbitStateRef.current
  if (!state) return
  if (state.rafId) cancelAnimationFrame(state.rafId)
  orbitStateRef.current = null
  if (restore && state.prevView) {
    map.flyTo({
      center: state.prevView.center,
      zoom: state.prevView.zoom,
      pitch: state.prevView.pitch,
      bearing: state.prevView.bearing,
      duration: ORBIT_FLY_DURATION,
      essential: true,
    })
  }
}

async function loadPlants() {
  const res = await fetch(PLANTS_URL)
  return res.json()
}

function renderMarkersAndZones(map, plants, onSelect) {
  const zoneFeatures = plants
    .filter(p => TYPE_CFG[p.type]?.pollution > 0)
    .map(p => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [geoCircle([p.lng, p.lat], TYPE_CFG[p.type].pollution)] },
      properties: { ptype: p.type },
    }))

  map.addSource('zones', { type:'geojson', data:{ type:'FeatureCollection', features: zoneFeatures } })
  map.addLayer({
    id: 'zones-fill', type: 'fill', source: 'zones',
    paint: {
      'fill-color': ['case',
        ['==', ['get','ptype'], 'coal'],    'rgba(120,53,15,0.22)',
        ['==', ['get','ptype'], 'gas'],     'rgba(234,88,12,0.18)',
        ['==', ['get','ptype'], 'wind'],    'rgba(16,185,129,0.13)',
        'rgba(124,58,237,0.14)',
      ],
    },
  })
  map.addLayer({
    id: 'zones-line', type: 'line', source: 'zones',
    paint: {
      'line-color': ['case',
        ['==', ['get','ptype'], 'coal'],    '#78350f',
        ['==', ['get','ptype'], 'gas'],     '#ea580c',
        ['==', ['get','ptype'], 'wind'],    '#10b981',
        '#7c3aed',
      ],
      'line-width': 1.5,
      'line-dasharray': [4, 4],
      'line-opacity': 0.6,
    },
  })

  // Only mid-size+ plants are shown at low zoom; smaller ones reveal as you zoom in.
  // Combined with a viewport check, this keeps the number of live DOM markers small
  // (MapLibre repositions every marker on each render frame, so marker count is the
  // main driver of map lag).
  function capacityThreshold(zoom) {
    if (zoom < 3.5) return 4000
    if (zoom < 4.5) return 2000
    if (zoom < 5.5) return 1000
    if (zoom < 6.5) return 300
    return 0
  }

  function buildMarker(plant) {
    const cfg  = TYPE_CFG[plant.type] ?? TYPE_CFG.hydro
    const size = markerSize(plant.capacity)
    const bg   = plant.status === 'active' ? cfg.color : statusColor(plant.status)

    const el = document.createElement('div')
    el.style.cssText = `width:${size}px;height:${size}px;cursor:pointer`

    const inner = document.createElement('div')
    inner.style.cssText = [
      `width:${size}px`, `height:${size}px`, 'border-radius:50%',
      `background:${bg}`,
      `border:${size >= 36 ? '3px' : '2px'} solid white`,
      'box-shadow:0 3px 12px rgba(0,0,0,0.5)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'transition:transform .15s ease, box-shadow .15s ease',
    ].join(';')
    const iconSize = Math.round(size * 0.52)
    inner.innerHTML = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none">${ICONS[plant.type] ?? ICONS.hydro}</svg>`

    inner.addEventListener('mouseenter', () => {
      inner.style.transform = 'scale(1.25)'
      inner.style.boxShadow = '0 6px 22px rgba(0,0,0,0.65)'
    })
    inner.addEventListener('mouseleave', () => {
      inner.style.transform = 'scale(1)'
      inner.style.boxShadow = '0 3px 12px rgba(0,0,0,0.5)'
    })

    el.appendChild(inner)
    el.addEventListener('click', () => onSelect(plant))

    return new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([plant.lng, plant.lat])
  }

  const liveMarkers = new Map() // plant.id -> maplibregl.Marker

  function update() {
    const zoom = map.getZoom()
    const threshold = capacityThreshold(zoom)
    const b = map.getBounds()
    const padLng = (b.getEast() - b.getWest()) * 0.25
    const padLat = (b.getNorth() - b.getSouth()) * 0.25
    const w = b.getWest() - padLng, e = b.getEast() + padLng
    const s = b.getSouth() - padLat, n = b.getNorth() + padLat

    const visibleIds = new Set()
    for (const plant of plants) {
      if (plant.capacity < threshold) continue
      if (plant.lng < w || plant.lng > e || plant.lat < s || plant.lat > n) continue
      visibleIds.add(plant.id)
      if (!liveMarkers.has(plant.id)) {
        const marker = buildMarker(plant)
        marker.addTo(map)
        liveMarkers.set(plant.id, marker)
      }
    }
    for (const [id, marker] of liveMarkers) {
      if (!visibleIds.has(id)) {
        marker.remove()
        liveMarkers.delete(id)
      }
    }
  }

  map.on('moveend', update)
  map.on('zoomend', update)
  update()
}

export default function DashboardPage() {
  const containerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const mapReadyRef = useRef(false)
  const plantsRef = useRef(null)
  const renderedRef = useRef(false)
  const orbitStateRef = useRef(null)

  const [selected, setSelected] = useState(null)
  const [lang, setLang] = useState('en')
  const [dataReady, setDataReady] = useState(false)
  const [isOrbiting, setIsOrbiting] = useState(false)
  const [plants, setPlants] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const tr = T[lang]

  function selectPlant(plant) {
    stopOrbit(mapInstanceRef.current, orbitStateRef)
    setIsOrbiting(false)
    setSelected(plant)
  }

  function showPlantOnMap(plant) {
    selectPlant(plant)
    startOrbit(mapInstanceRef.current, plant, orbitStateRef)
    setIsOrbiting(true)
    setSearchQuery('')
  }

  function closePanel() {
    stopOrbit(mapInstanceRef.current, orbitStateRef)
    setIsOrbiting(false)
    setSelected(null)
  }

  function toggleOrbit() {
    if (!selected || !mapInstanceRef.current) return
    if (isOrbiting) {
      stopOrbit(mapInstanceRef.current, orbitStateRef, true)
      setIsOrbiting(false)
    } else {
      startOrbit(mapInstanceRef.current, selected, orbitStateRef)
      setIsOrbiting(true)
    }
  }

  function tryRenderPlants() {
    if (renderedRef.current) return
    if (!mapReadyRef.current || !plantsRef.current) return
    renderedRef.current = true
    renderMarkersAndZones(mapInstanceRef.current, plantsRef.current, selectPlant)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        sources: {
          satellite: { type:'raster', tiles:[ESRI_SATELLITE], tileSize:256, attribution:'Tiles &copy; Esri' },
          terrain:   { type:'raster-dem', tiles:[AWS_TERRAIN], tileSize:256, encoding:'terrarium', maxzoom:14 },
        },
        layers: [{ id:'satellite-layer', type:'raster', source:'satellite' }],
      },
      center: [30, 30],
      zoom: 3,
      pitch: 20,
      bearing: 0,
      antialias: true,
      maxPitch: 85,
    })
    mapInstanceRef.current = map

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')

    // Stop the orbit fly-around as soon as the user touches the map themselves.
    map.on('dragstart', () => {
      if (!orbitStateRef.current) return
      stopOrbit(map, orbitStateRef)
      setIsOrbiting(false)
    })

    map.on('load', () => {
      map.setTerrain({ source: 'terrain', exaggeration: 2.2 })
      mapReadyRef.current = true
      tryRenderPlants()
    })

    requestAnimationFrame(() => map.resize())
    return () => {
      stopOrbit(map, orbitStateRef)
      map.remove()
    }
  }, [])

  useEffect(() => {
    let active = true
    loadPlants().then(rows => {
      if (!active) return
      plantsRef.current = rows
      setPlants(rows)
      setDataReady(true)
      tryRenderPlants()
    }).catch(err => {
      console.error('Failed to load power plant data', err)
    })
    return () => { active = false }
  }, [])

  const s = selected
  const cfg = s ? (TYPE_CFG[s.type] ?? TYPE_CFG.hydro) : null
  const typeColor = cfg?.color ?? '#3b82f6'
  const typeLabel = cfg ? cfg[lang] : ''
  const plantName = s ? (lang === 'ru' ? s.nameRu : s.name) : ''
  const plantNameAlt = s ? (lang === 'ru' ? s.name : s.nameRu) : ''
  const description = s ? (lang === 'ru' && s.descriptionRu ? s.descriptionRu : s.description) : ''
  const countryName = s ? (lang === 'ru' && s.countryRu ? s.countryRu : s.country) : ''
  const riverName = s ? (lang === 'ru' && s.riverRu ? s.riverRu : s.river) : null
  const hasPollution = s && cfg && cfg.pollution > 0

  const trimmedQuery = searchQuery.trim().toLowerCase()
  const searchResults = trimmedQuery
    ? plants.filter(p =>
        p.name.toLowerCase().includes(trimmedQuery) ||
        p.nameRu?.toLowerCase().includes(trimmedQuery) ||
        p.country.toLowerCase().includes(trimmedQuery) ||
        p.countryRu?.toLowerCase().includes(trimmedQuery)
      ).slice(0, 8)
    : []

  return (
    <div className={styles.page}>

      <div className={styles.navbarWrap}>
        <div className={styles.navbar}>
          <div className={styles.navBrand}>
            <div className={styles.navLogoCircle}><BoltIcon /></div>
            <span className={styles.navTitle}>EcoElectricity</span>
          </div>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><SearchIcon /></span>
            <input
              className={styles.searchInput}
              placeholder={tr.search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            />
            {searchFocused && trimmedQuery && (
              <div className={styles.searchResults}>
                {searchResults.length === 0 && (
                  <div className={styles.searchEmpty}>{tr.noResults}</div>
                )}
                {searchResults.map(p => {
                  const pc = TYPE_CFG[p.type] ?? TYPE_CFG.hydro
                  return (
                    <button
                      key={p.id}
                      className={styles.searchResultItem}
                      onClick={() => showPlantOnMap(p)}
                    >
                      <span className={styles.searchResultDot} style={{ background: pc.color }} />
                      <span className={styles.searchResultName}>
                        {lang === 'ru' ? p.nameRu : p.name}
                      </span>
                      <span className={styles.searchResultCountry}>
                        {lang === 'ru' && p.countryRu ? p.countryRu : p.country}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className={styles.navRight}>
            <button className={styles.statsBtn} onClick={() => setStatsOpen(true)}>
              <StatsIcon />
              {lang === 'ru' ? 'Статистика' : 'Statistics'}
            </button>
            <button
              className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`}
              onClick={() => setLang('en')}
            >EN</button>
            <button
              className={`${styles.langBtn} ${lang === 'ru' ? styles.langActive : ''}`}
              onClick={() => setLang('ru')}
            >RU</button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className={styles.map} />

      {statsOpen && (
        <StatsPanel plants={plants} lang={lang} onClose={() => setStatsOpen(false)} />
      )}

      {!dataReady && (
        <div className={styles.dbLoading}>
          <div className={styles.dbLoadingSpinner} />
          <span>{tr.loading}</span>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        {Object.entries(TYPE_CFG).map(([key, c]) => (
          <div key={key} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: c.color }} />
            <span className={styles.legendLabel}>{c[lang]}</span>
          </div>
        ))}
      </div>

      {/* Side panel */}
      <div className={`${styles.sidePanel} ${selected ? styles.sidePanelOpen : ''}`}>
        <button className={styles.sidePanelClose} onClick={closePanel}>✕</button>

        {s && (
          <>
            {s.img
              ? <img src={s.img} alt={plantName} className={styles.sidePanelImg}
                  onError={() => setSelected(prev => prev ? { ...prev, img: null } : prev)} />
              : <div className={styles.sidePanelImgPlaceholder}
                  style={{ background: `linear-gradient(135deg, ${typeColor}cc 0%, ${typeColor}33 100%)` }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" opacity="0.9"
                    dangerouslySetInnerHTML={{ __html: ICONS[s.type] ?? ICONS.hydro }} />
                </div>
            }

            <div className={styles.sidePanelBody}>
              <div className={styles.sidePanelBadges}>
                <span className={styles.typeBadge} style={{ background: typeColor }}>{typeLabel}</span>
                <span className={styles.statusBadge} style={{ color: statusColor(s.status) }}>
                  ● {statusLabel(s.status, tr)}
                </span>
              </div>

              <h2 className={styles.sidePanelName}>{plantName}</h2>
              <p className={styles.sidePanelNameAlt}>{plantNameAlt}</p>

              <button
                className={`${styles.showBtn} ${isOrbiting ? styles.showBtnActive : ''}`}
                style={!isOrbiting ? { background: typeColor } : undefined}
                onClick={toggleOrbit}
              >
                <EyeIcon />
                {isOrbiting ? tr.stopShow : tr.show}
              </button>

              <div className={styles.capacityBox} style={{ borderColor: typeColor + '44', background: typeColor + '0d' }}>
                <span className={styles.capacityNum} style={{ color: typeColor }}>
                  {s.capacity.toLocaleString()}<span className={styles.capacityUnit}> MW</span>
                </span>
                <span className={styles.capacityLabel}>{tr.capacity}</span>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailKey}>{tr.country}</span>
                  <span className={styles.detailVal}>{countryName}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailKey}>{tr.built}</span>
                  <span className={styles.detailVal}>{s.year}</span>
                </div>
                {riverName && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailKey}>{tr.river}</span>
                    <span className={styles.detailVal}>{riverName}</span>
                  </div>
                )}
                {s.annual && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailKey}>{tr.annual}</span>
                    <span className={styles.detailVal}>{s.annual}</span>
                  </div>
                )}
                {s.units && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailKey}>{tr.units}</span>
                    <span className={styles.detailVal}>{s.units}</span>
                  </div>
                )}
              </div>

              <p className={styles.sidePanelDesc}>{description}</p>

              {hasPollution && (
                <div className={styles.pollutionNote}
                  style={{ background: typeColor + '15', borderColor: typeColor + '44', color: typeColor }}>
                  {s.type === 'nuclear' ? tr.nuclearNote : s.type === 'wind' ? tr.windNote : tr.pollutionNote}
                  <span style={{ fontSize: 11, display:'block', marginTop:2, opacity:.8 }}>
                    r = {cfg.pollution} km
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function BoltIcon() {
  return <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><path d="M18 4L8 18H16L14 28L24 14H16L18 4Z" fill="white"/></svg>
}
function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="rgba(26,46,53,0.5)" strokeWidth="1.5"/><path d="M13.5 13.5L17 17" stroke="rgba(26,46,53,0.5)" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function EyeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.8"/></svg>
}
function StatsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="13" width="4" height="8" rx="1" fill="#0d9488"/><rect x="10" y="8" width="4" height="13" rx="1" fill="#0d9488"/><rect x="17" y="4" width="4" height="17" rx="1" fill="#0d9488"/></svg>
}
