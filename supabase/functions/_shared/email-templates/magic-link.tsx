/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl?: string
  token?: string
}

export const MagicLinkEmail = ({ siteName, token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} login code{token ? `: ${token}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your login code</Heading>
        <Text style={text}>
          Enter the 6-digit code below on the <strong>{siteName}</strong> login page.
          This code will expire shortly.
        </Text>

        {token && (
          <Section style={codeBox}>
            <Text style={codeLabel}>Your login code</Text>
            <Text style={codeText}>{token}</Text>
          </Section>
        )}

        <Text style={footer}>
          If you didn't request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 18px' }
const codeBox = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
  padding: '18px 20px', margin: '8px 0 22px', textAlign: 'center' as const,
}
const codeLabel = {
  fontSize: '11px', color: '#64748b', textTransform: 'uppercase' as const,
  letterSpacing: '1px', margin: '0 0 6px', fontWeight: 600 as const,
}
const codeText = {
  fontSize: '30px', fontWeight: 'bold' as const, color: '#0f172a',
  letterSpacing: '8px', margin: 0, fontFamily: 'monospace',
}
const button = {
  backgroundColor: '#1d4ed8', color: '#ffffff', fontSize: '14px',
  borderRadius: '8px', padding: '12px 22px', textDecoration: 'none', fontWeight: 600 as const,
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '28px 0 0' }
