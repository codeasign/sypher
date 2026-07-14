export const MOCK_INTERVIEW_EXPERIENCE_OPTIONS = ['Fresher', '0–2 Years', '3–5 Years', '6–10 Years', '10+ Years'];

export const MOCK_INTERVIEW_TYPE_OPTIONS = [
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

export const MOCK_INTERVIEW_TIME_SLOT_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Flexible'];

export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const MOCK_INTERVIEW_INITIAL_FIELDS = {
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

export function buildMockInterviewPayload({ accessKey, fields }) {
  return {
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
  };
}
