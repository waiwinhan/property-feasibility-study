'use strict'

/**
 * PDF export via Puppeteer + system Chromium.
 *
 * Requires PUPPETEER_EXECUTABLE_PATH to be set (done automatically in the
 * Docker image via server.Dockerfile ENV).  When running locally without
 * Docker the function throws a PdfUnavailableError so callers can return 501.
 *
 * PDF_BASE_URL (env) — the internal URL Puppeteer uses to load the page.
 *   In Docker compose set this to the client service name, e.g. http://client
 *   Defaults to CLIENT_URL.
 */

const puppeteer = require('puppeteer-core')

class PdfUnavailableError extends Error {
  constructor() {
    super('PDF export requires a Docker environment with Chromium installed. Set PUPPETEER_EXECUTABLE_PATH.')
    this.code = 'PDF_UNAVAILABLE'
  }
}

function getBaseUrl() {
  return process.env.PDF_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173'
}

async function launchBrowser() {
  const execPath = process.env.PUPPETEER_EXECUTABLE_PATH
  if (!execPath) throw new PdfUnavailableError()

  return puppeteer.launch({
    executablePath: execPath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
    headless: true,
  })
}

/**
 * Generate a PDF of the Management Dashboard for a given project.
 * @param {string} projectId
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateDashboardPdf(projectId) {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    const url = `${getBaseUrl()}/project/${projectId}/dashboard?print=true`
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })

    // Wait for charts to finish rendering
    await page.waitForSelector('[data-testid="dashboard-ready"], .recharts-surface', { timeout: 10_000 }).catch(() => {})

    const pdf = await page.pdf({
      format: 'A3',
      landscape: true,
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

/**
 * Generate a PDF of the Feasibility Study page for a given project.
 * @param {string} projectId
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateFeasibilityPdf(projectId) {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    // The study page lists all phases; ?print=true collapses navigation chrome
    const url = `${getBaseUrl()}/project/${projectId}/study?print=true`
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })

    await page.waitForSelector('table, [data-testid="study-ready"]', { timeout: 10_000 }).catch(() => {})

    const pdf = await page.pdf({
      format: 'A3',
      landscape: true,
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

module.exports = { generateDashboardPdf, generateFeasibilityPdf, PdfUnavailableError }
