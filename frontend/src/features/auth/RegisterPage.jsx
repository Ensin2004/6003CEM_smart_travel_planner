import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../api/authApi';
import AuthContext from '../../context/authContext';
import {
  ageGroupOptions,
  countries,
  genderOptions,
  passwordRequirements,
} from './auth.validation';

function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: 'MY',
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
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [isGenderMenuOpen, setIsGenderMenuOpen] = useState(false);
  const [isAgeGroupMenuOpen, setIsAgeGroupMenuOpen] = useState(false);

  const unmetPasswordRequirements = useMemo(
    () => passwordRequirements.filter((requirement) => !requirement.test(formData.password)),
    [formData.password]
  );
  const isConfirmPasswordFilled = formData.confirmPassword.length > 0;
  const doPasswordsMatch = formData.password === formData.confirmPassword;
  const shouldShowPasswordRequirements = isPasswordFocused && unmetPasswordRequirements.length > 0;
  const shouldShowPasswordMatchMessage = isConfirmPasswordFocused && isConfirmPasswordFilled;
  const selectedCountry = countries.find(
    ({ countryCode }) => countryCode === formData.country
  );
  const selectedGender = genderOptions.find(({ value }) => value === formData.gender);
  const selectedAgeGroup = ageGroupOptions.find(({ value }) => value === formData.ageGroup);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleCountrySelect = (countryCode) => {
    setFormData((current) => ({ ...current, country: countryCode }));
    setIsCountryMenuOpen(false);
  };

  const handleOptionSelect = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));

    if (name === 'gender') {
      setIsGenderMenuOpen(false);
    }

    if (name === 'ageGroup') {
      setIsAgeGroupMenuOpen(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.country ||
      !formData.gender ||
      !formData.ageGroup ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError('Please complete all signup fields.');
      return;
    }

    if (!formData.gender || !formData.ageGroup) {
      setError('Please select your gender and age group.');
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
        country: selectedCountry?.country || formData.country,
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
              Country
              <div className="country-select-field country-picker">
                <input type="hidden" name="country" value={formData.country} required />
                <button
                  type="button"
                  className="country-picker-button"
                  aria-haspopup="listbox"
                  aria-expanded={isCountryMenuOpen}
                  onClick={() => {
                    setIsGenderMenuOpen(false);
                    setIsAgeGroupMenuOpen(false);
                    setIsCountryMenuOpen((current) => !current);
                  }}
                >
                  {selectedCountry && (
                    <img
                      src={selectedCountry.flagUrl}
                      alt=""
                      className="country-select-flag"
                      aria-hidden="true"
                    />
                  )}
                  <span>{selectedCountry?.country || 'Select country'}</span>
                  <ChevronDown className="country-picker-icon" size={18} aria-hidden="true" />
                </button>
                {isCountryMenuOpen && (
                  <div className="country-picker-menu" role="listbox" aria-label="Country">
                    {countries.map(({ country, countryCode, flagUrl }) => (
                      <button
                        key={countryCode}
                        type="button"
                        className={countryCode === formData.country ? 'country-picker-option active' : 'country-picker-option'}
                        role="option"
                        aria-selected={countryCode === formData.country}
                        onClick={() => handleCountrySelect(countryCode)}
                      >
                        <img src={flagUrl} alt="" aria-hidden="true" />
                        <span>{country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <div className="auth-form-row">
              <label>
                Gender
                <div className="country-select-field country-picker">
                  <input type="hidden" name="gender" value={formData.gender} required />
                  <button
                    type="button"
                    className={`country-picker-button ${selectedGender ? '' : 'select-placeholder'}`}
                    aria-haspopup="listbox"
                    aria-expanded={isGenderMenuOpen}
                    onClick={() => {
                      setIsCountryMenuOpen(false);
                      setIsAgeGroupMenuOpen(false);
                      setIsGenderMenuOpen((current) => !current);
                    }}
                  >
                    <span>{selectedGender?.label || 'Select gender'}</span>
                    <ChevronDown className="country-picker-icon" size={18} aria-hidden="true" />
                  </button>
                  {isGenderMenuOpen && (
                    <div className="country-picker-menu" role="listbox" aria-label="Gender">
                      {genderOptions.map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          className={value === formData.gender ? 'country-picker-option active' : 'country-picker-option'}
                          role="option"
                          aria-selected={value === formData.gender}
                          onClick={() => handleOptionSelect('gender', value)}
                        >
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>

              <label>
                Age group
                <div className="country-select-field country-picker">
                  <input type="hidden" name="ageGroup" value={formData.ageGroup} required />
                  <button
                    type="button"
                    className={`country-picker-button ${selectedAgeGroup ? '' : 'select-placeholder'}`}
                    aria-haspopup="listbox"
                    aria-expanded={isAgeGroupMenuOpen}
                    onClick={() => {
                      setIsCountryMenuOpen(false);
                      setIsGenderMenuOpen(false);
                      setIsAgeGroupMenuOpen((current) => !current);
                    }}
                  >
                    <span>{selectedAgeGroup?.label || 'Select age group'}</span>
                    <ChevronDown className="country-picker-icon" size={18} aria-hidden="true" />
                  </button>
                  {isAgeGroupMenuOpen && (
                    <div className="country-picker-menu" role="listbox" aria-label="Age group">
                      {ageGroupOptions.map(({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          className={value === formData.ageGroup ? 'country-picker-option active' : 'country-picker-option'}
                          role="option"
                          aria-selected={value === formData.ageGroup}
                          onClick={() => handleOptionSelect('ageGroup', value)}
                        >
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                  {isPasswordVisible ? <Eye size={20} /> : <EyeOff size={20} />}
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
                  {isConfirmPasswordVisible ? <Eye size={20} /> : <EyeOff size={20} />}
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
