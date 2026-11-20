import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import {
  ArrowLeft,
  Building2,
  Lock,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  SelectField,
  TextAreaField,
  TextField,
} from '../../components/ui/FormField';
import { AlertBanner, EmptyState } from '../../components/ui/StateViews';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import {
  DGT_BRAND,
  NIGERIAN_STATES,
  formatCurrencyAmount,
} from '../../config/app.config';
import { fetchPublicStates } from '../../services/catalogueService';
import type { LiveNigerianState } from '../../types/domain';

const checkoutFormSchema = z.object({
  fullName: z.string().min(3, 'Enter the recipient full name.'),
  phone: z.string().min(8, 'Enter a valid Nigerian delivery telephone number.'),
  email: z.string().email('Enter a valid email address for order notifications.'),
  stateCode: z.string().min(2, 'Select a Nigerian delivery state.'),
  city: z.string().min(2, 'Enter the city or town.'),
  streetAddress: z.string().min(6, 'Enter the full street delivery address.'),
});

export function CheckoutPage() {
  const { items, subtotalNgn, displayCurrency } = useCart();
  const { isAuthenticated, profile } = useAuth();

  const [liveStates, setLiveStates] = useState<LiveNigerianState[]>([]);
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [stateCode, setStateCode] = useState('NG-KT');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (profile) {
      if (!fullName && profile.fullName) setFullName(profile.fullName);
      if (!phone && profile.phone) setPhone(profile.phone);
      if (!email && profile.email) setEmail(profile.email);
    }
  }, [profile]);

  useEffect(() => {
    fetchPublicStates()
      .then((rows) => setLiveStates(rows))
      .catch(() => setLiveStates([]));
  }, []);

  const selectedLiveState = liveStates.find((s) => s.code === stateCode);
  const deliveryFeeNgn = selectedLiveState?.base_delivery_fee_ngn ?? 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = checkoutFormSchema.safeParse({
      fullName,
      phone,
      email,
      stateCode,
      city,
      streetAddress,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0] ?? 'form')] = issue.message;
      }
      setErrors(next);
      setValidated(false);
      return;
    }
    setErrors({});
    setValidated(true);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<ShoppingBag className="h-5 w-5" />}
          title="No items in checkout"
          description="Add ready-stock products to your cart before proceeding to checkout, or request a custom wholesale quote from China."
          action={
            <>
              <Link to="/catalogue">
                <Button variant="primary" size="md">
                  Browse Catalogue
                </Button>
              </Link>
              <Link to="/sourcing">
                <Button variant="outline" size="md">
                  Wholesale Sourcing
                </Button>
              </Link>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="bg-[#F5F7FA] pb-16">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Cart
          </Link>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-[#10243A] sm:text-3xl">
            Secure Checkout
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Enter delivery details across any of Nigeria’s 36 states and FCT. Settlement is completed via verified corporate bank transfer.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {!isAuthenticated && (
          <div className="mb-6">
            <AlertBanner
              tone="info"
              title="Sign in for order history & bank transfer receipt upload"
              message="Registered customers can save delivery addresses, submit official orders through atomic stock reservation, and upload bank transfer receipts privately in the Customer Portal."
            />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left: Delivery & Payment Details */}
          <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-7" noValidate>
            <Card>
              <h2 className="font-display text-lg font-bold text-[#10243A]">
                1. Customer &amp; Delivery Address
              </h2>
              <p className="mt-1 text-xs text-[#64748B]">
                Provide the recipient’s details for dispatch coordination and delivery confirmation.
              </p>

              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="chk-name"
                    label="Recipient Full Name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={errors.fullName}
                    placeholder="Full legal or business name"
                  />
                  <TextField
                    id="chk-phone"
                    label="Phone Number"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={errors.phone}
                    placeholder="+234 800 000 0000"
                  />
                </div>

                <TextField
                  id="chk-email"
                  label="Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  placeholder="you@example.com"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    id="chk-state"
                    label="Delivery State (Nigeria)"
                    required
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    error={errors.stateCode}
                  >
                    {liveStates.length > 0
                      ? liveStates.map((st) => (
                          <option key={st.code} value={st.code}>
                            {st.name}
                          </option>
                        ))
                      : NIGERIAN_STATES.map((st) => (
                          <option key={st.code} value={st.code}>
                            {st.name}
                          </option>
                        ))}
                  </SelectField>

                  <TextField
                    id="chk-city"
                    label="City / Town"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    error={errors.city}
                    placeholder="e.g., Katsina, Abuja, Kano, Lagos"
                  />
                </div>

                <TextField
                  id="chk-street"
                  label="Street Address & Landmark"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  error={errors.streetAddress}
                  placeholder="Building number, street name, nearest landmark"
                />

                <TextAreaField
                  id="chk-notes"
                  label="Delivery Instructions (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Preferred delivery window or warehouse pickup preference..."
                />
              </div>
            </Card>

            {/* Bank Transfer Settlement Information (No simulated payment!) */}
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#10243A]">
                    2. Payment Method: Corporate Bank Transfer
                  </h2>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Danmusa Global Trade settles all ready-stock and pre-order invoices via verified bank transfer.
                  </p>
                </div>
                <Building2 className="h-5 w-5 shrink-0 text-[#2563EB]" />
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-[#F5F7FA] p-4 text-xs leading-relaxed text-[#64748B]">
                <p className="font-semibold text-[#10243A]">
                  How Bank Transfer Verification Works
                </p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                  <li>
                    Official {DGT_BRAND.name} corporate bank account details are issued once your order is logged under an authenticated customer account.
                  </li>
                  <li>
                    Complete your bank transfer and upload your transfer receipt inside your Customer Portal under <strong>My Orders</strong>.
                  </li>
                  <li>
                    Our Finance Manager verifies settlement before order status advances to <strong>Paid</strong> and dispatch begins.
                  </li>
                </ol>
              </div>

              {validated && (
                <div className="mt-4 space-y-3">
                  <AlertBanner
                    tone="success"
                    title="Delivery details validated"
                    message={
                      isAuthenticated
                        ? 'Your delivery information is validated. Final server-side atomic checkout requires an active saved address and verified warehouse allocation in the live database. Contact DGT support or proceed via your Customer Portal once warehouse inventory is published.'
                        : 'Your delivery information is validated. Sign in to your Customer Account to link this order to your profile and upload bank transfer evidence securely.'
                    }
                  />
                  {!isAuthenticated && (
                    <Link to="/login?next=/checkout">
                      <Button variant="primary" size="md">
                        <Lock className="h-4 w-4" />
                        Sign In to Complete Order
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              <div className="mt-5">
                <Button type="submit" variant="primary" size="lg" fullWidth>
                  Review &amp; Validate Checkout Details
                </Button>
              </div>
            </Card>
          </form>

          {/* Right: Order Summary */}
          <div className="lg:col-span-5">
            <Card className="sticky top-24 space-y-5">
              <h2 className="font-display text-lg font-bold text-[#10243A]">
                Order Summary
              </h2>

              <ul className="divide-y divide-slate-100">
                {items.map(({ product, quantity }) => (
                  <li key={product.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#10243A]">
                        {product.name}
                      </p>
                      <p className="text-xs text-[#64748B] tabular-nums">
                        Qty {quantity} × {formatCurrencyAmount(product.priceNgn, displayCurrency)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-[#10243A]">
                      {formatCurrencyAmount(product.priceNgn * quantity, displayCurrency)}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="space-y-2.5 border-t border-slate-200 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[#64748B]">Subtotal</dt>
                  <dd className="font-semibold tabular-nums text-[#10243A]">
                    {formatCurrencyAmount(subtotalNgn, displayCurrency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[#64748B]">
                    Delivery ({selectedLiveState?.name ?? stateCode})
                  </dt>
                  <dd className="font-semibold tabular-nums text-[#10243A]">
                    {deliveryFeeNgn > 0
                      ? formatCurrencyAmount(deliveryFeeNgn, displayCurrency)
                      : 'Confirmed on invoice'}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <dt className="font-display font-bold text-[#10243A]">
                    Estimated Total
                  </dt>
                  <dd className="font-display text-xl font-extrabold tabular-nums text-[#10243A]">
                    {formatCurrencyAmount(
                      subtotalNgn + deliveryFeeNgn,
                      displayCurrency,
                    )}
                  </dd>
                </div>
              </dl>

              <div className="flex items-start gap-2.5 rounded-lg bg-[#F5F7FA] p-3.5 text-xs text-[#64748B]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16865C]" />
                <span>
                  Online card/Paystack payments are intentionally disabled; all orders require verified bank transfer confirmation before dispatch.
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
