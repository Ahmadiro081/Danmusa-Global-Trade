import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MapPin,
  Phone,
  Send,
  Truck,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../components/ui/FormField';
import { AlertBanner } from '../../components/ui/StateViews';
import { DGT_BRAND } from '../../config/app.config';

export function ContactPage() {
  const [searchParams] = useSearchParams();
  const initialSubject = searchParams.get('subject') || '';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState(
    initialSubject ? 'Product Enquiry' : 'General Enquiry',
  );
  const [message, setMessage] = useState(
    initialSubject ? `Regarding: ${initialSubject}\n\n` : '',
  );
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-[#F5F7FA] pb-16">
      {/* Header Band */}
      <section className="border-b border-slate-200 bg-[#10243A] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F4A62A]">
            Contact &amp; Customer Support
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-white sm:text-4xl">
            Get in Touch with Danmusa Global Trade
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Have questions about ready-stock availability, bulk wholesale quotations, bank transfer verification, or Nigeria delivery schedules? Reach our operations team below.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Contact Information Column */}
          <div className="space-y-5 lg:col-span-5">
            <Card>
              <h2 className="font-display text-lg font-bold text-[#10243A]">
                Official Business Details
              </h2>
              <p className="mt-1 text-xs text-[#64748B]">
                Corporate contact details are displayed as maintained by Danmusa Global Trade administration.
              </p>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Nigeria Head Office
                    </p>
                    <p className="mt-0.5 font-medium text-[#10243A]">
                      {DGT_BRAND.placeholders.nigeriaOfficeAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Katsina Hub &amp; China Warehouse
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-[#10243A]">
                      {DGT_BRAND.placeholders.katsinaHubAddress}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {DGT_BRAND.placeholders.chinaWarehouseAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Telephone
                    </p>
                    <p className="mt-0.5 font-medium text-[#10243A]">
                      {DGT_BRAND.placeholders.businessPhone}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Support Email
                    </p>
                    <p className="mt-0.5 font-medium text-[#10243A]">
                      {DGT_BRAND.placeholders.supportEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t border-slate-100 pt-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F5F7FA] text-[#10243A]">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Trade Support Desk
                    </p>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      Monday – Saturday · 09:00 – 18:00 WAT (West Africa Time)
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Self-Service Links */}
            <Card>
              <h3 className="font-display text-sm font-bold text-[#10243A]">
                Faster Self-Service Options
              </h3>
              <div className="mt-3 space-y-2.5">
                <Link
                  to="/sourcing"
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-[#10243A] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                  <span className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#2563EB]" />
                    Submit a Wholesale Sourcing Request
                  </span>
                  <span>→</span>
                </Link>
                <Link
                  to="/account/tracking"
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-[#10243A] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Truck className="h-4 w-4 text-[#2563EB]" />
                    Track an Existing Order
                  </span>
                  <span>→</span>
                </Link>
              </div>
            </Card>
          </div>

          {/* Enquiry Form Column */}
          <div className="lg:col-span-7">
            <Card>
              <h2 className="font-display text-lg font-bold text-[#10243A]">
                Send an Enquiry
              </h2>
              <p className="mt-1 text-xs text-[#64748B]">
                For formal bulk procurement quotes, we recommend using our dedicated{' '}
                <Link to="/sourcing" className="font-semibold text-[#2563EB] hover:underline">
                  Wholesale Sourcing form
                </Link>{' '}
                so your request is logged directly into our operations tracker.
              </p>

              {submitted ? (
                <div className="mt-6 space-y-4">
                  <AlertBanner
                    tone="success"
                    title="Enquiry prepared"
                    message="Thank you for contacting Danmusa Global Trade. Once official email delivery (Resend) is activated by system administrators, enquiries submitted here route automatically to our support desk. For tracked sourcing quotes, sign in and submit via your Customer Portal."
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSubmitted(false);
                        setMessage('');
                      }}
                    >
                      Send Another Message
                    </Button>
                    <Link to="/sourcing">
                      <Button variant="primary" size="sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Go to Wholesale Sourcing
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      id="contact-name"
                      label="Full Name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Musa Danjuma"
                    />
                    <TextField
                      id="contact-email"
                      label="Email Address"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      id="contact-phone"
                      label="Phone / WhatsApp Number"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                    />
                    <SelectField
                      id="contact-topic"
                      label="Enquiry Topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    >
                      <option value="General Enquiry">General Enquiry</option>
                      <option value="Product Enquiry">Product Availability &amp; Specs</option>
                      <option value="Wholesale Procurement">Wholesale Procurement</option>
                      <option value="Shipping & Delivery">Shipping &amp; Delivery</option>
                      <option value="Order & Payment Support">Order &amp; Payment Support</option>
                    </SelectField>
                  </div>

                  <TextAreaField
                    id="contact-message"
                    label="Message"
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share your question, product requirements, or order number..."
                  />

                  <Button type="submit" variant="primary" size="lg">
                    <Send className="h-4 w-4" />
                    Submit Enquiry
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
