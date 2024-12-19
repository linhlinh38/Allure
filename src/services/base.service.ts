import { EntityRepository, FindOptionsWhere, ILike, Repository } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { ICRUDService } from "../utils/ICRUDService";

export abstract class BaseService<T> implements ICRUDService<T> {
  public readonly repository: Repository<T>;

  constructor(repository: Repository<T>) {
    this.repository = repository;
  }

  async beforeCreate(data: T): Promise<void> {}
  async beforeUpdate(
    id: string,
    data: QueryDeepPartialEntity<T>
  ): Promise<void> {}

  async findAll(): Promise<T[]> {
    return await this.repository.find();
  }

  async findBy(value: any, option: string): Promise<T[] | null> {
    return await this.repository.findBy({
      [option]: value,
    } as FindOptionsWhere<T>);
  }

  async findByContains(option: string, value: any): Promise<T[] | null> {
    return await this.repository.findBy({
      [option]: ILike(value),
    } as FindOptionsWhere<T>);
  }

  async findById(value: any): Promise<T | null> {
    const data = await this.repository.findBy({
      id: value,
    } as FindOptionsWhere<T>);
    return data[0];
  }

  async create(data: T): Promise<T> {
    await this.beforeCreate(data);
    return await this.repository.save(data);
  }

  async createMany(dataArray: T[]): Promise<T[]> {
    for (const data of dataArray) {
      await this.beforeCreate(data);
    }
    return await this.repository.save(dataArray);
  }

  async update(id: any, data: QueryDeepPartialEntity<T>): Promise<T | null> {
    await this.beforeUpdate(id, data);
    const updatedEntity = await this.repository.update({ id }, data);

    if (updatedEntity.affected === 0) {
      return null;
    }

    return await this.repository.findOneBy({
      id,
    } as unknown as FindOptionsWhere<T>);
  }

  async delete(id: string): Promise<boolean> {
    const deletedEntity = await this.repository.delete({
      id,
    } as unknown as FindOptionsWhere<T>);

    return deletedEntity.affected > 0;
  }
}
