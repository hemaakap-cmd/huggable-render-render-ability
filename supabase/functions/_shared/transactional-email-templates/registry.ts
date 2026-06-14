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
import { template as verificationApproved } from './verification-approved.tsx'
import { template as verificationRejected } from './verification-rejected.tsx'
import { template as adminPurchaseNotification } from './admin-purchase-notification.tsx'
import { template as sessionLinkUpdated } from './session-link-updated.tsx'
import { template as cancellationConfirmation } from './cancellation-confirmation.tsx'
import { template as instructorAssignment } from './instructor-assignment.tsx'
import { template as instructorUnassignment } from './instructor-unassignment.tsx'
import { template as waitlistSeatOpen } from './waitlist-seat-open.tsx'
import { template as cancellationRequestReceived } from './cancellation-request-received.tsx'
import { template as paymentReminder } from './payment-reminder.tsx'
import { template as leadCourseReminder } from './lead-course-reminder.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'test-email': testEmail,
  'payment-confirmation': paymentConfirmation,
  'enrollment-confirmation': enrollmentConfirmation,
  'verification-approved': verificationApproved,
  'verification-rejected': verificationRejected,
  'admin-purchase-notification': adminPurchaseNotification,
  'session-link-updated': sessionLinkUpdated,
  'cancellation-confirmation': cancellationConfirmation,
  'cancellation-request-received': cancellationRequestReceived,
  'instructor-assignment': instructorAssignment,
  'instructor-unassignment': instructorUnassignment,
  'waitlist-seat-open': waitlistSeatOpen,
  'payment-reminder': paymentReminder,
  'lead-course-reminder': leadCourseReminder,
}

