export const COHORT_INTEREST_INITIAL_FIELDS = {
  name: '',
  email: '',
  phone: '',
};

export function buildCohortInterestPayload({ accessKey, fields, cohortTitle }) {
  return {
    access_key: accessKey,
    subject: `New Cohort Interest: ${cohortTitle}`,
    from_name: fields.name,
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    cohort: cohortTitle,
  };
}
