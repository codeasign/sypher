export const RESUME_EXPERIENCE_OPTIONS = ['Fresher', '0–2 Years', '3–5 Years', '6–10 Years', '10+ Years'];

// Web3Forms' standard multipart uploader caps attachments at 5 MB per file
// (its Advanced File Uploader lifts this but requires a paid plan + FilePond).
export const RESUME_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const RESUME_ALLOWED_EXTENSIONS = ['.pdf'];

export const RESUME_REVIEW_INITIAL_FIELDS = {
  name: '',
  email: '',
  phone: '',
  yearsOfExperience: '',
  currentRole: '',
  aboutMe: '',
};

export function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateResumeFile(file) {
  const extension = `.${file.name.split('.').pop().toLowerCase()}`;
  if (!RESUME_ALLOWED_EXTENSIONS.includes(extension)) {
    return 'Please upload a PDF file.';
  }
  if (file.size > RESUME_MAX_FILE_SIZE_BYTES) {
    return 'File is too large. Please upload a file under 5 MB.';
  }
  return '';
}

export function buildResumeReviewFormData({ accessKey, fields, resumeFile }) {
  const formData = new FormData();
  formData.append('access_key', accessKey);
  formData.append('subject', 'New Resume Review Submission');
  formData.append('from_name', fields.name);
  formData.append('name', fields.name);
  formData.append('email', fields.email);
  formData.append('phone', fields.phone);
  formData.append('years_of_experience', fields.yearsOfExperience);
  formData.append('current_role', fields.currentRole);
  formData.append('about_me', fields.aboutMe);
  formData.append('attachment', resumeFile);
  return formData;
}
