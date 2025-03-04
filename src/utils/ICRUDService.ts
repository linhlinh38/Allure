import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export interface ICRUDService<T> {
  repository: Repository<T>;
  create(data: T): Promise<T>;
  findBy(id: string, option: string): Promise<T[] | null>;
  findAll(): Promise<T[] | null>;
  update(id: string, data: QueryDeepPartialEntity<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}
