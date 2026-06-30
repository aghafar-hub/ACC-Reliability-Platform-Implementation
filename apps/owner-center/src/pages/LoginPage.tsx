// apps/owner-center/src/pages/LoginPage.tsx
// Production-quality login page for the ACC Owner Center.
//
// Architecture rules (PS-101):
//  - All auth operations flow through useAuth() — no direct SDK or service calls.
//  - Audit events are emitted inside AuthService, never here.
//  - Must not contain any business logic.
//  - Must not implement MFA, Forgot Password, OAuth, or Entra ID.

import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import type { AuthCredentials } from '@acc-reliability/sdk';

// ── Copy table — all user-visible strings ─────────────────────────────────────

const COPY = {
  pageTitle:           { en: 'Sign In — ACC Owner Center',                  ar: 'تسجيل الدخول — مركز المالك'            },
  brandTitle:          { en: 'ACC Reliability Platform',                     ar: 'منصة ACC للموثوقية'                    },
  brandSubtitle:       { en: 'Owner Center',                                 ar: 'مركز المالك'                           },
  formHeading:         { en: 'Sign In',                                      ar: 'تسجيل الدخول'                          },
  formDesc:            { en: 'Enter your credentials to access the platform.', ar: 'أدخل بياناتك للوصول إلى المنصة.'     },
  emailLabel:          { en: 'Email Address',                                ar: 'البريد الإلكتروني'                      },
  emailPlaceholder:    { en: 'you@acc-reliability.com',                      ar: 'you@acc-reliability.com'               },
  passwordLabel:       { en: 'Password',                                     ar: 'كلمة المرور'                           },
  passwordPlaceholder: { en: 'Enter your password',                          ar: 'أدخل كلمة المرور'                      },
  showPassword:        { en: 'Show password',                                ar: 'إظهار كلمة المرور'                     },
  hidePassword:        { en: 'Hide password',                                ar: 'إخفاء كلمة المرور'                     },
  rememberMe:          { en: 'Keep me signed in',                            ar: 'إبقائي مسجلاً في الجهاز'               },
  signIn:              { en: 'Sign In',                                      ar: 'تسجيل الدخول'                          },
  signingIn:           { en: 'Signing In…',                                  ar: 'جارٍ تسجيل الدخول…'                    },
  emailRequired:       { en: 'Email address is required.',                   ar: 'البريد الإلكتروني مطلوب.'              },
  emailInvalid:        { en: 'Please enter a valid email address.',          ar: 'يرجى إدخال بريد إلكتروني صالح.'        },
  passwordRequired:    { en: 'Password is required.',                        ar: 'كلمة المرور مطلوبة.'                   },
  errorInvalidCreds:   { en: 'Invalid email or password. Please try again.', ar: 'البريد أو كلمة المرور غير صحيحة.'      },
  errorExpired:        { en: 'Your session has expired. Please sign in again.', ar: 'انتهت جلستك. سجّل الدخول مرة أخرى.' },
  errorAuthFailed:     { en: 'Authentication failed. Please try again.',     ar: 'فشلت المصادقة. حاول مرة أخرى.'         },
  errorUnexpected:     { en: 'An unexpected error occurred. Please try again.', ar: 'حدث خطأ غير متوقع. حاول مرة أخرى.' },
} as const;

// ── Error message normaliser ───────────────────────────────────────────────────

/**
 * Maps raw service error messages to user-friendly copies.
 * Never exposes internal exception details to the UI.
 */
function resolveErrorMessage(raw: string, isAr: boolean): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes('invalid') ||
    lower.includes('incorrect') ||
    lower.includes('credentials') ||
    lower.includes('username') ||
    lower.includes('password') ||
    lower.includes('required')
  ) {
    return isAr ? COPY.errorInvalidCreds.ar : COPY.errorInvalidCreds.en;
  }
  if (lower.includes('expired')) {
    return isAr ? COPY.errorExpired.ar : COPY.errorExpired.en;
  }
  if (lower.includes('authentication') || lower.includes('sign-in')) {
    return isAr ? COPY.errorAuthFailed.ar : COPY.errorAuthFailed.en;
  }
  return isAr ? COPY.errorUnexpected.ar : COPY.errorUnexpected.en;
}

// ── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(val: string, isAr: boolean): string | null {
  if (val.trim().length === 0) return isAr ? COPY.emailRequired.ar : COPY.emailRequired.en;
  if (!EMAIL_RE.test(val.trim()))  return isAr ? COPY.emailInvalid.ar  : COPY.emailInvalid.en;
  return null;
}

function validatePassword(val: string, isAr: boolean): string | null {
  if (val.length === 0) return isAr ? COPY.passwordRequired.ar : COPY.passwordRequired.en;
  return null;
}

// ── LoginPage ─────────────────────────────────────────────────────────────────

/**
 * Login page for the ACC Owner Center.
 *
 * Standalone — does NOT use AppLayout.
 * Redirects to "/" if the session is already active.
 * Shows AuthLoadingScreen during the initial session-restore tick to prevent
 * the login form flashing before the app redirects to the dashboard.
 */
export function LoginPage(): React.ReactElement {
  const { status, error, login } = useAuth();
  const { theme }                = useTheme();
  const { locale }               = useLanguage();

  const isAr = locale === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';

  // ── Form state ──────────────────────────────────────────────────────────────
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPw,        setShowPw]        = useState(false);
  const [rememberMe,    setRememberMe]    = useState(false);
  const [emailError,    setEmailError]    = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ── Track initialisation: after the first non-loading render ───────────────
  // Prevents AuthLoadingScreen from reappearing when status briefly returns
  // to 'loading' during a login submission.
  const initializedRef = useRef(false);
  if (status !== 'loading') initializedRef.current = true;

  const emailRef = useRef<HTMLInputElement>(null);

  // Apply locale direction to document root (AppLayout does this for the app shell)
  useEffect(() => {
    document.documentElement.dir  = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  // Focus email field on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // ── Auth gating ─────────────────────────────────────────────────────────────

  // Show loading screen during initial session-restore only
  if (!initializedRef.current && status === 'loading') {
    return <AuthLoadingScreen />;
  }

  // Already authenticated → go to dashboard
  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  // ── Form submit ─────────────────────────────────────────────────────────────

  const isSubmitting = status === 'loading';

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const eErr = validateEmail(email, isAr);
    const pErr = validatePassword(password, isAr);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr !== null || pErr !== null) return;

    const credentials: AuthCredentials = {
      kind:     'password',
      username: email.trim(),
      password,
    };

    await login(credentials);
  }

  const serverError = error !== null ? resolveErrorMessage(error, isAr) : null;
  const t = (key: keyof typeof COPY): string => isAr ? COPY[key].ar : COPY[key].en;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="login-root"
      data-theme={theme}
      dir={dir}
      lang={locale}
    >
      <div
        className="login-card"
        role="main"
        aria-label={t('formHeading')}
      >

        {/* ── Brand area ──────────────────────────────────────────────────── */}
        <div className="login-card__brand" aria-label="Platform branding">
          <div className="login-brand-mark" aria-hidden="true">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              aria-hidden="true"
              className="login-brand-mark__svg"
            >
              <rect width="40" height="40" rx="10" fill="currentColor" opacity="0.14" />
              <text
                x="20" y="27"
                textAnchor="middle"
                fontSize="20"
                fontWeight="bold"
                fill="currentColor"
              >
                A
              </text>
            </svg>
          </div>
          <h1 className="login-brand-title">{t('brandTitle')}</h1>
          <p className="login-brand-subtitle">{t('brandSubtitle')}</p>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <div className="login-divider" aria-hidden="true" />

        {/* ── Form heading ────────────────────────────────────────────────── */}
        <div className="login-form-wrap">
          <div className="login-form__intro">
            <h2 className="login-form__heading">{t('formHeading')}</h2>
            <p  className="login-form__desc">{t('formDesc')}</p>
          </div>

          {/* ── Server error banner ─────────────────────────────────────── */}
          {serverError !== null && (
            <div className="login-error" role="alert" aria-live="assertive">
              <span className="login-error__icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </span>
              <span>{serverError}</span>
            </div>
          )}

          {/* ── Form ──────────────────────────────────────────────────────── */}
          <form
            className="login-form"
            onSubmit={(e) => { void handleSubmit(e); }}
            noValidate
            aria-label={t('formHeading')}
          >

            {/* Email field */}
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="login-email">
                {t('emailLabel')}
              </label>
              <input
                ref={emailRef}
                id="login-email"
                className={`login-input${emailError !== null ? ' login-input--error' : ''}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError !== null) setEmailError(validateEmail(e.target.value, isAr));
                }}
                onBlur={() => setEmailError(validateEmail(email, isAr))}
                aria-invalid={emailError !== null}
                aria-describedby={emailError !== null ? 'login-email-err' : undefined}
                disabled={isSubmitting}
                required
              />
              {emailError !== null && (
                <span id="login-email-err" className="login-field-error" role="alert">
                  {emailError}
                </span>
              )}
            </div>

            {/* Password field */}
            <div className="login-form__field">
              <label className="login-form__label" htmlFor="login-password">
                {t('passwordLabel')}
              </label>
              <div className="login-input-wrap">
                <input
                  id="login-password"
                  className={`login-input login-input--pw${passwordError !== null ? ' login-input--error' : ''}`}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError !== null) setPasswordError(validatePassword(e.target.value, isAr));
                  }}
                  onBlur={() => setPasswordError(validatePassword(password, isAr))}
                  aria-invalid={passwordError !== null}
                  aria-describedby={passwordError !== null ? 'login-password-err' : undefined}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowPw(prev => !prev)}
                  aria-label={showPw ? t('hidePassword') : t('showPassword')}
                  tabIndex={0}
                  aria-pressed={showPw}
                >
                  {showPw ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError !== null && (
                <span id="login-password-err" className="login-field-error" role="alert">
                  {passwordError}
                </span>
              )}
            </div>

            {/* Remember me */}
            <div className="login-form__check-row">
              <label className="login-check-label">
                <input
                  type="checkbox"
                  className="login-check-input"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="login-check-text">{t('rememberMe')}</span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`login-submit${isSubmitting ? ' login-submit--loading' : ''}`}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="login-btn-spinner" aria-hidden="true" />
                  {t('signingIn')}
                </>
              ) : (
                t('signIn')
              )}
            </button>

          </form>
        </div>
      </div>

      {/* Footer */}
      <p className="login-footer-text" aria-hidden="true">
        ACC Reliability Platform · Owner Center
      </p>
    </div>
  );
}
