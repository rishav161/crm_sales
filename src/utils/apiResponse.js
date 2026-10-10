/**
 * Standardized success API response helper
 */
const sendResponse = (res, statusCode, message, data = null, meta = null) => {
  const responseBody = {
    success: true,
    message,
  };

  if (data !== null) {
    responseBody.data = data;
  }

  if (meta !== null) {
    responseBody.meta = meta;
  }

  return res.status(statusCode).json(responseBody);
};

module.exports = {
  sendResponse,
};
