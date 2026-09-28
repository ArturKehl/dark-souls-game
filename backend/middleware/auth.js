// Middleware removido — sem autenticação
async function authRequired(req, res, next) {
  req.user = { id: 1, username: "player" };
  next();
}
module.exports = { authRequired };
