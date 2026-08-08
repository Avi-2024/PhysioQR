function createIamController({ iamService }) {
  async function listUsers(req, res) {
    const result = await iamService.listUsers(null, req.validated.query || {});
    res.status(200).json(result);
  }

  async function resolveUsers(req, res) {
    const result = await iamService.resolveUsers(null, req.validated.body.userIds);
    res.status(200).json({ data: result });
  }

  async function createUser(req, res) {
    const result = await iamService.createUser(null, req.validated.body, req.context);
    res.status(201).json({ data: result });
  }

  async function listRoles(req, res) {
    const result = await iamService.listRoles(null);
    res.status(200).json({ data: result });
  }

  async function createRole(req, res) {
    const result = await iamService.createRole(null, req.validated.body);
    res.status(201).json({ data: result });
  }

  async function listPermissions(_req, res) {
    const result = await iamService.listPermissions();
    res.status(200).json({ data: result });
  }

  async function replaceRolePermissions(req, res) {
    const result = await iamService.replaceRolePermissions(null, req.validated.params.id, req.validated.body.permissionKeys, req.context);
    res.status(200).json({ data: result });
  }

  async function checkPermission(req, res) {
    const result = await iamService.checkPermission({
      userId: req.validated.body.userId,
      permission: req.validated.body.permission,
      resource: req.validated.body.resource || {},
    });
    res.status(200).json({ data: result });
  }

  return Object.freeze({ checkPermission, createRole, createUser, listPermissions, listRoles, listUsers, resolveUsers, replaceRolePermissions });
}

export { createIamController };
