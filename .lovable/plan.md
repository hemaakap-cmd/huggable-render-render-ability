# نظام مراقبة الدفع (Payment Monitoring)

نظام متكامل لتتبع كل محاولات الدفع على الموقع، تسجيل بيانات الفشل، عدد المحاولات لكل مستخدم، وأوقات الدفع، مع لوحة تحكم للأدمن.

## 1) جدول جديد: `ssra_payment_attempts`

تسجيل كل محاولة دفع (نجاح/فشل/قيد التنفيذ) مع كل التفاصيل.

**الحقول الأساسية:**
- `user_id`, `user_email`, `course_id`, `course_title`
- `enrollment_id` (ربط بالحجز المؤقت)
- `amount_eur`, `coupon_code`
- `status`: `initiated` | `processing` | `succeeded` | `failed` | `abandoned`
- `failure_reason`, `failure_code` (من Stripe)
- `stripe_session_id`, `stripe_payment_intent_id`
- `attempt_number` (رقم المحاولة لنفس المستخدم/الكورس)
- `ip_address`, `user_agent`, `country`
- `initiated_at`, `completed_at`, `duration_ms`
- `environment` (sandbox/live)

**الحماية (RLS):**
- المستخدم يشوف محاولاته فقط
- الأدمن يشوف الكل
- Service role يكتب من الـ edge functions

## 2) دالة `record_payment_attempt`

دالة SQL تستدعى من الـ edge functions لتسجيل المحاولة وحساب `attempt_number` تلقائياً.

## 3) تحديث Edge Functions

- `create-checkout`: تسجيل المحاولة عند البدء (status=`initiated`)
- `confirm-checkout-session`: تحديث الحالة عند النجاح/الفشل
- `payments-webhook`: تحديث من webhook events (`payment_intent.failed`, `checkout.session.completed`)

## 4) لوحة تحكم الأدمن `/ssra-admin/payment-monitor`

**الإحصائيات (KPIs):**
- إجمالي المحاولات (آخر 24 ساعة / 7 أيام / 30 يوم)
- معدل النجاح (Success Rate %)
- معدل الفشل + أكثر أسباب الفشل
- متوسط مدة عملية الدفع
- المستخدمين اللي عندهم محاولات متكررة فاشلة (تنبيه احتيال)

**الجداول:**
- آخر 100 محاولة (مع filters: status, course, date range)
- top failed users (>3 محاولات فاشلة)
- توزيع الفشل حسب السبب (chart)
- توزيع المحاولات حسب الوقت (chart)

**إجراءات:**
- export CSV
- إعادة تشغيل محاولة فاشلة (resend payment link)
- تحديد محاولة كاحتيال (flag)

## 5) تنبيهات تلقائية

- إذا مستخدم فشل 3+ مرات → notification للأدمن + flag في `ssra_fraud_flags`
- إذا معدل الفشل العام تخطى 30% في ساعة → تنبيه

## التفاصيل التقنية

- جدول جديد + indexes على (`user_id`, `course_id`, `status`, `created_at`)
- 3 edge functions يتم تعديلها
- صفحة React جديدة مع Recharts للرسوم البيانية
- استخدام `supabase.channel` للتحديث الحي (realtime)

هل أبدأ التنفيذ بهذا الشكل، أم تريد تعديل/إضافة شيء (مثلاً ربط بـ WhatsApp/Email للتنبيهات)؟
