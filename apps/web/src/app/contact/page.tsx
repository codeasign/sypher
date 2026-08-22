import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import ContactForm from './ContactForm';
import styles from './styles.module.css';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Sypher team.',
};

export default function ContactPage(): React.JSX.Element {
  return (
    <>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>Contact</span>
            <h1 className={styles.pageTitle}>Get in touch</h1>
            <p className={styles.pageSubtitle}>
              Questions, feedback, or partnership ideas — send us a message and we&apos;ll get back to you.
            </p>
          </div>
          <ContactForm />
        </div>
      </div>
      <Footer />
    </>
  );
}
