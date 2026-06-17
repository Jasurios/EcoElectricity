import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import styles from './Dashboard.module.css'

const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const AWS_TERRAIN    = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

const TYPE_CFG = {
  hydro:   { color: '#3b82f6', en: 'Hydro',    ru: 'ГЭС',        pollution: 0  },
  nuclear: { color: '#8b5cf6', en: 'Nuclear',  ru: 'АЭС',        pollution: 30 },
  coal:    { color: '#78716c', en: 'Coal',     ru: 'Угольная',   pollution: 80 },
  gas:     { color: '#f97316', en: 'Gas',      ru: 'Газовая',    pollution: 35 },
  solar:   { color: '#eab308', en: 'Solar',    ru: 'Солнечная',  pollution: 0  },
  wind:    { color: '#10b981', en: 'Wind',     ru: 'Ветровая',   pollution: 25 },
}

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
    active: 'Operational', construction: 'Under construction',
    pollutionNote: '⚠️ Pollution zone shown on map',
    nuclearNote: '☢️ Exclusion zone shown on map',
    windNote: '🔊 Noise pollution zone shown on map',
  },
  ru: {
    search: 'Поиск электростанций...',
    capacity: 'Установленная мощность', annual: 'Выработка в год',
    country: 'Страна', river: 'Река', built: 'Год', units: 'Агрегаты',
    active: 'Действующая', construction: 'Строится',
    pollutionNote: '⚠️ Зона загрязнения на карте',
    nuclearNote: '☢️ Зона отчуждения на карте',
    windNote: '🔊 Зона шумового загрязнения на карте',
  },
}

const IMG = s => `https://commons.wikimedia.org/wiki/Special:FilePath/${s}`

const powerPlants = [
  // ── TAJIKISTAN ──────────────────────────────────────────────
  { id:1, name:'Nurek HPP', nameRu:'Нурекская ГЭС', type:'hydro',
    lng:69.34806, lat:38.37167, capacity:3015, country:'Tajikistan', countryRu:'Таджикистан',
    river:'Vakhsh', riverRu:'Вахш', status:'active', year:1972, annual:'11 TWh', units:9,
    img: IMG('Nurek_Dam.JPG'),
    desc:'Second-tallest dam in the world at 304 m. Nine 335 MW Francis turbines producing ~11 TWh/year, supplying over 70% of Tajikistan\'s electricity.',
    descRu:'Вторая по высоте плотина в мире — 304 м. Девять турбин по 335 МВт вырабатывают ~11 ТВт·ч/год и обеспечивают более 70% электроэнергии Таджикистана.' },
  { id:2, name:'Rogun HPP', nameRu:'Рогунская ГЭС', type:'hydro',
    lng:69.77194, lat:38.68306, capacity:3600, country:'Tajikistan', countryRu:'Таджикистан',
    river:'Vakhsh', riverRu:'Вахш', status:'construction', year:2018, annual:'13.3 TWh', units:6,
    img: IMG('Rogun_Dam.jpg'),
    desc:'When complete, will be the world\'s tallest dam at 335 m. Six 600 MW turbines planned. Two units already operational since 2018–2019.',
    descRu:'После завершения — самая высокая плотина в мире (335 м). Шесть турбин по 600 МВт. Два агрегата уже работают с 2018–2019 гг.' },
  { id:3, name:'Sangtuda-1 HPP', nameRu:'Сангтудинская ГЭС-1', type:'hydro',
    lng:69.05833, lat:38.04500, capacity:670, country:'Tajikistan', countryRu:'Таджикистан',
    river:'Vakhsh', riverRu:'Вахш', status:'active', year:2009, annual:'2.7 TWh', units:4,
    img: IMG('Sangtuda_1.jpg'),
    desc:'Four 167.5 MW run-of-river turbines. Built with Russian investment; generates ~12% of Tajikistan\'s national electricity output.',
    descRu:'Четыре турбины по 167,5 МВт. Построена с российскими инвестициями; даёт ~12% национальной выработки электроэнергии.' },
  { id:4, name:'Pamir-1 HPP', nameRu:'Памир-1 ГЭС', type:'hydro',
    lng:71.47000, lat:37.49000, capacity:28, country:'Tajikistan', countryRu:'Таджикистан',
    river:'Gunt', riverRu:'Гунт', status:'active', year:2006, annual:'0.15 TWh', units:2,
    img: null,
    desc:'Main power source for the entire Gorno-Badakhshan region (GBAO), including Khorog city. Operated by Pamir Energy (Aga Khan Fund).',
    descRu:'Основной источник электроэнергии для всего Горно-Бадахшанского региона, включая город Хорог. Управляется Pamir Energy (Фонд Ага-Хана).' },
  { id:5, name:'Kairakkum HPP', nameRu:'Кайраккумская ГЭС', type:'hydro',
    lng:69.81612, lat:40.27702, capacity:174, country:'Tajikistan', countryRu:'Таджикистан',
    river:'Syrdarya', riverRu:'Сырдарья', status:'active', year:1956, annual:'0.9 TWh', units:6,
    img: null,
    desc:'Oldest major HPP in Tajikistan, located in the northern Sughd Region. Modernised from 126 MW to 174 MW. Also regulates irrigation.',
    descRu:'Старейшая крупная ГЭС Таджикистана, расположена в Согдийской области. Модернизирована с 126 до 174 МВт. Регулирует орошение.' },
  { id:6, name:'Dushanbe-2 CHP', nameRu:'Душанбинская ТЭЦ-2', type:'coal',
    lng:68.77256, lat:38.60983, capacity:400, country:'Tajikistan', countryRu:'Таджикистан',
    river:null, status:'active', year:2016, annual:'2 TWh', units:3,
    img: null,
    desc:'Coal-fired CHP plant built by Chinese contractor, financed by China Exim Bank. Critical winter backup for Dushanbe when hydro output drops.',
    descRu:'Угольная ТЭЦ, построенная китайским подрядчиком на средства China Exim Bank. Критически важный зимний резерв для Душанбе.' },

  // ── CHINA ───────────────────────────────────────────────────
  { id:10, name:'Three Gorges Dam', nameRu:'ГЭС «Три ущелья»', type:'hydro',
    lng:110.985, lat:30.823, capacity:22500, country:'China', countryRu:'Китай',
    river:'Yangtze', riverRu:'Янцзы', status:'active', year:2003, annual:'88.2 TWh', units:34,
    img: IMG('Three_Gorges_Dam%2C_Yangtze_River%2C_China.jpg'),
    desc:'World\'s largest power station by installed capacity. 34 turbines of 700–778 MW each. The reservoir stretches 600 km upstream and displaced 1.3 million people.',
    descRu:'Крупнейшая электростанция мира по установленной мощности. 34 турбины по 700–778 МВт. Водохранилище длиной 600 км затопило территорию с 1,3 млн жителей.' },
  { id:11, name:'Tianwan Nuclear', nameRu:'АЭС Тяньвань', type:'nuclear',
    lng:119.460, lat:34.690, capacity:6900, country:'China', countryRu:'Китай',
    river:null, status:'active', year:2007, annual:'50 TWh', units:8,
    img: null,
    desc:'Largest nuclear power plant in China, built in cooperation with Russia (Rosatom). Eight VVER-1000 reactors; four more units under construction.',
    descRu:'Крупнейшая АЭС Китая, построена в сотрудничестве с Россией (Росатом). Восемь реакторов ВВЭР-1000; ещё четыре блока строятся.' },
  { id:12, name:'Tuoketuo Power Station', nameRu:'Тяньэлектростанция Туокэтуо', type:'coal',
    lng:111.060, lat:40.290, capacity:6720, country:'China', countryRu:'Китай',
    river:null, status:'active', year:2006, annual:'39 TWh', units:12,
    img: null,
    desc:'World\'s largest coal-fired power plant by installed capacity. Located in Inner Mongolia, supplying electricity to Beijing and surrounding regions.',
    descRu:'Крупнейшая угольная электростанция мира по установленной мощности. Расположена во Внутренней Монголии, снабжает электроэнергией Пекин и прилегающие регионы.' },
  { id:13, name:'Huanghe Solar Park', nameRu:'Солнечный парк Хуанхэ', type:'solar',
    lng:98.050, lat:36.070, capacity:2200, country:'China', countryRu:'Китай',
    river:null, status:'active', year:2020, annual:'3.9 TWh', units:null,
    img: null,
    desc:'One of the world\'s largest solar farms, located on the Qinghai Plateau at 3,000 m elevation. Combines solar panels with sheep grazing below.',
    descRu:'Один из крупнейших солнечных парков мира на Цинхайском плато, высота 3000 м. Сочетает солнечные панели с выпасом овец.' },
  { id:14, name:'Gansu Wind Farm', nameRu:'Ветропарк Ганьсу', type:'wind',
    lng:97.000, lat:39.500, capacity:8000, country:'China', countryRu:'Китай',
    river:null, status:'active', year:2010, annual:'17 TWh', units:5000,
    img: null,
    desc:'World\'s largest wind farm complex by capacity. Located in the Gobi Desert corridor. Part of China\'s plan to reach 1,200 GW of wind capacity by 2030.',
    descRu:'Крупнейший в мире ветроэнергетический комплекс по мощности. Расположен в коридоре пустыни Гоби. Часть китайского плана по ветровой энергетике.' },

  // ── BRAZIL / SOUTH AMERICA ──────────────────────────────────
  { id:20, name:'Itaipu Dam', nameRu:'ГЭС Итайпу', type:'hydro',
    lng:-54.590, lat:-25.408, capacity:14000, country:'Brazil/Paraguay', countryRu:'Бразилия/Парагвай',
    river:'Paraná', riverRu:'Парана', status:'active', year:1984, annual:'96 TWh', units:20,
    img: IMG('Itaipu_Dam.jpg'),
    desc:'Second-largest hydroelectric plant in the world by annual generation. Supplies ~15% of Brazil\'s electricity and ~75% of Paraguay\'s total demand.',
    descRu:'Вторая в мире ГЭС по годовой выработке. Обеспечивает ~15% электроэнергии Бразилии и ~75% всего потребления Парагвая.' },
  { id:21, name:'Belo Monte HPP', nameRu:'ГЭС Белу-Монти', type:'hydro',
    lng:-52.415, lat:-3.120, capacity:11233, country:'Brazil', countryRu:'Бразилия',
    river:'Xingu', riverRu:'Шингу', status:'active', year:2016, annual:'39.5 TWh', units:24,
    img: null,
    desc:'Third-largest hydroelectric plant in the world. Located in the Amazon basin; its construction was highly controversial due to displacement of indigenous communities.',
    descRu:'Третья по величине ГЭС в мире. Расположена в бассейне Амазонки; строительство вызвало споры из-за переселения коренных народов.' },

  // ── USA ─────────────────────────────────────────────────────
  { id:30, name:'Grand Coulee Dam', nameRu:'Плотина Гранд-Кули', type:'hydro',
    lng:-118.981, lat:47.967, capacity:6809, country:'USA', countryRu:'США',
    river:'Columbia', riverRu:'Колумбия', status:'active', year:1942, annual:'20 TWh', units:33,
    img: IMG('Grand_Coulee_Dam_panoramic_taken_June_2012.jpg'),
    desc:'Largest hydroelectric plant in the USA and the largest concrete structure in the country. Powers the Pacific Northwest and played a key role in WWII aluminium production.',
    descRu:'Крупнейшая ГЭС США и наибольшее бетонное сооружение в стране. Питает Тихоокеанский Северо-Запад.' },
  { id:31, name:'Hoover Dam', nameRu:'Плотина Гувера', type:'hydro',
    lng:-114.737, lat:36.016, capacity:2080, country:'USA', countryRu:'США',
    river:'Colorado', riverRu:'Колорадо', status:'active', year:1936, annual:'4 TWh', units:17,
    img: IMG('Hoover_Dam%2C_Nevada.jpg'),
    desc:'Iconic arch-gravity dam on the Colorado River, forming Lake Mead — the USA\'s largest reservoir. A National Historic Landmark and major tourism destination.',
    descRu:'Знаменитая арочно-гравитационная плотина на реке Колорадо, создаёт озеро Мид — крупнейшее водохранилище США.' },
  { id:32, name:'Alta Wind Energy Center', nameRu:'Ветропарк Альта', type:'wind',
    lng:-118.570, lat:34.960, capacity:1547, country:'USA', countryRu:'США',
    river:null, status:'active', year:2012, annual:'3.2 TWh', units:600,
    img: null,
    desc:'Largest wind farm in the Western Hemisphere at the time of construction. Located in Tehachapi Pass, California, taking advantage of strong, consistent winds.',
    descRu:'Крупнейший ветропарк Западного полушария на момент постройки. Расположен в перевале Техачапи, Калифорния.' },
  { id:33, name:'Solar Star', nameRu:'Солнечная электростанция Solar Star', type:'solar',
    lng:-118.420, lat:35.090, capacity:579, country:'USA', countryRu:'США',
    river:null, status:'active', year:2015, annual:'1.1 TWh', units:null,
    img: null,
    desc:'One of the largest photovoltaic power stations in the USA, covering 13 km² in the Mojave Desert. Uses SunPower\'s high-efficiency monocrystalline silicon panels.',
    descRu:'Одна из крупнейших фотовольтаических станций США, занимает 13 км² в пустыне Мохаве. Использует высокоэффективные монокристаллические панели SunPower.' },

  // ── EUROPE ──────────────────────────────────────────────────
  { id:40, name:'Zaporizhzhia NPP', nameRu:'Запорожская АЭС', type:'nuclear',
    lng:34.588, lat:47.510, capacity:5700, country:'Ukraine', countryRu:'Украина',
    river:'Kakhovka Reservoir', riverRu:'Каховское водохр.', status:'active', year:1985, annual:'40 TWh', units:6,
    img: IMG('Zaporizhzhia_NPP_from_Energodar.jpg'),
    desc:'Largest nuclear power plant in Europe. Six VVER-1000 reactors. Under Russian military control since March 2022, causing major nuclear safety concerns.',
    descRu:'Крупнейшая атомная электростанция Европы. Шесть реакторов ВВЭР-1000. С марта 2022 года под российским военным контролем.' },
  { id:41, name:'Gravelines Nuclear', nameRu:'АЭС Гравлин', type:'nuclear',
    lng:2.141, lat:51.014, capacity:5706, country:'France', countryRu:'Франция',
    river:'North Sea', riverRu:'Северное море', status:'active', year:1980, annual:'38 TWh', units:6,
    img: null,
    desc:'Largest nuclear power plant in Western Europe. Six 950 MW PWR reactors operated by EDF. France generates ~70% of its electricity from nuclear power.',
    descRu:'Крупнейшая АЭС в Западной Европе. Шесть реакторов PWR по 950 МВт. Франция производит ~70% электроэнергии на АЭС.' },
  { id:42, name:'Bełchatów Power Station', nameRu:'ТЭС Белхатув', type:'coal',
    lng:19.330, lat:51.265, capacity:5420, country:'Poland', countryRu:'Польша',
    river:null, status:'active', year:1981, annual:'28 TWh', units:13,
    img: null,
    desc:'Largest power plant in the European Union and Europe\'s largest CO₂ emitter. Burns lignite (brown coal) extracted from an adjacent open-cast mine.',
    descRu:'Крупнейшая электростанция Евросоюза и главный эмитент CO₂ в Европе. Сжигает бурый уголь из соседнего открытого разреза.' },
  { id:43, name:'Hornsea 1', nameRu:'Ветропарк Хорнси-1', type:'wind',
    lng:1.650, lat:53.910, capacity:1218, country:'UK', countryRu:'Великобритания',
    river:null, status:'active', year:2019, annual:'4.2 TWh', units:174,
    img: IMG('Hornsea_Wind_Farm_1.jpg'),
    desc:'World\'s largest offshore wind farm at time of completion. 174 Siemens Gamesa 7 MW turbines located 120 km off the Yorkshire coast in the North Sea.',
    descRu:'На момент завершения — крупнейший офшорный ветропарк мира. 174 турбины Siemens Gamesa по 7 МВт в 120 км от побережья Йоркшира.' },

  // ── RUSSIA ──────────────────────────────────────────────────
  { id:50, name:'Krasnoyarsk HPP', nameRu:'Красноярская ГЭС', type:'hydro',
    lng:92.424, lat:55.972, capacity:6000, country:'Russia', countryRu:'Россия',
    river:'Yenisei', riverRu:'Енисей', status:'active', year:1967, annual:'18 TWh', units:12,
    img: null,
    desc:'One of the most powerful hydroelectric plants in Russia. Features the unique Krasnoyarsk ship lift, allowing vessels to bypass the 124 m dam.',
    descRu:'Одна из мощнейших ГЭС России. Единственная в России судоподъёмная машина позволяет судам обходить 124-метровую плотину.' },
  { id:51, name:'Leningrad NPP', nameRu:'Ленинградская АЭС', type:'nuclear',
    lng:29.068, lat:59.838, capacity:4200, country:'Russia', countryRu:'Россия',
    river:null, status:'active', year:1974, annual:'28 TWh', units:6,
    img: null,
    desc:'One of Russia\'s oldest nuclear power plants. The original four RBMK-1000 reactors (same type as Chernobyl) are being replaced by new VVER-1200 units.',
    descRu:'Одна из старейших АЭС России. Четыре исходных реактора РБМК-1000 (того же типа, что в Чернобыле) заменяются новыми ВВЭР-1200.' },
  { id:52, name:'Surgut-2 GRES', nameRu:'Сургутская ГРЭС-2', type:'gas',
    lng:73.514, lat:61.240, capacity:5597, country:'Russia', countryRu:'Россия',
    river:null, status:'active', year:1985, annual:'35 TWh', units:6,
    img: null,
    desc:'World\'s largest natural gas-fired power station. Supplies electricity to the Urals, Western Siberia, and Tyumen regions. Burns associated petroleum gas.',
    descRu:'Крупнейшая в мире газовая электростанция. Снабжает Урал, Западную Сибирь и Тюменский регион. Сжигает попутный нефтяной газ.' },

  // ── JAPAN ───────────────────────────────────────────────────
  { id:60, name:'Kashiwazaki-Kariwa NPP', nameRu:'АЭС Касивадзаки-Карива', type:'nuclear',
    lng:138.603, lat:37.432, capacity:7965, country:'Japan', countryRu:'Япония',
    river:null, status:'active', year:1985, annual:'0 TWh', units:7,
    img: IMG('Kashiwazaki-Kariwa_Nuclear_Power_Plant.jpg'),
    desc:'World\'s largest nuclear power plant by installed capacity. All 7 reactors have been offline since the 2011 Fukushima disaster. Restart approval granted for 2 units in 2023.',
    descRu:'Крупнейшая АЭС в мире по установленной мощности. Все 7 реакторов остановлены после Фукусимы в 2011 г. В 2023 г. получено разрешение на перезапуск 2 блоков.' },

  // ── CANADA ──────────────────────────────────────────────────
  { id:70, name:'Bruce Nuclear', nameRu:'АЭС Брюс', type:'nuclear',
    lng:-81.594, lat:44.322, capacity:6430, country:'Canada', countryRu:'Канада',
    river:null, status:'active', year:1977, annual:'47 TWh', units:8,
    img: null,
    desc:'Largest nuclear generating facility in the Western Hemisphere. Eight CANDU pressurised heavy-water reactors on the shore of Lake Huron.',
    descRu:'Крупнейший ядерный генерирующий комплекс Западного полушария. Восемь реакторов CANDU с тяжёлой водой на берегу озера Гурон.' },

  // ── INDIA ───────────────────────────────────────────────────
  { id:80, name:'Vindhyachal Super TPS', nameRu:'ТЭС Виндхьячал', type:'coal',
    lng:82.667, lat:23.980, capacity:4760, country:'India', countryRu:'Индия',
    river:null, status:'active', year:1987, annual:'26 TWh', units:8,
    img: null,
    desc:'Largest coal-fired power plant in India. Located in Madhya Pradesh, on the banks of the Rihand reservoir. Supplies electricity to northern India.',
    descRu:'Крупнейшая угольная электростанция Индии. Расположена в Мадхья-Прадеше на берегу водохранилища Риханд.' },
  { id:81, name:'Bhadla Solar Park', nameRu:'Солнечный парк Бхадла', type:'solar',
    lng:71.906, lat:27.541, capacity:2245, country:'India', countryRu:'Индия',
    river:null, status:'active', year:2020, annual:'5.5 TWh', units:null,
    img: IMG('Bhadla_Solar_Park.jpg'),
    desc:'World\'s largest solar park by installed capacity. Located in the Thar Desert, Rajasthan, where temperatures exceed 50°C. Covers over 56 km².',
    descRu:'Крупнейший в мире солнечный парк по установленной мощности. Расположен в пустыне Тар (Раджастхан) при температурах свыше 50°C. Площадь — более 56 км².' },
  { id:82, name:'Muppandal Wind Farm', nameRu:'Ветропарк Муппандал', type:'wind',
    lng:77.650, lat:8.240, capacity:1500, country:'India', countryRu:'Индия',
    river:null, status:'active', year:1996, annual:'3 TWh', units:3000,
    img: null,
    desc:'Largest wind farm in India, located at the southern tip of the subcontinent in Tamil Nadu. Takes advantage of strong monsoon-driven winds.',
    descRu:'Крупнейший ветропарк Индии, расположен на южной оконечности субконтинента в Тамилнаду. Использует сильные муссонные ветры.' },

  // ── AFRICA / MIDDLE EAST ────────────────────────────────────
  { id:90, name:'Aswan High Dam', nameRu:'Асуанская ГЭС', type:'hydro',
    lng:32.877, lat:23.971, capacity:2100, country:'Egypt', countryRu:'Египет',
    river:'Nile', riverRu:'Нил', status:'active', year:1970, annual:'10 TWh', units:12,
    img: IMG('Aswan_Dam.jpg'),
    desc:'Built with Soviet assistance in 1970. Created Lake Nasser, one of the world\'s largest man-made lakes (5,250 km²). Transformed Egyptian agriculture.',
    descRu:'Построена с советской помощью в 1970 г. Создала озеро Насер — одно из крупнейших искусственных озёр мира (5250 км²).' },
  { id:91, name:'Mohammed bin Rashid Solar Park', nameRu:'Солнечный парк им. Мухаммеда бин Рашида', type:'solar',
    lng:55.370, lat:24.870, capacity:5000, country:'UAE', countryRu:'ОАЭ',
    river:null, status:'active', year:2013, annual:'10.8 TWh', units:null,
    img: null,
    desc:'World\'s largest single-site solar park, located in the Dubai desert. Will reach 5,000 MW across multiple phases. Includes CSP, PV, and floating solar technologies.',
    descRu:'Крупнейший в мире солнечный парк на одной площадке, в пустыне Дубая. Достигнет 5000 МВт в нескольких фазах. Включает КСП, ФЭП и плавучие солнечные технологии.' },
  { id:92, name:'Kendal Power Station', nameRu:'ТЭС Кендал', type:'coal',
    lng:29.143, lat:-26.092, capacity:4116, country:'South Africa', countryRu:'ЮАР',
    river:null, status:'active', year:1988, annual:'20 TWh', units:6,
    img: null,
    desc:'One of the largest coal power stations in Africa. Located in Mpumalanga Province, part of South Africa\'s coal-dominated energy mix which causes severe regional air pollution.',
    descRu:'Одна из крупнейших угольных электростанций Африки. Расположена в провинции Мпумаланга, вносит основной вклад в угольную энергетику ЮАР.' },
]

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

export default function DashboardPage() {
  const containerRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [lang, setLang] = useState('en')
  const tr = T[lang]

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

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')

    map.on('load', () => {
      map.setTerrain({ source: 'terrain', exaggeration: 2.2 })

      // Pollution / exclusion zones
      const zoneFeatures = powerPlants
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

      // Markers
      powerPlants.forEach(plant => {
        const cfg  = TYPE_CFG[plant.type] ?? TYPE_CFG.hydro
        const size = markerSize(plant.capacity)
        const bg   = plant.status === 'construction' ? '#f59e0b' : cfg.color

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
        el.addEventListener('click', () => setSelected(plant))

        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([plant.lng, plant.lat])
          .addTo(map)
      })
    })

    requestAnimationFrame(() => map.resize())
    return () => map.remove()
  }, [])

  const s = selected
  const cfg = s ? (TYPE_CFG[s.type] ?? TYPE_CFG.hydro) : null
  const typeColor = cfg?.color ?? '#3b82f6'
  const typeLabel = cfg ? cfg[lang] : ''
  const plantName = s ? (lang === 'ru' ? s.nameRu : s.name) : ''
  const plantNameAlt = s ? (lang === 'ru' ? s.name : s.nameRu) : ''
  const desc = s ? (lang === 'ru' && s.descRu ? s.descRu : s.desc) : ''
  const countryName = s ? (lang === 'ru' && s.countryRu ? s.countryRu : s.country) : ''
  const riverName = s ? (lang === 'ru' && s.riverRu ? s.riverRu : s.river) : null
  const hasPollution = s && cfg && cfg.pollution > 0

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
            <input className={styles.searchInput} placeholder={tr.search} />
          </div>
          <div className={styles.navRight}>
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
        <button className={styles.sidePanelClose} onClick={() => setSelected(null)}>✕</button>

        {s && (
          <>
            {s.img
              ? <img src={s.img} alt={plantName} className={styles.sidePanelImg}
                  onError={e => { e.currentTarget.style.display = 'none' }} />
              : <div className={styles.sidePanelImgPlaceholder}
                  style={{ background: `linear-gradient(135deg, ${typeColor}cc 0%, ${typeColor}33 100%)` }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" opacity="0.9"
                    dangerouslySetInnerHTML={{ __html: ICONS[s.type] ?? ICONS.hydro }} />
                </div>
            }

            <div className={styles.sidePanelBody}>
              <div className={styles.sidePanelBadges}>
                <span className={styles.typeBadge} style={{ background: typeColor }}>{typeLabel}</span>
                <span className={styles.statusBadge}
                  style={{ color: s.status === 'active' ? '#10b981' : '#f59e0b' }}>
                  ● {s.status === 'active' ? tr.active : tr.construction}
                </span>
              </div>

              <h2 className={styles.sidePanelName}>{plantName}</h2>
              <p className={styles.sidePanelNameAlt}>{plantNameAlt}</p>

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

              <p className={styles.sidePanelDesc}>{desc}</p>

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
