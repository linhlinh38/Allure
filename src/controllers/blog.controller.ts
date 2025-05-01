import { NextFunction, Request, Response } from "express";
import { blogService } from "../services/blog.service";
import { createNormalResponse } from "../utils/response";
import { NotFoundError } from "../errors/error";
import { BlogEnum, BlogTypeEnum } from "../utils/enum";
import { Blog } from "../entities/blog.entity";
import { AuthRequest } from "../middleware/authentication";
import { Account } from "../entities/account.entity";
export default class BlogController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const blogs = await blogService.findAll();
      return createNormalResponse(res, "Get all blogs success", blogs);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const blog = await blogService.findById(req.params.id);
      if (!blog) throw new NotFoundError("Blog Not Existed!");
      return createNormalResponse(res, "Get blog success", blog);
    } catch (err) {
      next(err);
    }
  }

  static async findByTag(req: Request, res: Response, next: NextFunction) {
    try {
      const blog = await blogService.findByTag(req.params.tag);
      if (!blog) throw new NotFoundError("Blog Not Existed!");
      return createNormalResponse(res, "Get blog success", blog);
    } catch (err) {
      next(err);
    }
  }

  static async filterBlogs(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        title,
        tag,
        types,
        authors,
        statuses,
        page,
        limit,
        sortBy,
        order,
      } = req.query;

      const result = await blogService.filterBlogs({
        title: title as string,
        tag: tag as string,
        authors: authors ? (authors as string).split(",") : undefined,
        statuses: statuses
          ? ((statuses as string).split(",") as BlogEnum[])
          : undefined,
        types: types
          ? ((types as string).split(",") as BlogTypeEnum[])
          : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        sortBy: sortBy as keyof Blog,
        order: order ? (order as "ASC" | "DESC") : "ASC",
      });

      return createNormalResponse(res, "Get blog success", result);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      await blogService.update(req.params.id, req.body);
      return createNormalResponse(res, "Update blog success");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { title, content, status } = req.body;
      const blog = new Blog();
      blog.title = title;
      blog.content = content;
      blog.status = status || BlogEnum.UN_PUBLISHED;
      blog.author = new Account();
      blog.author.id = req.loginUser;
      await blogService.create(blog);
      return createNormalResponse(res, "Create blog success");
    } catch (err) {
      next(err);
    }
  }
}
