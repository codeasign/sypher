export type NextAction =
  | 'contact_candidate'
  | 'follow_up_with_candidate'
  | 'schedule_interview'
  | 'reschedule_interview'
  | 'complete_interview'
  | 'collect_interview_feedback'
  | 'schedule_next_interview_round'
  | 'select_candidate'
  | 'release_offer'
  | 'follow_up_on_offer'
  | 'confirm_offer_acceptance'
  | 'confirm_joining_date'
  | 'collect_documents'
  | 'mark_joined'
  | 'put_on_hold'
  | 'resume_process'
  | 'reject';

export const NEXT_ACTION_OPTIONS: { value: NextAction; label: string }[] = [
  { value: 'contact_candidate', label: 'Contact Candidate' },
  { value: 'follow_up_with_candidate', label: 'Follow Up With Candidate' },
  { value: 'schedule_interview', label: 'Schedule Interview' },
  { value: 'reschedule_interview', label: 'Reschedule Interview' },
  { value: 'complete_interview', label: 'Complete Interview' },
  { value: 'collect_interview_feedback', label: 'Collect Interview Feedback' },
  { value: 'schedule_next_interview_round', label: 'Schedule Next Interview Round' },
  { value: 'select_candidate', label: 'Select Candidate' },
  { value: 'release_offer', label: 'Release Offer' },
  { value: 'follow_up_on_offer', label: 'Follow Up On Offer' },
  { value: 'confirm_offer_acceptance', label: 'Confirm Offer Acceptance' },
  { value: 'confirm_joining_date', label: 'Confirm Joining Date' },
  { value: 'collect_documents', label: 'Collect Documents' },
  { value: 'mark_joined', label: 'Mark Joined' },
  { value: 'put_on_hold', label: 'Put On Hold' },
  { value: 'resume_process', label: 'Resume Process' },
  { value: 'reject', label: 'Reject' },
];
