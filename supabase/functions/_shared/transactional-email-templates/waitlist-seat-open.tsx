import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Row, Column, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME     = 'SSRA Academy'
const SITE_URL      = 'https://ssracourses.com'
const CONTACT_EMAIL = 'info@ssracourses.com'
const LOGO_URL      = 'https://vffcarzhfxlqzfwrhzau.supabase.co/storage/v1/object/public/ssra-course-images/brand/ssra-logo.png'

interface Props {
  studentName?: string
  courseName?: string
  enrollUrl?: string
  expiresInHours?: number
}

const WaitlistSeatOpenEmail = ({
  studentName, courseName, enrollUrl, expiresInHours = 48,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A seat just opened in {courseName ?? 'your waitlisted course'}</Preview>
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
          <Heading style={h1}>A seat just opened up 🎉</Heading>
          <Text style={subhead}>Hi {studentName ?? 'there'}, you were next on the waitlist.</Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>{courseName ?? 'Your course'}</Heading>
          <Text style={cardText}>
            One of our students cancelled, so a seat is now available.
            You have <strong>{expiresInHours} hours</strong> to claim it before we offer it to the next person on the waitlist.
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={enrollUrl ?? SITE_URL} style={btn}>Enroll now</Button>
        </Section>

        <Text style={note}>
          If you no longer want to join, you can ignore this email — the seat will be released automatically.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</a>.
        </Text>
        <Text style={footer}>
          {SITE_NAME} · <a href={SITE_URL} style={link}>ssracourses.com</a>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WaitlistSeatOpenEmail,
  subject: (d: Record<string, any>) =>
    `A seat opened in ${d?.courseName ?? 'your waitlisted course'} — claim it within ${d?.expiresInHours ?? 48}h`,
  displayName: 'Waitlist seat open',
  previewData: {
    studentName: 'Ahmed',
    courseName: 'Medizinisches Deutsch',
    enrollUrl: 'https://ssracourses.com/courses/med-deutsch',
    expiresInHours: 48,
  },
} satisfies TemplateEntry

const main          = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container     = { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }
const header        = { borderBottom: '3px solid #2563eb', paddingBottom: '16px', marginBottom: '24px' }
const h1            = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }
const subhead       = { fontSize: '14px', color: '#475569', margin: '0' }
const h2            = { fontSize: '17px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const card          = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '18px 20px', margin: '0 0 8px' }
const cardText      = { fontSize: '14px', color: '#0f172a', margin: 0, lineHeight: 1.6 }
const btn           = { background: '#2563eb', color: '#ffffff', padding: '14px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }
const hr            = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }
const note          = { fontSize: '12px', color: '#64748b', margin: '12px 0 0', textAlign: 'center' as const }
const footer        = { fontSize: '12px', color: '#64748b', margin: '0 0 6px' }
const link          = { color: '#2563eb', textDecoration: 'underline' }
const brandBar      = { background: '#0f172a', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px' }
const brandTextCell = { paddingLeft: '14px', verticalAlign: 'middle' as const }
const brandName     = { fontSize: '17px', fontWeight: 700 as const, color: '#ffffff', margin: 0, letterSpacing: '0.3px' }
const brandTag      = { fontSize: '10px', color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', letterSpacing: '1.2px' }
