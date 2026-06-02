import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SSRA Academy'
const SUPPORT_EMAIL = 'support@ssracourses.com'
const APPLY_URL = 'https://ssracourses.com/apply'

interface VerificationRejectedProps {
  studentName?: string
  courseName?: string
  adminNotes?: string
}

const VerificationRejectedEmail = ({
  studentName,
  courseName,
  adminNotes,
}: VerificationRejectedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Update on your {SITE_NAME} verification</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {studentName ? `Hi ${studentName},` : 'Update on your verification'}
        </Heading>

        <Text style={text}>
          Thank you for applying to{' '}
          {courseName ? <strong>{courseName}</strong> : `${SITE_NAME}`}. After reviewing
          your submission, our team was unable to approve your verification at this time.
        </Text>

        {adminNotes ? (
          <Section style={noteBox}>
            <Text style={noteLabel}>Reason from our reviewer</Text>
            <Text style={noteBody}>{adminNotes}</Text>
          </Section>
        ) : (
          <Text style={text}>
            Common reasons include: unclear diploma scan, missing graduation year, or a
            degree outside the sports science / rehabilitation field.
          </Text>
        )}

        <Text style={text}>
          You're welcome to submit a new application with updated documents whenever you're
          ready — there's no penalty for reapplying.
        </Text>

        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={APPLY_URL} style={button}>
            Submit a new application
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Questions? Reply to this email or write to{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</a>.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VerificationRejectedEmail,
  subject: 'Update on your SSRA Academy verification',
  displayName: 'Verification rejected',
  previewData: {
    studentName: 'Ahmed',
    courseName: 'Medizinisches Deutsch',
    adminNotes: 'Diploma scan was not legible — please resubmit a clearer copy.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 18px' }
const noteBox = {
  backgroundColor: '#fef2f2',
  borderLeft: '3px solid #dc2626',
  padding: '14px 16px',
  borderRadius: '8px',
  margin: '20px 0',
}
const noteLabel = { fontSize: '12px', color: '#991b1b', margin: '0 0 4px', fontWeight: 'bold' as const }
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
