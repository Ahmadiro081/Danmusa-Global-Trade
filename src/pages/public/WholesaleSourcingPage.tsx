import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Lock,
  Send,
  Ship,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  SelectField,
  TextAreaField,
  TextField,
} from '../../components/ui/FormField';
import { AlertBanner, ErrorBanner } from '../../components/ui/StateViews';
import { NIGERIAN_STATES } from '../../config/app.config';
import { STOREFRONT_CATEGORY_DIRECTORY } from '../../config/categories';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/apiClient';
import { fetchPublicStates } from '../../services/catalogueService';
import type { LiveNigerianState } from '../../types/domain';

interface CreatedSourcingResponse {
  request: {
    id: string;
    request_number: string;
    status: string;
  };
}

export function WholesaleSourcingPage() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, accessToken } = useAuth();

  const prefilledProduct = searchParams.get('product') || '';
  const prefilledSku = searchParams.get('sku') || '';

  const [productTitle, setProductTitle] = useState(
    prefilledProduct
      ? `${prefilledProduct}${prefilledSku ? ` (${prefilledSku})` : ''}`
      : '',
  );
  const [categoryName, setCategoryName] = useState<string>(
    STOREFRONT_CATEGORY_DIRECTORY[0].name,
  );
  const [targetQuantity, setTargetQuantity] = useState<string>('10');
  const [targetBudgetNgn, setTargetBudgetNgn] = useState<string>('');
  const [destinationStateId, setDestinationStateId] = useState<string>('');
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [liveStates, setLiveStates] = useState<LiveNigerianState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] =
    useState<CreatedSourcingResponse['request'] | null>(null);

  useEffect(() => {
    fetchPublicStates()
      .then((states) => setLiveStates(states))
      .catch(() => setLiveStates([]));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !accessToken) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const qty = Math.max(1, parseInt(targetQuantity, 10) || 1);
      const budget = targetBudgetNgn.trim() ? Number(targetBudgetNgn) : undefined;

      const payload: Record<string, unknown> = {
        productTitle: productTitle.trim(),
        categoryName,
        description: description.trim(),
        targetQuantity: qty,
      };
      if (budget && !Number.isNaN(budget) && budget > 0) {
        payload.targetBudgetNgn = budget;
      }
      if (destinationStateId) {
        payload.destinationStateId = destinationStateId;
      }
      if (referenceImageUrl.trim()) {
        payload.referenceImageUrl = referenceImageUrl.trim();
      }

      const res = await apiFetch<CreatedSourcingResponse>(
        '/api/customer/sourcing-requests',
        {
          method: 'POST',
          accessToken,
          body: payload,
        },
      );
      setCreatedRequest(res.request);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Unable to submit sourcing request. Please review all fields and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F5F7FA] pb-16">
      {/* Corporate Navy Hero Band */}
      <section className="border-b border-slate-200 bg-[#10243A] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F4A62A]">
            Wholesale &amp; Custom China Sourcing
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-white sm:text-4xl">
            Request Any Product Directly from China
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Looking for commercial vehicles, bulk smartphones, electronics, home appliances, apparel, or custom machinery? Share your requirements and receive an itemized quotation from DGT Sourcing Managers.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left: Sourcing Form */}
          <div className="lg:col-span-8">
            <Card>
              <div className="border-b border-slate-200 pb-4">
                <h2 className="font-display text-lg font-bold text-[#10243A]">
                  Wholesale &amp; Pre-Order Sourcing Specification
                </h2>
                <p className="mt-1 text-xs text-[#64748B]">
                  Provide clear product specifications, target volume, and destination state so our team can verify Chinese factory pricing and freight options.
                </p>
              </div>

              {!isAuthenticated ? (
                <div className="mt-6 space-y-5">
                  <AlertBanner
                    tone="info"
                    title="Sign in to submit and track your sourcing request"
                    message="To link quotations, supplier updates, and orders securely to your customer profile, please sign in or create a DGT account before submitting a sourcing request."
                  />
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/login?next=${encodeURIComponent('/sourcing' + (prefilledProduct ? `?product=${prefilledProduct}` : ''))}`}
                    >
                      <Button variant="primary" size="md">
                        <Lock className="h-4 w-4" />
                        Sign In to Continue
                      </Button>
                    </Link>
                    <Link to="/register">
                      <Button variant="outline" size="md">
                        Create Customer Account
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : createdRequest ? (
                <div className="mt-6 space-y-5">
                  <AlertBanner
                    tone="success"
                    title={`Sourcing Request Submitted (${createdRequest.request_number})`}
                    message="Your request has been logged into the Danmusa Global Trade sourcing queue. Our Sourcing Managers will evaluate verified Chinese suppliers and issue an itemized quotation directly to your Customer Portal."
                  />
                  <div className="flex flex-wrap gap-3">
                    <Link to="/account/sourcing">
                      <Button variant="primary" size="md">
                        View My Sourcing Requests
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => {
                        setCreatedRequest(null);
                        setProductTitle('');
                        setDescription('');
                        setTargetBudgetNgn('');
                        setReferenceImageUrl('');
                      }}
                    >
                      Submit Another Request
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  {submitError && (
                    <ErrorBanner
                      title="Could not submit sourcing request"
                      message={submitError}
                    />
                  )}

                  <TextField
                    id="src-title"
                    label="Product Name / Model"
                    required
                    minLength={3}
                    value={productTitle}
                    onChange={(e) => setProductTitle(e.target.value)}
                    placeholder="e.g., 2024 Toyota RAV4 Hybrid / 50x 5G Android Smartphones / Commercial Chest Freezers"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      id="src-category"
                      label="Product Category"
                      required
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                    >
                      {STOREFRONT_CATEGORY_DIRECTORY.map((cat) => (
                        <option key={cat.slug} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="Other Imported Products">
                        Other Imported Products
                      </option>
                    </SelectField>

                    <TextField
                      id="src-qty"
                      label="Target Quantity (Units)"
                      type="number"
                      min={1}
                      required
                      value={targetQuantity}
                      onChange={(e) => setTargetQuantity(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      id="src-budget"
                      label="Target Budget (₦ NGN — Optional)"
                      type="number"
                      min={1}
                      value={targetBudgetNgn}
                      onChange={(e) => setTargetBudgetNgn(e.target.value)}
                      placeholder="e.g., 2500000"
                    />

                    <SelectField
                      id="src-state"
                      label="Destination State in Nigeria"
                      value={destinationStateId}
                      onChange={(e) => setDestinationStateId(e.target.value)}
                    >
                      <option value="">Select destination state (optional)</option>
                      {liveStates.length > 0
                        ? liveStates.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name}
                            </option>
                          ))
                        : NIGERIAN_STATES.map((st) => (
                            <option key={st.code} value="" disabled>
                              {st.name}
                            </option>
                          ))}
                    </SelectField>
                  </div>

                  <TextField
                    id="src-ref-url"
                    label="Reference Product Link or Image URL (Optional)"
                    type="url"
                    value={referenceImageUrl}
                    onChange={(e) => setReferenceImageUrl(e.target.value)}
                    placeholder="https://example.com/product-reference"
                  />

                  <TextAreaField
                    id="src-desc"
                    label="Detailed Specifications & Quality Requirements"
                    required
                    minLength={10}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe brand preferences, technical specifications, vehicle trim/year, colour/size breakdown, packaging requirements, and preferred air or sea freight timing..."
                  />

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                    <p className="text-xs text-[#64748B]">
                      All submissions are saved securely under your verified customer account.
                    </p>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={submitting}
                    >
                      <Send className="h-4 w-4" />
                      {submitting ? 'Submitting Request...' : 'Submit Sourcing Request'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>

          {/* Right: Wholesale Process & Commitments */}
          <div className="space-y-5 lg:col-span-4">
            <Card>
              <div className="flex items-center gap-2.5 text-[#10243A]">
                <ClipboardList className="h-5 w-5 text-[#2563EB]" />
                <h3 className="font-display text-base font-bold">
                  What Happens Next
                </h3>
              </div>
              <ol className="mt-4 space-y-3.5 text-xs text-[#64748B]">
                <li className="flex gap-3">
                  <span className="font-mono font-bold text-[#2563EB]">01</span>
                  <span>
                    <strong className="text-[#10243A]">Supplier Investigation:</strong>{' '}
                    DGT Sourcing Managers verify Chinese suppliers, factory pricing, and MOQ.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono font-bold text-[#2563EB]">02</span>
                  <span>
                    <strong className="text-[#10243A]">Formal Quotation:</strong>{' '}
                    Receive an itemized NGN/USD/CNY quotation covering goods and freight in your portal.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono font-bold text-[#2563EB]">03</span>
                  <span>
                    <strong className="text-[#10243A]">Order &amp; Freight Execution:</strong>{' '}
                    Approve the quote, settle via bank transfer, and track every China-to-Nigeria milestone.
                  </span>
                </li>
              </ol>
            </Card>

            <Card className="bg-[#10243A] text-white border-[#10243A]">
              <div className="flex items-center gap-2 text-[#F4A62A]">
                <Ship className="h-5 w-5" />
                <h3 className="font-display text-sm font-bold text-white">
                  Air &amp; Sea Cargo Options
                </h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Choose weight-based air freight for urgent electronics and smartphones, or cost-effective CBM sea consolidation for vehicles, appliances, and bulk retail lots.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#F4A62A]" />
                  Quality inspection at China hub
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#F4A62A]" />
                  Full Nigerian customs coordination
                </li>
              </ul>
              <Link
                to="/logistics"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#F4A62A] hover:underline"
              >
                Explore Shipping &amp; Logistics →
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
