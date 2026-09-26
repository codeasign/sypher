import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'The Refund Policy governing subscription payments made for Sypher Next.',
};

export default function RefundPolicyPage(): React.JSX.Element {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>Legal</span>
            <h1 className={styles.pageTitle}>Refund Policy</h1>
            <p className={styles.pageSubtitle}>Last Updated: September 26, 2026</p>
          </div>

          <div className={styles.prose}>
            <p>
              This Refund Policy applies to subscription payments made for <strong>Sypher Next</strong>, operated by{' '}
              <strong>[Legal Entity Name]</strong>, [Business Address], New Delhi, India.
            </p>
            <p>This policy should be read together with our Terms and Conditions.</p>

            <section>
              <h2>1. Seven-Day Refund Window</h2>
              <p>
                Unless otherwise stated at the time of purchase, you may request a refund within{' '}
                <strong>7 calendar days</strong> of:
              </p>
              <ul>
                <li>Your initial eligible subscription payment; or</li>
                <li>An eligible subscription renewal charge.</li>
              </ul>
              <p>Submitting a request within 7 days does not automatically guarantee approval.</p>
              <p>Refund requests are evaluated according to this policy, account usage, applicable law, and the circumstances of the request.</p>
            </section>

            <section>
              <h2>2. How to Request a Refund</h2>
              <p>
                To request a refund, email: <a href="mailto:support@syphernext.com">support@syphernext.com</a>
              </p>
              <p>
                Your request should include sufficient information for us to identify the transaction and should
                explain the <strong>reason for the refund request</strong>.
              </p>
              <p>We may ask for additional information reasonably necessary to verify:</p>
              <ul>
                <li>Your account;</li>
                <li>The transaction;</li>
                <li>The payment method;</li>
                <li>The basis of the request; or</li>
                <li>Potential fraud or payment abuse.</li>
              </ul>
            </section>

            <section>
              <h2>3. Content Consumption</h2>
              <p>Sypher Next provides digital educational content that may be consumed immediately after purchase.</p>
              <p>
                We therefore reserve the right to decline a refund where our records reasonably indicate that the
                subscriber has consumed or accessed a <strong>substantial amount of paid content</strong> during the
                refund period.
              </p>
              <p>Factors may include:</p>
              <ul>
                <li>Courses opened;</li>
                <li>Lessons accessed;</li>
                <li>Videos watched;</li>
                <li>Learning progress;</li>
                <li>Frequency of platform usage;</li>
                <li>Quiz or course activity; and</li>
                <li>Other relevant usage information.</li>
              </ul>
              <p>There is no single percentage that automatically determines eligibility. Requests may be reviewed case by case.</p>
            </section>

            <section>
              <h2>4. Renewal Refunds</h2>
              <p>
                Refund requests relating to automatic renewal charges should ordinarily be made within{' '}
                <strong>7 calendar days of the renewal payment</strong>.
              </p>
              <p>A renewal refund may be denied where the subscriber substantially continued to use paid content after the renewal occurred.</p>
              <p>Exceptional circumstances may be considered individually.</p>
            </section>

            <section>
              <h2>5. Promotional and Discounted Purchases</h2>
              <p>Unless expressly stated otherwise in the applicable offer, subscriptions purchased using:</p>
              <ul>
                <li>Promotional pricing;</li>
                <li>Coupons;</li>
                <li>Special discounts;</li>
                <li>Limited-time offers; or</li>
                <li>Similar promotional arrangements</li>
              </ul>
              <p>
                may be designated as <strong>non-refundable</strong>.
              </p>
              <p>However, mandatory consumer rights and refunds required by applicable law remain unaffected.</p>
              <p>Sypher Next may also approve an exceptional refund at its discretion.</p>
            </section>

            <section>
              <h2>6. Duplicate Charges and Billing Errors</h2>
              <p>
                If you are charged more than once for the same transaction or a clear billing error occurs, contact:{' '}
                <a href="mailto:support@syphernext.com">support@syphernext.com</a>
              </p>
              <p>Confirmed duplicate charges and genuine billing errors may be refunded even if the normal 7-day period has passed.</p>
            </section>

            <section>
              <h2>7. Technical Problems</h2>
              <p>
                If a material technical problem prevents you from accessing paid functionality and we are unable to
                reasonably resolve it, we may consider a refund or other appropriate remedy on a case-by-case basis.
              </p>
              <p>
                Minor interruptions, routine maintenance, temporary outages, changes to individual courses, or
                removal/modification of particular content do not automatically qualify for a refund.
              </p>
            </section>

            <section>
              <h2>8. Account Suspension or Termination</h2>
              <p>
                If an account is suspended or terminated because of a serious violation of the Sypher Next Terms and
                Conditions, the user will generally not be entitled to a refund for any remaining subscription
                period.
              </p>
              <p>Sypher Next may nevertheless review exceptional circumstances on a case-by-case basis.</p>
              <p>Nothing in this section removes consumer rights that cannot legally be waived.</p>
            </section>

            <section>
              <h2>9. Account Sharing</h2>
              <p>Subscriptions are intended for one individual user.</p>
              <p>Refunds may be refused where there is reasonable evidence of unauthorized account sharing, subscription abuse, or circumvention of access restrictions.</p>
            </section>

            <section>
              <h2>10. Fraud and Refund Abuse</h2>
              <p>We reserve the right to refuse a refund where we reasonably suspect:</p>
              <ul>
                <li>Fraud;</li>
                <li>Repeated refund abuse;</li>
                <li>Intentional exploitation of the refund policy;</li>
                <li>Payment manipulation;</li>
                <li>Unauthorized account sharing;</li>
                <li>Fraudulent chargebacks; or</li>
                <li>Other abusive conduct.</li>
              </ul>
              <p>We may investigate relevant account and payment activity before approving a request.</p>
            </section>

            <section>
              <h2>11. Chargebacks and Payment Disputes</h2>
              <p>
                If you initiate a chargeback or payment dispute with your bank, payment provider, or other financial
                institution, we may remove paid subscription access and return your Sypher Next account to the{' '}
                <strong>free tier</strong> while the dispute is pending.
              </p>
              <p>Your underlying account may remain active.</p>
              <p>If the dispute is resolved in Sypher Next&apos;s favor, paid access will not necessarily be restored automatically.</p>
              <p>
                You may contact <a href="mailto:support@syphernext.com">support@syphernext.com</a> to request
                restoration of eligible remaining subscription access.
              </p>
              <p>Repeated or fraudulent misuse of chargebacks may result in further account restrictions under our Terms and Conditions.</p>
            </section>

            <section>
              <h2>12. Method of Refund</h2>
              <p>
                Where reasonably possible, approved refunds may be returned to the{' '}
                <strong>original payment method</strong>.
              </p>
              <p>In some circumstances, Sypher Next and the user may agree to another refund mechanism, which may include:</p>
              <ul>
                <li>Bank transfer;</li>
                <li>UPI;</li>
                <li>PayPal; or</li>
                <li>Another mutually agreed payment method.</li>
              </ul>
              <p>We may require appropriate account or payment verification before using an alternative refund method.</p>
            </section>

            <section>
              <h2>13. Refund Processing Time</h2>
              <p>
                Approved refunds will generally be initiated or processed by Sypher Next within{' '}
                <strong>5&ndash;7 working days</strong>.
              </p>
              <p>After we process a refund, additional time may be required by:</p>
              <ul>
                <li>Banks;</li>
                <li>Razorpay;</li>
                <li>Card networks;</li>
                <li>UPI providers;</li>
                <li>PayPal; or</li>
                <li>Other payment intermediaries</li>
              </ul>
              <p>before funds appear in your account.</p>
              <p>These external processing periods are outside Sypher Next&apos;s direct control.</p>
            </section>

            <section>
              <h2>14. Subscription Cancellation Is Different From a Refund</h2>
              <p>
                Cancelling your subscription does <strong>not</strong> automatically refund an existing payment.
              </p>
              <p>When you cancel:</p>
              <ul>
                <li>Future automatic renewal will stop; and</li>
                <li>Your paid access will ordinarily continue until the end of the current billing period.</li>
              </ul>
              <p>A refund of the current payment must separately qualify under this Refund Policy.</p>
            </section>

            <section>
              <h2>15. Course and Feature Changes</h2>
              <p>Subscriptions provide access to the Sypher Next service rather than ownership or permanent access to an individual course.</p>
              <p>Sypher Next may add, update, replace, modify, or remove:</p>
              <ul>
                <li>Courses;</li>
                <li>Lessons;</li>
                <li>Videos;</li>
                <li>Articles;</li>
                <li>Features; or</li>
                <li>Other platform content.</li>
              </ul>
              <p>The modification or removal of an individual course or feature does not automatically qualify a subscription for a refund.</p>
              <p>Where a material reduction in the overall paid service creates rights under applicable consumer law, those rights remain unaffected.</p>
            </section>

            <section>
              <h2>16. No Lifetime Access at Present</h2>
              <p>Sypher Next does not currently offer lifetime-access subscriptions unless expressly stated otherwise on a specific future product or offer.</p>
            </section>

            <section>
              <h2>17. Statutory Consumer Rights</h2>
              <p>This Refund Policy is intended to define Sypher Next&apos;s contractual refund process.</p>
              <p>
                It does <strong>not</strong> exclude, restrict, or override any refund, cancellation, remedy, or
                consumer protection right that cannot legally be waived under applicable law.
              </p>
              <p>Where applicable law provides greater rights than this policy, the applicable law will prevail.</p>
            </section>

            <section>
              <h2>18. Policy Changes</h2>
              <p>Sypher Next may update this Refund Policy from time to time.</p>
              <p>Changes will be published on the website with an updated &ldquo;Last Updated&rdquo; date.</p>
              <p>Changes will not retroactively deprive a user of a mandatory right that applied to an earlier transaction.</p>
            </section>

            <section>
              <h2>19. Contact</h2>
              <p>For refunds, billing questions, or payment disputes:</p>
              <p className={styles.addressBlock}>
                <span>Sypher Next</span>
                <span>Operated by: [Legal Entity Name]</span>
                <span>Address: [Business Address]</span>
                <span>New Delhi, India</span>
                <span>
                  Email: <a href="mailto:support@syphernext.com">support@syphernext.com</a>
                </span>
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
