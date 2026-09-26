import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The Terms and Conditions governing access to and use of Sypher Next.',
};

export default function TermsAndConditionsPage(): React.JSX.Element {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>Legal</span>
            <h1 className={styles.pageTitle}>Terms &amp; Conditions</h1>
            <p className={styles.pageSubtitle}>Last Updated: September 26, 2026</p>
          </div>

          <div className={styles.prose}>
            <p>
              These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access to and use of{' '}
              <strong>Sypher Next</strong>, operated by <strong>[Legal Entity Name]</strong>, having its business
              address at <strong>[Business Address]</strong>, New Delhi, India (&ldquo;Sypher Next&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
            </p>
            <p>
              These Terms apply to the Sypher Next website, courses, videos, blogs, subscriptions, community
              features, user-generated content, and related services (collectively, the &ldquo;Services&rdquo;).
            </p>
            <p>
              By creating an account, purchasing a subscription, or otherwise using the Services, you agree to these
              Terms and our Privacy Policy.
            </p>
            <p>If you do not agree, do not use the Services.</p>

            <section>
              <h2>1. Eligibility</h2>
              <p>
                You must be <strong>at least 18 years old</strong> to create an account or use Sypher Next.
              </p>
              <p>By registering, you represent that:</p>
              <ul>
                <li>You are at least 18;</li>
                <li>Information provided by you is accurate;</li>
                <li>You are legally capable of entering into these Terms; and</li>
                <li>Your use of Sypher Next does not violate applicable law.</li>
              </ul>
              <p>
                We may refuse registration or access where reasonably necessary because of prior bans, suspected
                fraud, abuse, security risks, or legal requirements.
              </p>
            </section>

            <section>
              <h2>2. Accounts</h2>
              <p>An account may be created using an email address or supported third-party authentication service such as Google Sign-In.</p>
              <p>
                Each account is intended for <strong>one individual user only</strong>.
              </p>
              <p>You may not:</p>
              <ul>
                <li>Share your account with another person;</li>
                <li>Sell or transfer your account;</li>
                <li>Permit multiple people to use one individual subscription;</li>
                <li>Circumvent account restrictions; or</li>
                <li>Use another person&apos;s account without authorization.</li>
              </ul>
              <p>
                You are responsible for activities occurring through your account where caused by your use or
                failure to appropriately secure your credentials.
              </p>
              <p>We may suspend or terminate accounts where account sharing or unauthorized access is detected.</p>
            </section>

            <section>
              <h2>3. Subscriptions</h2>
              <p>Sypher Next may offer monthly and annual paid subscription plans.</p>
              <p>Subscription features, content, prices, and availability may vary.</p>
              <p>
                Unless otherwise stated, subscriptions <strong>automatically renew</strong> at the end of each
                billing period until cancelled.
              </p>
              <p>
                By purchasing an automatically renewing subscription, you authorize the applicable payment provider
                to collect recurring payments in accordance with the subscription terms presented at purchase.
              </p>
              <p>We intend to send subscription renewal reminders for monthly and annual subscriptions where appropriate.</p>
              <p>Failure to receive a reminder does not, by itself, cancel an otherwise valid renewal, subject to applicable law.</p>
            </section>

            <section>
              <h2>4. Subscription Pricing</h2>
              <p>Subscription prices displayed on Sypher Next may change from time to time.</p>
              <p>The price applicable to a new subscription will generally be the price displayed when the subscription is purchased.</p>
              <p>Sypher Next may change renewal pricing for future billing periods.</p>
              <p>
                Where an existing subscriber&apos;s renewal price will increase, we may provide reasonable advance
                notice as required by applicable law or payment-provider requirements.
              </p>
              <p>A price change will not retroactively change an already-paid billing period.</p>
              <p>Taxes may apply where required.</p>
            </section>

            <section>
              <h2>5. Payments</h2>
              <p>
                Payments may be processed through <strong>Razorpay</strong> or another supported payment provider.
              </p>
              <p>Payment processors may apply their own terms, authentication requirements, and security procedures.</p>
              <p>You agree to provide valid payment information and authorize applicable charges associated with your purchase.</p>
              <p>Sypher Next does not guarantee that every payment method will remain available.</p>
            </section>

            <section>
              <h2>6. Cancellation</h2>
              <p>You may cancel your subscription through the functionality provided by Sypher Next.</p>
              <p>Cancellation prevents future automatic renewal.</p>
              <p>
                Unless otherwise stated, after cancellation you will retain paid access until the{' '}
                <strong>end of your current paid billing period</strong>.
              </p>
              <p>Cancellation does not automatically entitle you to a refund for amounts already paid.</p>
              <p>Refund eligibility is governed by our Refund Policy and applicable law.</p>
            </section>

            <section>
              <h2>7. Free Access</h2>
              <p>
                Sypher Next may provide a free tier, limited previews, selected free courses, free features,
                promotional access, or other restricted functionality.
              </p>
              <p>Free access may:</p>
              <ul>
                <li>Contain less content;</li>
                <li>Have fewer features;</li>
                <li>Be subject to different usage restrictions; and</li>
                <li>In the future, contain advertising.</li>
              </ul>
              <p>We may modify or discontinue free features at any time.</p>
            </section>

            <section>
              <h2>8. Advertising and Promotions</h2>
              <p>Sypher Next does not currently display advertisements but may introduce advertisements in the future.</p>
              <p>Paid plans may be offered as ad-free plans while free users may see advertising.</p>
              <p>
                Sypher Next may also introduce sponsorships, promotional partnerships, affiliate links, referral
                programs, or other commercial arrangements in the future.
              </p>
              <p>Appropriate disclosures will be made where required.</p>
            </section>

            <section>
              <h2>9. Refunds</h2>
              <p>
                Refund requests are governed by our separate <strong>Refund Policy</strong>.
              </p>
              <p>
                As a general policy, eligible subscription refund requests should be submitted within{' '}
                <strong>7 calendar days</strong> of the applicable payment.
              </p>
              <p>
                Sypher Next may consider factors including content consumption, account usage, payment history,
                suspected abuse, and the reason for the request.
              </p>
              <p>Nothing in these Terms limits mandatory consumer rights that cannot legally be waived.</p>
            </section>

            <section>
              <h2>10. Educational Nature of the Services</h2>
              <p>
                Sypher Next is an educational technology platform primarily providing content concerning software,
                technology, professional development, personal skills, and related subjects.
              </p>
              <p>Content is provided for educational and informational purposes.</p>
              <p>Unless expressly stated otherwise, completing a Sypher Next course does not guarantee:</p>
              <ul>
                <li>Employment;</li>
                <li>Promotion;</li>
                <li>Salary increases;</li>
                <li>Business results;</li>
                <li>Professional qualification;</li>
                <li>Certification;</li>
                <li>Admission to an institution;</li>
                <li>Passing an examination; or</li>
                <li>Any other specific outcome.</li>
              </ul>
              <p>Users are responsible for how they apply information learned through the Services.</p>
              <p>
                Educational content should not be treated as professional legal, financial, medical, or other
                regulated professional advice where such advice would ordinarily require an appropriately qualified
                professional.
              </p>
            </section>

            <section>
              <h2>11. Content Availability</h2>
              <p>Sypher Next may at any time:</p>
              <ul>
                <li>Add courses;</li>
                <li>Update courses;</li>
                <li>Edit lessons;</li>
                <li>Replace videos;</li>
                <li>Modify articles;</li>
                <li>Change course structures;</li>
                <li>Remove content;</li>
                <li>Discontinue courses;</li>
                <li>Add or remove platform functionality; or</li>
                <li>Redesign features.</li>
              </ul>
              <p>
                Your subscription provides access to the Services available under your plan during your subscription
                period. It does not create ownership of any course or guarantee that a particular course or feature
                will exist permanently.
              </p>
              <p>We do not currently promise lifetime access.</p>
              <p>Any future lifetime-access product will be subject to the specific terms presented with that product.</p>
            </section>

            <section>
              <h2>12. Intellectual Property</h2>
              <p>
                Except for user-generated content and third-party materials, Sypher Next and its licensors own or
                control the intellectual property rights associated with the Services, including:
              </p>
              <ul>
                <li>Courses;</li>
                <li>Videos;</li>
                <li>Audio;</li>
                <li>Articles;</li>
                <li>Graphics;</li>
                <li>Software;</li>
                <li>Designs;</li>
                <li>Branding;</li>
                <li>Logos;</li>
                <li>Interfaces;</li>
                <li>Course structures;</li>
                <li>Learning materials; and</li>
                <li>Other proprietary content.</li>
              </ul>
              <p>
                Subject to these Terms, Sypher Next grants you a limited, personal, non-exclusive, non-transferable,
                revocable right to access the Services for your own lawful personal use.
              </p>
              <p>You may not, without permission:</p>
              <ul>
                <li>Copy or reproduce paid content;</li>
                <li>Download content where downloading is not expressly enabled;</li>
                <li>Screen-record courses;</li>
                <li>Redistribute videos or course materials;</li>
                <li>Sell or sublicense content;</li>
                <li>Publicly republish content;</li>
                <li>Share paid access;</li>
                <li>Scrape the platform;</li>
                <li>Build unauthorized datasets from the Services;</li>
                <li>Reverse engineer protected portions of the Services;</li>
                <li>Circumvent technological restrictions; or</li>
                <li>
                  Use Sypher Next content to train, fine-tune, evaluate, or develop machine-learning or
                  artificial-intelligence models.
                </li>
              </ul>
              <p>Nothing in these Terms transfers ownership of Sypher Next intellectual property to you.</p>
            </section>

            <section>
              <h2>13. User-Generated Content</h2>
              <p>Sypher Next may allow users to create:</p>
              <ul>
                <li>Blog posts;</li>
                <li>Comments;</li>
                <li>Discussions;</li>
                <li>Images;</li>
                <li>Profile photographs;</li>
                <li>Code snippets;</li>
                <li>Replies; and</li>
                <li>Other contributions.</li>
              </ul>
              <p>You retain ownership of intellectual property rights you lawfully hold in content you create.</p>
              <p>
                By publishing or uploading content to Sypher Next, you grant Sypher Next a worldwide, non-exclusive,
                royalty-free license to host, store, reproduce, format, display, distribute, make technically
                necessary modifications to, and otherwise use that content as reasonably necessary to:
              </p>
              <ul>
                <li>Operate Sypher Next;</li>
                <li>Display your content to users;</li>
                <li>Moderate the platform;</li>
                <li>Promote or feature public contributions;</li>
                <li>Maintain backups;</li>
                <li>Protect the Services; and</li>
                <li>Promote Sypher Next.</li>
              </ul>
              <p>
                For public content, this license includes the ability to feature or quote reasonable excerpts of
                your public posts or comments in Sypher Next promotional materials or social-media communications,
                with attribution where appropriate.
              </p>
              <p>This license does not transfer ownership of your content to Sypher Next.</p>
            </section>

            <section>
              <h2>14. Responsibility for User Content</h2>
              <p>You are responsible for content you upload or publish.</p>
              <p>
                You represent that you have all rights and permissions necessary to publish the content, including
                rights relating to photographs, images, code, text, and intellectual property belonging to others.
              </p>
              <p>Do not upload content that infringes another person&apos;s copyright, privacy, confidentiality, publicity, trademark, or other rights.</p>
            </section>

            <section>
              <h2>15. Public Profiles</h2>
              <p>Sypher Next may provide public user profiles.</p>
              <p>Publicly visible information may include:</p>
              <ul>
                <li>Handle or username;</li>
                <li>Profile photograph;</li>
                <li>Blog posts;</li>
                <li>Comments; and</li>
                <li>Other public contributions.</li>
              </ul>
              <p>Email addresses and private account information are not intended to be publicly displayed.</p>
              <p>Users may choose their own public handles.</p>
              <p>Handles may not:</p>
              <ul>
                <li>Impersonate Sypher Next;</li>
                <li>Impersonate another individual or organization;</li>
                <li>Falsely imply affiliation;</li>
                <li>Contain unlawful or abusive material; or</li>
                <li>Violate another party&apos;s rights.</li>
              </ul>
              <p>We may modify, reclaim, disable, or require modification of a handle that violates these Terms.</p>
            </section>

            <section>
              <h2>16. Community Rules</h2>
              <p>Users must participate respectfully and constructively.</p>
              <p>Constructive criticism and disagreement are welcome. Abuse is not.</p>
              <p>You may not use Sypher Next to post, upload, transmit, promote, or facilitate content or conduct involving:</p>
              <ul>
                <li>Harassment;</li>
                <li>Threats;</li>
                <li>Bullying;</li>
                <li>Targeted personal attacks;</li>
                <li>Hate speech;</li>
                <li>Unlawful discrimination;</li>
                <li>Sexually explicit or unlawful sexual content;</li>
                <li>Unlawful violent content;</li>
                <li>Fraud or scams;</li>
                <li>Spam;</li>
                <li>Unauthorized advertising;</li>
                <li>Unauthorized affiliate promotion;</li>
                <li>Excessive self-promotion;</li>
                <li>Phishing;</li>
                <li>Credential theft;</li>
                <li>Malware;</li>
                <li>Malicious software;</li>
                <li>Exploit material intended to compromise systems;</li>
                <li>Instructions primarily intended to facilitate unauthorized system compromise;</li>
                <li>Copyright infringement;</li>
                <li>Plagiarism;</li>
                <li>Illegal activity;</li>
                <li>Impersonation;</li>
                <li>Disclosure of another person&apos;s confidential information;</li>
                <li>Disclosure of another person&apos;s sensitive or private information without authorization; or</li>
                <li>Other content that violates applicable law or these Terms.</li>
              </ul>
            </section>

            <section>
              <h2>17. Moderation</h2>
              <p>Sypher Next may moderate content before or after publication.</p>
              <p>We may, where reasonably appropriate:</p>
              <ul>
                <li>Review submissions;</li>
                <li>Reject submissions;</li>
                <li>Edit formatting;</li>
                <li>Add notices or labels;</li>
                <li>Restrict visibility;</li>
                <li>Disable comments;</li>
                <li>Unpublish content;</li>
                <li>Remove content;</li>
                <li>Suspend features;</li>
                <li>Suspend accounts; or</li>
                <li>Permanently terminate accounts.</li>
              </ul>
              <p>
                We are not required to provide advance notice before taking action where immediate action is
                reasonably necessary because of serious abuse, security threats, fraud, illegal activity, or other
                significant violations.
              </p>
              <p>Moderation decisions do not create an obligation for Sypher Next to monitor every piece of user content.</p>
            </section>

            <section>
              <h2>18. Reporting and Appeals</h2>
              <p>Users may report content believed to violate these Terms.</p>
              <p>
                Moderation, suspension, or termination decisions may be appealed by contacting:{' '}
                <a href="mailto:support@syphernext.com">support@syphernext.com</a>
              </p>
              <p>We may review appeals case by case.</p>
              <p>An appeal does not guarantee reversal of a decision.</p>
            </section>

            <section>
              <h2>19. Copyright and Intellectual Property Complaints</h2>
              <p>
                If you believe content available through Sypher Next infringes your copyright or other intellectual
                property rights, contact: <a href="mailto:support@syphernext.com">support@syphernext.com</a>
              </p>
              <p>Please provide enough information for us to reasonably identify:</p>
              <ul>
                <li>The protected work;</li>
                <li>The allegedly infringing material;</li>
                <li>Where the material appears;</li>
                <li>Your relationship to the rights holder;</li>
                <li>Your contact information; and</li>
                <li>The basis of your complaint.</li>
              </ul>
              <p>We may remove or restrict disputed content while reviewing a complaint.</p>
              <p>Repeated infringement may result in account suspension or termination.</p>
            </section>

            <section>
              <h2>20. Prohibited Technical Conduct</h2>
              <p>You may not:</p>
              <ul>
                <li>Scrape Sypher Next without authorization;</li>
                <li>Use automated bots to extract content;</li>
                <li>Crawl restricted areas;</li>
                <li>Bypass access controls;</li>
                <li>Circumvent subscription restrictions;</li>
                <li>Probe for vulnerabilities without authorization;</li>
                <li>Attempt unauthorized access;</li>
                <li>Interfere with security controls;</li>
                <li>Introduce malware;</li>
                <li>Overload infrastructure;</li>
                <li>Conduct denial-of-service activity;</li>
                <li>Automate requests in an abusive manner;</li>
                <li>Reverse engineer protected systems except where a non-waivable law expressly permits it; or</li>
                <li>Otherwise interfere with normal operation of the Services.</li>
              </ul>
              <p>
                Sypher Next may employ technical measures to block accounts, devices, network sources, or activity
                associated with suspected abuse, fraud, scraping, attacks, or security threats.
              </p>
            </section>

            <section>
              <h2>21. Security and Investigations</h2>
              <p>We may temporarily restrict account access while investigating suspected:</p>
              <ul>
                <li>Fraud;</li>
                <li>Account compromise;</li>
                <li>Payment abuse;</li>
                <li>Security incidents;</li>
                <li>Terms violations; or</li>
                <li>Illegal activity.</li>
              </ul>
              <p>Where reasonably necessary, we may request identity or account verification for:</p>
              <ul>
                <li>Account recovery;</li>
                <li>Fraud investigations;</li>
                <li>Payment disputes;</li>
                <li>Security;</li>
                <li>Enforcement; or</li>
                <li>Compliance with law.</li>
              </ul>
            </section>

            <section>
              <h2>22. Suspension and Termination</h2>
              <p>We may suspend or terminate access where a user:</p>
              <ul>
                <li>Seriously violates these Terms;</li>
                <li>Repeatedly violates community rules;</li>
                <li>Shares accounts;</li>
                <li>Commits or attempts fraud;</li>
                <li>Abuses refunds or payment systems;</li>
                <li>Engages in illegal conduct;</li>
                <li>Attacks the platform;</li>
                <li>Scrapes protected content;</li>
                <li>Infringes intellectual property;</li>
                <li>Circumvents restrictions; or</li>
                <li>Creates material security or legal risk.</li>
              </ul>
              <p>Serious violations may result in permanent termination without prior warning.</p>
              <p>
                Termination for violations generally does not create a right to a refund, although Sypher Next may
                consider exceptional circumstances case by case and applicable law will continue to apply.
              </p>
            </section>

            <section>
              <h2>23. Chargebacks and Payment Disputes</h2>
              <p>
                If you initiate a chargeback or payment dispute, Sypher Next may remove paid subscription access and
                return your account to the free tier while the dispute is pending.
              </p>
              <p>Your account need not be terminated solely because a chargeback was initiated.</p>
              <p>
                If the dispute is resolved in Sypher Next&apos;s favor, restoration of paid access may require you to
                contact <a href="mailto:support@syphernext.com">support@syphernext.com</a>.
              </p>
              <p>Fraudulent chargebacks, repeated payment abuse, or misuse of payment dispute mechanisms may result in further account restrictions.</p>
            </section>

            <section>
              <h2>24. User Content After Account Deletion</h2>
              <p>Where functionality is available, users may edit, modify, or delete their own content.</p>
              <p>If an account is deleted, Sypher Next may anonymize public contributions rather than removing the entire discussion or publication.</p>
              <p>For example, comments or discussions may remain while identifying account details are removed.</p>
              <p>Requests for additional content removal may be considered case by case, subject to legal obligations and applicable rights.</p>
              <p>Backups or archived copies may remain for a limited period for legal, security, compliance, or disaster-recovery purposes.</p>
            </section>

            <section>
              <h2>25. Third-Party Services</h2>
              <p>Sypher Next may link to or incorporate third-party websites, repositories, videos, products, tools, applications, or other services.</p>
              <p>Third-party services are controlled by their respective operators.</p>
              <p>We do not guarantee and are not responsible for third-party:</p>
              <ul>
                <li>Content;</li>
                <li>Availability;</li>
                <li>Security;</li>
                <li>Accuracy;</li>
                <li>Products;</li>
                <li>Services;</li>
                <li>Transactions; or</li>
                <li>Privacy practices.</li>
              </ul>
              <p>Your use of third-party services may be governed by separate terms.</p>
            </section>

            <section>
              <h2>26. Platform Changes and Downtime</h2>
              <p>We may modify, redesign, replace, add, restrict, suspend, or discontinue any part of Sypher Next.</p>
              <p>The Services may occasionally be unavailable because of:</p>
              <ul>
                <li>Maintenance;</li>
                <li>Updates;</li>
                <li>Infrastructure issues;</li>
                <li>Security events;</li>
                <li>Technical failures;</li>
                <li>Provider outages; or</li>
                <li>Events outside our reasonable control.</li>
              </ul>
              <p>We do not guarantee uninterrupted or error-free operation.</p>
              <p>Ordinary downtime does not create an automatic entitlement to compensation or refund, except where required by law or expressly provided by our Refund Policy.</p>
            </section>

            <section>
              <h2>27. Disclaimer of Warranties</h2>
              <p>
                To the maximum extent permitted by law, Sypher Next and the Services are provided on an{' '}
                <strong>&ldquo;as is&rdquo;</strong> and <strong>&ldquo;as available&rdquo;</strong> basis.
              </p>
              <p>We do not warrant that:</p>
              <ul>
                <li>The Services will always be available;</li>
                <li>Every feature will remain available;</li>
                <li>Courses will remain permanently unchanged;</li>
                <li>Content will be error-free;</li>
                <li>All information will always be complete or current;</li>
                <li>The Services will meet every user&apos;s individual requirements; or</li>
                <li>Using Sypher Next will produce a specific academic, employment, professional, financial, or personal outcome.</li>
              </ul>
              <p>Nothing in this section excludes warranties or rights that cannot lawfully be excluded.</p>
            </section>

            <section>
              <h2>28. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable law, the aggregate liability of Sypher Next and{' '}
                <strong>[Legal Entity Name]</strong> arising from or relating to the Services or these Terms will not
                exceed the total amount actually paid by you to Sypher Next in connection with the applicable
                Services.
              </p>
              <p>
                To the maximum extent permitted by law, Sypher Next will not be liable for indirect, incidental,
                special, exemplary, punitive, or consequential losses arising from use of or inability to use the
                Services.
              </p>
              <p>These limitations do not apply to liability that cannot legally be excluded or limited.</p>
              <p>Nothing in these Terms limits mandatory rights available to consumers under applicable law.</p>
            </section>

            <section>
              <h2>29. Indemnity</h2>
              <p>To the extent permitted by law, you agree to be responsible for losses, claims, liabilities, and reasonable costs arising from:</p>
              <ul>
                <li>Your unlawful use of Sypher Next;</li>
                <li>Your user-generated content;</li>
                <li>Your infringement of another person&apos;s rights; or</li>
                <li>Your material violation of these Terms.</li>
              </ul>
              <p>This provision will be interpreted only to the extent enforceable under applicable law.</p>
            </section>

            <section>
              <h2>30. Law Enforcement and Legal Compliance</h2>
              <p>Sypher Next may cooperate with law enforcement agencies, courts, regulators, or governmental authorities where legally required.</p>
              <p>We may preserve or disclose relevant account information in response to valid legal process or where otherwise permitted or required by law.</p>
            </section>

            <section>
              <h2>31. Business Transfers</h2>
              <p>
                If Sypher Next undergoes a merger, acquisition, restructuring, financing, sale, insolvency
                transaction, or transfer of assets, contracts and information associated with the Services may be
                transferred as part of the transaction, subject to applicable law.
              </p>
            </section>

            <section>
              <h2>32. Changes to These Terms</h2>
              <p>We may update these Terms from time to time.</p>
              <p>The updated version will be posted on Sypher Next with a revised &ldquo;Last Updated&rdquo; date.</p>
              <p>We may provide additional notice regarding material changes where appropriate or legally required.</p>
              <p>Continued use after an updated version becomes effective may constitute acceptance where permitted by applicable law.</p>
              <p>Where applicable law requires affirmative consent to a particular change, we will seek such consent.</p>
            </section>

            <section>
              <h2>33. Governing Law and Jurisdiction</h2>
              <p>
                These Terms are governed by the laws of <strong>India</strong>, without regard to conflict-of-law
                principles.
              </p>
              <p>
                Subject to mandatory consumer rights and any jurisdiction that cannot legally be excluded, disputes
                relating to these Terms or Sypher Next will be subject to the competent courts of{' '}
                <strong>New Delhi, India</strong>.
              </p>
              <p>
                Nothing in this provision prevents a consumer from exercising any non-waivable right to approach a
                consumer commission, regulator, authority, or court that has jurisdiction under applicable law.
              </p>
            </section>

            <section>
              <h2>34. Severability</h2>
              <p>If any provision of these Terms is found invalid or unenforceable, the remaining provisions will remain effective to the fullest extent permitted by law.</p>
            </section>

            <section>
              <h2>35. No Waiver</h2>
              <p>Failure by Sypher Next to immediately enforce a provision of these Terms does not waive our right to enforce that provision later.</p>
            </section>

            <section>
              <h2>36. Entire Agreement</h2>
              <p>
                These Terms, together with the Privacy Policy, Refund Policy, subscription information presented at
                purchase, and any other terms expressly incorporated into them, constitute the agreement governing
                your use of Sypher Next.
              </p>
            </section>

            <section>
              <h2>37. Grievance and Contact Information</h2>
              <p>Questions, complaints, reports, appeals, copyright complaints, or other concerns may be submitted to:</p>
              <p className={styles.addressBlock}>
                <span>Grievance Contact</span>
                <span>[Grievance Officer Name]</span>
                <span>[Legal Entity Name]</span>
                <span>[Business Address]</span>
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
