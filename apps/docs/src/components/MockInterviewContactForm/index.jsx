import React, { useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import baseStyles from '../TrainingContactForm/styles.module.css';
import styles from './styles.module.css';

const EXPERIENCE_OPTIONS = ['Fresher', '0–2 Years', '3–5 Years', '6–10 Years', '10+ Years'];
const INTERVIEW_TYPE_OPTIONS = [
  'Data Structures & Algorithms',
  'System Design',
  'Software Testing',
  'Test Automation',
  'Behavioral',
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'Custom',
];
const TIME_SLOT_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Flexible'];

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const initialFields = {
  name: '',
  email: '',
  phone: '',
  yearsOfExperience: '',
  currentRole: '',
  interviewType: '',
  targetCompanies: '',
  aboutMe: '',
  preferredDate: '',
  timeSlot: '',
};

export default function MockInterviewContactForm() {
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
      setErrorMessage("Mock interview bookings aren't configured yet — please email us directly.");
      return;
    }

    if (fields.preferredDate && fields.preferredDate < getTodayDateString()) {
      setStatus('error');
      setErrorMessage('Preferred interview date cannot be in the past.');
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
          subject: 'New Mock Interview Booking',
          from_name: fields.name,
          name: fields.name,
          email: fields.email,
          phone: fields.phone,
          years_of_experience: fields.yearsOfExperience,
          current_role: fields.currentRole,
          preferred_interview_type: fields.interviewType,
          target_companies: fields.targetCompanies,
          about_me: fields.aboutMe,
          preferred_interview_date: fields.preferredDate,
          preferred_time_slot: fields.timeSlot,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setFields(initialFields);
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
        <h3 className={baseStyles.successTitle}>Booking received</h3>
        <p className={baseStyles.successText}>
          Thanks for booking a mock interview. Our team will reach out to confirm your session details shortly.
        </p>
      </div>
    );
  }

  return (
    <form className={baseStyles.form} onSubmit={handleSubmit}>
      <input type="checkbox" name="botcheck" className={baseStyles.honeypot} tabIndex={-1} autoComplete="off" />

      <div className={baseStyles.row}>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="name">Name *</label>
          <input
            className={baseStyles.input}
            id="name"
            name="name"
            type="text"
            required
            value={fields.name}
            onChange={handleChange}
          />
        </div>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="email">Email Address *</label>
          <input
            className={baseStyles.input}
            id="email"
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
          <label className={baseStyles.label} htmlFor="phone">Phone Number</label>
          <input
            className={baseStyles.input}
            id="phone"
            name="phone"
            type="tel"
            value={fields.phone}
            onChange={handleChange}
          />
        </div>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="yearsOfExperience">Total Years of Experience *</label>
          <select
            className={baseStyles.select}
            id="yearsOfExperience"
            name="yearsOfExperience"
            required
            value={fields.yearsOfExperience}
            onChange={handleChange}
          >
            <option value="">Select experience</option>
            {EXPERIENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={baseStyles.row}>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="currentRole">Current Role</label>
          <input
            className={baseStyles.input}
            id="currentRole"
            name="currentRole"
            type="text"
            value={fields.currentRole}
            onChange={handleChange}
          />
        </div>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="interviewType">Preferred Interview Type *</label>
          <select
            className={baseStyles.select}
            id="interviewType"
            name="interviewType"
            required
            value={fields.interviewType}
            onChange={handleChange}
          >
            <option value="">Select interview type</option>
            {INTERVIEW_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={baseStyles.field}>
        <label className={baseStyles.label} htmlFor="targetCompanies">Target Companies</label>
        <textarea
          className={baseStyles.textarea}
          id="targetCompanies"
          name="targetCompanies"
          rows={2}
          placeholder="Examples: Google, Microsoft, Amazon, Atlassian, Razorpay, Walmart, Flipkart, etc."
          value={fields.targetCompanies}
          onChange={handleChange}
        />
      </div>

      <div className={baseStyles.field}>
        <label className={baseStyles.label} htmlFor="aboutMe">About Me *</label>
        <textarea
          className={baseStyles.textarea}
          id="aboutMe"
          name="aboutMe"
          rows={4}
          required
          placeholder="Tell us about your background, current role, interview goals, and any specific areas where you'd like feedback."
          value={fields.aboutMe}
          onChange={handleChange}
        />
      </div>

      <div className={baseStyles.row}>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="preferredDate">Preferred Interview Date</label>
          <input
            className={baseStyles.input}
            id="preferredDate"
            name="preferredDate"
            type="date"
            min={getTodayDateString()}
            value={fields.preferredDate}
            onChange={handleChange}
          />
        </div>
        <div className={baseStyles.field}>
          <label className={baseStyles.label} htmlFor="timeSlot">Preferred Time Slot</label>
          <select
            className={baseStyles.select}
            id="timeSlot"
            name="timeSlot"
            value={fields.timeSlot}
            onChange={handleChange}
          >
            <option value="">Select time slot</option>
            {TIME_SLOT_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      {status === 'error' && (
        <p className={baseStyles.error} role="alert">{errorMessage}</p>
      )}

      <button
        type="submit"
        className={`${baseStyles.submitBtn} ${styles.submitBtnAccent}`}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Sending…' : 'Book Mock Interview'}
      </button>
    </form>
  );
}
