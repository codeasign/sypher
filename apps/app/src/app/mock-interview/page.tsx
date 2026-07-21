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
import { InterviewIcon } from '@/components/NavIcons';
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

const TIER_TINT_CLASS: Record<string, string> = {
  bronze: styles.tintBronze,
  silver: styles.tintSilver,
  gold: styles.tintGold,
  ultra: styles.tintUltra,
};

const TIER_ICON_CLASS: Record<string, string> = {
  bronze: styles.iconBronze,
  silver: styles.iconSilver,
  gold: styles.iconGold,
  ultra: styles.iconUltra,
};

const TIER_ICON: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  ultra: '💎',
};

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

  useEffect(() => {
    if (user?.email) {
      const email = user.email;
      setFields((prev) => (prev.email === email ? prev : { ...prev, email }));
    }
  }, [user?.email]);

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
      setFields({ ...initialFields, email: user?.email ?? '' });
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
  const featuredTier = packs.find((p) => p.tier === 'gold')?.tier ?? packs[Math.floor(packs.length / 2)]?.tier;

  return (
    <DashboardLayout title="Mock Interview" description="Book a mock interview with our team">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <InterviewIcon />
          </div>
          <div>
            <h1 className={styles.heading}>Mock Interview</h1>
            <p className={styles.subtitle}>Book a practice interview and get personalized feedback from our team.</p>
          </div>
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
                  <input
                    className={styles.input}
                    id="email"
                    name="email"
                    type="email"
                    required
                    readOnly
                    title="Locked to your account email"
                    value={fields.email}
                    onChange={handleChange}
                  />
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
                  <h3 className={styles.ctaTitle}>Walk into your next interview prepared</h3>
                  <p className={styles.ctaText}>
                    Paid members get {featureStatus?.mockInterview.included ?? 0} mock interviews included every
                    year, plus the option to book more anytime.
                  </p>
                  <ul className={styles.benefitsList}>
                    <li className={styles.benefitItem}>
                      <span className={styles.benefitCheck}>✓</span>
                      A live simulation with real interview questions for your target role
                    </li>
                    <li className={styles.benefitItem}>
                      <span className={styles.benefitCheck}>✓</span>
                      Actionable feedback on communication, structure, and technical depth
                    </li>
                    <li className={styles.benefitItem}>
                      <span className={styles.benefitCheck}>✓</span>
                      Practice with people who&apos;ve actually hired for your target companies
                    </li>
                  </ul>
                  <button type="button" className={styles.upgradeBtn} disabled={isProcessing} onClick={handleUpgrade}>
                    {isProcessing ? 'Processing…' : priceLabel ? `Upgrade to Paid — ₹${priceLabel}/year` : 'Upgrade to Paid'}
                  </button>
                  <p className={styles.trustNote}>Cancel anytime · Secure checkout via Razorpay</p>
                </>
              ) : (
                <>
                  <div className={styles.infoTip}>
                    <span className={styles.infoTipIcon}>i</span>
                    <div className={styles.infoTipContent}>
                      <p className={styles.infoTipTitle}>You&apos;re out of mock interviews</p>
                      <p className={styles.infoTipText}>
                        Buy a credit pack to keep going — credits convert to interviews at{' '}
                        {mockInterviewStatus?.creditsPerUse ?? 0} credits per interview and are valid for 1 year.
                      </p>
                    </div>
                  </div>
                  <div className={styles.packsIntro}>
                    <ul className={styles.benefitsList}>
                      <li className={styles.benefitItem}>
                        <span className={styles.benefitCheck}>✓</span>
                        Practice with real interviewers who&apos;ve actually hired for your target roles
                      </li>
                      <li className={styles.benefitItem}>
                        <span className={styles.benefitCheck}>✓</span>
                        Credits are valid for a full year, so you can schedule on your own timeline
                      </li>
                    </ul>
                    <p className={styles.packsIntroTitle}>What do you get</p>
                  </div>
                  <div className={styles.packGrid}>
                    {packs.map((pack) => {
                      const isFeatured = pack.tier === featuredTier;
                      const accentClass = styles.packAccent;
                      const tintClass = TIER_TINT_CLASS[pack.tier] ?? '';
                      const iconClass = TIER_ICON_CLASS[pack.tier] ?? '';
                      const cardClass = [styles.packCard, tintClass, isFeatured ? styles.packFeatured : ''].filter(Boolean).join(' ');
                      const packPriceLabel = `₹${(pack.price_paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                      return (
                        <div key={pack.tier} className={cardClass}>
                          {isFeatured && <span className={styles.popularBadge}>Popular</span>}
                          <span className={`${styles.packIconBadge} ${iconClass}`}>{TIER_ICON[pack.tier] ?? ''}</span>
                          <span className={styles.packName}>{pack.name}</span>
                          <div className={styles.packPriceBlock}>
                            <span className={styles.packPrice}>{packPriceLabel}</span>
                            <span className={styles.packPriceUnit}>{pack.credits} credits</span>
                          </div>
                          <span className={styles.packDivider} />
                          <button
                            type="button"
                            className={`${styles.packBuyBtn} ${accentClass}`}
                            disabled={isProcessing}
                            onClick={() => handleBuyPack(pack.tier)}
                          >
                            {isProcessing ? 'Processing…' : packPriceLabel}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.trustNoteRow}>
                    <svg className={styles.razorpayIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <rect width="24" height="24" rx="6" fill="#0A2540" />
                      <path d="M9 17V7h6.2c1.9 0 3.3 1.15 3.3 2.9 0 1.4-.9 2.45-2.25 2.8L18.6 17h-2.5l-2.35-4.1H11V17H9zm2-6h4c.85 0 1.5-.5 1.5-1.25S15.85 8.5 15 8.5h-4V11z" fill="#fff" />
                    </svg>
                    <p className={styles.trustNote}>Credits are valid for 1 year from purchase · Secure checkout via Razorpay</p>
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
