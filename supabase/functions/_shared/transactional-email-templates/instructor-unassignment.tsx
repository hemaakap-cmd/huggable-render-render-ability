import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Row, Column, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME     = 'SSRA Academy'
const SITE_URL      = 'https://ssracourses.com'
const CONTACT_EMAIL = 'info@ssracourses.com'
const DASHBOARD_URL = 'https://ssracourses.com/dashboard/courses'
const LOGO_URL      = 'https://vffcarzhfxlqzfwrhzau.supabase.co/storage/v1/object/public/ssra-course-images/brand/ssra-logo.png'

interface Props {
  studentName?: string
  courseName?: string
  instructorName?: string
}

const InstructorUnassignmentEmail = ({
  studentName, courseName, instructorName,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Instructor update for {courseName ?? 'your course'}</Preview>
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
          <Heading style={h1}>Instructor update</Heading>
          <Text style={subhead}>
            Hi {studentName ?? 'there'}, we wanted to let you know about a change to your course.
          </Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>{courseName ?? 'Your course'}</Heading>
          <Text style={cardText}>
            {instructorName ?? 'Your instructor'} is no longer assigned to this course.
            A new instructor will be assigned shortly and you will be notified as soon as that happens.
            Your enrollment and access to all sessions and materials are unaffected.
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={DASHBOARD_URL} style={btn}>Go to my courses</Button>
        </Section>

        <Text style={note}>
          If you have any questions in the meantime, our team is happy to help.
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
  component: InstructorUnassignmentEmail,
  subject: (d: Record<string, any>) =>
    `Instructor update — ${d?.courseName ?? 'your course'}`,
  displayName: 'Instructor unassigned',
  previewData: {
    studentName: 'Ahmed',
    courseName: 'Medizinisches Deutsch',
    instructorName: 'Dr. Mohamed E.',
  },
} satisfies TemplateEntry

const main          = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container     = { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }
const header        = { borderBottom: '3px solid #b45309', paddingBottom: '16px', marginBottom: '24px' }
const h1            = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px' }
const subhead       = { fontSize: '14px', color: '#475569', margin: '0' }
const h2            = { fontSize: '17px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const card          = { background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '18px 20px', margin: '0 0 8px' }
const cardText      = { fontSize: '14px', color: '#0f172a', margin: 0, lineHeight: 1.6 }
const btn           = { background: '#b45309', color: '#ffffff', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const hr            = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }
const note          = { fontSize: '12px', color: '#64748b', margin: '12px 0 0', textAlign: 'center' as const }
const footer        = { fontSize: '12px', color: '#64748b', margin: '0 0 6px' }
const link          = { color: '#b45309', textDecoration: 'underline' }
const brandBar      = { background: '#0f172a', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px' }
const brandTextCell = { paddingLeft: '14px', verticalAlign: 'middle' as const }
const brandName     = { fontSize: '17px', fontWeight: 700 as const, color: '#ffffff', margin: 0, letterSpacing: '0.3px' }
const brandTag      = { fontSize: '10px', color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', letterSpacing: '1.2px' }
