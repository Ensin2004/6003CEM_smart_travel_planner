import { Eye, EyeOff } from 'lucide-react';
import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/authApi';
import AuthContext from '../../context/authContext';
import {
  countryCallingCodes,
  formatInternationalPhoneNumber,
  validatePhoneNumber,
} from '../../data/countryCallingCodes';
import { passwordRequirements } from './passwordValidation';

function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: 'MY',
    phoneNumber: '',
    gender: '',
    ageGroup: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  const unmetPasswordRequirements = useMemo(
    () => passwordRequirements.filter((requirement) => !requirement.test(formData.password)),
    [formData.password]
  );
  const isConfirmPasswordFilled = formData.confirmPassword.length > 0;
  const doPasswordsMatch = formData.password === formData.confirmPassword;
  const shouldShowPasswordRequirements = isPasswordFocused && unmetPasswordRequirements.length > 0;
  const shouldShowPasswordMatchMessage = isConfirmPasswordFocused && isConfirmPasswordFilled;
  const selectedCountryCode = countryCallingCodes.find(
    ({ countryCode }) => countryCode === formData.countryCode
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validatePhoneNumber(formData.countryCode, formData.phoneNumber)) {
      setError('Please enter a valid phone number for the selected country code.');
      return;
    }

    if (!doPasswordsMatch) {
      setError('Passwords must match.');
      return;
    }

    if (unmetPasswordRequirements.length > 0) {
      setError('Please meet all password requirements.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({
        ...formData,
        countryCode: undefined,
        phoneNumber: formatInternationalPhoneNumber(formData.countryCode, formData.phoneNumber),
      });
      const result = response.data.data;

      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);
      navigate('/dashboard');
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        requestError.response?.data?.errors?.[0]?.msg ||
        'Unable to create your account. Please check your details and try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page auth-register">
      <section className="auth-card">
        <aside className="auth-showcase">
          <Link className="auth-brand" to="/">
            <span>ST</span>
            Smart Travel Planner
          </Link>
          <div className="showcase-copy">
            <p className="eyebrow">Start planning</p>
            <h1>Create a calmer way to organize every trip.</h1>
            <p>
              Save destinations, preferences, checklists, and budget notes in a
              workspace made for real travel decisions.
            </p>
          </div>
          <div className="showcase-card">
            <span>Planning board</span>
            <strong>Weather, budget, notes</strong>
            <p>Bring the practical details together before departure.</p>
          </div>
        </aside>

        <section className="auth-panel" aria-labelledby="register-title">
          <div className="auth-heading">
            <p className="eyebrow">Sign up</p>
            <h2 id="register-title">Create your account</h2>
            <p>Create a user account to start planning your trips.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-row">
              <label>
                Full name
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
            </div>

            <label>
              Phone number
              <div className="phone-field">
                <div className="country-code-field">
                  {selectedCountryCode && (
                    <img
                      src={selectedCountryCode.flagUrl}
                      alt=""
                      className="country-code-flag"
                      aria-hidden="true"
                    />
                  )}
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleChange}
                    aria-label="Country code"
                    required
                  >
                    {countryCallingCodes.map(({ country, countryCode, code }) => (
                      <option key={countryCode} value={countryCode}>
                        {country} ({code})
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="12 345 6789"
                  autoComplete="tel-national"
                  required
                />
              </div>
            </label>

            <div className="auth-form-row">
              <label>
                Gender
                <select
                  className={formData.gender ? '' : 'select-placeholder'}
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </label>

              <label>
                Age group
                <select
                  className={formData.ageGroup ? '' : 'select-placeholder'}
                  name="ageGroup"
                  value={formData.ageGroup}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select age group</option>
                  <option value="under-18">Under 18</option>
                  <option value="18-24">18-24</option>
                  <option value="25-34">25-34</option>
                  <option value="35-44">35-44</option>
                  <option value="45-54">45-54</option>
                  <option value="55+">55+</option>
                </select>
              </label>
            </div>

            <label>
              Password
              <div className="password-field">
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  placeholder="Enter a password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                  onClick={() => setIsPasswordVisible((current) => !current)}
                >
                  {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {shouldShowPasswordRequirements && (
                <ul className="password-requirements" aria-live="polite">
                  {unmetPasswordRequirements.map((requirement) => (
                    <li key={requirement.label}>{requirement.label}</li>
                  ))}
                </ul>
              )}
            </label>

            <label>
              Confirm password
              <div className="password-field">
                <input
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setIsConfirmPasswordFocused(true)}
                  onBlur={() => setIsConfirmPasswordFocused(false)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={isConfirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setIsConfirmPasswordVisible((current) => !current)}
                >
                  {isConfirmPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {shouldShowPasswordMatchMessage && (
                <p
                  className={`password-match-message ${
                    doPasswordsMatch ? 'password-match-message-success' : 'password-match-message-error'
                  }`}
                  aria-live="polite"
                >
                  {doPasswordsMatch ? 'Password match' : 'Password does not match'}
                </p>
              )}
            </label>

            {error && <p className="form-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default RegisterPage;
