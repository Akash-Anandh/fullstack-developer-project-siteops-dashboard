export function notFoundHandler(_req, res, _next) {
  res.status(404).json({
    error: {
      message: 'Resource not found',
      status: 404,
    },
  });
}

export function errorHandler(err, _req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Map common Postgres constraint failures to client-safe 4xx responses.
  if (err.code === '23503') {
    status = 400;
    message = 'Referenced record does not exist';
  } else if (err.code === '23514') {
    status = 400;
    message = 'Value violates a database constraint';
  } else if (err.code === '23505') {
    status = 409;
    message = 'A record with that unique value already exists';
  }

  if (status === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  if (status >= 500) {
    console.error(err);
  }

  const responseBody = {
    error: {
      message,
      status,
    },
  };

  if (err.errors) {
    responseBody.error.errors = err.errors;
  }

  res.status(status).json(responseBody);
}
