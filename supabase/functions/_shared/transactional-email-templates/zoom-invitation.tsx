import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Row, Column, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SSRA Academy'
const CONTACT_EMAIL = 'support@ssracourses.com'
const LOGO_URL = 'https://vffcarzhfxlqzfwrhzau.supabase.co/storage/v1/object/public/ssra-course-images/brand/ssra-logo.png'

interface Props {
  studentName?: string
  title?: string
  description?: string
  scheduledAt?: string
  durationMinutes?: number | string
  zoomLink?: string
  zoomPassword?: string
  trackingPixelUrl?: string
}

const ZoomInvitationEmail = ({
  studentName, title, description, scheduledAt, durationMinutes, zoomLink, zoomPassword, trackingPixelUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're invited: {title ?? 'Live Zoom session'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Row>
            <Column style={{ width: '72px', verticalAlign: 'middle' as const }}>
              <Img src={LOGO_URL} width="56" height="56" alt={SITE_NAME} style={{ borderRadius: '12px', display: 'block' }} />
            </Column>
            <Column>
              <Text style={brandName}>{SITE_NAME}</Text>
              <Text style={brandTag}>SPORTS SCIENCE &amp; REHABILITATION</Text>
            </Column>
          </Row>
        </Section>

        <Section style={header}>
          <Heading style={h1}>You're invited to a live Zoom session 🎥</Heading>
          <Text style={subhead}>Hi {studentName ?? 'there'}, you have a new invitation from {SITE_NAME}.</Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>{title ?? 'Live session'}</Heading>
          {description ? <Text style={desc}>{description}</Text> : null}
          <Row style={kvRow}><Column style={k}>When</Column><Column style={v}>{scheduledAt ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Duration</Column><Column style={v}>{durationMinutes ? `${durationMinutes} minutes` : '—'}</Column></Row>
          {zoomPassword ? (
            <Row style={kvRow}><Column style={k}>Passcode</Column><Column style={v}>{zoomPassword}</Column></Row>
          ) : null}
        </Section>

        {zoomLink ? (
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={zoomLink} style={btn}>Join the Zoom meeting</Button>
            <Text style={smallLink}>{zoomLink}</Text>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</a>.
        </Text>
        <Text style={footer}>{SITE_NAME} · ssracourses.com</Text>
        {trackingPixelUrl ? (
          <Img src={trackingPixelUrl} width="1" height="1" alt="" style={{ display: 'block', border: 0 }} />
        ) : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ZoomInvitationEmail,
  subject: (d: Record<string, any>) => `You're invited: ${d?.title ?? 'Live Zoom session'}`,
  displayName: 'Zoom invitation',
  previewData: {
    studentName: 'Ahmed',
    title: 'Open Q&A with Dr. Hemaa',
    description: 'Join us for a free open session covering exam tips.',
    scheduledAt: 'June 20, 2026 · 19:00 (Cairo)',
    durationMinutes: 60,
    zoomLink: 'https://zoom.us/j/123456789',
    zoomPassword: '123456',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }
const brandBar = { marginBottom: '12px' }
const brandName = { fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }
const brandTag = { fontSize: '10px', letterSpacing: '1px', color: '#64748b', margin: 0 }
const header = { borderBottom: '3px solid #2563eb', paddingBottom: '16px', marginBottom: '24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }
const subhead = { fontSize: '14px', color: '#475569', margin: '0' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const card = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '18px 20px', margin: '0 0 8px' }
const desc = { fontSize: '14px', color: '#334155', margin: '0 0 12px', lineHeight: '20px' }
const kvRow = { padding: '5px 0' }
const k = { fontSize: '13px', color: '#64748b', width: '40%' }
const v = { fontSize: '14px', color: '#0f172a', fontWeight: 600 }
const btn = { background: '#2563eb', color: '#ffffff', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const smallLink = { fontSize: '12px', color: '#2563eb', margin: '10px 0 0', wordBreak: 'break-all' as const }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#64748b', margin: '0 0 6px' }
const link = { color: '#2563eb', textDecoration: 'underline' }
