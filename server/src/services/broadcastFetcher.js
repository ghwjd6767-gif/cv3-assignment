const SIGN_IN_URL = 'https://live.ecomm-data.com/api/user/sign_in';
const GNB_URL = 'https://live.ecomm-data.com/api/home/gnb';
const LIST_URLS = {
  live: 'https://live.ecomm-data.com/api/ranking/list',
  hs: 'https://live.ecomm-data.com/api/ranking/list_hs',
};

const LIST_PAYLOADS = {
  live: { period: 0, cid: null },
  hs: { period: 0, cid: null, date: null },
};

const POLL_INTERVAL_MS = 8000;
const LOGIN_BACKOFF_MS = 60000;
const SESSION_COOKIE_NAMES = ['sales2', 'sales2.sig'];

let sessionCookies = { sales2: null, 'sales2.sig': null };
let categoryMap = new Map();
const broadcastCache = { live: [], hs: [] };

let loginPromise = null;
let lastLoginFailureAt = null;
const consecutive401Count = { live: 0, hs: 0 };

function buildCookieHeader() {
  if (SESSION_COOKIE_NAMES.some((name) => !sessionCookies[name])) {
    return null;
  }
  return SESSION_COOKIE_NAMES.map((name) => `${name}=${sessionCookies[name]}`).join('; ');
}

function updateSessionCookies(response) {
  const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
  for (const cookieStr of setCookieHeaders) {
    const pair = cookieStr.split(';', 1)[0];
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const name = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    if (SESSION_COOKIE_NAMES.includes(name)) {
      sessionCookies[name] = value;
    }
  }
}

function maskLoginResponse(data) {
  const masked = { ...data };
  for (const key of ['email', 'password']) {
    if (key in masked) {
      masked[key] = '***masked***';
    }
  }
  return masked;
}

function findMostRecentSessId(oldSess) {
  return oldSess.reduce((latest, current) =>
    new Date(current.access_timestamp) > new Date(latest.access_timestamp) ? current : latest
  ).sess_id;
}

async function requestSignIn(email, password, sessId) {
  const payload = sessId ? { email, password, sess_id: sessId } : { email, password };

  const response = await fetch(SIGN_IN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  updateSessionCookies(response);

  return response.json();
}

async function performLogin() {
  const email = process.env.CV3_TEST_ID;
  const password = process.env.CV3_TEST_PW;

  let data = await requestSignIn(email, password);

  if (!data.user && Array.isArray(data.old_sess) && data.old_sess.length > 0) {
    const sessId = findMostRecentSessId(data.old_sess);
    data = await requestSignIn(email, password, sessId);
  }

  if (!data.user) {
    console.error('[broadcastFetcher] Login failed -', JSON.stringify(maskLoginResponse(data)));
    throw new Error('Login failed: no user in response');
  }

  console.log('[broadcastFetcher] Login success');

  if (!sessionCookies.sales2 || !sessionCookies['sales2.sig']) {
    throw new Error('Login response did not include session cookies');
  }
}

async function login() {
  if (loginPromise) {
    return loginPromise;
  }

  if (lastLoginFailureAt && Date.now() - lastLoginFailureAt < LOGIN_BACKOFF_MS) {
    const remainingMs = LOGIN_BACKOFF_MS - (Date.now() - lastLoginFailureAt);
    console.warn(`[broadcastFetcher] Skipping login retry, backing off for ${Math.ceil(remainingMs / 1000)}s more`);
    throw new Error('Login retry skipped due to backoff');
  }

  loginPromise = performLogin()
    .then((result) => {
      lastLoginFailureAt = null;
      return result;
    })
    .catch((error) => {
      lastLoginFailureAt = Date.now();
      throw error;
    })
    .finally(() => {
      loginPromise = null;
    });

  return loginPromise;
}

async function loadCategoryMap() {
  const cookieHeader = buildCookieHeader();

  const response = await fetch(GNB_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify({}),
  });

  updateSessionCookies(response);

  if (!response.ok) {
    throw new Error(`gnb request failed with status ${response.status}`);
  }

  const data = await response.json();
  categoryMap = new Map(Object.entries(data.cats ?? {}));

  console.log(`[broadcastFetcher] Loaded ${categoryMap.size} categories from gnb`);
}

function mapItem(item, type) {
  const category = type === 'live'
    ? categoryMap.get(String(item.cid))?.name ?? null
    : item.cat?.cat_name ?? null;

  const isLive = type === 'live';

  return {
    id: isLive ? item.objectID : item.hsshow_id,
    title: isLive ? item.title : item.hsshow_title,
    category,
    startTime: isLive ? item.datetime_start : item.hsshow_datetime_start,
    viewMetric: item.visit_cnt,
    salesCount: item.sales_cnt,
    salesAmount: item.sales_amt,
    itemCount: item.item_cnt,
    type,
  };
}

async function fetchBroadcasts(type, { isRetryAfterRelogin = false } = {}) {
  const url = LIST_URLS[type];
  if (!url) throw new Error(`Unknown broadcast type: ${type}`);

  const cookieHeader = buildCookieHeader();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(LIST_PAYLOADS[type]),
  });

  updateSessionCookies(response);

  if (response.status === 401 || response.status === 403) {
    consecutive401Count[type] += 1;

    if (consecutive401Count[type] >= 2 && !isRetryAfterRelogin) {
      console.warn(`[broadcastFetcher] ${type} unauthorized twice in a row, re-authenticating`);
      consecutive401Count[type] = 0;
      await login();
      return fetchBroadcasts(type, { isRetryAfterRelogin: true });
    }

    throw new Error(`${type} list request failed with status ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`${type} list request failed with status ${response.status}`);
  }

  consecutive401Count[type] = 0;

  const data = await response.json();
  const list = Array.isArray(data.list) ? data.list : [];
  const mapped = list.slice(0, 10).map((item) => mapItem(item, type));

  broadcastCache[type] = mapped;
  return mapped;
}

async function pollBroadcasts() {
  try {
    const live = await fetchBroadcasts('live');
    console.log(`[broadcastFetcher] live poll succeeded - ${live.length} items`);
  } catch (error) {
    console.error('[broadcastFetcher] live poll failed, keeping previous cache -', error.message);
  }

  try {
    const hs = await fetchBroadcasts('hs');
    console.log(`[broadcastFetcher] hs poll succeeded - ${hs.length} items`);
  } catch (error) {
    console.error('[broadcastFetcher] hs poll failed, keeping previous cache -', error.message);
  }
}

async function pollLoop() {
  await pollBroadcasts();
  setTimeout(pollLoop, POLL_INTERVAL_MS);
}

async function init() {
  try {
    await login();
    await loadCategoryMap();
  } catch (error) {
    console.error('[broadcastFetcher] Startup initialization failed:', error);
  }

  pollLoop();
}

function getCachedBroadcasts(type) {
  return broadcastCache[type] ?? [];
}

export { init, getCachedBroadcasts };
