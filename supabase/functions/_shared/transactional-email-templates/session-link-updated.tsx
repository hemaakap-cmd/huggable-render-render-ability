import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Row, Column, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SSRA Academy'
const CONTACT_EMAIL = 'support@ssracourses.com'
const DASHBOARD_URL = 'https://ssracourses.com/dashboard/sessions'
const LOGO_URL = 'https://vffcarzhfxlqzfwrhzau.supabase.co/storage/v1/object/public/ssra-course-images/brand/ssra-logo.png'

interface Props {
  studentName?: string
  courseName?: string
  sessionTitle?: string
  scheduledAt?: string
  durationMinutes?: number | string
  instructor?: string
}

const SessionLinkUpdatedEmail = ({
  studentName, courseName, sessionTitle, scheduledAt, durationMinutes, instructor,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your live session link is ready — {sessionTitle ?? 'upcoming session'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Row>
            <Column style={{ width: '72px', verticalAlign: 'middle' as const }}>
              <Img src={LOGO_URL} width="56" height="56" alt={SITE_NAME} style={{ borderRadius: '12px', display: 'block' }} />
            </Column>
            <Column style={brandTextCell}>
              <Text style={brandName}>{SITE_NAME}</Text>
              <Text style={brandTag}>SPORTS SCIENCE &amp; REHABILITATION</Text>
            </Column>
          </Row>
        </Section>

        <Section style={header}>
          <Heading style={h1}>Your session link is ready 🎥</Heading>
          <Text style={subhead}>Hi {studentName ?? 'there'}, your instructor has published the Zoom link.</Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>{sessionTitle ?? 'Live session'}</Heading>
          <Row style={kvRow}><Column style={k}>Course</Column><Column style={v}>{courseName ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Scheduled</Column><Column style={v}>{scheduledAt ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Duration</Column><Column style={v}>{durationMinutes ? `${durationMinutes} minutes` : '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Instructor</Column><Column style={v}>{instructor ?? '—'}</Column></Row>
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={DASHBOARD_URL} style={btn}>Open my sessions</Button>
        </Section>

        <Text style={note}>
          For your security, the join link opens from inside your dashboard 30 minutes before the session starts.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</a>.
        </Text>
        <Text style={footer}>{SITE_NAME} · ssracourses.com</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SessionLinkUpdatedEmail,
  subject: (d: Record<string, any>) =>
    `Session link ready — ${d?.sessionTitle ?? 'your upcoming session'}`,
  displayName: 'Session link ready',
  previewData: {
    studentName: 'Ahmed',
    courseName: 'Medizinisches Deutsch',
    sessionTitle: 'Week 1 — Intro',
    scheduledAt: 'June 15, 2026 · 18:00 (Cairo)',
    durationMinutes: 60,
    instructor: 'Dr. Hemaa Kap',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }
const header = { borderBottom: '3px solid #2563eb', paddingBottom: '16px', marginBottom: '24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }
const subhead = { fontSize: '14px', color: '#475569', margin: '0' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const card = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '18px 20px', margin: '0 0 8px' }
const kvRow = { padding: '5px 0' }
const k = { fontSize: '13px', color: '#64748b', width: '40%' }
const v = { fontSize: '14px', color: '#0f172a', fontWeight: 600 }
const btn = { background: '#2563eb', color: '#ffffff', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }
const note = { fontSize: '12px', color: '#64748b', margin: '12px 0 0', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#64748b', margin: '0 0 6px' }
const link = { color: '#2563eb', textDecoration: 'underline' }
const brandBar = { background: '#0f172a', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px' }
const brandTextCell = { paddingLeft: '14px', verticalAlign: 'middle' as const }
const brandName = { fontSize: '17px', fontWeight: 700 as const, color: '#ffffff', margin: 0, letterSpacing: '0.3px' }
const brandTag = { fontSize: '10px', color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', letterSpacing: '1.2px' }
