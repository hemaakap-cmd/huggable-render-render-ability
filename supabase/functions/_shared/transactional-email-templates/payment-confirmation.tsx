import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Row, Column, Img, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SSRA Academy'
const SITE_URL = 'https://ssracourses.com'
const CONTACT_EMAIL = 'support@ssracourses.com'
const CONTACT_URL = 'https://ssracourses.com/contact'
const SITE_ADDRESS = 'Bracknellstraße 41, 51379 Leverkusen, Germany'
const LOGO_URL = 'https://vffcarzhfxlqzfwrhzau.supabase.co/storage/v1/object/public/ssra-course-images/brand/ssra-logo.png'


interface PaymentConfirmationProps {
  studentName?: string
  courseName?: string
  orderNumber?: string
  amountPaid?: string
  paymentDate?: string
}

const PaymentConfirmationEmail = ({
  studentName,
  courseName,
  orderNumber,
  amountPaid,
  paymentDate,
}: PaymentConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment received — {courseName ?? 'your course'} · {SITE_NAME}</Preview>
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
          <Heading style={h1}>Payment received ✓</Heading>
          <Text style={subhead}>Thank you for your purchase, {studentName ?? 'student'}.</Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>Receipt</Heading>
          <Row style={kvRow}><Column style={k}>Order number</Column><Column style={v}>{orderNumber ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Course</Column><Column style={v}>{courseName ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Amount paid</Column><Column style={v}>{amountPaid ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Payment date</Column><Column style={v}>{paymentDate ?? '—'}</Column></Row>
        </Section>

        <Text style={text}>
          Your enrollment is now active. A separate email with course access details
          (start date, time, instructor) is on its way.
        </Text>

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
                {'  ·  '}
                <Link href={CONTACT_URL} style={link}>Contact</Link>
              </Text>
              <Text style={contactMeta}>{SITE_ADDRESS}</Text>
              <Text style={contactMeta}>Invoice issued by {SITE_NAME} via Paddle (Merchant of Record).</Text>
            </Column>
          </Row>
        </Section>

      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentConfirmationEmail,
  subject: (d: Record<string, any>) =>
    `Payment received — ${d?.courseName ?? 'your course'} · ${SITE_NAME}`,
  displayName: 'Payment confirmation',
  previewData: {
    studentName: 'Ahmed',
    courseName: 'Medizinisches Deutsch',
    orderNumber: 'SSRA-ENR-2026-A1B2C3',
    amountPaid: '€19.00',
    paymentDate: 'June 2, 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }
const header = { borderBottom: '3px solid #10b981', paddingBottom: '16px', marginBottom: '24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }
const subhead = { fontSize: '14px', color: '#475569', margin: '0' }
const h2 = { fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const card = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', margin: '0 0 20px' }
const kvRow = { padding: '6px 0' }
const k = { fontSize: '13px', color: '#64748b', width: '40%' }
const v = { fontSize: '14px', color: '#0f172a', fontWeight: 600 }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.65', margin: '0 0 14px' }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#64748b', margin: '0 0 6px' }
const link = { color: '#2563eb', textDecoration: 'underline' }
const brandBar = { background: '#0f172a', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px' }
const brandBadge = { background: '#f59e0b', color: '#0f172a', fontWeight: 'bold' as const, fontSize: '20px', width: '44px', height: '44px', borderRadius: '10px', textAlign: 'center' as const, verticalAlign: 'middle' as const, lineHeight: '44px' }
const brandTextCell = { paddingLeft: '14px', verticalAlign: 'middle' as const }
const brandName = { fontSize: '17px', fontWeight: 700 as const, color: '#ffffff', margin: 0, letterSpacing: '0.3px' }
const brandTag = { fontSize: '10px', color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', letterSpacing: '1.2px' }
