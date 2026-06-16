/**
 * Settings module.
 * Exports and local helpers keep related behavior in a single module.
 */
import { Edit3 } from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getFeedback, submitFeedback } from '../../../api/feedbackApi';
import { getSettingsContent, updateSettingsContent } from '../../../api/settingsApi';
import { changeMyPassword, getMe, updateMe } from '../../../api/userApi';
import AuthContext from '../../../context/authContext';
import useNotifications from '../../../hooks/useNotifications';
import { ageGroupOptions, countries, genderOptions, passwordRequirements } from '../../auth/auth.validation';
import ContentSettings from './components/ContentSettings';
import FaqSettings from './components/FaqSettings';
import FeedbackSettings from './components/FeedbackSettings';
import NotificationSettings from './components/NotificationSettings';
import PasswordSettings from './components/PasswordSettings';
import ProfileSettings from './components/ProfileSettings';
import {
  allNotificationKeys,
  defaultNotificationPreferences,
  maxAvatarSizeBytes,
  maxAvatarSizeMegabytes,
  sections,
} from './settings.constants';
import './SettingsWorkspace.css';

// ===== MAIN SETTINGS COMPONENT =====
// Renders the settings workspace and manages all settings-related state and interactions
function SettingsWorkspace({ role }) {
  // ===== CONTEXT AND HOOKS =====
  // Authentication context for user data and update functions
  const { setUser } = useContext(AuthContext);
  // Custom hook for real-time subscriptions to feedback and content updates
  const { subscribeToFeedback, subscribeToSettingsContent } = useNotifications();
  // React Router hook to access URL parameters for section navigation
  const location = useLocation();

  // ===== PROFILE STATE =====
  // Manages all user profile data including name, email, avatar, and preferences
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    avatarUrl: '',
    country: 'Malaysia',
    gender: '',
    ageGroup: '',
    notificationPreferences: {},
  });

  // ===== PASSWORD STATE =====
  // Manages password change form fields
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });

  // ===== CONTENT STATE =====
  // Manages dynamic content like privacy policy, terms, and FAQs (admin-only)
  const [content, setContent] = useState({
    privacyPolicy: '',
    termsAndConditions: '',
    faqs: [],
  });

  // ===== FEEDBACK STATE =====
  // Manages feedback entries and form data for the feedback section
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [sortFilter, setSortFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, feedback: '' });

  // ===== UI STATE =====
  // Manages various UI interactions including FAQs, status messages, and visibility toggles
  const [openFaq, setOpenFaq] = useState('');
  const [status, setStatus] = useState({ target: '', type: '', text: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [passwordFocus, setPasswordFocus] = useState('');
  const [openDropdown, setOpenDropdown] = useState('');
  const [editableFields, setEditableFields] = useState({
    name: false,
    email: false,
  });
  const [editModes, setEditModes] = useState({
    privacyPolicy: false,
    termsAndConditions: false,
    faqs: false,
  });

  // ===== ROLE-BASED CONFIGURATION =====
  // Determines if current user has admin privileges
  const isAdmin = role === 'admin';
  
  // Generates visible sections with admin-specific labels when applicable
  const visibleSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        label: isAdmin && section.adminLabel ? section.adminLabel : section.label,
      })),
    [isAdmin]
  );
  
  // Creates a Set of visible section IDs for efficient lookups
  const visibleSectionIds = useMemo(
    () => new Set(visibleSections.map((section) => section.id)),
    [visibleSections]
  );
  
  // ===== ACTIVE SECTION DETERMINATION =====
  // Determines which settings section should be active based on URL params or hash
  const activeSection = useMemo(() => {
    const sectionParam = new URLSearchParams(location.search).get('section');

    if (sectionParam && visibleSectionIds.has(sectionParam)) {
      return sectionParam;
    }

    if (location.hash === '#notifications' && visibleSectionIds.has('notifications')) {
      return 'notifications';
    }

    return 'profile';
  }, [location.hash, location.search, visibleSectionIds]);

  // ===== FILTERED FEEDBACK ENTRIES =====
  // Applies rating and sorting filters to feedback entries
  const filteredFeedbackEntries = useMemo(() => {
    const entries =
      ratingFilter === 'all'
        ? [...feedbackEntries]
        : feedbackEntries.filter((entry) => Number(entry.rating) === Number(ratingFilter));

    if (sortFilter === 'oldest') {
      return entries.sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt));
    }

    return entries.sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
  }, [feedbackEntries, ratingFilter, sortFilter]);

  // ===== PASSWORD VALIDATION =====
  // Computes password requirements that are not yet met
  const unmetPasswordRequirements = useMemo(
    () => passwordRequirements.filter((requirement) => !requirement.test(passwordData.password)),
    [passwordData.password]
  );
  
  // Checks if password and confirmation password match
  const doPasswordsMatch = passwordData.password === passwordData.confirmPassword;

  // ===== SELECTED OPTION HELPERS =====
  // Finds the selected country, gender, and age group objects from their respective options
  const selectedCountryCode =
    countries.find(({ country }) => country === profile.country)?.countryCode || 'MY';
  const selectedGender = genderOptions.find(({ value }) => value === profile.gender);
  const selectedAgeGroup = ageGroupOptions.find(({ value }) => value === profile.ageGroup);

  // ===== INITIAL DATA LOADING =====
  // Loads all settings data when the component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [profileResponse, contentResponse, feedbackResponse] = await Promise.all([
          getMe(),
          getSettingsContent(),
          isAdmin ? getFeedback() : Promise.resolve(null),
        ]);
        const loadedUser = profileResponse.data.data.user;
        setProfile({
          name: loadedUser.name || '',
          email: loadedUser.email || '',
          avatarUrl: loadedUser.avatarUrl || '',
          country: loadedUser.country || 'Malaysia',
          gender: loadedUser.gender || '',
          ageGroup: loadedUser.ageGroup || '',
          notificationPreferences: {
            ...defaultNotificationPreferences,
            ...(loadedUser.notificationPreferences || {}),
          },
        });
        setContent(contentResponse.data.data.content);
        if (feedbackResponse) {
          setFeedbackEntries(feedbackResponse.data.data.feedback);
        }
      } catch (requestError) {
        setStatus({
          target: 'page',
          type: 'error',
          text: requestError.response?.data?.message || 'Unable to load settings.',
        });
      }
    };

    loadSettings();
  }, [isAdmin]);

  // ===== REAL-TIME CONTENT SUBSCRIPTION =====
  // Subscribes to settings content updates via WebSocket or polling
  useEffect(() => {
    return subscribeToSettingsContent((nextContent) => {
      setContent(nextContent);
    });
  }, [subscribeToSettingsContent]);

  // ===== REAL-TIME FEEDBACK SUBSCRIPTION =====
  // Subscribes to new feedback entries (admin only)
  useEffect(() => {
    if (!isAdmin) return undefined;

    return subscribeToFeedback((nextFeedback) => {
      setFeedbackEntries((current) => [
        nextFeedback,
        ...current.filter((entry) => entry._id !== nextFeedback._id),
      ]);
    });
  }, [isAdmin, subscribeToFeedback]);

  // ===== PROFILE HANDLERS =====
  // Handles text input changes in profile form
  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };
  
  // Handles select input changes in profile form
  const handleProfileSelect = (name, value) => {
    setProfile((current) => ({ ...current, [name]: value }));
  };
  
  // Toggles individual notification preferences
  const handleNotificationToggle = (key) => {
    setProfile((current) => ({
      ...current,
      notificationPreferences: {
        ...current.notificationPreferences,
        notificationsOff: false,
        [key]: !current.notificationPreferences?.[key],
      },
    }));
  };
  
  // Toggles all notifications on/off
  const handleAllNotificationsOff = () => {
    setProfile((current) => {
      const notificationsOn = Boolean(current.notificationPreferences?.notificationsOff);
      return {
        ...current,
        notificationPreferences: {
          ...current.notificationPreferences,
          notificationsOff: !notificationsOn,
          ...Object.fromEntries(allNotificationKeys.map((key) => [key, notificationsOn])),
        },
      };
    });
  };

  // ===== AVATAR HANDLERS =====
  // Handles avatar image file selection and validation
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setStatus({ target: 'profile', type: 'error', text: 'Avatar must be a PNG, JPG, or JPEG image.' });
      event.target.value = '';
      return;
    }

    if (file.size > maxAvatarSizeBytes) {
      setStatus({
        target: 'profile',
        type: 'error',
        text: `Avatar image is too large. Maximum size is ${maxAvatarSizeMegabytes}MB.`,
      });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfile((current) => ({ ...current, avatarUrl: reader.result }));
      setStatus({ target: 'profile', type: 'success', text: 'Avatar added. Save profile to keep this image.' });
    };
    reader.readAsDataURL(file);
  };
  
  // Removes the current avatar
  const handleAvatarRemove = () => {
    setProfile((current) => ({ ...current, avatarUrl: '' }));
    setStatus({ target: 'profile', type: 'success', text: 'Avatar removed. Save profile to keep this change.' });
  };

  // ===== PROFILE SUBMISSION =====
  // Validates and submits profile updates to the server
  const handleProfileSubmit = async (event) => {
    event?.preventDefault();
    setStatus({ target: '', type: '', text: '' });

    if (!profile.name.trim() || !profile.email.trim() || !profile.country || !profile.gender || !profile.ageGroup) {
      setStatus({ target: 'profile', type: 'error', text: 'Please complete all profile fields.' });
      return;
    }

    try {
      const response = await updateMe(profile);
      const updatedUser = response.data.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditableFields({ name: false, email: false });
      setStatus({ target: 'profile', type: 'success', text: 'Profile updated.' });
    } catch (requestError) {
      setStatus({
        target: 'profile',
        type: 'error',
        text: requestError.response?.data?.message || requestError.response?.data?.errors?.[0]?.message || 'Unable to update profile.',
      });
    }
  };

  // ===== PASSWORD SUBMISSION =====
  // Validates and submits password change request
  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setStatus({ target: '', type: '', text: '' });

    if (!passwordData.currentPassword || !passwordData.password || !passwordData.confirmPassword) {
      setStatus({ target: 'password', type: 'error', text: 'Please complete all password fields.' });
      return;
    }

    if (passwordData.currentPassword === passwordData.password) {
      setStatus({ target: 'password', type: 'error', text: 'New password cannot be the same as current password.' });
      return;
    }

    if (unmetPasswordRequirements.length > 0) {
      setStatus({ target: 'password', type: 'error', text: 'Please meet all password requirements.' });
      return;
    }

    if (!doPasswordsMatch) {
      setStatus({ target: 'password', type: 'error', text: 'Passwords must match.' });
      return;
    }

    try {
      await changeMyPassword(passwordData);
      setPasswordData({ currentPassword: '', password: '', confirmPassword: '' });
      setStatus({ target: 'password', type: 'success', text: 'Password changed.' });
    } catch (requestError) {
      setStatus({
        target: 'password',
        type: 'error',
        text: requestError.response?.data?.message || requestError.response?.data?.errors?.[0]?.message || 'Unable to change password.',
      });
    }
  };

  // ===== CONTENT HANDLERS =====
  // Updates content state when admin edits text fields
  const handleContentChange = (field, value) => {
    setContent((current) => ({ ...current, [field]: value }));
  };

  // Saves edited content to the server
  const handleContentSave = async (target = 'content') => {
    setStatus({ target: '', type: '', text: '' });

    try {
      const response = await updateSettingsContent(content);
      setContent(response.data.data.content);
      setStatus({ target, type: 'success', text: 'Content saved.' });
    } catch (requestError) {
      setStatus({
        target,
        type: 'error',
        text: requestError.response?.data?.message || requestError.response?.data?.errors?.[0]?.message || 'Unable to save content.',
      });
    }
  };

  // ===== FEEDBACK HANDLERS =====
  // Submits user feedback to the server
  const handleFeedbackSubmit = async (event) => {
    event.preventDefault();
    setStatus({ target: '', type: '', text: '' });

    if (!feedbackForm.rating) {
      setStatus({ target: 'feedback', type: 'error', text: 'Please select a rating.' });
      return;
    }

    try {
      await submitFeedback(feedbackForm);
      setFeedbackForm({ rating: 0, feedback: '' });
      setStatus({ target: 'feedback', type: 'success', text: 'Thank you for your rating.' });
    } catch (requestError) {
      setStatus({
        target: 'feedback',
        type: 'error',
        text: requestError.response?.data?.message || requestError.response?.data?.errors?.[0]?.message || 'Unable to submit feedback.',
      });
    }
  };

  // ===== RENDER HELPERS =====
  // Renders status messages for specific targets
  const renderStatus = (target) =>
    status.target === target && status.text ? (
      <p className={status.type === 'success' ? 'form-success' : 'form-error'}>{status.text}</p>
    ) : null;

  // Renders a pane header with optional edit button for admin
  const renderPaneHeader = (title, editKey) => (
    <div className="settings-pane-header">
      <h3>{title}</h3>
      {isAdmin && editKey && (
        <button
          type="button"
          className="settings-icon-button"
          aria-label={`Edit ${title}`}
          onClick={() => setEditModes((current) => ({ ...current, [editKey]: !current[editKey] }))}
        >
          <Edit3 size={18} />
        </button>
      )}
    </div>
  );

  // ===== COMPONENT RENDER =====
  // Renders the active settings section based on URL or navigation state
  return (
    <section className="settings-workspace">
      <div className="settings-content">
        {renderStatus('page')}

        {activeSection === 'profile' && (
          <ProfileSettings
            editableFields={editableFields}
            onAvatarChange={handleAvatarChange}
            onAvatarRemove={handleAvatarRemove}
            onProfileChange={handleProfileChange}
            onProfileSubmit={handleProfileSubmit}
            onSelect={handleProfileSelect}
            openDropdown={openDropdown}
            profile={profile}
            renderStatus={renderStatus}
            selectedAgeGroup={selectedAgeGroup}
            selectedCountryCode={selectedCountryCode}
            selectedGender={selectedGender}
            setEditableFields={setEditableFields}
            setOpenDropdown={setOpenDropdown}
          />
        )}

        {activeSection === 'password' && (
          <PasswordSettings
            doPasswordsMatch={doPasswordsMatch}
            onPasswordSubmit={handlePasswordSubmit}
            passwordData={passwordData}
            passwordFocus={passwordFocus}
            renderStatus={renderStatus}
            setPasswordData={setPasswordData}
            setPasswordFocus={setPasswordFocus}
            setVisiblePasswords={setVisiblePasswords}
            unmetPasswordRequirements={unmetPasswordRequirements}
            visiblePasswords={visiblePasswords}
          />
        )}

        {activeSection === 'notifications' && (
          <NotificationSettings
            onAllNotificationsOff={handleAllNotificationsOff}
            onNotificationToggle={handleNotificationToggle}
            onProfileSubmit={handleProfileSubmit}
            profile={profile}
            renderStatus={renderStatus}
            role={role}
          />
        )}

        {activeSection === 'privacy' && (
          <ContentSettings
            content={content}
            editKey="privacyPolicy"
            editMode={editModes.privacyPolicy}
            isAdmin={isAdmin}
            onContentChange={handleContentChange}
            onContentSave={handleContentSave}
            renderPaneHeader={renderPaneHeader}
            renderStatus={renderStatus}
            title="Privacy Policy"
          />
        )}
        {activeSection === 'terms' && (
          <ContentSettings
            content={content}
            editKey="termsAndConditions"
            editMode={editModes.termsAndConditions}
            isAdmin={isAdmin}
            onContentChange={handleContentChange}
            onContentSave={handleContentSave}
            renderPaneHeader={renderPaneHeader}
            renderStatus={renderStatus}
            title="Terms and Conditions"
          />
        )}

        {activeSection === 'support' && (
          <FaqSettings
            content={content}
            editMode={editModes.faqs}
            isAdmin={isAdmin}
            onContentSave={handleContentSave}
            openFaq={openFaq}
            renderPaneHeader={renderPaneHeader}
            renderStatus={renderStatus}
            setContent={setContent}
            setOpenFaq={setOpenFaq}
          />
        )}

        {activeSection === 'feedback' && (
          <FeedbackSettings
            feedbackForm={feedbackForm}
            filteredFeedbackEntries={filteredFeedbackEntries}
            isAdmin={isAdmin}
            onFeedbackSubmit={handleFeedbackSubmit}
            ratingFilter={ratingFilter}
            renderStatus={renderStatus}
            setFeedbackForm={setFeedbackForm}
            setRatingFilter={setRatingFilter}
            setSortFilter={setSortFilter}
            sortFilter={sortFilter}
          />
        )}
      </div>
    </section>
  );
}

export default SettingsWorkspace;
