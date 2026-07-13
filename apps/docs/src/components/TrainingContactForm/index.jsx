import React, { useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

const TEAM_SIZE_OPTIONS = ['1–10', '11–25', '26–50', '51–100', '101–250', '250+'];
const DELIVERY_OPTIONS = ['On-Premise', 'Live Online', 'Hybrid', 'Not Sure Yet'];
const TIMELINE_OPTIONS = ['Immediately', 'Within 1 Month', 'Within 3 Months', 'Just Exploring'];

const initialFields = {
  name: '',
  email: '',
  company: '',
  phone: '',
  teamSize: '',
  delivery: '',
  timeline: '',
  requirements: '',
};

export default function TrainingContactForm() {
  const { siteConfig } = useDocusaurusContext();
  const accessKey = siteConfig.customFields?.web3formsAccessKey;

  const [fields, setFields] = useState(initialFields);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!accessKey) {
      setStatus('error');
      setErrorMessage("Training inquiries aren't configured yet — please email us directly.");
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: 'New Corporate Training Inquiry',
          from_name: fields.name,
          name: fields.name,
          email: fields.email,
          company: fields.company,
          phone: fields.phone,
          team_size: fields.teamSize,
          training_delivery: fields.delivery,
          preferred_timeline: fields.timeline,
          requirements: fields.requirements,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(result.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong. Please check your connection and try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className={styles.successCard} role="status">
        <div className={styles.successIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className={styles.successTitle}>Request received</h3>
        <p className={styles.successText}>
          Thanks for reaching out. Our team will review your request and get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input type="checkbox" name="botcheck" className={styles.honeypot} tabIndex={-1} autoComplete="off" />

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="name">Name *</label>
          <input
            className={styles.input}
            id="name"
            name="name"
            type="text"
            required
            value={fields.name}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Work Email *</label>
          <input
            className={styles.input}
            id="email"
            name="email"
            type="email"
            required
            value={fields.email}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="company">Company *</label>
          <input
            className={styles.input}
            id="company"
            name="company"
            type="text"
            required
            value={fields.company}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="phone">Phone Number</label>
          <input
            className={styles.input}
            id="phone"
            name="phone"
            type="tel"
            value={fields.phone}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="teamSize">Team Size</label>
          <select
            className={styles.select}
            id="teamSize"
            name="teamSize"
            value={fields.teamSize}
            onChange={handleChange}
          >
            <option value="">Select team size</option>
            {TEAM_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="delivery">Training Delivery</label>
          <select
            className={styles.select}
            id="delivery"
            name="delivery"
            value={fields.delivery}
            onChange={handleChange}
          >
            <option value="">Select delivery format</option>
            {DELIVERY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="timeline">Preferred Timeline</label>
        <select
          className={styles.select}
          id="timeline"
          name="timeline"
          value={fields.timeline}
          onChange={handleChange}
        >
          <option value="">Select timeline</option>
          {TIMELINE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="requirements">Brief Requirements</label>
        <textarea
          className={styles.textarea}
          id="requirements"
          name="requirements"
          rows={4}
          value={fields.requirements}
          onChange={handleChange}
        />
      </div>

      {status === 'error' && (
        <p className={styles.error} role="alert">{errorMessage}</p>
      )}

      <button type="submit" className={styles.submitBtn} disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Request a Proposal'}
      </button>
    </form>
  );
}
