/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as testEmail } from './test-email.tsx'
import { template as paymentConfirmation } from './payment-confirmation.tsx'
import { template as enrollmentConfirmation } from './enrollment-confirmation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'test-email': testEmail,
  'payment-confirmation': paymentConfirmation,
  'enrollment-confirmation': enrollmentConfirmation,
}
