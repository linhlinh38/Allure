import { AppDataSource } from "../dataSource";
import { Role } from "../entities/role.entity";
import { BadRequestError } from "../errors/error";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(Role);
class RoleService extends BaseService<Role> {
  constructor() {
    super(repository);
  }

  async beforeCreate(body: Role) {
    const checkRole = await this.findBy(body.role, "role");
    if (checkRole.length > 0) {
      throw new BadRequestError("Role already Existed");
    }
  }
}
export const roleService = new RoleService();
