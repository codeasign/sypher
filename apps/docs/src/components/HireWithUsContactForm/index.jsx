import React, { useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { submitToWeb3Forms } from '@sypher/career-tools';
import baseStyles from '../TrainingContactForm/styles.module.css';

const COMPANY_SIZE_OPTIONS = ['1–10', '11–50', '51–200', '201–500', '500+'];

const initialFields = {
  name: '',
  email: '',
  company: '',
  companySize: '',
  roles: '',
  message: '',
};

export default function HireWithUsContactForm() {
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
      setErrorMessage("Hiring inquiries aren't configured yet — please email us directly.");
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const result = await submitToWeb3Forms({
        access_key: accessKey,
        subject: 'New Hire with Us Inquiry',
        from_name: fields.name,
        name: fields.name,
        email: fields.email,
        company: fields.company,
        company_size: fields.companySize,
        roles_hiring_for: fields.roles,
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
          Thanks for reaching out. Our hiring team will review your requirements and get back to
          you within one business day with a curated shortlist plan.
        </p>
      </div>
    );
  }

  return (
    <form className={baseStyles.form} onSubmit={handleSubmit}>
      <input type="checkbox" name="botcheck" className={baseStyles.honeypot} tabIndex={-1} autoComplete="off" />

      <div className={baseStyles.row}>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="hwu-name">Name *</label>
          <input
            className={baseStyles.input}
            id="hwu-name"
            name="name"
            type="text"
            required
            value={fields.name}
            onChange={handleChange}
          />
        </div>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="hwu-email">Work Email *</label>
          <input
            className={baseStyles.input}
            id="hwu-email"
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
          <label className={baseStyles.label} htmlFor="hwu-company">Company *</label>
          <input
            className={baseStyles.input}
            id="hwu-company"
            name="company"
            type="text"
            required
            value={fields.company}
            onChange={handleChange}
          />
        </div>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="hwu-companySize">Company Size</label>
          <select
            className={baseStyles.select}
            id="hwu-companySize"
            name="companySize"
            value={fields.companySize}
            onChange={handleChange}
          >
            <option value="">Select company size</option>
            {COMPANY_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={baseStyles.field}>
        <label className={baseStyles.label} htmlFor="hwu-roles">Roles You're Hiring For *</label>
        <input
          className={baseStyles.input}
          id="hwu-roles"
          name="roles"
          type="text"
          required
          placeholder="e.g. Backend Engineer, QA/SDET, AI Engineer"
          value={fields.roles}
          onChange={handleChange}
        />
      </div>

      <div className={baseStyles.field}>
        <label className={baseStyles.label} htmlFor="hwu-message">Tell Us About the Role</label>
        <textarea
          className={baseStyles.textarea}
          id="hwu-message"
          name="message"
          rows={4}
          placeholder="Team, seniority, must-have skills, timeline — whatever helps us curate the right shortlist."
          value={fields.message}
          onChange={handleChange}
        />
      </div>

      {status === 'error' && (
        <p className={baseStyles.error} role="alert">{errorMessage}</p>
      )}

      <button type="submit" className={baseStyles.submitBtn} disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Get a Curated Shortlist'}
      </button>
    </form>
  );
}
