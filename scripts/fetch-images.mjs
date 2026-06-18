import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { plants } from './plants-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, 'fetched-images.json')

const HEADERS = {
  'User-Agent': 'EcoElectricityApp/1.0 (educational power-plant map; contact: noreply@example.com)',
  'Api-User-Agent': 'EcoElectricityApp/1.0 (educational power-plant map)',
}

// Guaranteed-to-exist generic Wikipedia photos, used only when no
// plant-specific image can be found, so every station ends up with a picture.
const GENERIC_TITLES = {
  hydro: 'Hydroelectricity',
  nuclear: 'Nuclear_power_plant',
  coal: 'Coal-fired_power_station',
  gas: 'Natural_gas-fired_power_station',
  solar: 'Photovoltaic_power_station',
  wind: 'Wind_farm',
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function wikiSummary(title, attempt = 0) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  let res
  try {
    res = await fetch(url, { headers: HEADERS })
  } catch {
    return null
  }
  if (res.status === 429 && attempt < 2) {
    await sleep(1500 * (attempt + 1))
    return wikiSummary(title, attempt + 1)
  }
  if (!res.ok) return null
  const data = await res.json()
  if (data.type === 'disambiguation') return null
  return data.thumbnail?.source ?? null
}

function titleCandidates(name) {
  const base = name.replace(/\s*\([^)]*\)\s*$/, '').trim()
  const variants = new Set([base])
  variants.add(base.replace(/\bHPP\b/i, 'Dam'))
  variants.add(base.replace(/\bNPP\b/i, 'Nuclear Power Plant'))
  variants.add(base.replace(/\bCHP\b/i, 'Power Station'))
  return [...variants].slice(0, 3)
}

const results = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf-8')) : {}
let hits = 0, fallbacks = 0, skipped = 0

for (const plant of plants) {
  if (plant.img) { skipped++; continue }
  if (results[plant.id]) { continue }

  let found = null
  for (const candidate of titleCandidates(plant.name)) {
    found = await wikiSummary(candidate)
    await sleep(300)
    if (found) break
  }

  if (!found) {
    found = await wikiSummary(GENERIC_TITLES[plant.type] ?? GENERIC_TITLES.hydro)
    await sleep(300)
    fallbacks++
  } else {
    hits++
  }

  results[plant.id] = found ?? null
  console.log((found ? 'OK  ' : 'NONE'), plant.id, plant.name)
  writeFileSync(outPath, JSON.stringify(results, null, 2))
}

console.log(`\nDone. specific hits: ${hits}, generic fallbacks: ${fallbacks}, already had img: ${skipped}`)
