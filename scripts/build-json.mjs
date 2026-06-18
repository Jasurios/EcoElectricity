import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { plants } from './plants-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '..', 'public', 'power-plants.json')
const fetchedPath = path.join(__dirname, 'fetched-images.json')

// Guaranteed fallback so every station ends up with some image, even if
// fetch-images.mjs hasn't found a plant-specific photo for it.
const GENERIC_FALLBACK = {
  hydro: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/ThreeGorgesDam-China2009.jpg/330px-ThreeGorgesDam-China2009.jpg',
  nuclear: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Centrale-nucl%C3%A9aire-de-saint-alban-1.jpg/330px-Centrale-nucl%C3%A9aire-de-saint-alban-1.jpg',
  coal: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Be%C5%82chat%C3%B3w_Elektrownia.jpg/330px-Be%C5%82chat%C3%B3w_Elektrownia.jpg',
  gas: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bayside_Power_Station.jpg/330px-Bayside_Power_Station.jpg',
  solar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Solarpark_J%C3%A4nnersdorf.jpg/330px-Solarpark_J%C3%A4nnersdorf.jpg',
  wind: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Wind_turbines_in_southern_California_2016.jpg/330px-Wind_turbines_in_southern_California_2016.jpg',
}

const fetched = existsSync(fetchedPath) ? JSON.parse(readFileSync(fetchedPath, 'utf-8')) : {}

const merged = plants.map(p => ({
  ...p,
  img: p.img ?? fetched[p.id] ?? GENERIC_FALLBACK[p.type] ?? GENERIC_FALLBACK.hydro,
}))

writeFileSync(outPath, JSON.stringify(merged, null, 2))

console.log(`Built ${outPath} with ${merged.length} power plants (${merged.filter(p => p.img).length} with images).`)
