import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import countryTopology from 'world-atlas/countries-110m.json'

const countries = feature(countryTopology, countryTopology.objects.countries).features
const graticule = geoGraticule10()

function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function hashCountryName(name = '') {
  return [...name].reduce((hash, char) => hash + char.charCodeAt(0), 0)
}

function createProjection(width, height) {
  return geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2])
    .precision(0.2)
}

function paintOcean(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#02152f')
  gradient.addColorStop(0.45, '#062a56')
  gradient.addColorStop(1, '#010b1d')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(34, 211, 238, 0.05)'
  for (let index = 0; index < 160; index += 1) {
    const x = (Math.sin(index * 12.9898) * 43758.5453) % 1
    const y = (Math.sin(index * 78.233) * 24634.6345) % 1
    ctx.beginPath()
    ctx.arc(Math.abs(x) * width, Math.abs(y) * height, 0.65 + (index % 4) * 0.18, 0, Math.PI * 2)
    ctx.fill()
  }
}

function paintGraticule(ctx, path) {
  ctx.save()
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.11)'
  ctx.lineWidth = 0.65
  ctx.beginPath()
  path(graticule)
  ctx.stroke()
  ctx.restore()
}

function paintCountries(ctx, path) {
  countries.forEach((country) => {
    const hash = hashCountryName(country.properties.name)
    const green = 60 + (hash % 36)
    const tan = 62 + (hash % 24)
    const isDry = hash % 5 === 0

    ctx.beginPath()
    path(country)
    ctx.fillStyle = isDry ? `rgb(${tan + 48}, ${tan + 36}, ${tan})` : `rgb(${28}, ${green + 42}, ${green})`
    ctx.fill()
  })

  ctx.beginPath()
  countries.forEach((country) => path(country))
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.24)'
  ctx.lineWidth = 0.55
  ctx.stroke()
}

function paintRelief(ctx, path, width, height) {
  ctx.fillStyle = '#070b13'
  ctx.fillRect(0, 0, width, height)

  countries.forEach((country) => {
    const hash = hashCountryName(country.properties.name)
    ctx.beginPath()
    path(country)
    ctx.fillStyle = `rgb(${94 + (hash % 46)}, ${94 + (hash % 46)}, ${94 + (hash % 46)})`
    ctx.fill()
  })

  ctx.globalAlpha = 0.32
  for (let y = 0; y < height; y += 8) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + (y % 24) / 300})`
    ctx.beginPath()
    ctx.moveTo(0, y + Math.sin(y * 0.04) * 3)
    ctx.bezierCurveTo(width * 0.25, y - 8, width * 0.7, y + 8, width, y + Math.cos(y * 0.03) * 3)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

export function createEarthCanvases({ width = 2048, height = 1024 } = {}) {
  const mapCanvas = createCanvas(width, height)
  const bumpCanvas = createCanvas(width, height)
  const projection = createProjection(width, height)
  const path = geoPath(projection, mapCanvas.getContext('2d'))
  const bumpPath = geoPath(projection, bumpCanvas.getContext('2d'))

  paintOcean(mapCanvas.getContext('2d'), width, height)
  paintGraticule(mapCanvas.getContext('2d'), path)
  paintCountries(mapCanvas.getContext('2d'), path)
  paintRelief(bumpCanvas.getContext('2d'), bumpPath, width, height)

  return { mapCanvas, bumpCanvas, countries }
}
