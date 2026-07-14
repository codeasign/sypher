export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

export async function submitToWeb3Forms(body) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(WEB3FORMS_ENDPOINT, {
    method: 'POST',
    headers: isFormData
      ? { Accept: 'application/json' }
      : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: isFormData ? body : JSON.stringify(body),
  });
  return response.json();
}
