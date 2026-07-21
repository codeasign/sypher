import { listProfiles } from './profiles';

export async function fetchPlanFeatureDefaults(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('plan_feature_defaults')
    .select('role, resume_reviews_included, mock_interviews_included')
    .order('role', { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load plan feature defaults:', error.message);
    return [];
  }
  return data;
}

export async function savePlanFeatureDefault(supabase, role, resumeReviewsIncluded, mockInterviewsIncluded) {
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('plan_feature_defaults').upsert({
    role,
    resume_reviews_included: resumeReviewsIncluded,
    mock_interviews_included: mockInterviewsIncluded,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save plan feature default:', error.message);
    return { error: error.message };
  }
  invalidateResumeMockAdminConfigCache();
  return { error: null };
}

export async function fetchUserFeatureOverride(supabase, userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('user_feature_overrides')
    .select('user_id, resume_reviews_bonus, mock_interviews_bonus')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load user feature override:', error.message);
    return null;
  }
  return data;
}

export async function saveUserFeatureOverride(supabase, userId, resumeReviewsBonus, mockInterviewsBonus) {
  if (!supabase || !userId) return { error: 'Not authenticated' };
  const { error } = await supabase.from('user_feature_overrides').upsert({
    user_id: userId,
    resume_reviews_bonus: resumeReviewsBonus,
    mock_interviews_bonus: mockInterviewsBonus,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save user feature override:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function fetchConversionRates(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('credit_conversion_rates')
    .select('feature, credits_per_use')
    .order('feature', { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load conversion rates:', error.message);
    return [];
  }
  return data;
}

export async function saveConversionRate(supabase, feature, creditsPerUse) {
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('credit_conversion_rates').upsert({
    feature,
    credits_per_use: creditsPerUse,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save conversion rate:', error.message);
    return { error: error.message };
  }
  invalidateResumeMockAdminConfigCache();
  return { error: null };
}

export async function fetchCreditPacks(supabase) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('credit_packs')
    .select('id, tier, name, credits, price_paise, currency, is_active, sort_order')
    .order('sort_order', { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load credit packs:', error.message);
    return [];
  }
  return data;
}

export async function saveCreditPack(supabase, tier, fields) {
  if (!supabase) return { error: 'Not authenticated' };
  const { error } = await supabase.from('credit_packs').upsert({
    tier,
    name: fields.name,
    credits: fields.credits,
    price_paise: fields.pricePaise,
    is_active: fields.isActive,
    sort_order: fields.sortOrder,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save credit pack:', error.message);
    return { error: error.message };
  }
  invalidateResumeMockAdminConfigCache();
  return { error: null };
}

export async function fetchFeatureStatus(supabase, userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.rpc('get_feature_status', { p_user_id: userId });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load feature status:', error.message);
    return null;
  }
  return data;
}

export async function consumeFeature(supabase, userId, feature) {
  if (!supabase || !userId) return { error: 'Not authenticated' };
  const { data, error } = await supabase.rpc('consume_feature', { p_user_id: userId, p_feature: feature });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to consume feature:', error.message);
    return { error: error.message };
  }
  return { error: null, result: data };
}

// Bundles the 4 queries the Manage Access "Resume Reviews & Mock Interview"
// tab needs into one cached fetch (same in-memory-per-session pattern as
// fetchCourseAccessRows) -- switching tabs and back used to re-run all 4
// (including a full profiles scan) every time.
let cachedConfig = null;
let configPromise = null;

export function fetchResumeMockAdminConfig(supabase, { forceRefresh = false } = {}) {
  if (!forceRefresh && cachedConfig) return Promise.resolve(cachedConfig);
  if (!forceRefresh && configPromise) return configPromise;

  configPromise = Promise.all([
    fetchPlanFeatureDefaults(supabase),
    fetchConversionRates(supabase),
    fetchCreditPacks(supabase),
    listProfiles(supabase),
  ]).then(([defaultRows, rateRows, packRows, profileRows]) => {
    cachedConfig = { defaultRows, rateRows, packRows, profileRows };
    configPromise = null;
    return cachedConfig;
  });
  return configPromise;
}

export function invalidateResumeMockAdminConfigCache() {
  cachedConfig = null;
  configPromise = null;
}
