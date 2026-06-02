import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SSRA Academy'
const SUPPORT_EMAIL = 'support@ssracourses.com'
const COURSES_URL = 'https://ssracourses.com/courses'

interface VerificationApprovedProps {
  studentName?: string
  courseName?: string
  adminNotes?: string
}

const VerificationApprovedEmail = ({
  studentName,
  courseName,
  adminNotes,
}: VerificationApprovedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} verification was approved — you can now enroll</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {studentName ? `Welcome aboard, ${studentName}!` : 'Your verification is approved'}
        </Heading>

        <Text style={text}>
          Great news — your sports science credentials have been verified by the{' '}
          {SITE_NAME} team. You now have access to enroll in{' '}
          {courseName ? <strong>{courseName}</strong> : 'our restricted programs'} and any
          other courses that require academic verification.
        </Text>

        {adminNotes ? (
          <Section style={noteBox}>
            <Text style={noteLabel}>Note from our team</Text>
            <Text style={noteBody}>{adminNotes}</Text>
          </Section>
        ) : null}

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={COURSES_URL} style={button}>
            Browse courses
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Need help? Reply to this email or contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</a>.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VerificationApprovedEmail,
  subject: 'Your SSRA Academy verification is approved',
  displayName: 'Verification approved',
  previewData: {
    studentName: 'Ahmed',
    courseName: 'Medizinisches Deutsch',
    adminNotes: 'Welcome — your diploma was clear and complete.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 18px' }
const noteBox = {
  backgroundColor: '#f1f5f9',
  borderLeft: '3px solid #1d6ef0',
  padding: '14px 16px',
  borderRadius: '8px',
  margin: '20px 0',
}
const noteLabel = { fontSize: '12px', color: '#64748b', margin: '0 0 4px', fontWeight: 'bold' as const }
const noteBody = { fontSize: '14px', color: '#0f172a', margin: 0, lineHeight: '1.5' }
const button = {
  backgroundColor: '#1d6ef0',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '28px 0 18px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '6px 0' }
const link = { color: '#1d6ef0', textDecoration: 'underline' }
