import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SSRA Academy'

interface TestEmailProps {
  name?: string
}

const TestEmail = ({ name }: TestEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Test email from {SITE_NAME} — delivery verification</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>✓ Email Delivery Test</Heading>
        </Section>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hello,'}
        </Text>
        <Text style={text}>
          This is a test email from <strong>{SITE_NAME}</strong> sent through
          <strong> notify.ssracourses.com</strong>.
        </Text>
        <Text style={text}>
          If you are reading this, the email infrastructure is configured correctly
          and emails are being delivered successfully. 🎉
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Sent from {SITE_NAME} · ssracourses.com
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TestEmail,
  subject: 'SSRA Academy — Email Delivery Test',
  displayName: 'Delivery test',
  previewData: { name: 'Hemaa' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }
const header = { borderBottom: '3px solid #f59e0b', paddingBottom: '16px', marginBottom: '24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.65', margin: '0 0 14px' }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#64748b', margin: '0' }
