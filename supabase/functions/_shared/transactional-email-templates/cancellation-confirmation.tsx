import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Row, Column, Img, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SSRA Academy'
const SITE_URL = 'https://ssracourses.com'
const CONTACT_EMAIL = 'support@ssracourses.com'
const SITE_ADDRESS = 'Bracknellstraße 41, 51379 Leverkusen, Germany'
const LOGO_URL = 'https://vffcarzhfxlqzfwrhzau.supabase.co/storage/v1/object/public/ssra-course-images/brand/ssra-logo.png'

interface CancellationConfirmationProps {
  studentName?: string
  courseName?: string
  orderNumber?: string
  amountPaid?: string
  refundIssued?: boolean
  refundAmount?: string
  administrativeFee?: string | null
  refundPolicyNote?: string | null
  cancellationDate?: string
}

const CancellationConfirmationEmail = ({
  studentName,
  courseName,
  orderNumber,
  amountPaid,
  refundIssued,
  refundAmount,
  cancellationDate,
}: CancellationConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your enrollment in {courseName ?? 'your course'} has been cancelled · {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Brand header */}
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
          <Heading style={h1}>Enrollment cancelled</Heading>
          <Text style={subhead}>Hi {studentName ?? 'there'}, we've processed your cancellation request.</Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>Cancellation summary</Heading>
          <Row style={kvRow}><Column style={k}>Course</Column><Column style={v}>{courseName ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Order number</Column><Column style={v}>{orderNumber ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Amount paid</Column><Column style={v}>{amountPaid ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Cancellation date</Column><Column style={v}>{cancellationDate ?? '—'}</Column></Row>
          <Row style={kvRow}>
            <Column style={k}>Refund</Column>
            <Column style={v}>
              {refundIssued ? `Issued — ${refundAmount ?? amountPaid ?? ''}` : 'Will be processed manually by our team'}
            </Column>
          </Row>
        </Section>

        <Text style={text}>
          {refundIssued
            ? 'Your refund has been issued. It may take 5–10 business days to appear on your statement, depending on your bank.'
            : 'Our team will process your refund manually and contact you shortly with the details.'}
        </Text>

        <Text style={text}>
          We're sorry to see you go. If you change your mind, you can re-enroll anytime at {' '}
          <Link href={SITE_URL} style={link}>{SITE_URL.replace('https://', '')}</Link>.
        </Text>

        <Hr style={hr} />

        {/* Branded contact footer */}
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
  component: CancellationConfirmationEmail,
  subject: (d: Record<string, any>) =>
    `Enrollment cancelled — ${d?.courseName ?? 'your course'} · ${SITE_NAME}`,
  displayName: 'Cancellation confirmation',
  previewData: {
    studentName: 'Ahmed',
    courseName: 'Medizinisches Deutsch',
    orderNumber: 'SSRA-ENR-2026-A1B2C3',
    amountPaid: '€19.00',
    refundIssued: true,
    refundAmount: '€19.00',
    cancellationDate: 'June 8, 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }
const header = { borderBottom: '3px solid #ef4444', paddingBottom: '16px', marginBottom: '24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }
const subhead = { fontSize: '14px', color: '#475569', margin: '0' }
const h2 = { fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const card = { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '18px 20px', margin: '0 0 20px' }
const kvRow = { padding: '6px 0' }
const k = { fontSize: '13px', color: '#64748b', width: '40%' }
const v = { fontSize: '14px', color: '#0f172a', fontWeight: 600 }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.65', margin: '0 0 14px' }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }
const link = { color: '#2563eb', textDecoration: 'underline' }
const brandBar = { background: '#0f172a', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px' }
const brandTextCell = { paddingLeft: '14px', verticalAlign: 'middle' as const }
const brandName = { fontSize: '17px', fontWeight: 700 as const, color: '#ffffff', margin: 0, letterSpacing: '0.3px' }
const brandTag = { fontSize: '10px', color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', letterSpacing: '1.2px' }
const contactCard = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', margin: '8px 0 0' }
const contactName = { fontSize: '14px', fontWeight: 700 as const, color: '#0f172a', margin: '0 0 2px' }
const contactMeta = { fontSize: '12px', color: '#64748b', margin: '0 0 2px', lineHeight: '1.5' }
