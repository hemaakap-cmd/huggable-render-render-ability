/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl?: string
  token?: string
}

export const SignupEmail = ({
  siteName, siteUrl, recipient, token,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} verification code{token ? `: ${token}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>!
        </Text>
        <Text style={text}>
          Please confirm your email address (<strong>{recipient}</strong>) by entering the
          6-digit verification code below on the signup page:
        </Text>

        {token && (
          <Section style={codeBox}>
            <Text style={codeLabel}>Your verification code</Text>
            <Text style={codeText}>{token}</Text>
          </Section>
        )}

        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 18px' }
const link = { color: '#1d4ed8', textDecoration: 'underline' }
const codeBox = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '18px 20px',
  margin: '8px 0 22px',
  textAlign: 'center' as const,
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
