'use client';

import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFeatureStatus, consumeFeature, fetchCreditPacks } from '@/data/featureCredits';
import { createRazorpayOrder, createCreditPackOrder, verifyRazorpayPayment, loadRazorpayCheckout } from '@/data/payments';
import {
  MOCK_INTERVIEW_EXPERIENCE_OPTIONS as EXPERIENCE_OPTIONS,
  MOCK_INTERVIEW_TYPE_OPTIONS as INTERVIEW_TYPE_OPTIONS,
  MOCK_INTERVIEW_TIME_SLOT_OPTIONS as TIME_SLOT_OPTIONS,
  MOCK_INTERVIEW_INITIAL_FIELDS as initialFields,
  getTodayDateString,
  buildMockInterviewPayload,
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

export default function MockInterviewPage(): React.JSX.Element {
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
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formErrorMessage, setFormErrorMessage] = useState('');

  const loadStatus = useCallback(async () => {
    if (!supabase || !user?.id) return;
    setStatusLoading(true);
    setStatusError(null);
    const [status, packRows] = await Promise.all([
      fetchFeatureStatus(supabase, user.id),
      fetchCreditPacks(supabase),
    ]);
    if (!status) {
      setStatusError('Could not load your mock interview allowance. Please try again.');
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user?.id || !supabase) return;

    if (fields.preferredDate && fields.preferredDate < getTodayDateString()) {
      setFormStatus('error');
      setFormErrorMessage('Preferred interview date cannot be in the past.');
      return;
    }

    setFormStatus('loading');
    setFormErrorMessage('');

    try {
      const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
      if (!accessKey) {
        setFormStatus('error');
        setFormErrorMessage("Mock interview bookings aren't configured yet — please contact support.");
        return;
      }
      const payload = buildMockInterviewPayload({ accessKey, fields });
      const result = await submitToWeb3Forms(payload);

      if (!result.success) {
        setFormStatus('error');
        setFormErrorMessage(result.message || 'Something went wrong. Please try again.');
        return;
      }

      const { error: consumeError } = await consumeFeature(supabase, user.id, 'mock_interview');
      if (consumeError) {
        setFormStatus('error');
        setFormErrorMessage('Your booking was submitted, but we could not update your allowance. Contact support.');
        return;
      }

      setFormStatus('success');
      setFields(initialFields);
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
  const mockInterviewStatus = featureStatus?.mockInterview;
  const canUse =
    !!mockInterviewStatus &&
    (mockInterviewStatus.remainingIncluded > 0 ||
      (mockInterviewStatus.creditsPerUse > 0 && (featureStatus?.creditBalance ?? 0) >= mockInterviewStatus.creditsPerUse));

  return (
    <DashboardLayout title="Mock Interview" description="Book a mock interview with our team">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.heading}>Mock Interview</h1>
          <p className={styles.subtitle}>Book a practice interview and get personalized feedback from our team.</p>
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
              <h3 className={styles.successTitle}>Booking received</h3>
              <p className={styles.successText}>
                Thanks for booking a mock interview. Our team will reach out to confirm your session details shortly.
              </p>
            </div>
          </div>
        ) : canUse && mockInterviewStatus ? (
          <div className={styles.card}>
            <div className={styles.statusRow}>
              <span className={`${styles.statusBadge} ${styles.statusPaid}`}>
                {mockInterviewStatus.remainingIncluded > 0
                  ? `${mockInterviewStatus.remainingIncluded} included interview${mockInterviewStatus.remainingIncluded === 1 ? '' : 's'} left`
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

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="currentRole">Current Role</label>
                  <input className={styles.input} id="currentRole" name="currentRole" type="text" value={fields.currentRole} onChange={handleChange} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="interviewType">Preferred Interview Type *</label>
                  <select className={styles.select} id="interviewType" name="interviewType" required value={fields.interviewType} onChange={handleChange}>
                    <option value="">Select interview type</option>
                    {INTERVIEW_TYPE_OPTIONS.map((option: string) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="targetCompanies">Target Companies</label>
                <textarea
                  className={styles.textarea}
                  id="targetCompanies"
                  name="targetCompanies"
                  rows={2}
                  placeholder="Examples: Google, Microsoft, Amazon, Atlassian, Razorpay, Walmart, Flipkart, etc."
                  value={fields.targetCompanies}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="aboutMe">About Me *</label>
                <textarea
                  className={styles.textarea}
                  id="aboutMe"
                  name="aboutMe"
                  rows={4}
                  required
                  placeholder="Tell us about your background, current role, interview goals, and any specific areas where you'd like feedback."
                  value={fields.aboutMe}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="preferredDate">Preferred Interview Date</label>
                  <input
                    className={styles.input}
                    id="preferredDate"
                    name="preferredDate"
                    type="date"
                    min={getTodayDateString()}
                    value={fields.preferredDate}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="timeSlot">Preferred Time Slot</label>
                  <select className={styles.select} id="timeSlot" name="timeSlot" value={fields.timeSlot} onChange={handleChange}>
                    <option value="">Select time slot</option>
                    {TIME_SLOT_OPTIONS.map((option: string) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formStatus === 'error' && <p className={styles.error} role="alert">{formErrorMessage}</p>}

              <button type="submit" className={styles.submitBtn} disabled={formStatus === 'loading'}>
                {formStatus === 'loading' ? 'Sending…' : 'Book Mock Interview'}
              </button>
            </form>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.ctaCard}>
              {role === 'free_users' ? (
                <>
                  <h3 className={styles.ctaTitle}>Upgrade to unlock mock interviews</h3>
                  <p className={styles.ctaText}>
                    Paid members get {featureStatus?.mockInterview.included ?? 0} mock interviews included per year,
                    plus the option to buy more anytime.
                  </p>
                  <button type="button" className={styles.upgradeBtn} disabled={isProcessing} onClick={handleUpgrade}>
                    {isProcessing ? 'Processing…' : priceLabel ? `Upgrade to Paid — ₹${priceLabel}/year` : 'Upgrade to Paid'}
                  </button>
                </>
              ) : (
                <>
                  <h3 className={styles.ctaTitle}>You&apos;re out of mock interviews</h3>
                  <p className={styles.ctaText}>
                    Buy a credit pack to keep going — credits convert to interviews at{' '}
                    {mockInterviewStatus?.creditsPerUse ?? 0} credits per interview and are valid for 1 year.
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
