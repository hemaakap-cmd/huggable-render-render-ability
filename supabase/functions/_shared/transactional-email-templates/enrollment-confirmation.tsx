import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Row, Column, Img, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SSRA Academy'
const SITE_URL = 'https://ssracourses.com'
const CONTACT_EMAIL = 'support@ssracourses.com'
const SITE_ADDRESS = 'Bracknellstraße 41, 51379 Leverkusen, Germany'
const DASHBOARD_URL = 'https://ssracourses.com/dashboard/courses'
const LOGO_URL = 'https://vffcarzhfxlqzfwrhzau.supabase.co/storage/v1/object/public/ssra-course-images/brand/ssra-logo.png'


interface EnrollmentConfirmationProps {
  studentName?: string
  courseName?: string
  startDate?: string
  startTime?: string
  duration?: string
  instructor?: string
  courseFormat?: string
  orderNumber?: string
  amountPaid?: string
  paymentDate?: string
}

const EnrollmentConfirmationEmail = ({
  studentName,
  courseName,
  startDate,
  startTime,
  duration,
  instructor,
  courseFormat,
  orderNumber,
  amountPaid,
  paymentDate,
}: EnrollmentConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're enrolled in {courseName ?? 'your course'} — starts {startDate ?? 'soon'}</Preview>
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
          <Heading style={h1}>You're enrolled 🎉</Heading>
          <Text style={subhead}>Welcome, {studentName ?? 'student'}. Here are your course details.</Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>{courseName ?? 'Your course'}</Heading>
          <Row style={kvRow}><Column style={k}>Start date</Column><Column style={v}>{startDate ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Start time</Column><Column style={v}>{startTime ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Duration</Column><Column style={v}>{duration ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Format</Column><Column style={v}>{courseFormat ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Instructor</Column><Column style={v}>{instructor ?? '—'}</Column></Row>
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={DASHBOARD_URL} style={btn}>Access your course</Button>
        </Section>

        <Section style={cardSecondary}>
          <Heading as="h3" style={h3}>Order summary</Heading>
          <Row style={kvRow}><Column style={k}>Order number</Column><Column style={v}>{orderNumber ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Amount paid</Column><Column style={v}>{amountPaid ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Payment date</Column><Column style={v}>{paymentDate ?? '—'}</Column></Row>
        </Section>

        <Hr style={hr} />

        <Section style={contactCard}>
          <Row>
            <Column style={{ width: '56px', verticalAlign: 'middle' as const }}>
              <Img src={LOGO_URL} width="44" height="44" alt={SITE_NAME} style={{ borderRadius: '10px', display: 'block' }} />
            </Column>
            <Column style={{ paddingLeft: '12px', verticalAlign: 'middle' as const }}>
              <Text style={contactName}>{SITE_NAME}</Text>
              <Text style={contactMeta}>
                <Link href={SITE_URL} style={link}>{SITE_URL.replace('https://', '')}</Link>
                {'  ·  '}
                <Link href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</Link>
              </Text>
              <Text style={contactMeta}>{SITE_ADDRESS}</Text>
            </Column>
          </Row>
        </Section>
      </Container>
    </Body>
  </Html>
)


export const template = {
  component: EnrollmentConfirmationEmail,
  subject: (d: Record<string, any>) =>
    `You're enrolled — ${d?.courseName ?? 'your course'} starts ${d?.startDate ?? 'soon'}`,
  displayName: 'Enrollment confirmation',
  previewData: {
    studentName: 'Ahmed',
    courseName: 'Medizinisches Deutsch',
    startDate: 'June 15, 2026',
    startTime: '18:00 (Cairo)',
    duration: '8 weeks · 2h/session',
    instructor: 'Dr. Hemaa Kap',
    courseFormat: 'live',
    orderNumber: 'SSRA-ENR-2026-A1B2C3',
    amountPaid: '€19.00',
    paymentDate: 'June 2, 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }
const header = { borderBottom: '3px solid #2563eb', paddingBottom: '16px', marginBottom: '24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }
const subhead = { fontSize: '14px', color: '#475569', margin: '0' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const h3 = { fontSize: '14px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const card = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '18px 20px', margin: '0 0 8px' }
const cardSecondary = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', margin: '0 0 20px' }
const kvRow = { padding: '5px 0' }
const k = { fontSize: '13px', color: '#64748b', width: '40%' }
const v = { fontSize: '14px', color: '#0f172a', fontWeight: 600 }
const btn = { background: '#2563eb', color: '#ffffff', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#64748b', margin: '0 0 6px' }
const link = { color: '#2563eb', textDecoration: 'underline' }
const brandBar = { background: '#0f172a', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px' }
const brandBadge = { background: '#f59e0b', color: '#0f172a', fontWeight: 'bold' as const, fontSize: '20px', width: '44px', height: '44px', borderRadius: '10px', textAlign: 'center' as const, verticalAlign: 'middle' as const, lineHeight: '44px' }
const brandTextCell = { paddingLeft: '14px', verticalAlign: 'middle' as const }
const brandName = { fontSize: '17px', fontWeight: 700 as const, color: '#ffffff', margin: 0, letterSpacing: '0.3px' }
const brandTag = { fontSize: '10px', color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', letterSpacing: '1.2px' }
