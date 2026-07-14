'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFeatureStatus, consumeFeature, fetchCreditPacks } from '@/data/featureCredits';
import { createRazorpayOrder, createCreditPackOrder, verifyRazorpayPayment, loadRazorpayCheckout } from '@/data/payments';
import {
  RESUME_EXPERIENCE_OPTIONS as EXPERIENCE_OPTIONS,
  RESUME_REVIEW_INITIAL_FIELDS as initialFields,
  formatFileSize,
  validateResumeFile as validateFile,
  buildResumeReviewFormData,
  submitToWeb3Forms,
} from '@sypher/career-tools';
import styles from '@/styles/careerForm.module.css';

interface FeatureStatus {
  role: string;
  resumeReview: { included: number; used: number; remainingIncluded: number; creditsPerUse: number };
  mockInterview: { included: number; used: number; remainingIncluded: number; creditsPerUse: number };
  creditBalance: number;
}

interface CreditPack {
  id: string;
  tier: string;
  name: string;
  credits: number;
  price_paise: number;
  is_active: boolean;
  sort_order: number;
}

function formatPrice(pricePaise: string | undefined): string | null {
  if (!pricePaise || pricePaise === 'REPLACE-ME') return null;
  const rupees = Number(pricePaise) / 100;
  return rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function ResumeReviewPage(): React.JSX.Element {
  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const paidUpgradePriceInrPaise = process.env.NEXT_PUBLIC_PAID_UPGRADE_PRICE_INR_PAISE;

  const { supabase, user, session, role, refreshProfile } = useAuth();

  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [fields, setFields] = useState(initialFields);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadStatus = useCallback(async () => {
    if (!supabase || !user?.id) return;
    setStatusLoading(true);
    setStatusError(null);
    const [status, packRows] = await Promise.all([
      fetchFeatureStatus(supabase, user.id),
      fetchCreditPacks(supabase),
    ]);
    if (!status) {
      setStatusError('Could not load your resume review allowance. Please try again.');
    } else {
      setFeatureStatus(status as FeatureStatus);
    }
    setPacks((packRows as CreditPack[]).filter((p) => p.is_active));
    setStatusLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      setResumeFile(null);
      setFileError('');
      return;
    }
    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      setResumeFile(null);
      event.target.value = '';
      return;
    }
    setFileError('');
    setResumeFile(file);
  }

  function resetForm(): void {
    setFields(initialFields);
    setResumeFile(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!resumeFile) {
      setFileError('Please attach your resume.');
      return;
    }
    if (!user?.id || !supabase) return;

    setFormStatus('loading');
    setFormErrorMessage('');

    try {
      const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
      if (!accessKey) {
        setFormStatus('error');
        setFormErrorMessage("Resume review requests aren't configured yet — please contact support.");
        return;
      }
      const formData = buildResumeReviewFormData({ accessKey, fields, resumeFile });
      const result = await submitToWeb3Forms(formData);

      if (!result.success) {
        setFormStatus('error');
        setFormErrorMessage(result.message || 'Something went wrong. Please try again.');
        return;
      }

      const { error: consumeError } = await consumeFeature(supabase, user.id, 'resume_review');
      if (consumeError) {
        setFormStatus('error');
        setFormErrorMessage('Your resume was submitted, but we could not update your allowance. Contact support.');
        return;
      }

      setFormStatus('success');
      resetForm();
      await loadStatus();
    } catch {
      setFormStatus('error');
      setFormErrorMessage('Something went wrong. Please check your connection and try again.');
    }
  }

  async function handleUpgrade(): Promise<void> {
    if (!session?.access_token) return;
    setPaymentError(null);
    setIsProcessing(true);
    try {
      const Razorpay = await loadRazorpayCheckout();
      const order = await createRazorpayOrder(session.access_token, apiBaseUrl);
      const checkout = new Razorpay({
        key: razorpayKeyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Sypher',
        description: 'Paid plan — 1 year',
        prefill: { email: user?.email ?? '' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verifyRazorpayPayment(session.access_token, response, apiBaseUrl);
            await refreshProfile();
            await loadStatus();
          } catch (err) {
            setPaymentError(err instanceof Error ? err.message : 'Payment verification failed');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: { ondismiss: () => setIsProcessing(false) },
      });
      checkout.on('payment.failed', () => {
        setPaymentError('Payment failed — please try again.');
        setIsProcessing(false);
      });
      checkout.open();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  }

  async function handleBuyPack(tier: string): Promise<void> {
    if (!session?.access_token) return;
    setPaymentError(null);
    setIsProcessing(true);
    try {
      const Razorpay = await loadRazorpayCheckout();
      const order = await createCreditPackOrder(session.access_token, tier, apiBaseUrl);
      const checkout = new Razorpay({
        key: razorpayKeyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Sypher',
        description: `Credit pack — ${tier}`,
        prefill: { email: user?.email ?? '' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verifyRazorpayPayment(session.access_token, response, apiBaseUrl);
            await loadStatus();
          } catch (err) {
            setPaymentError(err instanceof Error ? err.message : 'Payment verification failed');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: { ondismiss: () => setIsProcessing(false) },
      });
      checkout.on('payment.failed', () => {
        setPaymentError('Payment failed — please try again.');
        setIsProcessing(false);
      });
      checkout.open();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  }

  const priceLabel = formatPrice(paidUpgradePriceInrPaise);
  const resumeReviewStatus = featureStatus?.resumeReview;
  const canUse =
    !!resumeReviewStatus &&
    (resumeReviewStatus.remainingIncluded > 0 ||
      (resumeReviewStatus.creditsPerUse > 0 && (featureStatus?.creditBalance ?? 0) >= resumeReviewStatus.creditsPerUse));

  return (
    <DashboardLayout title="Resume Review" description="Get expert feedback on your resume">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.heading}>Resume Review</h1>
          <p className={styles.subtitle}>Submit your resume for detailed, personalized feedback from our team.</p>
        </div>

        {statusLoading ? (
          <div className={styles.card}>
            <p className={styles.subtitle}>Loading your allowance…</p>
          </div>
        ) : statusError ? (
          <div className={styles.card}>
            <p className={styles.error}>{statusError}</p>
            <button type="button" className={styles.upgradeBtn} onClick={loadStatus}>
              Retry
            </button>
          </div>
        ) : formStatus === 'success' ? (
          <div className={styles.card}>
            <div className={styles.successCard} role="status">
              <h3 className={styles.successTitle}>Resume received</h3>
              <p className={styles.successText}>
                Thanks for submitting your resume. Our team will review it and get back to you with detailed
                feedback within a few business days.
              </p>
            </div>
          </div>
        ) : canUse && resumeReviewStatus ? (
          <div className={styles.card}>
            <div className={styles.statusRow}>
              <span className={`${styles.statusBadge} ${styles.statusPaid}`}>
                {resumeReviewStatus.remainingIncluded > 0
                  ? `${resumeReviewStatus.remainingIncluded} included review${resumeReviewStatus.remainingIncluded === 1 ? '' : 's'} left`
                  : `${featureStatus?.creditBalance} credits available`}
              </span>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <input type="checkbox" name="botcheck" className={styles.honeypot} tabIndex={-1} autoComplete="off" />

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="name">Name *</label>
                  <input className={styles.input} id="name" name="name" type="text" required value={fields.name} onChange={handleChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">Email Address *</label>
                  <input className={styles.input} id="email" name="email" type="email" required value={fields.email} onChange={handleChange} />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="phone">Phone Number</label>
                  <input className={styles.input} id="phone" name="phone" type="tel" value={fields.phone} onChange={handleChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="yearsOfExperience">Total Years of Experience *</label>
                  <select className={styles.select} id="yearsOfExperience" name="yearsOfExperience" required value={fields.yearsOfExperience} onChange={handleChange}>
                    <option value="">Select experience</option>
                    {EXPERIENCE_OPTIONS.map((option: string) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="currentRole">Current Role</label>
                <input className={styles.input} id="currentRole" name="currentRole" type="text" value={fields.currentRole} onChange={handleChange} />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="aboutMe">About Me *</label>
                <textarea
                  className={styles.textarea}
                  id="aboutMe"
                  name="aboutMe"
                  rows={4}
                  required
                  placeholder="Tell us about your experience, career goals, and the type of roles you're targeting."
                  value={fields.aboutMe}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="resume">Resume Attachment *</label>
                <input
                  className={styles.fileInput}
                  id="resume"
                  name="resume"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  required
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <span className={styles.fileHint}>PDF, DOC, or DOCX — max 5 MB</span>
                {resumeFile && !fileError && (
                  <span className={styles.fileMeta}>{resumeFile.name} ({formatFileSize(resumeFile.size)})</span>
                )}
                {fileError && <p className={styles.error} role="alert">{fileError}</p>}
              </div>

              {formStatus === 'error' && <p className={styles.error} role="alert">{formErrorMessage}</p>}

              <button type="submit" className={styles.submitBtn} disabled={formStatus === 'loading'}>
                {formStatus === 'loading' ? 'Sending…' : 'Submit Resume'}
              </button>
            </form>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.ctaCard}>
              {role === 'free_users' ? (
                <>
                  <h3 className={styles.ctaTitle}>Upgrade to unlock resume reviews</h3>
                  <p className={styles.ctaText}>
                    Paid members get {featureStatus?.resumeReview.included ?? 0} resume reviews included per year,
                    plus the option to buy more anytime.
                  </p>
                  <button type="button" className={styles.upgradeBtn} disabled={isProcessing} onClick={handleUpgrade}>
                    {isProcessing ? 'Processing…' : priceLabel ? `Upgrade to Paid — ₹${priceLabel}/year` : 'Upgrade to Paid'}
                  </button>
                </>
              ) : (
                <>
                  <h3 className={styles.ctaTitle}>You&apos;re out of resume reviews</h3>
                  <p className={styles.ctaText}>
                    Buy a credit pack to keep going — credits convert to reviews at{' '}
                    {resumeReviewStatus?.creditsPerUse ?? 0} credits per review and are valid for 1 year.
                  </p>
                  <div className={styles.packGrid}>
                    {packs.map((pack) => (
                      <div key={pack.tier} className={styles.packCard}>
                        <span className={styles.packName}>{pack.name}</span>
                        <span className={styles.packCredits}>{pack.credits} credits</span>
                        <span className={styles.packPrice}>₹{(pack.price_paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <button type="button" className={styles.buyBtn} disabled={isProcessing} onClick={() => handleBuyPack(pack.tier)}>
                          Buy
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {paymentError && <p className={styles.error}>{paymentError}</p>}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
