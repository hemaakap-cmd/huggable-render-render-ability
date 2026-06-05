import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Text, Section, Row, Column, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SSRA Academy'
const LOGO_URL = 'https://ssracourses.com/logo-mark-1024.png'

interface Props {
  studentName?: string
  studentEmail?: string
  courseName?: string
  orderNumber?: string
  amountPaid?: string
  environment?: string
  transactionId?: string
}

const Email = ({ studentName, studentEmail, courseName, orderNumber, amountPaid, environment, transactionId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New purchase: {courseName ?? 'course'} · {amountPaid ?? ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>💰 New purchase</Heading>
          <Text style={subhead}>A student just enrolled on {SITE_NAME}.</Text>
        </Section>

        <Section style={card}>
          <Row style={kvRow}><Column style={k}>Student</Column><Column style={v}>{studentName ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Email</Column><Column style={v}>{studentEmail ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Course</Column><Column style={v}>{courseName ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Amount</Column><Column style={v}>{amountPaid ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Order #</Column><Column style={v}>{orderNumber ?? '—'}</Column></Row>
          <Hr style={hr} />
          <Row style={kvRow}><Column style={k}>Environment</Column><Column style={v}>{environment ?? '—'}</Column></Row>
          <Row style={kvRow}><Column style={k}>Transaction</Column><Column style={v}>{transactionId ?? '—'}</Column></Row>
        </Section>

        <Text style={footer}>You receive this notice for every successful payment. Manage via the admin dashboard.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `New purchase: ${d.courseName ?? 'Course'} (${d.amountPaid ?? ''})`,
  displayName: 'Admin: purchase notification',
  previewData: {
    studentName: 'Test Student', studentEmail: 'test@example.com',
    courseName: 'Medical German', orderNumber: 'SSRA-ENR-2026-ABCDEF',
    amountPaid: 'EUR 19.00', environment: 'sandbox', transactionId: 'txn_xxx',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = { paddingBottom: '12px' }
const h1 = { fontSize: '22px', margin: '0', color: '#0f172a' }
const subhead = { fontSize: '14px', color: '#64748b', margin: '4px 0 0' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginTop: '16px' }
const kvRow = { padding: '6px 0' }
const k = { color: '#64748b', fontSize: '13px', width: '40%' }
const v = { color: '#0f172a', fontSize: '13px', fontWeight: 600 }
const hr = { borderColor: '#e2e8f0', margin: '12px 0' }
const footer = { fontSize: '11px', color: '#94a3b8', marginTop: '20px', textAlign: 'center' as const }
