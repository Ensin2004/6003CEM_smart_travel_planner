export const passwordRequirements = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    label: 'At least one uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'At least one lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'At least one number',
    test: (password) => /\d/.test(password),
  },
  {
    label: 'At least one symbol',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];
