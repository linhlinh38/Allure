import { FindOptionsWhere, Repository } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

export interface ICRUDService<T> {
  repository: Repository<T>;
  create(data: T): Promise<T>;
  findById(id: number, option: string): Promise<T | null>;
  findAll(): Promise<T[] | null>;
  update(id: number, data: QueryDeepPartialEntity<T>): Promise<T | null>;
  delete(id: number): Promise<boolean>;
}