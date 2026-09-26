import type { Request, Response } from "express";
import pool from "../db.js";

export async function createProduct(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const { name, description, price, category } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        message: "name is required and must be a string",
      });
    }

    if (price === undefined || typeof price !== "number" || price < 0) {
      return res.status(400).json({
        message: "price is required and must be a non-negative number",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO products (
          name,
          description,
          price,
          category
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [
        name,
        description ?? null,
        price,
        category ?? null,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to create product:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export async function listProducts(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const {
      name,
      category,
      minPrice,
      maxPrice,
    } = req.query;

    const parsedMinPrice =
        typeof minPrice === "string" ? Number(minPrice) : undefined;
        
    const parsedMaxPrice =
        typeof maxPrice === "string" ? Number(maxPrice) : undefined;
    
    if (
      parsedMinPrice !== undefined &&
      (!Number.isFinite(parsedMinPrice) || parsedMinPrice < 0)
    ) {
      return res.status(400).json({
        message: "minPrice must be a non-negative number",
      });
    }

    if (
      parsedMaxPrice !== undefined &&
      (!Number.isFinite(parsedMaxPrice) || parsedMaxPrice < 0)
    ) {
      return res.status(400).json({
        message: "maxPrice must be a non-negative number",
      });
    }

    // minPrice <= maxPrice
    if (
      parsedMinPrice !== undefined &&
      parsedMaxPrice !== undefined &&
      parsedMinPrice > parsedMaxPrice
    ) {
      return res.status(400).json({
        message: "minPrice cannot be greater than maxPrice",
      });
    }

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (typeof name === "string" && name.trim()) {
      values.push(`%${name.trim()}%`);
      conditions.push(`name ILIKE $${values.length}`);
    }

    if (typeof category === "string" && category.trim()) {
      values.push(category.trim());
      conditions.push(`category = $${values.length}`);
    }

    if (parsedMinPrice !== undefined) {
      values.push(parsedMinPrice);
      conditions.push(`price >= $${values.length}`);
    }

    if (parsedMaxPrice !== undefined) {
      values.push(parsedMaxPrice);
      conditions.push(`price <= $${values.length}`);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const result = await pool.query(
      `
        SELECT *
        FROM products
        ${whereClause}
        ORDER BY id ASC
      `,
      values
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to list products:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// get by id
export async function getProductById(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid ID",
      });
    }

    const result = await pool.query(
      `
        SELECT *
        FROM products
        WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to get product:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// PUT
export async function updateProduct(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "id must be a positive integer",
      });
    }

    const { name, description, price, category } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "name must be a non-empty string",
        });
      }

      values.push(name.trim());
      updates.push(`name = $${values.length}`);
    }

    if (description !== undefined) {
      if (
        description !== null &&
        typeof description !== "string"
      ) {
        return res.status(400).json({
          message: "description must be a string or null",
        });
      }

      values.push(description);
      updates.push(`description = $${values.length}`);
    }

    if (price !== undefined) {
      if (
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        return res.status(400).json({
          message: "price must be a non-negative number",
        });
      }

      values.push(price);
      updates.push(`price = $${values.length}`);
    }

    if (category !== undefined) {
      if (
        category !== null &&
        typeof category !== "string"
      ) {
        return res.status(400).json({
          message: "category must be a string or null",
        });
      }

      values.push(category);
      updates.push(`category = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "at least one field must be provided",
      });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    values.push(id);

    const result = await pool.query(
      `
        UPDATE products
        SET ${updates.join(", ")}
        WHERE id = $${values.length}
        RETURNING *
      `,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update product:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function deleteProduct(
  req: Request,
  res: Response
): Promise<Response> {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "id must be a positive integer",
      });
    }

    const result = await pool.query(
      `
        DELETE FROM products
        WHERE id = $1
        RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to delete product:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}