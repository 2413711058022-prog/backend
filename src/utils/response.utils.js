/**
 * Standardised API response helpers
 */

function success(res, data = {}, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function created(res, data = {}, message = 'Created successfully') {
  return success(res, data, message, 201);
}

function paginated(res, rows, total, page, limit, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data: rows,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
}

function error(res, message = 'Error', status = 400, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

module.exports = { success, created, paginated, error };
