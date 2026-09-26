import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Sypher Next collects, uses, stores, shares, and processes personal information.',
};

export default function PrivacyPolicyPage(): React.JSX.Element {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>Legal</span>
            <h1 className={styles.pageTitle}>Privacy Policy</h1>
            <p className={styles.pageSubtitle}>Last Updated: September 26, 2026</p>
          </div>

          <div className={styles.prose}>
            <p>
              This Privacy Policy explains how <strong>Sypher Next</strong>, operated by{' '}
              <strong>[Legal Entity Name]</strong>, having its business address at{' '}
              <strong>[Business Address]</strong> (&ldquo;Sypher Next&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
              &ldquo;our&rdquo;), collects, uses, stores, shares, and otherwise processes personal information when
              you access or use the Sypher Next website, services, applications, courses, videos, blogs, community
              features, subscriptions, and related services (collectively, the &ldquo;Services&rdquo;).
            </p>
            <p>By using Sypher Next, you acknowledge the practices described in this Privacy Policy.</p>
            <p>
              Sypher Next is primarily operated from India but may be accessed by users worldwide. Where applicable
              law provides you with additional privacy rights, we will process requests in accordance with those
              laws.
            </p>

            <section>
              <h2>1. Who May Use Sypher Next</h2>
              <p>Sypher Next is intended for individuals who are 18 years of age or older.</p>
              <p>
                We do not knowingly provide accounts to individuals under 18. If we become aware that an account
                belongs to a person under the required minimum age, we may suspend or remove the account and take
                appropriate steps regarding associated personal information.
              </p>
            </section>

            <section>
              <h2>2. Information We Collect</h2>

              <h3>2.1 Account Information</h3>
              <p>When you create a Sypher Next account, we may collect:</p>
              <ul>
                <li>Full name;</li>
                <li>Email address;</li>
                <li>Authentication information;</li>
                <li>Public handle or username;</li>
                <li>Profile photograph, if provided; and</li>
                <li>Account status and subscription information.</li>
              </ul>
              <p>
                Users may register using an email address or supported third-party authentication services such as
                Google Sign-In.
              </p>
              <p>
                When Google Sign-In is used, Sypher Next uses it for account creation and authentication and may
                receive basic information necessary for this purpose, such as your name and email address.
              </p>
              <p>We may add other authentication providers in the future.</p>

              <h3>2.2 Learning and Usage Information</h3>
              <p>
                When you use Sypher Next, we may maintain information relating to your activity on the platform,
                including:
              </p>
              <ul>
                <li>Courses you access;</li>
                <li>Course and lesson progress;</li>
                <li>Videos watched;</li>
                <li>Completed lessons;</li>
                <li>Quiz activity;</li>
                <li>Learning progress;</li>
                <li>Subscription status;</li>
                <li>Content interactions; and</li>
                <li>Other platform activity required to provide your account and learning experience.</li>
              </ul>

              <h3>2.3 User-Generated Content</h3>
              <p>Sypher Next may allow users to create or submit content, including:</p>
              <ul>
                <li>Comments;</li>
                <li>Blog posts;</li>
                <li>Discussions;</li>
                <li>Profile photographs;</li>
                <li>Images;</li>
                <li>Code snippets;</li>
                <li>Replies and other community contributions.</li>
              </ul>
              <p>
                Information that you intentionally publish through public areas of Sypher Next may be visible to
                other users and potentially to the public.
              </p>
              <p>Your public profile may display information such as your:</p>
              <ul>
                <li>Public handle;</li>
                <li>Profile photograph;</li>
                <li>Comments;</li>
                <li>Blog posts; and</li>
                <li>Other public contributions.</li>
              </ul>
              <p>
                <strong>Your email address is not intended to be displayed publicly.</strong>
              </p>
              <p>You should not publish information that you wish to remain private.</p>

              <h3>2.4 Payment Information</h3>
              <p>Paid subscriptions may be processed through third-party payment providers, including Razorpay.</p>
              <p>
                Sypher Next does not intend to directly store your complete payment-card credentials. Payment
                providers may independently collect and process information required to complete transactions,
                prevent fraud, comply with financial regulations, and manage refunds or disputes.
              </p>
              <p>We may retain limited payment-related information such as:</p>
              <ul>
                <li>Transaction identifiers;</li>
                <li>Subscription status;</li>
                <li>Payment status;</li>
                <li>Plan information;</li>
                <li>Billing dates; and</li>
                <li>Refund status.</li>
              </ul>

              <h3>2.5 Communications</h3>
              <p>
                If you contact us, we may process information contained in your communication, including support
                requests, privacy requests, refund requests, moderation appeals, copyright complaints, and other
                correspondence.
              </p>

              <h3>2.6 Analytics and Cookies</h3>
              <p>
                Sypher Next currently uses Google Analytics 4 (GA4), including custom events, to understand how
                visitors use the Services and to improve the platform.
              </p>
              <p>
                Depending on your consent choices and applicable law, analytics technologies may process information
                concerning:
              </p>
              <ul>
                <li>Pages viewed;</li>
                <li>Events and interactions;</li>
                <li>Session activity;</li>
                <li>Browser or device characteristics;</li>
                <li>Approximate geographic information;</li>
                <li>Referral information; and</li>
                <li>Similar analytics information.</li>
              </ul>
              <p>
                Sypher Next does not intentionally store certain analytics-related technical information, such as raw
                IP addresses and browser/device telemetry, in its own application database merely because an
                analytics provider processes such information.
              </p>
              <p>
                Third-party analytics, hosting, authentication, security, payment, or infrastructure providers may
                process technical information according to their own systems and privacy practices.
              </p>
            </section>

            <section>
              <h2>3. Cookies and Similar Technologies</h2>
              <p>We use cookies and similar technologies for different purposes.</p>

              <h3>Essential Cookies</h3>
              <p>Essential cookies may be required for:</p>
              <ul>
                <li>Account authentication;</li>
                <li>Login sessions;</li>
                <li>Security;</li>
                <li>Subscription access;</li>
                <li>User preferences; and</li>
                <li>Core website functionality.</li>
              </ul>
              <p>
                Because these technologies are necessary to provide requested functionality, they may not always
                require optional consent where permitted by law.
              </p>

              <h3>Analytics Cookies</h3>
              <p>Analytics cookies may be used to understand how users interact with Sypher Next.</p>
              <p>
                Where consent is legally required, analytics technologies will be activated based on the
                user&apos;s consent choices.
              </p>
              <p>Our cookie consent interface may provide options such as Accept All and Reject All.</p>
              <p>
                We intend to provide appropriate mechanisms for users to withdraw or change optional cookie consent
                where required by applicable law.
              </p>
            </section>

            <section>
              <h2>4. Advertising</h2>
              <p>Sypher Next does not currently display advertising.</p>
              <p>
                We may introduce advertisements, sponsorships, affiliate relationships, or similar commercial
                features in the future.
              </p>
              <p>
                If advertising is introduced, free users may see advertisements while paid subscribers may receive an
                ad-free experience depending on their subscription plan.
              </p>
              <p>
                Where required, we will update our disclosures and obtain appropriate consent before using personal
                information or optional cookies for personalized advertising.
              </p>
              <p>Sypher Next does not sell personal information.</p>
              <p>
                If applicable privacy law treats certain advertising-related disclosures as a &ldquo;sale&rdquo; or
                &ldquo;sharing&rdquo; of personal information, we will provide any legally required disclosures and
                opt-out mechanisms.
              </p>
            </section>

            <section>
              <h2>5. How We Use Information</h2>
              <p>We may process personal information to:</p>
              <ul>
                <li>Create and administer accounts;</li>
                <li>Authenticate users;</li>
                <li>Provide courses and platform functionality;</li>
                <li>Track learning progress;</li>
                <li>Manage paid subscriptions;</li>
                <li>Process payments and refunds;</li>
                <li>Maintain user preferences;</li>
                <li>Operate public profiles and community features;</li>
                <li>Send transactional communications;</li>
                <li>Send marketing communications where permitted;</li>
                <li>Provide customer support;</li>
                <li>Moderate user-generated content;</li>
                <li>Investigate violations of our Terms;</li>
                <li>Detect and prevent fraud, abuse, scraping, attacks, and security incidents;</li>
                <li>Analyze and improve our Services;</li>
                <li>Maintain and develop features;</li>
                <li>Protect our users and business;</li>
                <li>Exercise or defend legal rights;</li>
                <li>Comply with applicable laws and lawful governmental requests; and</li>
                <li>Complete corporate transactions such as mergers, acquisitions, reorganizations, or business transfers.</li>
              </ul>
            </section>

            <section>
              <h2>6. Email Communications</h2>
              <p>We may send essential service communications concerning:</p>
              <ul>
                <li>Account creation;</li>
                <li>Authentication;</li>
                <li>Password or security matters;</li>
                <li>Subscription payments;</li>
                <li>Renewals;</li>
                <li>Subscription cancellation;</li>
                <li>Refunds;</li>
                <li>Changes to the Services;</li>
                <li>Legal notices; and</li>
                <li>Other important account matters.</li>
              </ul>
              <p>
                These communications are part of providing the Services and may not be subject to marketing opt-out
                mechanisms.
              </p>
              <p>
                We may separately send newsletters, product announcements, course information, promotions, or other
                marketing communications.
              </p>
              <p>You may unsubscribe from marketing communications using the unsubscribe mechanism included in the relevant message.</p>
              <p>Unsubscribing from marketing messages does not prevent us from sending essential transactional or service-related communications.</p>
            </section>

            <section>
              <h2>7. Service Providers</h2>
              <p>We may use third-party providers to operate Sypher Next, including providers of:</p>
              <ul>
                <li>Cloud infrastructure;</li>
                <li>Hosting;</li>
                <li>Databases;</li>
                <li>Content delivery;</li>
                <li>Authentication;</li>
                <li>Analytics;</li>
                <li>Email delivery;</li>
                <li>Payment processing;</li>
                <li>Security;</li>
                <li>Storage;</li>
                <li>Customer support; and</li>
                <li>Other technical or operational services.</li>
              </ul>
              <p>We do not publicly disclose every infrastructure provider or component of our technology architecture.</p>
              <p>Important third-party services currently include Google services for authentication and analytics and Razorpay for payment processing.</p>
              <p>Third-party providers may process personal information on our behalf or independently under their own terms and privacy policies.</p>
            </section>

            <section>
              <h2>8. International Data Processing</h2>
              <p>
                Because Sypher Next is available internationally and uses technology service providers, personal
                information may be processed or stored in countries other than the country in which you live.
              </p>
              <p>Where required by applicable law, we will take appropriate measures relating to international transfers of personal information.</p>
            </section>

            <section>
              <h2>9. Public Information</h2>
              <p>Content intentionally published through Sypher Next&apos;s public features may be accessible to other users or the general public.</p>
              <p>This may include:</p>
              <ul>
                <li>Handles;</li>
                <li>Profile photographs;</li>
                <li>Comments;</li>
                <li>Blog posts;</li>
                <li>Discussions; and</li>
                <li>Other public submissions.</li>
              </ul>
              <p>Do not post confidential information or personal information about yourself or another person that should not be publicly disclosed.</p>
            </section>

            <section>
              <h2>10. Your Content and Account Deletion</h2>
              <p>Users may generally edit, modify, or delete their own user-generated content where such functionality is available.</p>
              <p>
                If your account is deleted, Sypher Next may remove your identifying profile information while
                retaining public contributions in anonymized or de-identified form where appropriate.
              </p>
              <p>For example, a discussion may remain visible while your name and identifying account details are removed.</p>
              <p>Specific content-removal requests may be reviewed case by case.</p>
              <p>Deleted information may remain temporarily in backups, archives, security records, or disaster-recovery systems.</p>
            </section>

            <section>
              <h2>11. Account Deletion and Retention</h2>
              <p>Sypher Next does not currently provide a self-service account deletion function.</p>
              <p>
                You may request deletion by contacting: <a href="mailto:support@syphernext.com">support@syphernext.com</a>
              </p>
              <p>
                When an account deletion request is approved, the account may first be soft deleted, making it
                unavailable for ordinary use.
              </p>
              <p>
                Unless longer retention is reasonably necessary or legally required, remaining account personal
                information will be permanently deleted or anonymized within 12 months.
              </p>
              <p>Some information may be retained for longer where reasonably necessary for purposes such as:</p>
              <ul>
                <li>Tax or accounting obligations;</li>
                <li>Payment records;</li>
                <li>Fraud prevention;</li>
                <li>Security;</li>
                <li>Chargebacks;</li>
                <li>Litigation or disputes;</li>
                <li>Enforcement of agreements;</li>
                <li>Regulatory obligations; or</li>
                <li>Compliance with applicable law.</li>
              </ul>
              <p>We will not retain personal information merely because indefinite retention is technically possible.</p>
            </section>

            <section>
              <h2>12. Privacy Rights</h2>
              <p>Depending on where you live, applicable law may provide rights regarding your personal information.</p>
              <p>These may include rights to request:</p>
              <ul>
                <li>Access to certain personal information;</li>
                <li>Correction of inaccurate information;</li>
                <li>Deletion or erasure;</li>
                <li>Withdrawal of consent;</li>
                <li>Restriction of certain processing;</li>
                <li>Objection to certain processing;</li>
                <li>Information regarding how your data is processed; or</li>
                <li>Other rights provided by applicable law.</li>
              </ul>
              <p>Sypher Next does not currently provide a self-service data export feature.</p>
              <p>However, where applicable law gives you a right to receive or access information, we will handle a valid request in accordance with that law.</p>
              <p>
                Users cannot directly change the registered name or email address through the account interface at
                present. Requests to correct inaccurate account information may be submitted manually.
              </p>
              <p>
                Requests should be sent to: <a href="mailto:support@syphernext.com">support@syphernext.com</a>
              </p>
              <p>We may reasonably verify your identity before acting on a privacy request.</p>
            </section>

            <section>
              <h2>13. Security</h2>
              <p>We use reasonable administrative, technical, and organizational safeguards intended to protect information processed through Sypher Next.</p>
              <p>However, no website, database, internet transmission, or storage system can be guaranteed to be completely secure.</p>
              <p>You are responsible for maintaining the confidentiality and security of your login credentials.</p>
              <p>
                If you believe your account has been compromised, contact{' '}
                <a href="mailto:support@syphernext.com">support@syphernext.com</a>.
              </p>
            </section>

            <section>
              <h2>14. Legal Requests and Safety</h2>
              <p>We may preserve or disclose information when reasonably necessary to:</p>
              <ul>
                <li>Comply with applicable law;</li>
                <li>Respond to valid legal process;</li>
                <li>Comply with court or governmental orders;</li>
                <li>Investigate fraud or security incidents;</li>
                <li>Protect users;</li>
                <li>Enforce our Terms; or</li>
                <li>Protect the rights, property, or safety of Sypher Next or others.</li>
              </ul>
            </section>

            <section>
              <h2>15. Business Transfers</h2>
              <p>
                If Sypher Next or its assets are involved in a merger, acquisition, financing, restructuring,
                insolvency, sale, or transfer of business assets, information associated with the Services may be
                transferred as part of that transaction, subject to applicable law.
              </p>
            </section>

            <section>
              <h2>16. Third-Party Websites and Embedded Services</h2>
              <p>Sypher Next may contain links to or embedded content from third-party websites and services.</p>
              <p>Those third parties operate under their own terms and privacy practices.</p>
              <p>We are not responsible for the privacy practices of third-party services that we do not control.</p>
            </section>

            <section>
              <h2>17. Changes to This Privacy Policy</h2>
              <p>We may modify this Privacy Policy from time to time.</p>
              <p>The latest version will be posted on Sypher Next with an updated &ldquo;Last Updated&rdquo; date.</p>
              <p>Where a change is material and applicable law requires additional notice or consent, we will take appropriate steps to provide that notice or obtain consent.</p>
            </section>

            <section>
              <h2>18. Grievance and Privacy Contact</h2>
              <p>Questions, complaints, privacy requests, data correction requests, or deletion requests may be directed to:</p>
              <p className={styles.addressBlock}>
                <span>Grievance / Privacy Contact</span>
                <span>[Grievance Officer Name]</span>
                <span>[Legal Entity Name]</span>
                <span>[Business Address]</span>
                <span>New Delhi, India</span>
                <span>
                  Email: <a href="mailto:support@syphernext.com">support@syphernext.com</a>
                </span>
              </p>
              <p>We may request information necessary to authenticate and process your request.</p>
            </section>

            <section>
              <h2>19. Contact Us</h2>
              <p>For questions regarding this Privacy Policy:</p>
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
