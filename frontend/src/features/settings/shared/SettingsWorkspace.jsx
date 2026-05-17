import { Edit3 } from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { getFeedback, submitFeedback } from '../../../api/feedbackApi';
import { getSettingsContent, updateSettingsContent } from '../../../api/settingsApi';
import { changeMyPassword, getMe, updateMe } from '../../../api/userApi';
import AuthContext from '../../../context/authContext';
import { ageGroupOptions, countries, genderOptions, passwordRequirements } from '../../auth/auth.validation';
import ContentSettings from './components/ContentSettings';
import FaqSettings from './components/FaqSettings';
import FeedbackSettings from './components/FeedbackSettings';
import NotificationSettings from './components/NotificationSettings';
import PasswordSettings from './components/PasswordSettings';
import ProfileSettings from './components/ProfileSettings';
import SettingsSubnav from './components/SettingsSubnav';
import { allNotificationKeys, maxAvatarSizeBytes, maxAvatarSizeMegabytes, sections } from './settings.constants';
import './SettingsWorkspace.css';

function SettingsWorkspace({ role }) {
  const { setUser } = useContext(AuthContext);
  const [activeSection, setActiveSection] = useState('profile');
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    avatarUrl: '',
    country: 'Malaysia',
    gender: '',
    ageGroup: '',
    notificationPreferences: {},
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [content, setContent] = useState({
    privacyPolicy: '',
    termsAndConditions: '',
    faqs: [],
  });
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [sortFilter, setSortFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, feedback: '' });
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

  const isAdmin = role === 'admin';
  const visibleSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        label: isAdmin && section.adminLabel ? section.adminLabel : section.label,
      })),
    [isAdmin]
  );
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
  const unmetPasswordRequirements = useMemo(
    () => passwordRequirements.filter((requirement) => !requirement.test(passwordData.password)),
    [passwordData.password]
  );
  const doPasswordsMatch = passwordData.password === passwordData.confirmPassword;
  const selectedCountryCode =
    countries.find(({ country }) => country === profile.country)?.countryCode || 'MY';
  const selectedGender = genderOptions.find(({ value }) => value === profile.gender);
  const selectedAgeGroup = ageGroupOptions.find(({ value }) => value === profile.ageGroup);

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
          notificationPreferences: loadedUser.notificationPreferences || {},
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

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleProfileSelect = (name, value) => {
    setProfile((current) => ({ ...current, [name]: value }));
  };

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

  const handleAvatarRemove = () => {
    setProfile((current) => ({ ...current, avatarUrl: '' }));
    setStatus({ target: 'profile', type: 'success', text: 'Avatar removed. Save profile to keep this change.' });
  };

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

  const handleContentChange = (field, value) => {
    setContent((current) => ({ ...current, [field]: value }));
  };

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

  const renderStatus = (target) =>
    status.target === target && status.text ? (
      <p className={status.type === 'success' ? 'form-success' : 'form-error'}>{status.text}</p>
    ) : null;

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

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setStatus({ target: '', type: '', text: '' });
  };

  return (
    <section className="settings-workspace">
      <SettingsSubnav sections={visibleSections} activeSection={activeSection} onSectionChange={handleSectionChange} />

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
            title="Terms and Condition"
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
