import React, { useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { submitToWeb3Forms } from '@sypher/career-tools';
import baseStyles from '../TrainingContactForm/styles.module.css';

const TEAM_SIZE_OPTIONS = ['1–10', '11–25', '26–50', '51–100', '101–250', '250+'];

const initialFields = {
  name: '',
  email: '',
  company: '',
  teamSize: '',
  coursesInterested: '',
  message: '',
};

export default function TeamAccessContactForm() {
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
      setErrorMessage("Team access requests aren't configured yet — please email us directly.");
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const result = await submitToWeb3Forms({
        access_key: accessKey,
        subject: 'New Team Course Access Inquiry',
        from_name: fields.name,
        name: fields.name,
        email: fields.email,
        company: fields.company,
        team_size: fields.teamSize,
        courses_interested: fields.coursesInterested,
        message: fields.message,
      });

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
      <div className={baseStyles.successCard} role="status">
        <div className={baseStyles.successIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className={baseStyles.successTitle}>Request received</h3>
        <p className={baseStyles.successText}>
          Thanks for reaching out. Our team will set up your company profile and follow up within
          one business day to finalize course access.
        </p>
      </div>
    );
  }

  return (
    <form className={baseStyles.form} onSubmit={handleSubmit}>
      <input type="checkbox" name="botcheck" className={baseStyles.honeypot} tabIndex={-1} autoComplete="off" />

      <div className={baseStyles.row}>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="ta-name">Name *</label>
          <input
            className={baseStyles.input}
            id="ta-name"
            name="name"
            type="text"
            required
            value={fields.name}
            onChange={handleChange}
          />
        </div>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="ta-email">Work Email *</label>
          <input
            className={baseStyles.input}
            id="ta-email"
            name="email"
            type="email"
            required
            value={fields.email}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className={baseStyles.row}>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="ta-company">Company / Institution *</label>
          <input
            className={baseStyles.input}
            id="ta-company"
            name="company"
            type="text"
            required
            value={fields.company}
            onChange={handleChange}
          />
        </div>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="ta-teamSize">Team Size</label>
          <select
            className={baseStyles.select}
            id="ta-teamSize"
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
      </div>

      <div className={baseStyles.field}>
        <label className={baseStyles.label} htmlFor="ta-coursesInterested">Courses You're Interested In</label>
        <input
          className={baseStyles.input}
          id="ta-coursesInterested"
          name="coursesInterested"
          type="text"
          placeholder="e.g. Python for AI Engineers, full catalog, or specific tracks"
          value={fields.coursesInterested}
          onChange={handleChange}
        />
      </div>

      <div className={baseStyles.field}>
        <label className={baseStyles.label} htmlFor="ta-message">Anything Else We Should Know</label>
        <textarea
          className={baseStyles.textarea}
          id="ta-message"
          name="message"
          rows={4}
          placeholder="Team structure, rollout timeline, access restrictions you need — whatever helps us set this up right."
          value={fields.message}
          onChange={handleChange}
        />
      </div>

      {status === 'error' && (
        <p className={baseStyles.error} role="alert">{errorMessage}</p>
      )}

      <button type="submit" className={baseStyles.submitBtn} disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Request Team Access'}
      </button>
    </form>
  );
}
