const userRepository = require('../users/user.repository');
const tripRepository = require('../trips/trip.repository');
const apiLogRepository = require('../apiLogs/apiLog.repository');

const getDashboard = async () => {
  const [users, totalTrips, failedApiEvents] = await Promise.all([
    userRepository.findAll(),
    tripRepository.countAll(),
    apiLogRepository.countFailures(),
  ]);

  return {
    totalUsers: users.length,
    totalTrips,
    failedApiEvents,
    apiStatus: failedApiEvents > 0 ? 'warning' : 'healthy',
  };
};

module.exports = { getDashboard };
