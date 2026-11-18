import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  FieldWrapper,
  SelectInput,
  TextAreaInput,
  TextInput,
} from '../../components/ui/FormField';
import { IntegrationNotice } from '../../components/ui/StateViews';
import { NIGERIAN_STATES } from '../../config/app.config';
import { DEMO_CATEGORIES } from '../../data/demoCatalogue';

const sourcingSchema = z.object({
  productTitle: z.string().min(3, 'Enter a descriptive product name (at least 3 characters).'),
  categoryName: z.string().min(2, 'Select a product category.'),
  targetQuantity: z.coerce
    .number()
    .int()
    .positive('Quantity must be at least 1 unit.'),
  destinationState: z.string().min(2, 'Select destination Nigerian state.'),
  description: z
    .string()
    .min(15, 'Provide at least 15 characters describing model, sizing, or packaging needs.'),
});

export function WholesaleSourcingPage() {
  const [productTitle, setProductTitle] = useState('');
  const [categoryName, setCategoryName] = useState(DEMO_CATEGORIES[0].name);
  const [targetQuantity, setTargetQuantity] = useState('50');
  const [destinationState, setDestinationState] = useState('NG-KT');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmittedNotice(null);

    const result = sourcingSchema.safeParse({
      productTitle,
      categoryName,
      targetQuantity,
      destinationState,
      description,
    });

    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmittedNotice(
      'Client-side validation passed. Persistent submission, Cloudinary reference photo uploads, and Sourcing Manager assignment will activate once Supabase Auth & Cloudinary credentials are configured in Stage 2.',
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold text-[#8E6B0C]">
          Custom China Procurement & Wholesale
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#0B1E3D]">
          Wholesale Sourcing Request
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Request supplier sourcing from China for commercial quantities or specialized
          products not listed in the online catalogue.
        </p>
      </div>

      <IntegrationNotice
        title="Backend & Media Upload Integration Pending"
        description="This Stage 1 form validates your sourcing request structure. Persistent request saving and customer reference image uploads await Supabase PostgreSQL, Supabase Auth, and Cloudinary setup."
        requirements={['Supabase Auth', 'Supabase PostgreSQL', 'Cloudinary']}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <FieldWrapper
              id="sourcing-title"
              label="Requested Product Name"
              required
              error={errors.productTitle}
            >
              <TextInput
                id="sourcing-title"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                placeholder="e.g. Commercial Solar Street Lights 200W"
              />
            </FieldWrapper>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrapper
                id="sourcing-category"
                label="Category"
                required
                error={errors.categoryName}
              >
                <SelectInput
                  id="sourcing-category"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                >
                  {DEMO_CATEGORIES.map((category) => (
                    <option key={category.slug} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                  <option value="Other Commercial Goods">Other Commercial Goods</option>
                </SelectInput>
              </FieldWrapper>

              <FieldWrapper
                id="sourcing-qty"
                label="Target Quantity"
                required
                error={errors.targetQuantity}
              >
                <TextInput
                  id="sourcing-qty"
                  type="number"
                  min={1}
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(e.target.value)}
                />
              </FieldWrapper>
            </div>

            <FieldWrapper
              id="sourcing-state"
              label="Nigerian Delivery State"
              required
              error={errors.destinationState}
            >
              <SelectInput
                id="sourcing-state"
                value={destinationState}
                onChange={(e) => setDestinationState(e.target.value)}
              >
                {NIGERIAN_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name} ({state.zone})
                  </option>
                ))}
              </SelectInput>
            </FieldWrapper>

            <FieldWrapper
              id="sourcing-desc"
              label="Technical Specifications & Quality Requirements"
              required
              error={errors.description}
              hint="Include model numbers, dimensions, packaging preferences, or target unit price."
            >
              <TextAreaInput
                id="sourcing-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe exact product specifications, preferred freight mode (air or sea), and timeline..."
              />
            </FieldWrapper>

            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold text-[#0B1E3D]">
                Reference Product Photograph (Cloudinary Upload)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Image upload control is disabled until Cloudinary signed upload presets are
                configured on the backend.
              </p>
            </div>

            {submittedNotice ? (
              <div
                role="status"
                className="rounded-md border border-[#C59B27]/50 bg-[#F7F1DF] px-4 py-3 text-xs text-[#0B1E3D]"
              >
                {submittedNotice}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="lg">
                Validate Sourcing Request
              </Button>
            </div>
          </form>
        </Card>

        <div className="lg:col-span-4 space-y-4">
          <Card>
            <h2 className="font-display text-base font-semibold text-[#0B1E3D]">
              Wholesale Workflow
            </h2>
            <ol className="mt-4 space-y-3 text-xs leading-relaxed text-slate-600">
              <li>1. Customer submits product description & reference photo.</li>
              <li>2. DGT Sourcing Manager reviews request and contacts verified China factories.</li>
              <li>3. Supplier CNY cost, USD/NGN shipping, and margin calculated.</li>
              <li>4. Formal NGN quotation issued for customer acceptance and payment.</li>
              <li>5. Procurement, China warehouse inspection, and delivery to Nigeria.</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
