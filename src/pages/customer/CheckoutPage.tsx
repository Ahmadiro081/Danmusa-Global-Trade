import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  FieldWrapper,
  SelectInput,
  TextInput,
} from '../../components/ui/FormField';
import { IntegrationNotice } from '../../components/ui/StateViews';
import {
  formatCurrencyAmount,
  NIGERIAN_STATES,
} from '../../config/app.config';
import { useCart } from '../../context/CartContext';

const checkoutSchema = z.object({
  recipientName: z.string().min(3, 'Enter recipient full name.'),
  phone: z.string().min(8, 'Enter a valid Nigerian contact number.'),
  stateCode: z.string().min(2, 'Select destination Nigerian state.'),
  city: z.string().min(2, 'Enter city or LGA.'),
  streetAddress: z.string().min(6, 'Enter street address or pickup terminal.'),
  paymentMethod: z.enum(['bank_transfer']),
});

export function CheckoutPage() {
  const { items, subtotalNgn, displayCurrency } = useCart();
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('NG-KT');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [paymentMethod] = useState<'bank_transfer'>('bank_transfer');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationNotice, setValidationNotice] = useState<string | null>(null);

  const handleCheckoutSubmit = (event: FormEvent) => {
    event.preventDefault();
    setValidationNotice(null);

    const parsed = checkoutSchema.safeParse({
      recipientName,
      phone,
      stateCode,
      city,
      streetAddress,
      paymentMethod,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0] ?? 'form')] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setValidationNotice(
      'Delivery details validated. Server-side order reservation and Bank Transfer proof verification are disabled until Supabase Auth and PostgreSQL credentials are connected.',
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold text-[#8E6B0C]">
          Ready-Stock Checkout Architecture
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#0B1E3D]">
          Checkout & Payment Verification
        </h1>
      </div>

      <IntegrationNotice
        title="Bank Transfer Verification Architecture"
        description="Online payment gateway integration (Paystack) is skipped for now. Orders enter 'Awaiting Verification' upon bank transfer proof submission until confirmed by a Finance Manager."
        requirements={['Supabase Auth & PostgreSQL', 'Finance Manager Verification']}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        <Card className="lg:col-span-8">
          <form onSubmit={handleCheckoutSubmit} className="space-y-6" noValidate>
            <h2 className="font-display text-lg font-bold text-[#0B1E3D]">
              Nigerian Delivery Destination
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrapper
                id="chk-name"
                label="Recipient Full Name"
                required
                error={errors.recipientName}
              >
                <TextInput
                  id="chk-name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient name"
                />
              </FieldWrapper>

              <FieldWrapper
                id="chk-phone"
                label="Contact Phone"
                required
                error={errors.phone}
              >
                <TextInput
                  id="chk-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 ..."
                />
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrapper
                id="chk-state"
                label="State (All 36 States + FCT)"
                required
                error={errors.stateCode}
              >
                <SelectInput
                  id="chk-state"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                >
                  {NIGERIAN_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name} ({state.zone})
                    </option>
                  ))}
                </SelectInput>
              </FieldWrapper>

              <FieldWrapper
                id="chk-city"
                label="City / LGA"
                required
                error={errors.city}
              >
                <TextInput
                  id="chk-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Katsina, Kano, Abuja"
                />
              </FieldWrapper>
            </div>

            <FieldWrapper
              id="chk-address"
              label="Delivery Street Address"
              required
              error={errors.streetAddress}
            >
              <TextInput
                id="chk-address"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Street address, landmark, or logistics hub pickup"
              />
            </FieldWrapper>

            <div className="space-y-3 border-t border-slate-200 pt-5">
              <h2 className="font-display text-lg font-bold text-[#0B1E3D]">
                Payment Method
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col rounded-md border border-[#0B1E3D] bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      readOnly
                    />
                    <span className="text-sm font-semibold text-[#0B1E3D]">
                      Bank Transfer (Admin Verification)
                    </span>
                  </div>
                  <span className="mt-1.5 text-xs text-slate-600">
                    Official DGT bank account details displayed once configured; verified
                    manually by Finance Manager.
                  </span>
                </div>

                <div className="flex flex-col rounded-md border border-slate-200 bg-slate-50/60 p-4 opacity-75">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-600">
                      Online Card / Gateway Payment
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      Deferred
                    </span>
                  </div>
                  <span className="mt-1.5 text-xs text-slate-500">
                    Paystack integration is skipped for the initial phase and reserved for
                    a later release.
                  </span>
                </div>
              </div>
            </div>

            {validationNotice ? (
              <div
                role="status"
                className="rounded-md border border-[#C59B27]/50 bg-[#F7F1DF] px-4 py-3 text-xs text-[#0B1E3D]"
              >
                {validationNotice}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-4 pt-2">
              <Link
                to="/cart"
                className="text-xs font-semibold text-slate-600 hover:text-[#0B1E3D]"
              >
                ← Back to Bag
              </Link>
              <Button type="submit" variant="primary" size="lg">
                Validate Checkout Form
              </Button>
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-4 space-y-4">
          <h2 className="font-display text-base font-bold text-[#0B1E3D]">
            Bag Summary ({items.length} {items.length === 1 ? 'line' : 'lines'})
          </h2>
          {items.length === 0 ? (
            <p className="text-xs text-slate-600">
              No items in bag. Add demonstration products from the catalogue to preview
              totals.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 text-xs">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="py-2.5 flex justify-between gap-2">
                  <span className="text-slate-700 truncate">
                    {product.name} × {quantity}
                  </span>
                  <span className="font-mono font-semibold text-[#0B1E3D] tabular-nums shrink-0">
                    {formatCurrencyAmount(
                      product.demoPriceNgn * quantity,
                      displayCurrency,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-200 pt-3 flex justify-between text-sm font-bold text-[#0B1E3D]">
            <span>Demo Merchandise Total</span>
            <span className="font-mono tabular-nums">
              {formatCurrencyAmount(subtotalNgn, displayCurrency)}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
