import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { AppDataSource } from "../dataSource";
import { Blog } from "../entities/blog.entity";
import { BadRequestError } from "../errors/error";
import { BaseService } from "./base.service";
import { BlogEnum } from "../utils/enum";

const repository = AppDataSource.getRepository(Blog);
class BlogService extends BaseService<Blog> {
  constructor() {
    super(repository);
  }

  async beforeCreate(data: Blog): Promise<void> {
    const checkBlog = await this.findBy(data.title, "title");
    if (checkBlog.length > 0) {
      throw new BadRequestError("Blog title already Existed");
    }
  }

  async beforeUpdate(
    id: string,
    data: QueryDeepPartialEntity<Blog>
  ): Promise<void> {
    const checkBlog = await this.findById(id);
    if (!checkBlog) {
      throw new BadRequestError("Blog Not Existed!");
    }
    const checkBlogTitle = await this.findBy(data.title, "title");
    if (checkBlogTitle.length > 0 && checkBlogTitle[0].id !== id) {
      throw new BadRequestError("Blog title already Existed");
    }
  }

  async filterBlogs(options: {
    title?: string;
    authors?: string[];
    statuses?: BlogEnum[];
    page?: number;
    limit?: number;
    sortBy?: keyof Blog;
    order?: string;
  }): Promise<{ items: Blog[]; total: number; page: number; limit: number }> {
    const { title, authors, statuses, page, limit, sortBy, order } = options;

    const queryBuilder = this.repository
      .createQueryBuilder("blog")
      .leftJoinAndSelect("blog.author", "author")
      .select("blog")
      .addSelect([
        "author.id",
        "author.username",
        "author.email",
        "author.phone",
        "author.firstName",
        "author.lastName",
        "author.avatar",
      ]);

    if (title) {
      queryBuilder.andWhere("LOWER(blog.title) LIKE :title", {
        title: `%${title.toLowerCase()}%`,
      });
    }

    if (authors && authors.length > 0) {
      queryBuilder.andWhere("author.id IN (:...authors)", { authors });
    }

    if (statuses && statuses.length > 0) {
      queryBuilder.andWhere("blog.status IN (:...statuses)", { statuses });
    }

    queryBuilder.orderBy(
      `blog.${sortBy}`,
      order.toUpperCase() as "ASC" | "DESC"
    );

    queryBuilder.skip((page - 1) * limit).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }
}

export const blogService = new BlogService();
