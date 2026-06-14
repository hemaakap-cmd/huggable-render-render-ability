import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Row, Column, Img, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SSRA Academy'
const SITE_URL = 'https://ssracourses.com'
const CONTACT_EMAIL = 'support@ssracourses.com'
const SITE_ADDRESS = 'Bracknellstraße 41, 51379 Leverkusen, Germany'
const LOGO_URL = 'https://vffcarzhfxlqzfwrhzau.supabase.co/storage/v1/object/public/ssra-course-images/brand/ssra-logo.png'

interface Props {
  studentName?: string
  courseName?: string
  courseNameAr?: string
  startDate?: string
  price?: string
  courseUrl?: string
}

const Email = ({ studentName, courseName, courseNameAr, startDate, price, courseUrl }: Props) => {
  const displayCourse = courseNameAr || courseName || 'كورس اللغة الألمانية المتخصصة في علوم الرياضة'
  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Preview>{`ذكّرنا نفسك — احجز مكانك في ${displayCourse}`}</Preview>
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
            <Heading style={h1}>مكانك لسه مستنيك 🎯</Heading>
            <Text style={subhead}>
              {`أهلاً ${studentName || 'بيك'}، لاحظنا إنك سجّلت معانا بس لسه ما حجزتش كورس. خلّي خطوتك الجاية في طريقك المهني الألماني تبدأ من النهارده.`}
            </Text>
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>{displayCourse}</Heading>
            <Text style={cardDesc}>
              كورس متخصص في تعليم اللغة الألمانية الطبية و الرياضية — بيأهلك تشتغل في ألمانيا في مجال العلاج الطبيعي و إعادة التأهيل.
            </Text>
            <Row style={kvRow}><Column style={k}>بداية الكورس</Column><Column style={v}>{startDate || '١ يوليو ٢٠٢٦'}</Column></Row>
            {price && <Row style={kvRow}><Column style={k}>السعر</Column><Column style={v}>{price}</Column></Row>}
          </Section>

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={courseUrl || `${SITE_URL}/courses`} style={btn}>احجز مكانك الآن</Button>
          </Section>

          <Text style={note}>
            المقاعد محدودة — الحجز بالأسبقية. لو محتاج تستفسر عن أي حاجة، احنا في خدمتك.
          </Text>

          <Hr style={hr} />

          <Section style={contactCard}>
            <Row>
              <Column style={{ width: '56px', verticalAlign: 'middle' as const }}>
                <Img src={LOGO_URL} width="44" height="44" alt={SITE_NAME} style={{ borderRadius: '10px', display: 'block' }} />
              </Column>
              <Column style={{ paddingRight: '12px', verticalAlign: 'middle' as const }}>
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
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `ذكّرنا نفسك — احجز مكانك في ${d?.courseNameAr || d?.courseName || 'كورس اللغة الألمانية المتخصصة'}`,
  displayName: 'Lead course reminder (AR)',
  previewData: {
    studentName: 'أحمد',
    courseName: 'Medical German for Sports Science',
    courseNameAr: 'الألمانية الطبية لعلوم الرياضة',
    startDate: '١ يوليو ٢٠٢٦',
    price: '€19 / شهر',
    courseUrl: 'https://ssracourses.com/courses',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }
const header = { borderBottom: '3px solid #f59e0b', paddingBottom: '16px', marginBottom: '24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px', textAlign: 'right' as const }
const subhead = { fontSize: '14px', color: '#475569', margin: '0', textAlign: 'right' as const, lineHeight: '1.7' }
const h2 = { fontSize: '17px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px', textAlign: 'right' as const }
const cardDesc = { fontSize: '13px', color: '#475569', margin: '0 0 14px', lineHeight: '1.7', textAlign: 'right' as const }
const card = { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '18px 20px', margin: '0 0 8px' }
const kvRow = { padding: '5px 0' }
const k = { fontSize: '13px', color: '#64748b', width: '40%', textAlign: 'right' as const }
const v = { fontSize: '14px', color: '#0f172a', fontWeight: 600, textAlign: 'right' as const }
const btn = { background: '#f59e0b', color: '#0f172a', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }
const note = { fontSize: '12px', color: '#64748b', margin: '12px 0 0', lineHeight: '1.7', textAlign: 'center' as const }
const hr = { border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }
const link = { color: '#2563eb', textDecoration: 'underline' }
const brandBar = { background: '#0f172a', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px' }
const brandTextCell = { paddingLeft: '14px', verticalAlign: 'middle' as const }
const brandName = { fontSize: '17px', fontWeight: 700 as const, color: '#ffffff', margin: 0, letterSpacing: '0.3px' }
const brandTag = { fontSize: '10px', color: 'rgba(255,255,255,0.55)', margin: '2px 0 0', letterSpacing: '1.2px' }
const contactCard = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', margin: '8px 0 0' }
const contactName = { fontSize: '14px', fontWeight: 700 as const, color: '#0f172a', margin: '0 0 2px', textAlign: 'right' as const }
const contactMeta = { fontSize: '12px', color: '#64748b', margin: '0 0 2px', lineHeight: '1.5', textAlign: 'right' as const }
