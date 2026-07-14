import React, { useRef, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  RESUME_EXPERIENCE_OPTIONS as EXPERIENCE_OPTIONS,
  RESUME_REVIEW_INITIAL_FIELDS as initialFields,
  formatFileSize,
  validateResumeFile as validateFile,
  buildResumeReviewFormData,
  submitToWeb3Forms,
} from '@sypher/career-tools';
import baseStyles from '../TrainingContactForm/styles.module.css';
import styles from './styles.module.css';

export default function ResumeReviewContactForm({ onSuccess }) {
  const { siteConfig } = useDocusaurusContext();
  const accessKey = siteConfig.customFields?.web3formsAccessKey;

  const [fields, setFields] = useState(initialFields);
  const [resumeFile, setResumeFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setResumeFile(null);
      setFileError('');
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      setResumeFile(null);
      event.target.value = '';
      return;
    }

    setFileError('');
    setResumeFile(file);
  }

  function resetForm() {
    setFields(initialFields);
    setResumeFile(null);
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!accessKey) {
      setStatus('error');
      setErrorMessage("Resume review requests aren't configured yet — please email us directly.");
      return;
    }

    if (!resumeFile) {
      setFileError('Please attach your resume.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const formData = buildResumeReviewFormData({ accessKey, fields, resumeFile });
      const result = await submitToWeb3Forms(formData);

      if (result.success) {
        if (onSuccess) {
          const consumeError = await onSuccess();
          if (consumeError) {
            setStatus('error');
            setErrorMessage('Your resume was submitted, but we could not update your allowance. Contact support.');
            return;
          }
        }
        setStatus('success');
        resetForm();
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
        <h3 className={baseStyles.successTitle}>Resume received</h3>
        <p className={baseStyles.successText}>
          Thanks for submitting your resume. Our team will review it and get back to you with detailed feedback within a few business days.
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
        <label className={baseStyles.label} htmlFor="aboutMe">About Me *</label>
        <textarea
          className={baseStyles.textarea}
          id="aboutMe"
          name="aboutMe"
          rows={4}
          required
          placeholder="Tell us about your experience, career goals, and the type of roles you're targeting."
          value={fields.aboutMe}
          onChange={handleChange}
        />
      </div>

      <div className={baseStyles.field}>
        <label className={baseStyles.label} htmlFor="resume">Resume Attachment *</label>
        <input
          className={styles.fileInput}
          id="resume"
          name="resume"
          type="file"
          accept=".pdf,application/pdf"
          required
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <span className={styles.fileHint}>PDF only — max 5 MB</span>
        {resumeFile && !fileError && (
          <span className={styles.fileMeta}>{resumeFile.name} ({formatFileSize(resumeFile.size)})</span>
        )}
        {fileError && (
          <p className={baseStyles.error} role="alert">{fileError}</p>
        )}
      </div>

      {status === 'error' && (
        <p className={baseStyles.error} role="alert">{errorMessage}</p>
      )}

      <button
        type="submit"
        className={`${baseStyles.submitBtn} ${styles.submitBtnAccent}`}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Sending…' : 'Submit Resume'}
      </button>
    </form>
  );
}
