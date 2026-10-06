const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(409).json({ error: 'Duplicate entry', details: messages });
  }

  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ error: 'Validation error', details: messages });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ error: 'Referenced record not found' });
  }

  // Valor fuera del ENUM (ej: alert_type o severity inexistentes). Sin este
  // caso Postgres devuelve un error de base de datos y el usuario recibe un
  // 500 crudo en vez de un 400 que explique que campo esta mal.
  if (err.name === 'SequelizeDatabaseError' && /invalid input value for enum/i.test(err.message || '')) {
    return res.status(400).json({
      error: 'Valor invalido para un campo de tipo enumerado',
      details: err.message,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({ error: message, status: statusCode });
};

module.exports = errorHandler;
