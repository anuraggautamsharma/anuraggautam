#!/usr/bin/env node
// Field Notes setup on Resend (PLAN_V3 §4). Idempotent: looks everything up by name or key,
// creates only what's missing, and prints the env lines to paste into Vercel.
//
//   RESEND_API_KEY=re_... node scripts/newsletter-setup.mjs
//
// Reads RESEND_API_KEY from the environment or from .env.local. Sends nothing to anyone.

import { readFileSync, existsSync } from 'node:fs'
import { Resend } from 'resend'

const SEGMENT = 'Field Notes'
const TOPICS = [
  { env: 'RESEND_TOPIC_NOTES_ID', name: 'Field Notes', description: 'Every new field note, the day it lands.', defaultSubscription: 'opt_in' },
  { env: 'RESEND_TOPIC_EVENTS_ID', name: 'Campfires & events', description: 'Invites to Campfires and Summit Sessions.', defaultSubscription: 'opt_out' },
  { env: 'RESEND_TOPIC_COMMUNITY_ID', name: 'The Rope Team', description: 'The founding list for the Rope Team.', defaultSubscription: 'opt_out' },
  { env: 'RESEND_TOPIC_COHORT_ID', name: 'Field School waitlist', description: 'First word when a Summit Route Cohort opens.', defaultSubscription: 'opt_out' },
]
const PROPERTIES = ['source', 'intent', 'role', 'building', 'consent_at', 'consent_v']

function loadEnvLocal() {
  const file = new URL('../.env.local', import.meta.url)
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

const fail = (msg) => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

loadEnvLocal()
const key = process.env.RESEND_API_KEY?.trim()
if (!key) fail('RESEND_API_KEY is not set (environment or .env.local).')
const resend = new Resend(key)

// Segment
const segs = await resend.segments.list({ limit: 100 })
if (segs.error) fail(`segments.list: ${segs.error.message}`)
let segment = segs.data.data.find((s) => s.name === SEGMENT)
if (!segment) {
  const r = await resend.segments.create({ name: SEGMENT })
  if (r.error) fail(`segments.create: ${r.error.message}`)
  segment = r.data
  console.log(`+ segment "${SEGMENT}"`)
} else console.log(`= segment "${SEGMENT}"`)

// Topics
const tl = await resend.topics.list()
if (tl.error) fail(`topics.list: ${tl.error.message}`)
const topicIds = {}
for (const t of TOPICS) {
  let found = tl.data.data.find((x) => x.name === t.name)
  if (!found) {
    const r = await resend.topics.create({ name: t.name, description: t.description, defaultSubscription: t.defaultSubscription })
    if (r.error) fail(`topics.create(${t.name}): ${r.error.message}`)
    found = r.data
    console.log(`+ topic "${t.name}" (${t.defaultSubscription})`)
  } else console.log(`= topic "${t.name}"`)
  topicIds[t.env] = found.id
}

// Contact properties (all strings)
const pl = await resend.contactProperties.list({ limit: 100 })
if (pl.error) fail(`contactProperties.list: ${pl.error.message}`)
const have = new Set(pl.data.data.map((p) => p.key))
for (const k of PROPERTIES) {
  if (have.has(k)) {
    console.log(`= property "${k}"`)
    continue
  }
  const r = await resend.contactProperties.create({ key: k, type: 'string', fallbackValue: '' })
  if (r.error) fail(`contactProperties.create(${k}): ${r.error.message}`)
  console.log(`+ property "${k}"`)
}

console.log('\nPaste into Vercel (Production and Preview):\n')
console.log(`RESEND_SEGMENT_ID=${segment.id}`)
for (const t of TOPICS) console.log(`${t.env}=${topicIds[t.env]}`)
console.log('\nAlso set SUBSCRIBE_SECRET, NEWSLETTER_FROM, NEWSLETTER_POSTAL_ADDRESS and CRON_SECRET (see .env.example).')
